import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import { DEFAULT_SCHEME_SETTINGS } from "../../src/domain/evaluation-scheme.js";
import { mongoEvaluationRepository } from "../../src/infra/db/mongo-evaluation-repository.js";
import { mongoEvaluationSchemeRepository } from "../../src/infra/db/mongo-evaluation-scheme-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";
import { generateEvaluations, regenerateEvaluation, type EvaluationDeps } from "../../src/usecase/evaluation.js";

const uri = process.env.MONGO_URI;
const now = new Date("2026-10-11T00:00:00Z");
const summer = { code: "Summer 2026", startAt: new Date("2026-05-01Z"), endAt: new Date("2026-09-01Z") };
const officer = new Types.ObjectId();
const actor = { id: String(officer), accountState: "Active" as const };
const accepted = new Types.ObjectId(), returned = new Types.ObjectId(), silent = new Types.ObjectId();

describe.skipIf(!uri)("UC42 evaluation inputs", () => {
  const schemes = mongoEvaluationSchemeRepository();
  let deps: EvaluationDeps;
  let returnedReport: Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-evaluation-inputs-test-${process.pid}` }); await ensureUcmsDatabase();
    const founded = new Date("2026-01-01Z");
    await m.clubs!.create([
      { _id: accepted, code: "ACC", name: "Accepted club", field: "Technology", state: "Active", createdAt: founded },
      { _id: returned, code: "RET", name: "Returned club", field: "Technology", state: "Active", createdAt: founded },
      { _id: silent, code: "SIL", name: "Silent club", field: "Technology", state: "Active", createdAt: founded },
    ]);
    const policy = { minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS,
      reportDeadlines: [{ reportType: "PERIODIC" as const, dueDaysAfterPeriodEnd: 14, remindBeforeDays: 3, overdueAfterDays: 0,
        escalateAfterDays: 7 }], conflictThresholdMinutes: 15,
      feedbackWindowHours: 72, feedbackMinRespondents: 2, allowOverbooking: false, enforceOverdueReportBlock: true,
      academicCalendar: [summer], effectiveFrom: founded, createdBy: String(officer), createdAt: founded };
    await m.policyVersions!.create({ ...policy, createdBy: officer });
    const dueAt = new Date("2026-09-15Z");
    const report = { periodCode: summer.code, periodType: "SEMESTER", dueAt, versionNo: 2, preloadedFigures: {},
      narrative: "n", nextPlan: "p", evidence: [], submittedAt: new Date("2026-09-10Z") };
    const [acceptedReport, waiting] = await m.periodicReports!.create([
      { ...report, clubId: accepted, state: "Accepted" },
      { ...report, clubId: returned, state: "Submitted" }]);
    returnedReport = waiting!._id as Types.ObjectId;
    // The accepted report went through one round of correction before it was accepted.
    await m.auditLogs!.create({ entityType: "PeriodicReport", entityId: acceptedReport!._id, action: "PERIODIC_REPORT_RETURNED",
      actorId: officer, correlationId: "c1", at: new Date("2026-09-05Z") });
    const booking = { propertyId: new Types.ObjectId(), clubId: accepted, clubName: "Accepted club", purpose: "Meeting",
      semesterCode: summer.code, currentVersionNo: 1, createdAt: founded };
    function slot(day: number) {
      return { startAt: new Date(`2026-06-${day}T08:00:00Z`), endAt: new Date(`2026-06-${day}T10:00:00Z`) };
    }
    await m.propertyBookings!.create([
      { ...booking, ...slot(10), state: "Completed", decidedAt: founded },
      { ...booking, ...slot(11), state: "Cancelled", decidedAt: founded, isLateCancellation: true },
      // Released by ICPDP (UC58) and cancelled before any decision: neither is held against the club.
      { ...booking, ...slot(12), state: "Released", decidedAt: founded },
      { ...booking, ...slot(13), state: "Cancelled" },
    ]);
    const draft = await schemes.createDraft(summer.code, DEFAULT_SCHEME_SETTINGS, String(officer), now);
    await schemes.activate(draft.id, String(officer), now);
    deps = { repo: mongoEvaluationRepository(), schemes, auth: { systemRoleCodes: async () => ["ICPDP_OFFICER"] },
      policy: { findEffective: async () => ({ id: "p", ...policy }) } };
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("refuses to generate while a periodic report of the period still waits for review", async () => {
    await expect(generateEvaluations(deps, actor, summer.code, now)).rejects.toMatchObject({
      kind: "conflict", details: { field: "periodicReports", clubs: ["Returned club"] } });
  });

  it("scores reports and bookings from accepted, granted data only", async () => {
    await m.periodicReports!.updateOne({ _id: returnedReport }, { $set: { state: "Returned for correction" } });
    await m.auditLogs!.create({ entityType: "PeriodicReport", entityId: returnedReport, action: "PERIODIC_REPORT_RETURNED",
      actorId: officer, correlationId: "c2", at: now });
    const overview = await generateEvaluations(deps, actor, summer.code, now);
    const byName = new Map(await Promise.all(overview.rows.map(async (row) =>
      [row.clubName, (await deps.repo.find(row.evaluationId!))!] as const)));
    function dimension(club: string, code: string) {
      return byName.get(club)!.dimensions.find((item) => item.code === code)!;
    }
    function figure(club: string, code: string, metric: string) {
      return dimension(club, code).evidence.find((item) => item.metric === metric)?.value;
    }
    // Accepted on time, returned once before: 100 - 10.
    expect(dimension("Accepted club", "D5").score).toBe(90);
    expect(figure("Accepted club", "D5", "reportReturns")).toBe(1);
    // A returned report is not accepted, so it is not on time.
    expect(figure("Returned club", "D5", "reportsOnTime")).toBe(0);
    expect(dimension("Returned club", "D5").score).toBe(0);
    // A past-due period with no report at all is still due (BR21).
    expect(figure("Silent club", "D5", "reportsDue")).toBe(1);
    expect(dimension("Silent club", "D5").score).toBe(0);
    // Two bookings granted (one used, one cancelled after approval); no events, so D4 is bookings alone.
    expect(figure("Accepted club", "D4", "bookingsGranted")).toBe(2);
    expect(figure("Accepted club", "D4", "bookingsUsed")).toBe(1);
    expect(dimension("Accepted club", "D4").score).toBe(50);
    expect(dimension("Silent club", "D4").insufficientData).toBe(true);
  });

  it("keeps the period on the scheme version its evaluations used (BR51, BR60)", async () => {
    expect(await schemes.evaluatedPeriods()).toEqual([summer.code]);
    const next = await schemes.createDraft(summer.code, DEFAULT_SCHEME_SETTINGS, String(officer), now);
    await expect(schemes.activate(next.id, String(officer), now)).rejects.toMatchObject({ kind: "conflict" });
    const [first] = (await deps.repo.latest(summer.code));
    const again = await regenerateEvaluation(deps, actor, first!.id, now);
    expect(again.schemeId).toBe(first!.schemeId);
  });
});
