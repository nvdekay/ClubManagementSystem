import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoPostEventReportRepository } from "../../src/infra/db/mongo-post-event-report-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-post-event-test-${process.pid}`;
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!uri)("Mongo post-event report repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const officer = new Types.ObjectId();
  const submitter = new Types.ObjectId();
  const clubId = new Types.ObjectId();

  async function event(state: string, endAt: Date, { imported, ...extra }: Record<string, unknown> = {}) {
    const doc = await ucmsModels.events!.create({ organizerType: "CLUB", clubId, clubName: "HEBE", title: `Sự kiện ${state}`,
      startAt: new Date(endAt.getTime() - 3_600_000), endAt, semesterCode: "Fall 2026", audienceScope: "PUBLIC", capacity: 50,
      state, currentRevisionNo: 1, attendanceFinalized: true, createdAt: now, ...extra });
    if (!imported) {
      await ucmsModels.eventProposalVersions!.create({ eventId: doc._id, revisionNo: 1, submittedBy: submitter, submittedAt: now, payload: {} });
    }
    return doc._id as Types.ObjectId;
  }

  async function report(eventId: Types.ObjectId, checkedIn: number) {
    const doc = await ucmsModels.postEventReports!.create({ eventId, clubId, state: "Submitted", versionNo: 1, lateFlag: false,
      preloadedFigures: { attendance: { registered: 3, checkedIn } }, actualResult: "Đạt mục tiêu", submittedBy: submitter,
      submittedAt: now });
    await ucmsModels.approvalTasks!.create({ entityType: "POST_EVENT_REPORT", entityId: doc._id, clubId, title: "Báo cáo",
      state: "Open", openedAt: now });
    return String(doc._id);
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-HEBE", name: "HEBE", field: "Nghệ thuật", state: "Active", createdAt: now });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("accepts a consistent report and closes the event; returns a contradicting one", async () => {
    const repo = mongoPostEventReportRepository();
    const consistent = await event("Report Submitted", new Date(now.getTime() - 2 * DAY));
    await ucmsModels.attendances!.insertMany([0, 1].map(() => ({ eventId: consistent, clubId, studentId: new Types.ObjectId(),
      method: "self", checkedInAt: now })));
    const first = await report(consistent, 2);
    expect((await repo.queue(now, 7)).submitted.map((item) => item.id)).toContain(first);
    expect(await repo.find(first, now, 7)).toMatchObject({ live: { checkedIn: 2 }, attendanceMismatch: false });
    const accepted = await repo.decide(first, String(officer), { outcome: "Accept" }, now, 7);
    expect(accepted).toMatchObject({ state: "Accepted", event: { state: "Closed" }, decision: { outcome: "Accept" } });
    await expect(repo.decide(first, String(officer), { outcome: "Accept" }, now, 7)).rejects.toMatchObject({ kind: "conflict" });
    expect(await ucmsModels.approvalTasks!.countDocuments({ entityId: new Types.ObjectId(first), state: "Decided" })).toBe(1);

    const contradicting = await event("Report Submitted", new Date(now.getTime() - 2 * DAY));
    const second = await report(contradicting, 30);
    await expect(repo.decide(second, String(officer), { outcome: "Accept" }, now, 7)).rejects.toMatchObject({ kind: "conflict" });
    expect(await repo.decide(second, String(officer), { outcome: "Return", reason: "Số điểm danh không khớp" }, now, 7))
      .toMatchObject({ state: "Returned for correction", event: { state: "Completed" } });
    expect(await ucmsModels.notifications!.countDocuments({ entityId: new Types.ObjectId(second), recipientUserId: submitter })).toBe(1);
  });

  it("opens a REPORT_FINDING case when accepting with a finding", async () => {
    const repo = mongoPostEventReportRepository();
    const eventId = await event("Report Submitted", new Date(now.getTime() - DAY));
    const id = await report(eventId, 0);
    const decided = await repo.decide(id, String(officer), { outcome: "AcceptWithFinding", reason: "Tổ chức quá giờ",
      finding: { severity: "MINOR", title: "Kết thúc sau giờ cho phép" } }, now, 7);
    expect(decided).toMatchObject({ state: "Accepted", event: { state: "Closed" }, decision: { outcome: "AcceptWithFinding" } });
    const found = await ucmsModels.violations!.findById(decided.decision!.findingViolationId).lean();
    expect(found).toMatchObject({ originType: "REPORT_FINDING", state: "Open", severity: "MINOR" });
    expect(String(found!.originRefId)).toBe(String(eventId));
  });

  it("lists overdue events without a report and records them once (A1)", async () => {
    const repo = mongoPostEventReportRepository();
    const overdue = await event("Completed", new Date(now.getTime() - 10 * DAY));
    const recent = await event("Completed", new Date(now.getTime() - 2 * DAY));
    const internal = await event("Completed", new Date(now.getTime() - 10 * DAY), { audienceScope: "MEMBERS_ONLY" });
    const imported = await event("Completed", new Date(now.getTime() - 10 * DAY), { imported: true });
    const missing = (await repo.queue(now, 7)).missing.map((item) => item.eventId);
    expect(missing).not.toContain(String(imported));
    expect(missing).toContain(String(overdue));
    expect(missing).not.toContain(String(recent));
    expect(missing).not.toContain(String(internal));

    await expect(repo.recordMissing(String(recent), String(officer), { severity: "MINOR" }, now, 7)).rejects.toMatchObject({ kind: "conflict" });
    const { violationId } = await repo.recordMissing(String(overdue), String(officer), { severity: "MINOR", note: "Đã nhắc 2 lần" }, now, 7);
    expect(await ucmsModels.violations!.findById(violationId).lean()).toMatchObject({ originType: "OVERDUE_REPORT" });
    expect((await repo.queue(now, 7)).missing.find((item) => item.eventId === String(overdue))?.violationId).toBe(violationId);
    await expect(repo.recordMissing(String(overdue), String(officer), { severity: "MINOR" }, now, 7)).rejects.toMatchObject({ kind: "conflict" });
  });
});
