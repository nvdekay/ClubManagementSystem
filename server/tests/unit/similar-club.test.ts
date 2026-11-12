import { describe, expect, it } from "vitest";
import {
  similarClubHints, similarityScore, type SimilarityCandidate, type SimilaritySubject,
} from "../../src/domain/similar-club.js";

const subject: SimilaritySubject = {
  name: "CLB Lập Trình FPTU", field: "Công nghệ",
  text: "Học lập trình web và thuật toán. Tổ chức cuộc thi lập trình hằng tháng.",
};

function club(id: string, overrides: Partial<SimilarityCandidate> = {}): SimilarityCandidate {
  return { kind: "CLUB", id, name: "Lập trình", field: "Công nghệ", state: "Active",
    text: "Học lập trình web và thuật toán, tổ chức cuộc thi lập trình.", ...overrides };
}

describe("similar club hints", () => {
  it("ignores diacritics, case and the CLB prefix when comparing names", () => {
    const [hint] = similarClubHints(subject, [club("1", { name: "lap trinh", field: "Khác", text: "" })]);
    expect(hint?.reasons.name).toBe(1);
    const [other] = similarClubHints({ ...subject, name: "Câu lạc bộ Đọc sách" },
      [club("2", { name: "doc sach club", text: "" })]);
    expect(other?.reasons.name).toBe(1);
  });

  it("scores a same-field but unrelated club 20 and hides it", () => {
    const unrelated = club("1", { name: "Bóng rổ", text: "Tập luyện bóng rổ mỗi tuần ở sân trường." });
    expect(similarityScore(subject, unrelated)).toMatchObject({ score: 20,
      reasons: { name: 0, content: 0, field: 1, sharedWords: [] } });
    expect(similarClubHints(subject, [unrelated])).toEqual([]);
  });

  it("rates an identical name, same field and close content as HIGH", () => {
    const [hint] = similarClubHints(subject, [club("1")]);
    expect(hint).toMatchObject({ kind: "CLUB", id: "1", level: "HIGH",
      reasons: { name: 1, field: 1 } });
    expect(hint!.score).toBeGreaterThanOrEqual(60);
    expect(hint!.reasons.content).toBeGreaterThan(0.5);
    expect(hint!.reasons.sharedWords).toEqual(expect.arrayContaining(["lap", "trinh", "web", "thuat", "toan"]));
  });

  it("scores a club without a description on name and field only, capped at 60", () => {
    const [hint] = similarClubHints(subject, [club("1", { text: "" })]);
    expect(hint).toMatchObject({ score: 60, level: "HIGH",
      reasons: { name: 1, content: null, field: 1, sharedWords: [] } });
    const [nameOnly] = similarClubHints(subject, [club("2", { text: "", field: "Thể thao" })]);
    expect(nameOnly).toMatchObject({ score: 40, level: "MEDIUM", reasons: { content: null, field: 0 } });
  });

  it("hides a text-less club that only shares the field and a stray name overlap", () => {
    expect(similarClubHints({ name: "CLB Nhiếp ảnh", field: "Nghệ thuật", text: "chụp ảnh" },
      [club("1", { name: "FPTU Blazie Dance Team", field: "Nghệ thuật", text: "" })])).toEqual([]);
  });

  it("returns at most five hints, highest score first, ties by Vietnamese name order", () => {
    const candidates = [
      club("c", { name: "Lập trình", text: "", field: "Khác" }),
      club("h", { name: "Nhóm lập trình", text: "" }),
      club("a", { name: "Lập trình viên", text: "" }),
      club("f", { name: "Lập trình game", text: "" }),
      club("b", { name: "Lập trình", text: "" }),
      club("e", { name: "Đội lập trình", text: "" }),
      club("g", { name: "Bơi lội", text: "" }),
    ];
    const hints = similarClubHints(subject, candidates);
    expect(hints.map((hint) => [hint.id, hint.score])).toEqual([
      ["b", 60], ["a", 60], ["e", 52], ["h", 52], ["f", 50],
    ]);
    expect(hints.every((hint) => hint.reasons.content === null && hint.reasons.field === 1)).toBe(true);
    expect(similarClubHints(subject, [...candidates].reverse())).toEqual(hints);
  });

  it("marks scores from 35 to 59 as MEDIUM", () => {
    const [hint] = similarClubHints(subject, [club("1", { name: "Robotics", field: "Khác" })]);
    expect(hint?.level).toBe("MEDIUM");
    expect(hint?.score).toBeGreaterThanOrEqual(35);
    expect(hint?.score).toBeLessThan(60);
  });

  it("returns nothing for an application without a name or content", () => {
    expect(similarClubHints({ name: " CLB ", field: "Công nghệ", text: "" }, [club("1")])).toEqual([]);
  });

  it("caps shared words at ten", () => {
    const words = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu";
    const [hint] = similarClubHints({ name: "Lập trình", field: "Công nghệ", text: words },
      [club("1", { text: words })]);
    expect(hint?.reasons.sharedWords).toHaveLength(10);
  });
});
