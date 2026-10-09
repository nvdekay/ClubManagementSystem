import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoEventRegistrationRepository } from "../../src/infra/db/mongo-event-registration-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-event-registration-test-${process.pid}`;

describe.skipIf(!uri)("Mongo event registration repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("atomically protects capacity, allocates waitlist order, cancels and reuses a registration", async () => {
    const now = new Date("2026-10-09T10:00:00Z");
    const clubId = new Types.ObjectId();
    const eventId = new Types.ObjectId();
    const studentIds = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-EVENT-REG", name: "Event Club",
      field: "Technology", state: "Active", createdAt: now });
    await ucmsModels.users!.insertMany(studentIds.map((id, index) => ({ _id: id,
      email: `event-student-${index}@example.edu`, displayName: `Student ${index}`,
      accountState: "Active", createdAt: now })));
    await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId,
      clubName: "Event Club", title: "Capacity Lab", startAt: new Date("2026-10-10T10:00:00Z"),
      endAt: new Date("2026-10-10T12:00:00Z"), semesterCode: "FA26", audienceScope: "PUBLIC",
      capacity: 1, confirmedRegistrationCount: 0, nextWaitlistPosition: 1, waitlistEnabled: true,
      state: "Upcoming", registrationOpenAt: new Date("2026-10-01T00:00:00Z"),
      registrationCloseAt: new Date("2026-10-10T00:00:00Z"), allowWalkIn: false,
      currentRevisionNo: 1, publishedAt: now, attendanceFinalized: false, createdAt: now });
    await ucmsModels.eventProposalVersions!.create({ eventId, revisionNo: 1,
      payload: { registrationForm: [{ key: "dietary", label: "Dietary preference", type: "text",
        required: false }] }, submittedBy: studentIds[0], submittedAt: now });

    const repo = mongoEventRegistrationRepository();
    const results = await Promise.all(studentIds.map((studentId) => repo.register({
      eventId: eventId.toString(), studentId: studentId.toString(), answers: {},
      allowOverbooking: false, now,
    })));
    expect(results.filter((item) => item.state === "Confirmed")).toHaveLength(1);
    expect(results.filter((item) => item.state === "Waitlisted")
      .map((item) => item.waitlistPosition).sort()).toEqual([1, 2]);
    expect(await ucmsModels.events!.findById(eventId).lean()).toMatchObject({
      confirmedRegistrationCount: 1, nextWaitlistPosition: 3,
    });
    expect(await ucmsModels.eventRegistrations!.countDocuments({ eventId, state: "Confirmed" })).toBe(1);
    const confirmed = results.find((item) => item.state === "Confirmed")!;
    await expect(repo.register({ eventId: eventId.toString(), studentId: confirmed.studentId,
      answers: {}, allowOverbooking: false, now })).rejects.toMatchObject({ kind: "conflict" });

    const cancelled = await repo.cancel(confirmed.id, confirmed.studentId, now);
    expect(cancelled.state).toBe("Cancelled");
    expect(await ucmsModels.events!.findById(eventId).lean()).toMatchObject({ confirmedRegistrationCount: 0 });
    const reused = await repo.register({ eventId: eventId.toString(), studentId: confirmed.studentId,
      answers: { dietary: "None" }, allowOverbooking: false, now });
    expect(reused).toMatchObject({ id: confirmed.id, state: "Confirmed", answers: { dietary: "None" } });
    expect(await ucmsModels.eventRegistrations!.countDocuments({ eventId,
      studentId: new Types.ObjectId(confirmed.studentId) })).toBe(1);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityType: "EventRegistration" })).toBe(5);
    expect(await ucmsModels.notifications!.countDocuments({ entityType: "EventRegistration" })).toBe(5);
  }, 60_000);

  it("rejects a full event when waitlist is disabled", async () => {
    const now = new Date("2026-10-09T11:00:00Z");
    const clubId = new Types.ObjectId();
    const eventId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-NO-WAITLIST", name: "No Waitlist Club",
      field: "Community", state: "Active", createdAt: now });
    await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId,
      clubName: "No Waitlist Club", title: "Full Event", startAt: new Date("2026-10-11T10:00:00Z"),
      endAt: new Date("2026-10-11T12:00:00Z"), semesterCode: "FA26", audienceScope: "PUBLIC",
      capacity: 1, confirmedRegistrationCount: 1, nextWaitlistPosition: 1, waitlistEnabled: false,
      state: "Upcoming", registrationOpenAt: new Date("2026-10-01T00:00:00Z"),
      registrationCloseAt: new Date("2026-10-11T00:00:00Z"), allowWalkIn: false,
      currentRevisionNo: 1, publishedAt: now, attendanceFinalized: false, createdAt: now });

    await expect(mongoEventRegistrationRepository().register({ eventId: eventId.toString(),
      studentId: studentId.toString(), answers: {}, allowOverbooking: false, now }))
      .rejects.toMatchObject({ kind: "conflict", message: "event capacity has been reached" });
    expect(await ucmsModels.eventRegistrations!.countDocuments({ eventId })).toBe(0);
    expect(await ucmsModels.events!.findById(eventId).lean()).toMatchObject({ nextWaitlistPosition: 1 });
  }, 60_000);
});
