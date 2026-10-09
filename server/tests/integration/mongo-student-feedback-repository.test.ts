import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoStudentFeedbackRepository } from "../../src/infra/db/mongo-student-feedback-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-student-feedback-test-${process.pid}`;

describe.skipIf(!uri)("Mongo student feedback repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("routes feedback to the chosen recipient and never reveals anonymous senders", async () => {
    const now = new Date("2026-10-09T10:00:00Z");
    const [clubA, clubB, eventId, named, anonymous] = Array.from({ length: 5 }, () => new Types.ObjectId());
    await ucmsModels.clubs!.insertMany([
      { _id: clubA, code: "CLB-FB-A", name: "Club A", field: "Arts", state: "Active", createdAt: now },
      { _id: clubB, code: "CLB-FB-B", name: "Club B", field: "Arts", state: "Active", createdAt: now },
    ]);
    await ucmsModels.users!.insertMany([
      { _id: named, email: "named@example.edu", displayName: "Named Student", accountState: "Active", createdAt: now },
      { _id: anonymous, email: "secret@example.edu", displayName: "Secret Student", accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId: clubA, clubName: "Club A",
      title: "Gala", startAt: now, endAt: now, semesterCode: "FA26", audienceScope: "PUBLIC", capacity: 0,
      confirmedRegistrationCount: 0, nextWaitlistPosition: 1, waitlistEnabled: false, state: "Completed",
      allowWalkIn: false, currentRevisionNo: 1, attendanceFinalized: false, createdAt: now });
    const repo = mongoStudentFeedbackRepository();
    expect(await repo.eventBelongsToClub(eventId.toString(), clubA.toString())).toBe(true);
    expect(await repo.eventBelongsToClub(eventId.toString(), clubB.toString())).toBe(false);

    const sent = await repo.submit({ studentId: named.toString(), recipient: "CLUB", clubId: clubA.toString(),
      eventId: eventId.toString(), category: "praise", message: "Great gala", isAnonymous: false, now });
    expect(sent).toMatchObject({ clubName: "Club A", eventTitle: "Gala", category: "praise" });
    await repo.submit({ studentId: anonymous.toString(), recipient: "CLUB", clubId: clubA.toString(),
      category: "issue", message: "Too loud", isAnonymous: true, now });
    await repo.submit({ studentId: anonymous.toString(), recipient: "ICPDP", clubId: clubB.toString(),
      category: "issue", message: "For the school", isAnonymous: true, now });

    const clubInbox = await repo.inbox("CLUB", clubA.toString());
    expect(clubInbox.map((item) => item.message).sort()).toEqual(["Great gala", "Too loud"]);
    expect(clubInbox.find((item) => item.message === "Great gala")?.sender).toEqual({
      displayName: "Named Student", email: "named@example.edu" });
    expect(JSON.stringify(clubInbox)).not.toContain("Secret Student");
    expect(JSON.stringify(clubInbox)).not.toContain(anonymous.toString());
    expect(await repo.inbox("CLUB", clubB.toString())).toEqual([]);

    const icpdp = await repo.inbox("ICPDP");
    expect(icpdp.map((item) => item.message)).toEqual(["For the school"]);
    expect(icpdp[0]?.sender).toBeUndefined();
    expect((await repo.listMine(anonymous.toString())).map((item) => item.recipient).sort()).toEqual(["CLUB", "ICPDP"]);
    const stored = await ucmsModels.complaints!.findOne({ description: "Too loud" }).lean();
    expect(stored).toMatchObject({ state: "Submitted", isAnonymous: true, recipient: "CLUB" });
    expect(String(stored?.complainantId)).toBe(anonymous.toString());
    const audit = await ucmsModels.auditLogs!.findOne({ entityId: stored?._id }).lean();
    expect(JSON.stringify(audit)).not.toContain("Too loud");
  });
});
