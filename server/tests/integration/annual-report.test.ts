// UC55 A2 end to end: real Mongo repository, real Express routes, sessions and CSRF.
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import ExcelJS from "exceljs";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parsePeriodCode } from "../../src/domain/annual-report.js";
import type { AuthConfig } from "../../src/infra/config/index.js";
import { createSessionService } from "../../src/infra/auth/session-service.js";
import { ensureAuthBootstrap } from "../../src/infra/db/bootstrap-auth.js";
import { mongoAccessRepository } from "../../src/infra/db/mongo-access-repository.js";
import { mongoAccountAdminRepository } from "../../src/infra/db/mongo-account-admin-repository.js";
import { ensureAuthSessionIndexes, mongoSessionRepository } from "../../src/infra/db/mongo-auth-session-repository.js";
import { mongoAuthRepository } from "../../src/infra/db/mongo-auth-repository.js";
import { mongoExportRepository } from "../../src/infra/db/mongo-export-repository.js";
import { mongoPolicyRepository } from "../../src/infra/db/mongo-policy-repository.js";
import { mongoPublicDiscoveryRepository } from "../../src/infra/db/mongo-public-discovery-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import { exportFileWriter } from "../../src/infra/files/export-file-writer.js";
import { buildApp } from "../../src/interface/http/server.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-annual-report-test-${process.pid}`;
const secret = "annual-report-session-secret-long-enough-1";

interface Actor { id: string; cookie: string; csrf: string }

describe.skipIf(!uri)("UC55 A2 annual report", () => {
  let server: Server;
  let base = "";
  let officer: Actor;
  let student: Actor;
  const robotics = new Types.ObjectId();
  const music = new Types.ObjectId();
  const idle = new Types.ObjectId();
  const report = new Types.ObjectId();

  async function call(who: Actor | null, method: string, path: string, body?: unknown) {
    const headers: Record<string, string> = body === undefined ? {} : { "Content-Type": "application/json" };
    if (who) { headers.Cookie = `ucms_session=${who.cookie}`; headers["X-CSRF-Token"] = who.csrf; }
    return fetch(`${base}/api/v1${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  }

  async function signIn(id: string): Promise<Actor> {
    const issued = await createSessionService(mongoSessionRepository(), secret).issue(id, new Date());
    return { id, cookie: issued.cookieValue, csrf: issued.csrfToken };
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ensureAuthSessionIndexes();
    await ensureAuthBootstrap({ ALLOWED_DOMAIN: "test.edu", BOOTSTRAP_ICPDP_EMAIL: "officer@test.edu" } as AuthConfig);
    const m = ucmsModels;
    const now = new Date("2026-12-20T00:00:00Z");
    await m.clubs!.insertMany([
      { _id: robotics, code: "R", name: "CLB Robotics", field: "Công nghệ", state: "Active", createdAt: new Date("2025-01-01") },
      { _id: music, code: "M", name: "CLB Âm nhạc", field: "Nghệ thuật", state: "Suspended", createdAt: new Date("2026-03-01") },
      { _id: idle, code: "I", name: "CLB Im lặng", field: "Khác", state: "Active", createdAt: now }]);
    const springScheme = new Types.ObjectId();
    const fallScheme = new Types.ObjectId();
    await m.evaluationSchemes!.insertMany([
      { _id: springScheme, periodCode: "Spring 2026", version: 1, state: "Active", totalWeight: 100,
        thresholds: { excellent: 85, good: 70, fair: 50 }, createdAt: now },
      { _id: fallScheme, periodCode: "Fall 2026", version: 1, state: "Active", totalWeight: 100,
        thresholds: { excellent: 90, good: 80, fair: 60 }, createdAt: now }]);
    function evaluation(clubId: Types.ObjectId, periodCode: string, total: string, extra: Record<string, unknown> = {}) {
      return { clubId, periodCode, schemeId: /fall/i.test(periodCode) ? fallScheme : springScheme, state: "Published",
        totalScore: new Types.Decimal128(total), revisionNo: 1, publishedAt: now, ...extra };
    }
    const [roboticsSpring] = await m.evaluations!.insertMany([
      evaluation(robotics, "Spring 2026", "60"),
      // Revision 2 is the latest published one; revision 3 is still a draft and must be ignored.
      evaluation(robotics, "Fall 2026", "50"),
      evaluation(robotics, "Fall 2026", "75", { revisionNo: 2 }),
      evaluation(robotics, "Fall 2026", "10", { revisionNo: 3, state: "Draft" }),
      evaluation(music, "Spring 2026", "55"),
      evaluation(music, "Summer 2026", "99", { state: "Finalized" }),
      evaluation(music, "Fall 2025", "99"),
      evaluation(idle, "Kỳ 1 2026", "99")]);
    await m.evaluationDimensionResults!.insertMany([
      { evaluationId: roboticsSpring!._id, dimensionCode: "D1", score: new Types.Decimal128("80"),
        evidence: [{ metric: "completedEvents", value: 4 }, { metric: "attendances", value: 120 }] },
      { evaluationId: roboticsSpring!._id, dimensionCode: "D3", isInsufficientData: true, evidence: [] }]);
    const periodic = { periodType: "SEMESTER", versionNo: 2, lateFlag: false, dueAt: now };
    await m.periodicReports!.insertMany([
      { ...periodic, _id: report, clubId: robotics, periodCode: "Spring 2026", state: "Accepted",
        preloadedFigures: { finance: { approvedTotal: 2_000_000, disbursedTotal: 1_500_000 }, clubData: {
          members: [{ fullName: "Nguyễn Văn A", studentCode: "HE170001", email: "a@fpt.edu.vn" }],
          achievements: [{ title: "Giải nhất Robocon", description: "Vòng toàn quốc" }] } } },
      { ...periodic, clubId: music, periodCode: "Spring 2026", state: "Submitted",
        preloadedFigures: { finance: { approvedTotal: 9_000_000, disbursedTotal: 9_000_000 } } },
      { ...periodic, clubId: robotics, periodCode: "Summer 2026", state: "Returned for correction",
        preloadedFigures: { finance: { approvedTotal: 7_000_000, disbursedTotal: 7_000_000 } } }]);

    const officerDoc = await m.users!.findOne({ email: "officer@test.edu" }).lean();
    officer = await signIn(String(officerDoc!._id));
    const studentDoc = await m.users!.create({ email: "sv@test.edu", displayName: "Sinh viên", googleSubject: "sv",
      accountState: "Active", createdAt: now });
    student = await signIn(String(studentDoc._id));

    const sessions = createSessionService(mongoSessionRepository(), secret);
    async function unused(): Promise<never> { throw new Error("not used"); }
    server = buildApp({
      publicRepo: mongoPublicDiscoveryRepository(), dbReady: () => true, policyRepo: mongoPolicyRepository(),
      adminRepo: mongoAccountAdminRepository(),
      exportRepo: mongoExportRepository(), exportWriter: exportFileWriter(),
      auth: { repo: mongoAuthRepository("test.edu"), accessRepo: mongoAccessRepository(), sessions,
        google: { begin: unused, complete: unused } as never, oauthFlow: { seal: unused, open: unused } as never,
        clientBaseUrl: "http://localhost:5173", secureCookies: false },
    }).listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 60_000);

  afterAll(async () => {
    server?.close();
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("reads only Published evaluations, at their latest published revision, and only Accepted reports", async () => {
    const repo = mongoExportRepository();
    expect((await repo.publishedPeriodCodes()).sort()).toEqual(["Fall 2025", "Fall 2026", "Kỳ 1 2026", "Spring 2026"]);
    const source = await repo.annualSource((code) => parsePeriodCode(code)?.year === 2026);
    expect(source.evaluations.map((item) => `${item.periodCode}:${item.totalScore}:${item.revisionNo}`).sort())
      .toEqual(["Fall 2026:75:2", "Spring 2026:55:1", "Spring 2026:60:1"]);
    const spring = source.evaluations.find((item) => item.totalScore === 60)!;
    expect(spring).toMatchObject({ thresholds: { excellent: 85 }, metrics: { completedEvents: 4, attendances: 120 },
      dimensions: expect.arrayContaining([{ code: "D1", score: 80, insufficientData: false }, { code: "D3", insufficientData: true }]) });
    expect(source.reports).toEqual([{ id: String(report), clubId: String(robotics), periodCode: "Spring 2026", versionNo: 2,
      approvedTotal: 2_000_000, disbursedTotal: 1_500_000,
      achievements: [{ title: "Giải nhất Robocon", description: "Vòng toàn quốc" }] }]);
    expect(source.clubs).toHaveLength(3);
  });

  it("lists academic years in the export options", async () => {
    const response = await call(officer, "GET", "/admin/exports/options");
    expect(response.status).toBe(200);
    const { data } = await response.json() as { data: { annualYears: { year: number; terms: { published: boolean }[] }[] } };
    expect(data.annualYears.map((item) => item.year)).toEqual([2026, 2025]);
    expect(data.annualYears[0]!.terms.map((term) => term.published)).toEqual([true, false, true]);
  });

  it("guards the endpoints: 403 for students, 400 for bad input, 404 for a year without evaluations", async () => {
    expect((await call(student, "POST", "/admin/exports/annual-report/preview", { year: 2026 })).status).toBe(403);
    expect((await call(student, "POST", "/admin/exports/annual-report", { year: 2026, format: "pdf" })).status).toBe(403);
    for (const body of [{ year: "2026" }, { year: 26 }, { year: 2026, extra: true }]) {
      expect((await call(officer, "POST", "/admin/exports/annual-report/preview", body)).status).toBe(400);
    }
    for (const body of [{ year: 2026, format: "csv" }, { year: 2026, format: "pdf", remarks: "x".repeat(2001) },
      { year: 2026, format: "pdf", achievementKeys: ["000000000000000000000000:1:0"] },
      { year: 2026, format: "pdf", achievementKeys: Array.from({ length: 21 }, (_, index) => `k${index}`) }]) {
      expect((await call(officer, "POST", "/admin/exports/annual-report", body)).status).toBe(400);
    }
    expect((await call(officer, "POST", "/admin/exports/annual-report/preview", { year: 2024 })).status).toBe(404);
    expect((await call(officer, "POST", "/admin/exports/annual-report", { year: 2024, format: "xlsx" })).status).toBe(404);
  });

  it("previews without auditing, then exports a file with one ANNUAL_REPORT audit", async () => {
    const audits = { entityType: "DataExport", "after.type": "ANNUAL_REPORT" };
    const preview = await call(officer, "POST", "/admin/exports/annual-report/preview", { year: 2026 });
    expect(preview.status).toBe(200);
    const text = await preview.text();
    expect(text).not.toMatch(/HE170001|fpt\.edu\.vn|Nguyễn Văn A/);
    const { data } = JSON.parse(text) as { data: {
      provisional: boolean; missingTerms: string[]; thresholds: { excellent: number };
      evaluation: { rows: { clubId: string; yearScore: number | null; trend: string | null; yearClassification: string | null }[] };
      finance: { approvedTotal: number }; achievements: { key: string }[] } };
    expect(data).toMatchObject({ provisional: true, missingTerms: ["SUMMER"], thresholds: { excellent: 90 },
      finance: { approvedTotal: 2_000_000 } });
    expect(data.evaluation.rows.map((row) => [row.clubId, row.yearScore, row.trend, row.yearClassification])).toEqual([
      [String(robotics), 67.5, "UP", "FAIR"], [String(music), 55, null, "NEEDS_IMPROVEMENT"], [String(idle), null, null, null]]);
    expect(await ucmsModels.auditLogs!.countDocuments(audits)).toBe(0);

    const file = await call(officer, "POST", "/admin/exports/annual-report", { year: 2026, format: "pdf",
      remarks: "Đề nghị khen thưởng", achievementKeys: [data.achievements[0]!.key] });
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toContain("application/pdf");
    expect(file.headers.get("content-disposition")).toContain("attachment; filename=\"bao-cao-danh-gia-clb-2026.pdf\"");
    expect(Buffer.from(await file.arrayBuffer()).subarray(0, 5).toString()).toBe("%PDF-");
    expect(await ucmsModels.auditLogs!.find(audits).lean()).toEqual([expect.objectContaining({ action: "DATA_EXPORTED",
      actorId: new Types.ObjectId(officer.id), after: { type: "ANNUAL_REPORT", format: "pdf", filter: { year: 2026 }, rowCount: 2 } })]);
  });

  it("exports several types into one xlsx with an info sheet and one audit per type (FR-UC55-12)", async () => {
    const year = { from: "2026-01-01T00:00:00+07:00", to: "2026-12-31T23:59:59+07:00" };
    const types = ["EVALUATIONS", "EVENTS", "CLUB_BUDGETS"];
    for (const body of [{ types, format: "csv", filter: year }, { types, format: "pdf", filter: year },
      { types, format: "xlsx", filter: { ...year, status: "Published" } }, { types: [], format: "xlsx", filter: year },
      { types: ["EVENTS", "EVENTS"], format: "xlsx", filter: year }, { type: "EVENTS", format: "xlsx", filter: year }]) {
      expect((await call(officer, "POST", "/admin/exports", body)).status).toBe(400);
    }
    expect((await call(officer, "POST", "/admin/exports", { types: ["EVENTS", "FINANCE"], format: "xlsx", filter: year }))
      .status).toBe(404);

    const preview = await call(officer, "POST", "/admin/exports/preview", { types, filter: year });
    expect((await preview.json() as { data: unknown }).data).toEqual({ rowCount: 5, types: [
      // Every latest Published revision whose publishedAt falls in 2026 (Fall 2025 was published in 2026 too).
      { type: "EVALUATIONS", rowCount: 5 }, { type: "EVENTS", rowCount: 0 }, { type: "CLUB_BUDGETS", rowCount: 0 }] });

    const audits = { entityType: "DataExport", "after.type": { $in: types } };
    const file = await call(officer, "POST", "/admin/exports", { types, format: "xlsx", filter: year });
    expect(file.status).toBe(200);
    expect(file.headers.get("content-disposition")).toMatch(/filename="bao-cao-tong-hop-\d{4}-\d{2}-\d{2}\.xlsx"/);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual(["Thông tin", "Đánh giá CLB", "Sự kiện", "Ngân sách theo CLB"]);
    expect(workbook.getWorksheet("Sự kiện")!.getCell("A4").value).toBe("Không có dữ liệu khớp bộ lọc");
    expect(workbook.getWorksheet("Ngân sách theo CLB")!.getRow(3).values).toEqual([undefined, "CLB", "Số ngân sách",
      "Tổng được duyệt", "Tổng đã giải ngân", "Chi thực tế đã quyết toán", "Phải hoàn", "Đã hoàn", "Chưa đối soát"]);
    expect((await ucmsModels.auditLogs!.find(audits).lean()).map((item) => [(item.after as { type: string }).type,
      (item.after as { rowCount: number }).rowCount]).sort()).toEqual([["CLUB_BUDGETS", 0], ["EVALUATIONS", 5], ["EVENTS", 0]]);

    // A single type keeps its own file name and format choice.
    const single = await call(officer, "POST", "/admin/exports", { types: ["EVALUATIONS"], format: "csv", filter: year });
    expect(single.status).toBe(200);
    expect(single.headers.get("content-disposition")).toMatch(/filename="ucms-evaluations-\d{4}-\d{2}-\d{2}\.csv"/);
  });
});
