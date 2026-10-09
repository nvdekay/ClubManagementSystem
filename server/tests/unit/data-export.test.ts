import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import type { ExportFileWriter, ExportRepository, ExportTable } from "../../src/domain/data-export.js";
import type { PolicyRepository, PolicyVersion } from "../../src/domain/policy.js";
import { exportFileWriter } from "../../src/infra/files/export-file-writer.js";
import { exportData, exportOptions, previewExport } from "../../src/usecase/data-export.js";

const now = new Date("2026-10-10T08:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const clubId = "000000000000000000000002";
const auth = {
  systemRoleCodes: async (id: string) => (id === actor.id ? ["ICPDP_OFFICER"] : []),
  findUserById: async () => ({ id: actor.id, email: "officer@fpt.edu.vn", displayName: "Officer",
    accountState: "Active" as const }),
};
const policy: PolicyRepository = { findEffective: async () => ({ academicCalendar: [
  { code: "FA26", startAt: new Date("2026-09-01T00:00:00Z"), endAt: new Date("2026-12-31T00:00:00Z") },
] }) as unknown as PolicyVersion };
const table: ExportTable = { columns: ["Tên CLB", "Trạng thái"], rows: [["CLB A", "Active"], ["=HYPERLINK(1)", null]] };

function repository(rows = table) {
  const repo: ExportRepository = {
    table: vi.fn(async () => rows), clubs: async () => [{ id: clubId, name: "CLB A" }],
    audit: vi.fn(async () => undefined),
  };
  return repo;
}

describe("UC55 export use cases", () => {
  it("only lets ICPDP officers export (BR61)", async () => {
    const student = { id: "000000000000000000000009", accountState: "Active" as const };
    await expect(exportOptions(repository(), policy, auth, student, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(previewExport(repository(), policy, auth, null, { type: "CLUBS", filter: {} }, now))
      .rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("lists the fixed catalogue with per-type statuses, semesters and clubs", async () => {
    const options = await exportOptions(repository(), policy, auth, actor, now);
    expect(options.types.map((item) => item.type)).toEqual(["CLUBS", "MEMBERS", "EVENTS", "FINANCE", "COMPLIANCE", "EVALUATIONS"]);
    expect(options.types.find((item) => item.type === "EVALUATIONS")?.statuses).toEqual(["Published"]);
    expect(options.periods.map((item) => item.code)).toEqual(["FA26"]);
    expect(options.formats).toEqual(["xlsx", "csv", "pdf"]);
  });

  it("resolves a semester to its dates and validates the filter", async () => {
    const repo = repository();
    await expect(previewExport(repo, policy, auth, actor, { type: "EVENTS", filter: { periodCode: "FA26", clubId } }, now))
      .resolves.toEqual({ rowCount: 2 });
    expect(repo.table).toHaveBeenCalledWith("EVENTS", { periodCode: "FA26", clubId,
      from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-12-31T00:00:00Z") });
    for (const [type, filter] of [
      ["EVENTS", { periodCode: "SP30" }], ["EVENTS", { periodCode: "FA26", from: now }],
      ["EVENTS", { from: now, to: new Date("2026-01-01") }], ["CLUBS", { clubId: "x" }],
      ["CLUBS", { status: "Approved" }], ["EVALUATIONS", { status: "Draft" }], ["SECRETS", {}],
    ] as const) {
      await expect(previewExport(repo, policy, auth, actor, { type, filter }, now)).rejects.toMatchObject({ kind: "validation" });
    }
  });

  it("writes a file with who/when/filter on top, and audits each export (FR-05, FR-07)", async () => {
    const repo = repository();
    const writer: ExportFileWriter = { write: vi.fn(async () => ({ bytes: Buffer.from("x"), mimeType: "text/csv", extension: "csv" })) };
    const result = await exportData(repo, writer, policy, auth, actor,
      { type: "CLUBS", format: "csv", filter: { clubId, status: "Active" } }, now);
    expect(result.fileName).toBe("ucms-clubs-2026-10-10.csv");
    const [, title, heading] = vi.mocked(writer.write).mock.calls[0]!;
    expect(title).toBe("Danh sách CLB và trạng thái");
    expect(heading[1]).toBe("Người xuất: Officer <officer@fpt.edu.vn>");
    expect(heading[2]).toContain("CLB: CLB A; trạng thái: Active; 2 dòng");
    expect(repo.audit).toHaveBeenCalledWith(expect.objectContaining({ actorId: actor.id, type: "CLUBS",
      format: "csv", rowCount: 2 }));
    await expect(exportData(repo, writer, policy, auth, actor, { type: "CLUBS", format: "docx", filter: {} }, now))
      .rejects.toMatchObject({ kind: "validation" });
  });

  it("refuses to produce an empty file (E1)", async () => {
    const repo = repository({ columns: ["Tên CLB"], rows: [] });
    const writer: ExportFileWriter = { write: vi.fn() };
    await expect(exportData(repo, writer, policy, auth, actor, { type: "FINANCE", format: "xlsx", filter: {} }, now))
      .rejects.toMatchObject({ kind: "not_found" });
    expect(writer.write).not.toHaveBeenCalled();
    expect(repo.audit).not.toHaveBeenCalled();
  });
});

describe("UC55 export files", () => {
  const writer = exportFileWriter();
  const heading = ["Xuất lúc: 10/10/2026", "Người xuất: Officer"];

  it("writes UTF-8 CSV with a BOM, quoting and formula neutralising", async () => {
    const file = await writer.write("csv", "CLB", heading, { columns: ["Tên", "Ghi chú"],
      rows: [["CLB Nhiếp ảnh", "có, dấu phẩy"], ["=HYPERLINK(\"x\")", null]] });
    const text = file.bytes.toString("utf8");
    expect(text.startsWith("\uFEFFXuất lúc")).toBe(true);
    expect(text).toContain("CLB Nhiếp ảnh,\"có, dấu phẩy\"");
    expect(text).toContain("\"'=HYPERLINK(\"\"x\"\")\",");
    expect(file).toMatchObject({ extension: "csv", mimeType: "text/csv; charset=utf-8" });
  });

  it("writes an xlsx workbook with the heading above the table", async () => {
    const file = await writer.write("xlsx", "Danh sách CLB", heading, table);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.bytes as unknown as ArrayBuffer);
    const sheet = workbook.worksheets[0]!;
    expect(sheet.getCell("A1").value).toBe("Danh sách CLB");
    expect(sheet.getCell("A2").value).toBe("Xuất lúc: 10/10/2026");
    expect(sheet.getRow(5).values).toEqual([undefined, "Tên CLB", "Trạng thái"]);
    expect(sheet.getCell("A6").value).toBe("CLB A");
  });

  it("writes a multi-page PDF with an embedded Vietnamese-capable font", async () => {
    const many: ExportTable = { columns: ["Họ tên", "Email"], rows: Array.from({ length: 120 },
      (_, index) => [`Nguyễn Văn Đức ${index}`, `sv${index}@fpt.edu.vn`]) };
    const file = await writer.write("pdf", "Thành viên theo CLB", heading, many);
    const raw = file.bytes.toString("latin1");
    expect(raw.startsWith("%PDF-")).toBe(true);
    expect(raw).toContain("DejaVuSans");
    expect((raw.match(/\/Type \/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });
});
