import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import { overduePeriodicReports } from "../../src/infra/db/periodic-report-obligations.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const now = new Date("2026-10-11T00:00:00Z");
const actor = new Types.ObjectId();
const oldClub = new Types.ObjectId(), newClub = new Types.ObjectId();

describe.skipIf(!uri)("Overdue periodic reports (BR21)", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-periodic-owed-test-${process.pid}` }); await ensureUcmsDatabase();
    await m.clubs!.create([
      { _id: oldClub, code: "OLD", name: "Old club", field: "Technology", state: "Active", createdAt: new Date("2026-01-01Z") },
      { _id: newClub, code: "NEW", name: "New club", field: "Technology", state: "Active", createdAt: new Date("2026-07-01Z") },
    ]);
    await m.policyVersions!.create({ minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS,
      reportDeadlines: [{ reportType: "PERIODIC", dueDaysAfterPeriodEnd: 14 }], conflictThresholdMinutes: 15, feedbackWindowHours: 72,
      feedbackMinRespondents: 2, allowOverbooking: false, enforceOverdueReportBlock: true,
      academicCalendar: [
        { code: "Summer 2026", startAt: new Date("2026-05-01Z"), endAt: new Date("2026-09-01Z") },
        { code: "Fall 2026", startAt: new Date("2026-09-01Z"), endAt: new Date("2027-01-01Z") },
      ], effectiveFrom: new Date("2026-01-01Z"), createdBy: actor, createdAt: now });
  }, 30000);
  afterAll(async () => { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  it("counts a past-due period the club never opened a report for", async () => {
    expect(await overduePeriodicReports(oldClub, now)).toEqual(["Summer 2026"]);
  });

  it("does not hold a club to a period that started before it existed", async () => {
    expect(await overduePeriodicReports(newClub, now)).toEqual([]);
  });

  it("clears once the report is submitted and owes it again while it is back in Draft", async () => {
    const report = await m.periodicReports!.create({ clubId: oldClub, periodCode: "Summer 2026", periodType: "SEMESTER",
      dueAt: new Date("2026-09-15Z"), state: "Submitted", versionNo: 1, preloadedFigures: {}, narrative: "", nextPlan: "", evidence: [] });
    expect(await overduePeriodicReports(oldClub, now)).toEqual([]);
    await m.periodicReports!.updateOne({ _id: report._id }, { $set: { state: "Returned for correction" } });
    expect(await overduePeriodicReports(oldClub, now)).toEqual(["Summer 2026"]);
  });
});
