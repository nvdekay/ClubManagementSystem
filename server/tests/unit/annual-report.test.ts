import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import {
  annualYears, buildAnnualReport, parsePeriodCode,
  type AnnualClub, type AnnualEvaluation, type AnnualPeriodicReport, type AnnualSource,
} from "../../src/domain/annual-report.js";
import type { ExportFileWriter, ExportRepository } from "../../src/domain/data-export.js";
import { exportFileWriter } from "../../src/infra/files/export-file-writer.js";
import { exportAnnualReport, previewAnnualReport } from "../../src/usecase/data-export.js";

const spring = { excellent: 85, good: 70, fair: 50 };
const fall = { excellent: 90, good: 75, fair: 55 };

function evaluation(clubId: string, periodCode: string, totalScore: number, extra: Partial<AnnualEvaluation> = {}): AnnualEvaluation {
  return { clubId, periodCode, revisionNo: 1, publishedAt: new Date("2026-06-01T00:00:00Z"), totalScore,
    thresholds: /fall/i.test(periodCode) ? fall : spring, dimensions: [],
    metrics: { activeMembers: 10, completedEvents: 2, attendances: 30, openViolations: 1 }, ...extra };
}

const clubs: AnnualClub[] = [
  { id: "a", name: "CLB An", field: "Công nghệ", state: "Active", createdAt: new Date("2025-03-01T00:00:00Z") },
  { id: "b", name: "CLB Bình", state: "Suspended", createdAt: new Date("2026-02-01T00:00:00Z") },
  { id: "c", name: "CLB Cường", state: "Active" },
  { id: "d", name: "CLB Dũng", state: "Dissolving" },
  { id: "e", name: "CLB Em", state: "Active" },
  { id: "f", name: "CLB Phúc", state: "Suspended" },
  { id: "g", name: "CLB Giang", state: "Dissolved" },
];

const reports: AnnualPeriodicReport[] = [
  { id: "r1", clubId: "a", periodCode: "Spring 2026", versionNo: 2, approvedTotal: 1_000_000, disbursedTotal: 500_000,
    achievements: [{ title: "Giải nhất", description: "Cuộc thi lập trình" }, { title: "Giải ba", description: "Hackathon" }] },
  { id: "r2", clubId: "c", periodCode: "Fall 2026", versionNo: 1, approvedTotal: 3_000_000, disbursedTotal: 2_500_000,
    achievements: [] },
  { id: "r3", clubId: "a", periodCode: "Fall 2025", versionNo: 1, approvedTotal: 9_000_000, disbursedTotal: 9_000_000,
    achievements: [{ title: "Năm khác", description: "Không thuộc năm 2026" }] },
];

const source: AnnualSource = {
  clubs,
  reports,
  evaluations: [
    // a: UP, D1 skipped where data was insufficient.
    evaluation("a", "Spring 2026", 60, { dimensions: [{ code: "D1", score: 80, insufficientData: false }] }),
    evaluation("a", "Summer 2026", 70, { dimensions: [{ code: "D1", insufficientData: true }] }),
    evaluation("a", "Fall 2026", 80, { dimensions: [{ code: "D1", score: 60, insufficientData: false },
      { code: "D2", score: 90, insufficientData: false }] }),
    // b: DOWN, listed out of order on purpose.
    evaluation("b", "FALL2026", 60),
    evaluation("b", "spring 2026", 80),
    // c: STABLE; two spellings of Fall, the later publication wins.
    evaluation("c", "Spring 2026", 72),
    evaluation("c", "Fall 2026", 10, { publishedAt: new Date("2026-12-01T00:00:00Z") }),
    evaluation("c", "FALL 2026", 74, { publishedAt: new Date("2026-12-20T00:00:00Z") }),
    // d: a single term, needs improvement.
    evaluation("d", "Summer 2026", 40),
    // Other years and unparseable codes never count.
    evaluation("a", "Fall 2025", 99), evaluation("e", "Kỳ 1 2026", 99), evaluation("e", "Winter 2026", 99),
  ],
};

describe("UC55 A2 academic year", () => {
  it("parses period codes into a season and a year", () => {
    expect(parsePeriodCode("Fall 2026")).toEqual({ season: "FALL", year: 2026 });
    expect(parsePeriodCode("FALL 2026")).toEqual({ season: "FALL", year: 2026 });
    expect(parsePeriodCode("fall2026")).toEqual({ season: "FALL", year: 2026 });
    expect(parsePeriodCode("Summer 2027")).toEqual({ season: "SUMMER", year: 2027 });
    expect(parsePeriodCode("Kỳ 1 2026")).toBeNull();
    expect(parsePeriodCode("Winter 2026")).toBeNull();
    expect(parsePeriodCode("FA26")).toBeNull();
  });

  it("lists only years with a Published evaluation, newest first, terms always SPRING, SUMMER, FALL", () => {
    expect(annualYears(["Fall 2026", "Spring 2025", "FALL2026", "Summer 2026", "Kỳ 1 2027"])).toEqual([
      { year: 2026, terms: [{ season: "SPRING", periodCodes: [], published: false },
        { season: "SUMMER", periodCodes: ["Summer 2026"], published: true },
        { season: "FALL", periodCodes: ["FALL2026", "Fall 2026"], published: true }] },
      { year: 2025, terms: [{ season: "SPRING", periodCodes: ["Spring 2025"], published: true },
        { season: "SUMMER", periodCodes: [], published: false }, { season: "FALL", periodCodes: [], published: false }] },
    ]);
  });
});

describe("UC55 A2 report aggregation", () => {
  const report = buildAnnualReport(2026, source);
  function row(id: string) {
    return report.evaluation.rows.find((item) => item.clubId === id)!;
  }

  it("averages the evaluated terms only, rounds to one decimal, and orders the rows by year score", () => {
    expect(row("a")).toMatchObject({ yearScore: 70, evaluatedTerms: 3, trend: "UP" });
    expect(row("b")).toMatchObject({ yearScore: 70, evaluatedTerms: 2, trend: "DOWN",
      terms: { SPRING: { score: 80 }, SUMMER: null, FALL: { score: 60 } } });
    expect(row("c")).toMatchObject({ yearScore: 73, trend: "STABLE", terms: { FALL: { score: 74 } } });
    expect(row("d")).toMatchObject({ yearScore: 40, evaluatedTerms: 1, trend: null, yearClassification: "NEEDS_IMPROVEMENT" });
    expect(report.evaluation.rows.map((item) => item.clubId)).toEqual(["c", "a", "b", "d", "e", "f"]);
    expect(buildAnnualReport(2026, { ...source, evaluations: [evaluation("x", "Spring 2026", 70.25),
      evaluation("x", "Fall 2026", 70.1)] }).evaluation.rows[0]?.yearScore).toBe(70.2);
  });

  it("classifies the year with the thresholds of the latest term that has Published evaluations", () => {
    expect(report.thresholds).toEqual(fall);
    expect(row("a").yearClassification).toBe("FAIR"); // 70 is GOOD under Spring's thresholds, FAIR under Fall's
    expect(buildAnnualReport(2026, { ...source, evaluations: source.evaluations.filter((item) => !/fall/i.test(item.periodCode)) })
      .thresholds).toEqual(spring);
  });

  it("separates UP, DOWN and STABLE at exactly ±5 points", () => {
    function trend(first: number, last: number) {
      return buildAnnualReport(2026, { ...source, evaluations: [evaluation("x", "Spring 2026", first),
        evaluation("x", "Fall 2026", last)] }).evaluation.rows[0]?.trend;
    }
    expect([trend(60, 65), trend(60, 64.9), trend(60, 55), trend(60, 55.1)]).toEqual(["UP", "STABLE", "DOWN", "STABLE"]);
  });

  it("keeps clubs without an evaluation last and out of every statistic", () => {
    expect(row("e")).toMatchObject({ evaluatedTerms: 0, yearScore: null, trend: null });
    expect(row("f").state).toBe("Suspended");
    expect(report.evaluation.rows.some((item) => item.clubId === "g")).toBe(false);
    expect(report.evaluation.evaluatedClubs).toBe(4);
    const counts = Object.values(report.evaluation.byClassification);
    expect(counts.reduce((sum, value) => sum + value, 0)).toBe(report.evaluation.evaluatedClubs);
    expect(report.evaluation.averageYearScore).toBe(63.3);
    expect(report.evaluation.averageByTerm).toEqual({ SPRING: 70.7, SUMMER: 55, FALL: 71.3 });
    expect(report.evaluation.top.map((item) => item.clubId)).toEqual(["c", "a", "b", "d"]);
  });

  it("flags a year with missing terms as provisional", () => {
    expect(report).toMatchObject({ provisional: false, missingTerms: [] });
    const partial = buildAnnualReport(2026, { ...source, evaluations: source.evaluations.filter((item) => !/fall/i.test(item.periodCode)) });
    expect(partial).toMatchObject({ provisional: true, missingTerms: ["FALL"] });
  });

  it("averages D1–D8 without counting insufficient data as zero", () => {
    expect(row("a").dimensions).toMatchObject({ D1: 70, D2: 90, D3: null });
    expect(report.dimensions.averages.find((item) => item.code === "D1")?.average).toBe(70);
    expect(report.dimensions).toMatchObject({ highest: "D2", lowest: "D1" });
  });

  it("counts activity from evaluation evidence and the clubs by their current state", () => {
    expect(report.overview).toEqual({ clubsByState: { Active: 3, Suspended: 2, Dissolving: 1, Dissolved: 1 }, clubsCreated: 1,
      activeMembers: 30, completedEvents: 16, participations: 240 });
    expect(report.compliance).toEqual({ openViolations: 4,
      needsImprovement: [{ clubId: "d", clubName: "CLB Dũng" }], declining: [{ clubId: "b", clubName: "CLB Bình" }],
      suspendedOrDissolving: [{ clubId: "b", clubName: "CLB Bình", state: "Suspended" },
        { clubId: "d", clubName: "CLB Dũng", state: "Dissolving" }, { clubId: "f", clubName: "CLB Phúc", state: "Suspended" }] });
  });

  it("sums finance from the year's Accepted reports and counts clubs still missing one", () => {
    expect(report.finance).toEqual({ hasData: true, approvedTotal: 4_000_000, disbursedTotal: 3_000_000, disbursementRate: 75,
      clubsWithoutAcceptedReport: 4 });
    expect(buildAnnualReport(2026, { ...source, reports: [] }).finance).toMatchObject({ hasData: false, approvedTotal: 0,
      disbursementRate: null });
  });

  it("lists the year's achievements with a stable key", () => {
    expect(report.achievements).toEqual([
      { key: "r1:2:0", clubName: "CLB An", title: "Giải nhất", description: "Cuộc thi lập trình", periodCode: "Spring 2026", season: "SPRING" },
      { key: "r1:2:1", clubName: "CLB An", title: "Giải ba", description: "Hackathon", periodCode: "Spring 2026", season: "SPRING" },
    ]);
    expect(buildAnnualReport(2026, source)).toEqual(report);
  });
});

describe("UC55 A2 use cases", () => {
  const now = new Date("2026-12-31T08:00:00Z");
  const actor = { id: "000000000000000000000001", accountState: "Active" as const };
  const student = { id: "000000000000000000000009", accountState: "Active" as const };
  const auth = {
    systemRoleCodes: async (id: string) => (id === actor.id ? ["ICPDP_OFFICER"] : []),
    findUserById: async () => ({ id: actor.id, email: "officer@fpt.edu.vn", displayName: "Officer", accountState: "Active" as const }),
  };

  function repository() {
    const repo: ExportRepository = {
      table: vi.fn(), clubs: async () => [], audit: vi.fn(async () => undefined),
      publishedPeriodCodes: async () => ["Spring 2026", "Summer 2026", "Spring 2025"],
      annualSource: vi.fn(async () => ({ ...source, evaluations: source.evaluations.filter((item) => !/fall/i.test(item.periodCode)) })),
    };
    return repo;
  }
  function writer() {
    return { write: vi.fn(), writeWorkbook: vi.fn(), writeAnnual: vi.fn<ExportFileWriter["writeAnnual"]>(async () => ({ bytes: Buffer.from("x"),
      mimeType: "application/pdf", extension: "pdf" })) } satisfies ExportFileWriter;
  }

  it("rejects non-officers, bad years and years without Published evaluations", async () => {
    await expect(previewAnnualReport(repository(), auth, student, { year: 2026 })).rejects.toMatchObject({ kind: "forbidden" });
    for (const year of [26, 20260, 2026.5, "2026"]) {
      await expect(previewAnnualReport(repository(), auth, actor, { year })).rejects.toMatchObject({ kind: "validation" });
    }
    await expect(previewAnnualReport(repository(), auth, actor, { year: 2024 })).rejects.toMatchObject({ kind: "not_found" });
  });

  it("previews without auditing and only reads the codes of that year", async () => {
    const repo = repository();
    const report = await previewAnnualReport(repo, auth, actor, { year: 2026 });
    expect(report).toMatchObject({ year: 2026, provisional: true, missingTerms: ["FALL"] });
    const inYear = vi.mocked(repo.annualSource).mock.calls[0]![0];
    expect(["Spring 2026", "fall2026", "Spring 2025", "Kỳ 1 2026"].map(inYear)).toEqual([true, true, false, false]);
    expect(repo.audit).not.toHaveBeenCalled();
  });

  it("exports with the provisional heading, only the picked achievements, remarks, and one audit record", async () => {
    const repo = repository();
    const files = writer();
    const result = await exportAnnualReport(repo, files, auth, actor, { year: 2026, format: "pdf",
      remarks: "  Đề nghị khen thưởng  ", achievementKeys: ["r1:2:1"] }, now);
    expect(result.fileName).toBe("bao-cao-danh-gia-clb-2026.pdf");
    const [format, title, document] = files.writeAnnual.mock.calls[0]!;
    expect(format).toBe("pdf");
    expect(title).toBe("Báo cáo tổng kết hoạt động Câu lạc bộ năm học 2026");
    expect(document.heading[0]).toBe("Báo cáo tạm tính — còn thiếu học kỳ: Fall 2026");
    expect(document.heading).toContain("Người xuất: Officer");
    expect(document.achievements.map((item) => item.key)).toEqual(["r1:2:1"]);
    expect(document.remarks).toBe("Đề nghị khen thưởng");
    expect(repo.audit).toHaveBeenCalledTimes(1);
    expect(repo.audit).toHaveBeenCalledWith({ actorId: actor.id, type: "ANNUAL_REPORT", format: "pdf", filter: { year: 2026 },
      rowCount: 4, at: now });

    await exportAnnualReport(repo, files, auth, actor, { year: 2026, format: "xlsx" }, now);
    expect(files.writeAnnual.mock.calls[1]![2].achievements).toEqual([]);
  });

  it("rejects a bad format, long remarks, too many or foreign achievement keys, and writes nothing", async () => {
    const repo = repository();
    const files = writer();
    for (const input of [{ format: "csv" }, { format: "pdf", remarks: "x".repeat(2001) },
      { format: "pdf", achievementKeys: Array.from({ length: 21 }, (_, index) => `r1:2:${index}`) },
      { format: "pdf", achievementKeys: ["r3:1:0"] }]) {
      await expect(exportAnnualReport(repo, files, auth, actor, { year: 2026, ...input }, now)).rejects.toMatchObject({ kind: "validation" });
    }
    await expect(exportAnnualReport(repo, files, auth, actor, { year: 2024, format: "pdf" }, now)).rejects.toMatchObject({ kind: "not_found" });
    expect(files.writeAnnual).not.toHaveBeenCalled();
    expect(repo.audit).not.toHaveBeenCalled();
  });
});

describe("UC55 A2 files", () => {
  const report = buildAnnualReport(2026, source);
  const document = { report, heading: ["Học kỳ có dữ liệu: Spring 2026, Summer 2026, Fall 2026", "Người xuất: Officer"],
    achievements: report.achievements.slice(0, 1), remarks: "Kiến nghị tăng kinh phí cho CLB học thuật" };

  it("writes an xlsx with the three sheets", async () => {
    const file = await exportFileWriter().writeAnnual("xlsx", "Báo cáo năm học 2026", document);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.bytes as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Tổng quan", "Xếp loại", "Tiêu chí"]);
    function text(name: string): string {
      return workbook.getWorksheet(name)!.getSheetValues().flat().map(String).join("|");
    }
    expect(text("Tổng quan")).toContain("I. Tổng quan phong trào");
    expect(text("Tổng quan")).toContain("VI. Thành tích nổi bật và kiến nghị");
    expect(text("Tổng quan")).toContain("Giải nhất");
    expect(text("Tổng quan")).not.toContain("Giải ba");
    expect(text("Tổng quan")).toContain("Nhận xét của ICPDP: Kiến nghị tăng kinh phí cho CLB học thuật");
    expect(text("Xếp loại")).toContain("Chưa có đánh giá");
    expect(text("Tiêu chí")).toContain("D1 Số người tham gia");
    expect(file.extension).toBe("xlsx");
  });

  it("writes a pdf with the Vietnamese font", async () => {
    const file = await exportFileWriter().writeAnnual("pdf", "Báo cáo năm học 2026", document);
    const raw = file.bytes.toString("latin1");
    expect(raw.startsWith("%PDF-")).toBe(true);
    expect(raw).toContain("DejaVuSans");
    expect(file).toMatchObject({ extension: "pdf", mimeType: "application/pdf" });
  });

  it("carries no student identity in the JSON or the files", async () => {
    const json = JSON.stringify(report);
    expect(json).not.toMatch(/@|studentCode|email|fullName|userId/i);
    const file = await exportFileWriter().writeAnnual("xlsx", "Báo cáo", document);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.bytes as unknown as ArrayBuffer);
    expect(workbook.worksheets.flatMap((sheet) => sheet.getSheetValues().flat()).join("|")).not.toContain("@");
  });
});
