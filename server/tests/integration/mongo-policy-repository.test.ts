import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoAuthRepository } from "../../src/infra/db/mongo-auth-repository.js";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
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

  it("selects the historical version and ignores future versions; login domains come from config", async () => {
    const officer = new Types.ObjectId();
    const base = {
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
    // Written before form requirements existed (raw insert skips today's schema): reads as the defaults.
    await ucmsModels.policyVersions!.collection.insertOne({ ...base, minFoundingMembers: 3, effectiveFrom: jan,
      createdAt: new Date("2025-12-01T00:00:00Z") });
    await ucmsModels.policyVersions!.create([
      { ...base, minFoundingMembers: 4, formRequirements: DEFAULT_FORM_REQUIREMENTS, effectiveFrom: jun,
        createdAt: new Date("2026-05-01T00:00:00Z") },
      { ...base, minFoundingMembers: 5, effectiveFrom: jun, createdAt: new Date("2026-05-02T00:00:00Z"),
        formRequirements: { ...DEFAULT_FORM_REQUIREMENTS,
          clubFounding: { ...DEFAULT_FORM_REQUIREMENTS.clubFounding, logo: false } } },
      { ...base, minFoundingMembers: 9, formRequirements: DEFAULT_FORM_REQUIREMENTS, effectiveFrom: dec,
        createdAt: new Date("2026-11-01T00:00:00Z") },
    ]);

    const policies = mongoPolicyRepository();
    expect(await policies.findEffective(new Date("2025-12-31T23:59:59Z"))).toBeNull();
    const legacy = await policies.findEffective(new Date("2026-03-01T00:00:00Z"));
    expect(legacy).toMatchObject({ minFoundingMembers: 3, formRequirements: DEFAULT_FORM_REQUIREMENTS });
    const latest = await policies.findEffective(new Date("2026-07-01T00:00:00Z"));
    expect(latest).toMatchObject({ minFoundingMembers: 5 });
    expect(latest?.formRequirements.clubFounding.logo).toBe(false);
    expect((await policies.findEffective(dec))?.minFoundingMembers).toBe(9);
    expect(await mongoAuthRepository(" FPT.edu.vn, demo.edu.vn ").allowedDomains(dec))
      .toEqual(["fpt.edu.vn", "demo.edu.vn"]);
    expect(await mongoAuthRepository("*").allowedDomains(dec)).toEqual(["*"]);
  });

  it("appends a policy and audit without changing the previous version", async () => {
    const repo = mongoPolicyRepository();
    const firstDate = new Date("2030-01-01T00:00:00Z");
    await ucmsModels.policyVersions!.create({
      minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS,
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
      minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS,
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
