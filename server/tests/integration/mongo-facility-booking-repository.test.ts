import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import type { BookingInput } from "../../src/domain/facility-booking.js";
import { mongoFacilityBookingRepository } from "../../src/infra/db/mongo-facility-booking-repository.js";
import { mongoPropertyRepository } from "../../src/infra/db/mongo-property-repository.js";
import { mongoClubLifecycleRepository } from "../../src/infra/db/mongo-club-lifecycle-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const now = new Date("2026-10-10T01:00:00Z");
const actor = new Types.ObjectId().toString();
const officer = new Types.ObjectId().toString();
const repo = mongoFacilityBookingRepository();
async function fixture(): Promise<{ clubId: string; input: BookingInput }> {
  const clubId = new Types.ObjectId();
  await m.clubs!.create({ _id: clubId, code: String(clubId), name: "Club A", field: "Technology", state: "Active", createdAt: now });
  const property = await mongoPropertyRepository().create({ name: "Room A", type: "ROOM", location: "Alpha", capacity: 20,
    equipment: ["Projector"], blackouts: [], bookableHours: [{ day: 1, open: "07:00", close: "21:00" }] }, officer, now);
  return { clubId: String(clubId), input: { propertyId: property.id, purpose: "Meeting", startAt: new Date("2026-10-12T00:30:00Z"),
    endAt: new Date("2026-10-12T02:50:00Z"), headcount: 30, equipment: ["Projector"] } };
}
async function submitted(clubId: string, input: BookingInput) {
  const draft = await repo.create(clubId, input, actor, now);
  return repo.submit(draft.booking.id, clubId, 0, actor, now);
}
describe.skipIf(!uri)("Mongo facility booking repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-facility-booking-test-${process.pid}` });
    await ensureUcmsDatabase();
    const role = await m.roles!.create({ code: "ICPDP_OFFICER", name: "Officer", scope: "system", isSystem: true, permissionCodes: [] });
    await m.userRoleAssignments!.create({ userId: new Types.ObjectId(officer), roleId: role._id, grantedAt: now, grantedBy: new Types.ObjectId(officer) });
    await m.policyVersions!.create({ minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS, reportDeadlines: [],
      conflictThresholdMinutes: 30, feedbackWindowHours: 24, feedbackMinRespondents: 5, allowOverbooking: false,
      enforceOverdueReportBlock: true, academicCalendar: [{ code: "FA26", startAt: new Date("2026-09-01"), endAt: new Date("2026-12-31") }],
      effectiveFrom: new Date("2026-01-01"), createdBy: new Types.ObjectId(officer), createdAt: now });
  }, 30000);
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    for (const name of ["propertyBookings", "approvalTasks", "approvalDecisions", "auditLogs", "notifications", "properties", "clubs"]) {
      await m[name]!.deleteMany({});
    }
  });
  it("keeps submitted versions immutable and creates a new review task after correction", async () => {
    const { clubId, input } = await fixture();
    const first = await submitted(clubId, input); const id = first.booking.id;
    expect(first).toMatchObject({ booking: { state: "Requested", currentVersionNo: 1, equipment: ["Projector"] }, versions: [{ versionNo: 1 }] });
    expect((await repo.list(clubId))[0]?.equipment).toEqual(["Projector"]);
    await repo.claim(id, officer, now);
    await repo.decide(id, officer, { outcome: "Request revision", reason: "Adjust headcount",
      alternative: { propertyId: input.propertyId, startAt: input.startAt, endAt: input.endAt } }, now);
    await repo.save(id, clubId, { ...input, purpose: "Updated meeting", headcount: 10, equipment: [] }, 1, actor, now);
    const second = await repo.submit(id, clubId, 1, actor, now);
    expect(second.versions).toHaveLength(2);
    expect(second.versions[0]?.payload).toMatchObject({ purpose: "Meeting", headcount: 30, equipment: ["Projector"] });
    expect(second.versions[1]?.payload).toMatchObject({ purpose: "Updated meeting", headcount: 10, equipment: [] });
    expect(second.task?.id).not.toBe(first.task?.id);
    expect(second.decisions[0]?.alternative?.propertyId).toBe(input.propertyId);
    await expect(repo.submit(id, clubId, 1, actor, now)).rejects.toMatchObject({ kind: "conflict" });
    expect(await m.notifications!.countDocuments({ entityId: new Types.ObjectId(id) })).toBe(3);
  });
  it("claims exclusively and records only one decision per task", async () => {
    const { clubId, input } = await fixture(); const request = await submitted(clubId, input); const id = request.booking.id;
    const results = await Promise.allSettled([repo.claim(id, officer, now), repo.claim(id, actor, now)]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    const owner = (await repo.find(id, now))!.task!.assigneeId!;
    const decisions = await Promise.allSettled([repo.decide(id, owner, { outcome: "Approve", reason: "Allowed" }, now),
      repo.decide(id, owner, { outcome: "Reject", reason: "Not allowed" }, now)]);
    expect(decisions.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect((await repo.find(id, now))!.decisions).toHaveLength(1);
  });
  it("allows adjacent slots but blocks the same slot and checks legacy events with a buffer", async () => {
    const { clubId, input } = await fixture();
    const a = await submitted(clubId, input);
    await repo.claim(a.booking.id, officer, now);
    await repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now);
    const adjacent = { ...input, startAt: new Date("2026-10-12T10:00:00+07:00"),
      endAt: new Date("2026-10-12T12:20:00+07:00") };
    expect(await repo.conflicts(adjacent, 30)).toHaveLength(0);
    const b = await submitted(clubId, adjacent);
    await repo.claim(b.booking.id, officer, now);
    expect((await repo.decide(b.booking.id, officer, { outcome: "Approve", reason: "Next slot" }, now)).booking.state).toBe("Approved");
    expect(await repo.conflicts(input, 30)).toHaveLength(1);
    await m.events!.create({ organizerType: "CLUB", clubId: new Types.ObjectId(clubId), clubName: "Club A",
      title: "Legacy event", startAt: new Date("2026-10-12T12:30:00+07:00"), endAt: new Date("2026-10-12T14:00:00+07:00"),
      semesterCode: "FA26", propertyId: new Types.ObjectId(input.propertyId), audienceScope: "PUBLIC", capacity: 20,
      state: "Approved", createdAt: now });
    expect((await repo.conflicts(adjacent, 30)).filter((item) => item.source === "event")).toHaveLength(1);
  });
  it("rechecks notice at submission while allowing officers to approve after the notice deadline", async () => {
    const { clubId, input } = await fixture();
    const interval = { ...input, startAt: new Date("2026-10-12T12:50:00+07:00"),
      endAt: new Date("2026-10-12T15:10:00+07:00") };
    const cutoff = new Date("2026-10-12T09:50:00+07:00");
    const draft = await repo.create(clubId, interval, actor, now);
    await expect(repo.submit(draft.booking.id, clubId, 0, actor, cutoff)).rejects.toThrow("deadline");
    expect((await repo.find(draft.booking.id, now))!.versions).toHaveLength(0);
    await repo.submit(draft.booking.id, clubId, 0, actor, new Date(cutoff.getTime() - 1));
    await repo.claim(draft.booking.id, officer, cutoff);
    expect((await repo.decide(draft.booking.id, officer, { outcome: "Approve", reason: "Timely request" }, cutoff)).booking.state).toBe("Approved");
  });
  it("serializes concurrent approvals for one property across different clubs", async () => {
    const first = await fixture(); const second = await fixture();
    const a = await submitted(first.clubId, first.input);
    const b = await submitted(second.clubId, first.input);
    await repo.claim(a.booking.id, officer, now); await repo.claim(b.booking.id, actor, now);
    const results = await Promise.all([repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now),
      repo.decide(b.booking.id, actor, { outcome: "Approve", reason: "Allowed" }, now)]);
    expect(results.map((item) => item.booking.state).sort()).toEqual(["Approved", "Revision Requested"]);
    expect(results.find((item) => item.booking.state === "Revision Requested")?.decisions[0]?.outcome).toBe("Request revision");
    const draft = await repo.create(first.clubId, first.input, actor, now);
    await expect(repo.submit(draft.booking.id, first.clubId, 0, actor, now)).rejects.toMatchObject({ kind: "conflict" });
    expect((await repo.find(draft.booking.id, now))!.versions).toHaveLength(0);
  });
  it("rechecks active property/club and allows overbooking only when policy enables it", async () => {
    const { clubId, input } = await fixture(); const a = await submitted(clubId, input);
    await repo.claim(a.booking.id, officer, now);
    await m.clubs!.updateOne({ _id: new Types.ObjectId(clubId) }, { $set: { state: "Suspended" } });
    await expect(repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now)).rejects.toMatchObject({ kind: "conflict" });
    expect((await repo.find(a.booking.id, now))!.decisions).toHaveLength(0);
    await m.clubs!.updateOne({ _id: new Types.ObjectId(clubId) }, { $set: { state: "Active" } });
    await mongoPropertyRepository().setActive(input.propertyId, false, officer, now);
    await expect(repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now)).rejects.toMatchObject({ kind: "conflict" });
    await mongoPropertyRepository().setActive(input.propertyId, true, officer, now);
    await repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now);
    await m.policyVersions!.updateMany({}, { $set: { allowOverbooking: true } });
    const b = await submitted(clubId, input); await repo.claim(b.booking.id, officer, now);
    expect((await repo.decide(b.booking.id, officer, { outcome: "Approve", reason: "Exception allowed" }, now)).booking.state).toBe("Approved");
    await m.policyVersions!.updateMany({}, { $set: { allowOverbooking: false } });
  });
  it("cancels with late signals and releases slots and review tasks", async () => {
    const { clubId, input } = await fixture(); const request = await submitted(clubId, input);
    const cancelAt = new Date(input.startAt.getTime() - 3600000);
    const cancelled = await repo.cancel(request.booking.id, clubId, "No longer needed", actor, cancelAt);
    expect(cancelled).toMatchObject({ booking: { state: "Cancelled", isLateCancellation: true }, task: { state: "Closed" } });
    const a = await submitted(clubId, input); await repo.claim(a.booking.id, officer, now);
    await repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now);
    expect(await repo.conflicts(input, 30)).toHaveLength(1);
    await repo.cancel(a.booking.id, clubId, "No longer needed", actor, now);
    expect(await repo.conflicts(input, 30)).toHaveLength(0);
    await expect(repo.cancel(a.booking.id, clubId, "Again", actor, now)).rejects.toMatchObject({ kind: "conflict" });
  });
  it("advances time idempotently and reserves In Use release for club cascades", async () => {
    const { clubId, input } = await fixture(); const a = await submitted(clubId, input); await repo.claim(a.booking.id, officer, now);
    await repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now);
    expect(await repo.advanceLifecycle(input.startAt)).toMatchObject({ started: 1 });
    expect(await repo.advanceLifecycle(input.startAt)).toEqual({ started: 0, completed: 0 });
    await expect(repo.cancel(a.booking.id, clubId, "Unused", actor, input.startAt)).rejects.toMatchObject({ kind: "conflict" });
    expect(await repo.release({ clubId, source: "event", reason: "Event cancelled", now: input.startAt })).toBe(0);
    expect(await repo.release({ clubId, source: "club", reason: "Suspension", now: input.startAt })).toBe(1);
    expect((await repo.find(a.booking.id, now))!.booking).toMatchObject({ state: "Released", isLateCancellation: false });
    const b = await submitted(clubId, input); await repo.claim(b.booking.id, officer, now);
    await repo.decide(b.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now);
    expect((await repo.advanceLifecycle(input.endAt)).completed).toBe(1);
    await expect(repo.cancel(b.booking.id, clubId, "Unused", actor, input.endAt)).rejects.toMatchObject({ kind: "conflict" });
  });
  it("surfaces blackout conflicts only for pending requests and preserves approved decisions", async () => {
    const { clubId, input } = await fixture(); const a = await submitted(clubId, input);
    const b = await submitted(clubId, input); await repo.claim(a.booking.id, officer, now);
    await repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now);
    const properties = mongoPropertyRepository(); const property = (await properties.find(input.propertyId))!;
    await properties.update(property.id, { ...property, blackouts: [{ startAt: input.startAt, endAt: input.endAt, reason: "Maintenance" }] }, officer, now);
    expect((await repo.blackoutConflicts(property.id)).map((item) => item.id)).toEqual([b.booking.id]);
    expect((await repo.find(a.booking.id, now))!.booking.state).toBe("Approved");
    await repo.claim(b.booking.id, officer, now);
    await expect(repo.decide(b.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now)).rejects.toThrow("blackout");
  });
  it("uses the shared release helper atomically in the existing suspension cascade", async () => {
    const { clubId, input } = await fixture(); const a = await submitted(clubId, input);
    await repo.claim(a.booking.id, officer, now);
    await repo.decide(a.booking.id, officer, { outcome: "Approve", reason: "Allowed" }, now);
    const result = await mongoClubLifecycleRepository().suspend(clubId, { reason: "Compliance review", until: null }, officer, now);
    expect(result.cancelledBookings).toBe(1);
    expect((await repo.find(a.booking.id, now))!.booking).toMatchObject({ state: "Cancelled", isLateCancellation: false });
    expect(await m.auditLogs!.countDocuments({ entityId: new Types.ObjectId(a.booking.id), action: "BOOKING_RELEASED" })).toBe(1);
    expect(await repo.conflicts(input, 30)).toHaveLength(0);
    expect(await m.notifications!.countDocuments({ entityId: new Types.ObjectId(a.booking.id), eventCode: "BOOKING_RELEASED" })).toBe(1);
  });
  it("lists only live events of this club, validates attachment scope and excludes its own event from conflicts", async () => {
    const { clubId, input } = await fixture();
    const other = await fixture();
    const eventId = new Types.ObjectId();
    const event = { organizerType: "CLUB", clubId: new Types.ObjectId(clubId), clubName: "Club A", title: "Club event",
      startAt: input.startAt, endAt: input.endAt, semesterCode: "FA26", propertyId: new Types.ObjectId(input.propertyId),
      audienceScope: "PUBLIC", capacity: 20, state: "Approved", createdAt: now };
    await m.events!.create({ ...event, _id: eventId });
    await m.events!.create({ ...event, title: "Cancelled event", state: "Cancelled" });
    await m.events!.create({ ...event, clubId: new Types.ObjectId(other.clubId), title: "Other club event", state: "Draft" });
    expect(await repo.events(clubId)).toEqual([{ id: String(eventId), title: "Club event", startAt: input.startAt }]);
    expect(await repo.eventBelongsToClub(String(eventId), other.clubId)).toBe(false);
    await expect(repo.create(other.clubId, { ...input, eventId: String(eventId) }, actor, now)).rejects.toMatchObject({ kind: "validation" });
    expect(await repo.conflicts(input, 30)).toHaveLength(1);
    const linked = { ...input, eventId: String(eventId) };
    expect(await repo.conflicts(linked, 30)).toHaveLength(0);
    const booking = await submitted(clubId, linked);
    expect(booking.booking.eventId).toBe(String(eventId));
  });
});
