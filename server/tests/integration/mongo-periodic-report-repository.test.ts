import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoPeriodicReportRepository } from "../../src/infra/db/mongo-periodic-report-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-periodic-test-${process.pid}`;

describe.skipIf(!uri)("Mongo periodic report repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const dueAt = new Date("2026-09-07T00:00:00Z");
  const officer = new Types.ObjectId();
  const submitter = new Types.ObjectId();
  const reporting = new Types.ObjectId();
  const silent = new Types.ObjectId();
  const dissolved = new Types.ObjectId();
  let reportId = "";

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.clubs!.insertMany([
      { _id: reporting, code: "CLB-A", name: "An Club", field: "Học thuật", state: "Active", createdAt: now },
      { _id: silent, code: "CLB-B", name: "Bình Club", field: "Học thuật", state: "Active", createdAt: now },
      { _id: dissolved, code: "CLB-C", name: "Cũ Club", field: "Học thuật", state: "Dissolved", createdAt: now }]);
    const event = await ucmsModels.events!.create({ organizerType: "CLUB", clubId: reporting, clubName: "An Club", title: "Workshop",
      startAt: new Date("2026-07-01T08:00:00Z"), endAt: new Date("2026-07-01T10:00:00Z"), semesterCode: "Summer 2026",
      audienceScope: "PUBLIC", capacity: 30, state: "Closed", currentRevisionNo: 1, createdAt: now });
    await ucmsModels.attendances!.create({ eventId: event._id, clubId: reporting, studentId: new Types.ObjectId(),
      checkedInAt: new Date("2026-07-01T08:05:00Z"), method: "self" });
    const report = await ucmsModels.periodicReports!.create({ clubId: reporting, periodCode: "Summer 2026", periodType: "SEMESTER",
      preloadedFigures: { events: { completed: 1, cancelled: 0 }, attendance: { total: 1 } }, narrative: "Kỳ hè hoạt động ổn định",
      nextPlan: "Tổ chức 3 workshop", state: "Submitted", versionNo: 1, lateFlag: false, submittedBy: submitter,
      submittedAt: new Date("2026-09-05T00:00:00Z"), dueAt });
    reportId = String(report._id);
    await ucmsModels.approvalTasks!.create({ entityType: "PERIODIC_REPORT", entityId: report._id, clubId: reporting,
      title: "Báo cáo Summer 2026", state: "Open", openedAt: now });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("lists every owing club, with the silent one overdue, and shows live figures next to the report", async () => {
    const repo = mongoPeriodicReportRepository();
    const rows = await repo.overview("Summer 2026", dueAt, now);
    expect(rows.map((row) => row.clubName)).toEqual(["An Club", "Bình Club"]);
    expect(rows[0]).toMatchObject({ reportId, state: "Submitted", overdue: false });
    expect(rows[1]).toMatchObject({ overdue: true });
    expect(await repo.find(reportId)).toMatchObject({ live: { events: { completed: 1 }, attendance: { total: 1 } },
      preloadedFigures: { events: { completed: 1 } } });
  });

  it("returns with structured comments, then accepts the resubmission with an observation", async () => {
    const repo = mongoPeriodicReportRepository();
    const returned = await repo.decide(reportId, String(officer), { outcome: "Return", reason: "Thiếu số liệu tài chính",
      sections: ["figures"] }, now);
    expect(returned).toMatchObject({ state: "Returned for correction",
      decision: { outcome: "Return", reason: "Thiếu số liệu tài chính", sections: ["figures"] } });
    await expect(repo.decide(reportId, String(officer), { outcome: "Accept" }, now)).rejects.toMatchObject({ kind: "conflict" });
    expect(await ucmsModels.notifications!.countDocuments({ entityId: new Types.ObjectId(reportId), recipientUserId: submitter })).toBe(1);

    await ucmsModels.periodicReports!.updateOne({ _id: reportId }, { $set: { state: "Submitted", versionNo: 2 } });
    const accepted = await repo.decide(reportId, String(officer), { outcome: "Accept", observation: "Nộp lại đúng hạn sửa" }, now);
    expect(accepted).toMatchObject({ state: "Accepted", versionNo: 2, decision: { outcome: "Accept", observation: "Nộp lại đúng hạn sửa" } });
  });

  it("records a missing report once, as an OVERDUE_REPORT case (E1)", async () => {
    const repo = mongoPeriodicReportRepository();
    await expect(repo.recordMissing(String(reporting), "Summer 2026", dueAt, String(officer), { severity: "MINOR" }, now))
      .rejects.toMatchObject({ kind: "conflict" });
    const { violationId } = await repo.recordMissing(String(silent), "Summer 2026", dueAt, String(officer),
      { severity: "MINOR", note: "Đã nhắc qua email" }, now);
    expect(await ucmsModels.violations!.findById(violationId).lean()).toMatchObject({ originType: "OVERDUE_REPORT", clubId: silent });
    expect((await repo.overview("Summer 2026", dueAt, now)).find((row) => row.clubId === String(silent))?.violationId).toBe(violationId);
    await expect(repo.recordMissing(String(silent), "Summer 2026", dueAt, String(officer), { severity: "MINOR" }, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });
});
