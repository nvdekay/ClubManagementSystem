import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { readDocxXml } from "@/utils/docxDocument";
import { mapProposalDocument, proposalDateTime, proposalSections } from "@/utils/eventProposalImport";
import type { WordBlock } from "@/utils/docxDocument";

function document(overrides: Record<string, string> = {}) {
  const fields = {
    "Tên sự kiện": "Test event", "Mục đích": "Learn", "Nội dung sự kiện": "Workshop",
    "Thời gian diễn ra sự kiện": "20/12/2026", "Thời gian bắt đầu": "08h00", "Thời gian kết thúc": "10h30",
    "Địa điểm": "Gamma", "Số lượng người tham gia": "120 người", "Đối tượng": "Sinh viên FPT",
    "Mức độ rủi ro": "Thấp", ...overrides,
  };
  return { tables: [[ ["OVERVIEW"], ["STT", "Hạng mục", "Nội dung"], ...Object.entries(fields).map(([key, value], i) => [String(i + 1), key, value]) ]], paragraphs: [] };
}

function archive(xml: string, claimedSize?: number): ArrayBuffer {
  const name = new TextEncoder().encode("word/document.xml");
  const compressed = deflateRawSync(xml);
  const bytes = new Uint8Array(30 + name.length + compressed.length + 46 + name.length + 22);
  const view = new DataView(bytes.buffer);
  const central = 30 + name.length + compressed.length;
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(8, 8, true);
  view.setUint16(26, name.length, true);
  bytes.set(name, 30); bytes.set(compressed, 30 + name.length);
  view.setUint32(central, 0x02014b50, true);
  view.setUint16(central + 10, 8, true);
  view.setUint32(central + 20, compressed.length, true);
  view.setUint32(central + 24, claimedSize ?? new TextEncoder().encode(xml).length, true);
  view.setUint16(central + 28, name.length, true);
  bytes.set(name, central + 46);
  const end = central + 46 + name.length;
  view.setUint32(end, 0x06054b50, true);
  view.setUint16(end + 10, 1, true);
  view.setUint32(end + 12, 46 + name.length, true);
  view.setUint32(end + 16, central, true);
  return bytes.buffer;
}

describe("proposal document import", () => {
  it("retains every paragraph and table in source order across the complete proposal", () => {
    const blocks: WordBlock[] = [
      { kind: "paragraph", text: "ĐỀ ÁN HOẠT ĐỘNG", heading: 0 },
      { kind: "paragraph", text: "A. NHÂN SỰ", heading: 1 },
      { kind: "paragraph", text: "I. Danh sách nhân sự đội Core", heading: 2 },
      { kind: "table", rows: [[{ text: "Core team", columnSpan: 3, rowSpan: 1 }]] },
      { kind: "paragraph", text: "B. NỘI DUNG", heading: 1 },
      { kind: "paragraph", text: "Long source content. ".repeat(500), heading: 0 },
      { kind: "paragraph", text: "G. ĐỀ XUẤT HỖ TRỢ", heading: 1 },
      { kind: "paragraph", text: "Hỗ trợ cơ sở vật chất", heading: 2 },
    ];
    const sections = proposalSections({ tables: [], paragraphs: [], blocks });
    expect(sections.map((section) => section.title)).toEqual(["", "A. NHÂN SỰ", "B. NỘI DUNG", "G. ĐỀ XUẤT HỖ TRỢ"]);
    expect(sections.flatMap((section) => section.blocks)).toEqual(blocks);
  });
  it("keeps all raw tables when a document has no ordered block metadata", () => {
    const source = document();
    source.tables.push([["ĐỐI NGOẠI"], ["Sponsor", "Details"]]);
    const result = mapProposalDocument(source);
    const tables = result.sections.flatMap((section) => section.blocks).filter((block) => block.kind === "table");
    expect(tables).toHaveLength(2);
    expect(tables[1]?.rows[1]?.[1]?.text).toBe("Details");
  });
  it("extracts explicit fields with Vietnam times and no guessed defaults", () => {
    const result = mapProposalDocument(document());
    expect(result.missing).toEqual([]);
    expect(result.input).toMatchObject({ title: "Test event", startAt: "2026-12-20T01:00:00.000Z", endAt: "2026-12-20T03:30:00.000Z", capacity: 120, riskCategory: "LOW", budgetLines: [] });
  });
  it("does not turn team counts, goals or placeholders into capacity", () => {
    for (const value of ["30 đội (3 - 5 người/đội)", "[SỐ LƯỢNG]", "…", "0"]) {
      expect(mapProposalDocument(document({ "Số lượng người tham gia": value, "Mục tiêu": "Thu hút 1000 sinh viên" })).missing).toContain("capacity");
    }
  });
  it("prefers an explicit participant capacity added beside the original team-count row", () => {
    const source = document();
    source.tables[0]!.splice(2, 0, ["1", "Số lượng thí sinh (dự kiến)", "30 đội (3 - 5 người/đội)"]);
    expect(mapProposalDocument(source).input.capacity).toBe(120);
  });
  it("only reads the requested PDP support budget and uses the stated row amount", () => {
    const source = document();
    source.tables.push([["BUDGET TỔ CHỨC"], ["STT"], ["1", "Other expense", "", "", "", "999.000.000 ₫"]]);
    source.tables.push([["ĐỀ XUẤT HỖ TRỢ TỪ PHÒNG PDP"], ["STT", "Đầu mục", "Đơn vị", "Số lượng", "Đơn giá", "Thành tiền"], ["1", "Giải Ba", "Giải", "2", "1.000.000 ₫", "2.000.000 ₫"], ["Tổng", "2.000.000 ₫"]]);
    expect(mapProposalDocument(source).input.budgetLines).toMatchObject([{ purpose: "Giải Ba", amount: 2000000 }]);
  });
  it("rejects partially unreadable requested budgets instead of dropping their rows", () => {
    const source = document();
    source.tables.push([["ĐỀ XUẤT HỖ TRỢ TỪ PHÒNG PDP"], ["STT"], ["1", "Prize", "", "", "", "TBD"]]);
    expect(mapProposalDocument(source).missing).toContain("budget");
  });
  it("uses the day agenda only for one explicit event date", () => {
    const source = document({ "Thời gian bắt đầu": "", "Thời gian kết thúc": "" });
    source.tables.push([["AGENDA D - DAY"], ["1", "6h00 - 7h00"], ["2", "17h30 - 18h00"]]);
    expect(mapProposalDocument(source).input).toMatchObject({ startAt: "2026-12-19T23:00:00.000Z", endAt: "2026-12-20T11:00:00.000Z" });
    const multipleDays = document({ "Thời gian bắt đầu": "", "Thời gian kết thúc": "", "Thời gian diễn ra sự kiện": "20/12/2026 - 21/12/2026" });
    multipleDays.tables.push(source.tables[1]!);
    expect(mapProposalDocument(multipleDays).missing).toEqual(expect.arrayContaining(["start", "end"]));
  });
  it("reports missing required values in an empty template", () => {
    const source = document();
    source.tables[0] = source.tables[0]!.map((row, i) => i < 2 ? row : [row[0]!, row[1]!, ""]);
    expect(mapProposalDocument(source).missing).toEqual(expect.arrayContaining(["titleField", "objective", "plan", "start", "end", "venue", "capacity", "audience", "risk"]));
  });
  it("does not guess dates for an overnight or nonchronological agenda", () => {
    const source = document({ "Thời gian bắt đầu": "", "Thời gian kết thúc": "" });
    source.tables.push([["AGENDA SỰ KIỆN"], ["1", "23h00 - 00h30"]]);
    expect(mapProposalDocument(source).missing).toEqual(expect.arrayContaining(["start", "end"]));
  });
  it("keeps continuation cells and marks unknown risk or audience as missing", () => {
    const source = document({ "Mức độ rủi ro": "TBD", "Đối tượng": "TBD" });
    source.tables[0]!.push(["", "", "Continuation"]);
    const result = mapProposalDocument(source);
    expect(result.missing).toEqual(expect.arrayContaining(["risk", "audience"]));
    expect(result.fields.at(-1)?.value).toContain("Continuation");
  });
  it("rejects unknown layouts and invalid calendar dates", () => {
    expect(() => mapProposalDocument({ tables: [], paragraphs: [] })).toThrow("unknown_template");
    expect(proposalDateTime("31/02/2026", "08:00")).toBe("");
    expect(proposalDateTime("04/07/2026", "25:00")).toBe("");
  });
  it("reads deflated XML and rejects truncated archives or oversized content", async () => {
    const xml = "<document>Tiếng Việt</document>";
    await expect(readDocxXml(archive(xml))).resolves.toBe(xml);
    await expect(readDocxXml(new ArrayBuffer(5))).rejects.toThrow("invalid_docx");
    await expect(readDocxXml(archive(xml, 13 * 1024 * 1024))).rejects.toThrow("invalid_docx");
    await expect(readDocxXml(archive(xml, 1))).rejects.toThrow("invalid_docx");
  });
});
