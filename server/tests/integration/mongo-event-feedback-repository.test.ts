import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoEventFeedbackRepository } from "../../src/infra/db/mongo-event-feedback-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-event-feedback-test-${process.pid}`;

describe.skipIf(!uri)("Mongo event feedback repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("stores one immutable feedback per attendee and keeps anonymous identity out of the audit", async () => {
    const now = new Date("2026-10-10T11:00:00Z");
    const clubId = new Types.ObjectId();
    const eventId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    const attendanceId = new Types.ObjectId();
    await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId, clubName: "Feedback Club",
      title: "Demo Day", startAt: new Date("2026-10-10T10:00:00Z"), endAt: new Date("2026-10-10T12:00:00Z"),
      semesterCode: "FA26", audienceScope: "PUBLIC", capacity: 10, confirmedRegistrationCount: 1,
      nextWaitlistPosition: 1, waitlistEnabled: false, state: "Ongoing", allowWalkIn: false,
      currentRevisionNo: 1, publishedAt: now, attendanceFinalized: false, createdAt: now });
    await ucmsModels.attendances!.create({ _id: attendanceId, eventId, studentId, clubId,
      checkedInAt: new Date("2026-10-10T10:05:00Z"), method: "self", abnormalFlags: [], finalized: false });
    const repo = mongoEventFeedbackRepository();

    expect(await repo.target(eventId.toString(), studentId.toString())).toMatchObject({
      attendance: { id: attendanceId.toString() }, feedback: null });
    const input = { eventId: eventId.toString(), studentId: studentId.toString(), attendanceId: attendanceId.toString(),
      clubId: clubId.toString(), rating: 5, comment: "Loved it", isAnonymous: true, now };
    const results = await Promise.allSettled([repo.submit(input), repo.submit(input), repo.submit(input)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")
      .every((result) => (result as PromiseRejectedResult).reason?.kind === "conflict")).toBe(true);
    expect(await ucmsModels.eventFeedbacks!.countDocuments({ eventId })).toBe(1);

    const stored = await ucmsModels.eventFeedbacks!.findOne({ eventId }).lean();
    expect(stored).toMatchObject({ isAnonymous: true, comment: "Loved it",
      scores: [{ criterionCode: "overall", score: 5 }] });
    const audit = await ucmsModels.auditLogs!.findOne({ entityType: "EventFeedback" }).lean();
    expect(JSON.stringify(audit?.after)).not.toContain("Loved it");
    expect((await repo.target(eventId.toString(), studentId.toString()))?.feedback).toMatchObject({ rating: 5 });
    expect((await repo.listMine(studentId.toString())).map((item) => item.eventTitle)).toEqual(["Demo Day"]);
  });
});
