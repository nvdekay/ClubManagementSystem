import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoAuthRepository } from "../../src/infra/db/mongo-auth-repository.js";
import { mongoPolicyRepository } from "../../src/infra/db/mongo-policy-repository.js";
import { ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-policy-test-${process.pid}`;

describe.skipIf(!uri)("Mongo policy repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("selects the historical version and ignores future versions for policy and login", async () => {
    const officer = new Types.ObjectId();
    const base = {
      minFoundingMembers: 5, mandatoryApplicationDocuments: ["charter"],
      reportDeadlines: [{ reportType: "periodic", dueDaysAfterPeriodEnd: 10,
        remindBeforeDays: 3, overdueAfterDays: 2, escalateAfterDays: 5 }], conflictThresholdMinutes: 30,
      feedbackWindowHours: 48, feedbackMinRespondents: 5,
      allowOverbooking: false, enforceOverdueReportBlock: true,
      academicCalendar: [{ code: "FA26", startAt: new Date("2026-09-01"),
        endAt: new Date("2026-12-31") }], createdBy: officer,
    };
    const jan = new Date("2026-01-01T00:00:00Z");
    const jun = new Date("2026-06-01T00:00:00Z");
    const dec = new Date("2026-12-01T00:00:00Z");
    await ucmsModels.policyVersions!.create([
      { ...base, allowedEmailDomains: ["old.edu.vn"], effectiveFrom: jan,
        createdAt: new Date("2025-12-01T00:00:00Z") },
      { ...base, allowedEmailDomains: ["first.edu.vn"], effectiveFrom: jun,
        createdAt: new Date("2026-05-01T00:00:00Z") },
      { ...base, allowedEmailDomains: ["latest.edu.vn"], effectiveFrom: jun,
        createdAt: new Date("2026-05-02T00:00:00Z") },
      { ...base, allowedEmailDomains: ["future.edu.vn"], effectiveFrom: dec,
        createdAt: new Date("2026-11-01T00:00:00Z") },
    ]);

    const policies = mongoPolicyRepository();
    const auth = mongoAuthRepository("bootstrap.edu.vn");
    expect(await policies.findEffective(new Date("2025-12-31T23:59:59Z"))).toBeNull();
    expect(await auth.allowedDomains(new Date("2025-12-31T23:59:59Z")))
      .toEqual(["bootstrap.edu.vn"]);
    expect((await policies.findEffective(new Date("2026-03-01T00:00:00Z")))?.allowedEmailDomains)
      .toEqual(["old.edu.vn"]);
    expect(await auth.allowedDomains(new Date("2026-07-01T00:00:00Z")))
      .toEqual(["latest.edu.vn"]);
    expect((await policies.findEffective(dec))?.allowedEmailDomains)
      .toEqual(["future.edu.vn"]);
  });

  it("appends a policy and audit without changing the previous version", async () => {
    const repo = mongoPolicyRepository();
    const firstDate = new Date("2030-01-01T00:00:00Z");
    await ucmsModels.policyVersions!.create({
      allowedEmailDomains: ["original.edu.vn"], minFoundingMembers: 5,
      mandatoryApplicationDocuments: ["charter"],
      reportDeadlines: [{ reportType: "periodic", dueDaysAfterPeriodEnd: 10,
        remindBeforeDays: 3, overdueAfterDays: 2, escalateAfterDays: 5 }],
      conflictThresholdMinutes: 30, feedbackWindowHours: 48,
      feedbackMinRespondents: 5, allowOverbooking: false,
      enforceOverdueReportBlock: true,
      academicCalendar: [{ code: "SP30", startAt: new Date("2030-01-01"),
        endAt: new Date("2030-04-30") }],
      effectiveFrom: firstDate, createdAt: new Date("2029-12-01"),
      createdBy: new Types.ObjectId(),
    });
    const before = await repo.findEffective(firstDate);
    if (!before) throw new Error("expected fixture policy");
    const { id: _id, effectiveFrom: _effectiveFrom, createdBy: _createdBy,
      createdAt: _createdAt, ...settings } = before;
    const createdAt = new Date("2030-01-02T00:00:00Z");
    const created = await repo.append({
      settings: { ...settings, minFoundingMembers: 7 },
      effectiveFrom: new Date("2030-05-01T00:00:00Z"),
      createdBy: new Types.ObjectId().toString(), createdAt, reason: "new semester",
    });
    expect(created.minFoundingMembers).toBe(7);
    expect((await repo.findEffective(new Date("2030-02-15T00:00:00Z")))?.id).toBe(before.id);
    expect((await ucmsModels.policyVersions!.findById(before.id).lean())?.minFoundingMembers).toBe(5);
    expect(await ucmsModels.auditLogs!.findOne({ entityId: new Types.ObjectId(created.id),
      action: "POLICY_VERSION_CREATED" }).lean()).toMatchObject({
      reason: "new semester", before: { policyVersionId: before.id },
    });
  });

  it("lists issued decisions invalidated by a proposed calendar and overbooking policy", async () => {
    const clubId = new Types.ObjectId();
    const propertyId = new Types.ObjectId();
    const eventId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();
    const startAt = new Date("2041-09-10T08:00:00Z");
    const endAt = new Date("2041-09-10T10:00:00Z");
    await ucmsModels.clubs!.create({
      _id: clubId, code: "IMPACT", name: "Impact Club", field: "Academic", state: "Active",
      dissolution: { decidedAt: new Date("2040-01-01"), effectiveSemester: "SP42" },
      createdAt: new Date("2040-01-01"),
    });
    await ucmsModels.properties!.create({
      _id: propertyId, code: "ROOM-20", name: "Room 20", type: "Room",
      capacity: 20, bookableHours: {}, isActive: true,
    });
    await ucmsModels.events!.create({
      _id: eventId, clubId, clubName: "Impact Club", title: "Approved future event",
      startAt, endAt, semesterCode: "FA41", audienceScope: "PUBLIC", capacity: 30,
      state: "Approved", createdAt: new Date("2040-01-01"),
    });
    await ucmsModels.propertyBookings!.create({
      _id: bookingId, propertyId, clubId, clubName: "Impact Club", purpose: "Future event",
      startAt, endAt, semesterCode: "FA41", headcount: 30, state: "Approved",
      createdAt: new Date("2040-01-01"),
    });

    const impacts = await mongoPolicyRepository().findDecisionImpacts({
      allowedEmailDomains: ["fpt.edu.vn"], minFoundingMembers: 5,
      mandatoryApplicationDocuments: ["charter"],
      reportDeadlines: [{ reportType: "periodic", dueDaysAfterPeriodEnd: 10,
        remindBeforeDays: 3, overdueAfterDays: 2, escalateAfterDays: 5 }],
      conflictThresholdMinutes: 30, feedbackWindowHours: 48, feedbackMinRespondents: 5,
      allowOverbooking: false, enforceOverdueReportBlock: true,
      academicCalendar: [{ code: "SP41", startAt: new Date("2041-01-01"),
        endAt: new Date("2041-04-30") }],
    }, new Date("2041-01-01T00:00:00Z"));

    expect(impacts).toEqual(expect.arrayContaining([
      { entityType: "Event", entityId: eventId.toString(),
        reasons: ["EVENT_OUTSIDE_ACADEMIC_CALENDAR"] },
      { entityType: "PropertyBooking", entityId: bookingId.toString(), reasons: [
        "BOOKING_OUTSIDE_ACADEMIC_CALENDAR", "APPROVED_OVERBOOKING_DISALLOWED",
      ] },
      { entityType: "Club", entityId: clubId.toString(),
        reasons: ["DISSOLUTION_SEMESTER_REMOVED"] },
    ]));
  });
});
