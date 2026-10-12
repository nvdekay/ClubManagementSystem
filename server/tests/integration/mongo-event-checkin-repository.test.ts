import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoEventCheckInRepository } from "../../src/infra/db/mongo-event-checkin-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-event-checkin-test-${process.pid}`;

describe.skipIf(!uri)("Mongo event check-in repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("creates exactly one attendance under concurrent check-ins and registers walk-ins", async () => {
    const now = new Date("2026-10-10T10:30:00Z");
    const clubId = new Types.ObjectId();
    const eventId = new Types.ObjectId();
    const [registered, walkIn] = [new Types.ObjectId(), new Types.ObjectId()];
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-CHECKIN", name: "Check-in Club",
      field: "Technology", state: "Active", createdAt: now });
    await ucmsModels.users!.insertMany([registered, walkIn].map((id, index) => ({ _id: id,
      email: `checkin-${index}@example.edu`, displayName: `Student ${index}`, accountState: "Active", createdAt: now })));
    await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId, clubName: "Check-in Club",
      title: "Demo Day", startAt: new Date("2026-10-10T10:00:00Z"), endAt: new Date("2026-10-10T12:00:00Z"),
      semesterCode: "FA26", audienceScope: "PUBLIC", capacity: 10, confirmedRegistrationCount: 1,
      nextWaitlistPosition: 1, waitlistEnabled: false, state: "Ongoing", checkInCode: "DEMO-42",
      allowWalkIn: true, currentRevisionNo: 1, publishedAt: now, attendanceFinalized: false, createdAt: now });
    await ucmsModels.eventRegistrations!.create({ eventId, studentId: registered, clubId, state: "Confirmed",
      answers: {}, createdAt: now });
    const repo = mongoEventCheckInRepository();

    const target = await repo.target(eventId.toString(), registered.toString());
    expect(target).toMatchObject({ registrationState: "Confirmed", attendance: null,
      event: { checkInCode: "DEMO-42", allowWalkIn: true, published: true } });

    const results = await Promise.all(Array.from({ length: 5 }, () =>
      repo.checkIn({ eventId: eventId.toString(), studentId: registered.toString(), method: "self", now })));
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(new Set(results.map((result) => result.attendance.id)).size).toBe(1);
    expect(await ucmsModels.attendances!.countDocuments({ eventId, studentId: registered })).toBe(1);

    const walked = await repo.checkIn({ eventId: eventId.toString(), studentId: walkIn.toString(),
      method: "walk-in", now });
    expect(walked).toMatchObject({ created: true, attendance: { method: "walk-in", abnormalFlags: ["walk-in"] } });
    const registration = await ucmsModels.eventRegistrations!.findOne({ eventId, studentId: walkIn }).lean();
    expect(registration?.state).toBe("Confirmed");
    const attendance = await ucmsModels.attendances!.findOne({ eventId, studentId: walkIn }).lean();
    expect(String(attendance?.registrationId)).toBe(String(registration?._id));
    expect((await ucmsModels.events!.findById(eventId).lean())?.confirmedRegistrationCount).toBe(2);

    expect(await ucmsModels.auditLogs!.countDocuments({ entityType: "Attendance" })).toBe(2);
    expect(await ucmsModels.notifications!.countDocuments({ eventCode: "EVENT_CHECKED_IN" })).toBe(2);
    expect((await repo.listMine(registered.toString())).map((item) => item.eventTitle)).toEqual(["Demo Day"]);

    await expect(repo.checkIn({ eventId: eventId.toString(), studentId: new Types.ObjectId().toString(),
      method: "self", now })).rejects.toMatchObject({ kind: "forbidden" });
  });
});
