import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AcademicSemester } from "../../src/domain/policy.js";
import { planRoomAllocation, type RoomAllocationInput } from "../../src/domain/room-allocation.js";
import { mongoClubLifecycleRepository } from "../../src/infra/db/mongo-club-lifecycle-repository.js";
import { mongoFacilityBookingRepository } from "../../src/infra/db/mongo-facility-booking-repository.js";
import { mongoPropertyRepository } from "../../src/infra/db/mongo-property-repository.js";
import { mongoRoomAllocationRepository } from "../../src/infra/db/mongo-room-allocation-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const now = new Date("2026-09-01T00:00:00+07:00");
const officer = new Types.ObjectId().toString();
const semester: AcademicSemester = { code: "FA26", startAt: new Date("2026-09-07T00:00:00+07:00"),
  endAt: new Date("2026-10-04T23:59:59+07:00") };
const repo = mongoRoomAllocationRepository();
const bookings = mongoFacilityBookingRepository();

async function clubFixture(name: string) {
  const clubId = new Types.ObjectId();
  await m.clubs!.create({ _id: clubId, code: String(clubId), name, field: "Technology", state: "Active", createdAt: now });
  const user = await m.users!.create({ email: `${clubId}@example.edu`, displayName: `${name} leader`, accountState: "Active", createdAt: now });
  const position = await m.clubPositions!.create({ clubId, code: "CLUB_LEADER", name: "Leader", isActive: true,
    isLeaderRole: true, isBoardSeat: true, isSingleHolder: true, permissionCodes: [] });
  const membership = await m.clubMemberships!.create({ clubId, userId: user._id, state: "Active", joinedAt: now, statusHistory: [] });
  await m.clubPositionAssignments!.create({ clubId, termId: new Types.ObjectId(), positionId: position._id,
    membershipId: membership._id, effectiveFrom: now, assignedBy: new Types.ObjectId(officer) });
  return { id: String(clubId), name, leaderId: String(user._id) };
}
async function roomFixture() {
  return mongoPropertyRepository().create({ name: "DE312", type: "ROOM", location: "Delta building", capacity: 40, equipment: [],
    blackouts: [], bookableHours: Array.from({ length: 7 }, (_, day) => ({ day: day + 1, open: "07:30", close: "17:40" })) }, officer, now);
}
async function allocate(input: RoomAllocationInput, clubName: string, at = now) {
  const property = await mongoPropertyRepository().find(input.propertyId);
  const club = await repo.club(input.clubId);
  return repo.allocate(planRoomAllocation(input, property, club, [semester], at), clubName, 30, officer, at);
}

describe.skipIf(!uri)("Mongo room allocation repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-room-allocation-test-${process.pid}` });
    await ensureUcmsDatabase();
    const role = await m.roles!.create({ code: "ICPDP_OFFICER", name: "Officer", scope: "system", isSystem: true, permissionCodes: [] });
    await m.userRoleAssignments!.create({ userId: new Types.ObjectId(officer), roleId: role._id, grantedAt: now, grantedBy: new Types.ObjectId(officer) });
    await m.users!.create({ _id: new Types.ObjectId(officer), email: "officer@example.edu", displayName: "Officer A", accountState: "Active", createdAt: now });
  }, 30000);
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    for (const name of ["propertyBookings", "approvalTasks", "auditLogs", "notifications", "properties", "clubs", "clubPositions",
      "clubPositionAssignments", "clubMemberships", "events"]) {
      await m[name]!.deleteMany({});
    }
    await m.users!.deleteMany({ _id: { $ne: new Types.ObjectId(officer) } });
  });

  it("generates one approved booking per week, records the allocation and notifies the club board", async () => {
    const club = await clubFixture("HEBE"); const room = await roomFixture();
    const result = await allocate({ semesterCode: "FA26", clubId: club.id, propertyId: room.id, weekday: 3, slot: 4, note: "Practice" }, club.name);
    expect(result).toMatchObject({ semesterCode: "FA26", clubId: club.id, clubName: "HEBE", propertyName: "DE312",
      location: "Delta building", weekday: 3, slot: 4, note: "Practice", allocatedBy: officer, allocatedByName: "Officer A" });
    expect(result.occurrences).toHaveLength(4);
    expect(result.occurrences.every((item) => item.state === "Approved")).toBe(true);
    expect(await m.propertyBookings!.countDocuments({ clubId: new Types.ObjectId(club.id), purpose: "ICPDP room allocation",
      state: "Approved", currentVersionNo: 0 })).toBe(4);
    expect(await m.approvalTasks!.countDocuments()).toBe(0);
    expect(await m.notifications!.countDocuments({ recipientUserId: new Types.ObjectId(club.leaderId), eventCode: "ROOM_ALLOCATED" })).toBe(1);
    expect(await repo.list({ clubId: club.id })).toHaveLength(1);
    expect(await repo.list({ semesterCode: "SU26" })).toEqual([]);
    expect(await bookings.list(club.id)).toEqual([]);
  });

  it("lists room sessions caught by a blackout added after the allocation (UC44 A2)", async () => {
    const club = await clubFixture("HEBE"); const room = await roomFixture();
    const result = await allocate({ semesterCode: "FA26", clubId: club.id, propertyId: room.id, weekday: 3, slot: 4 }, club.name);
    const second = result.occurrences[1]!;
    const property = (await mongoPropertyRepository().find(room.id))!;
    await mongoPropertyRepository().update(room.id, { ...property, blackouts: [{ startAt: new Date(second.startAt.getTime() - 3_600_000),
      endAt: new Date(second.endAt.getTime() + 3_600_000), reason: "Maintenance" }] }, officer, now);
    expect((await bookings.blackoutConflicts(room.id, now)).map((item) => [item.id, item.purpose, item.state]))
      .toEqual([[second.bookingId, "ICPDP room allocation", "Approved"]]);
  });

  it("lets only one club take a room slot when two officers allocate at once, and lists the clashing dates", async () => {
    const first = await clubFixture("HEBE"); const second = await clubFixture("FDS"); const room = await roomFixture();
    const input = { semesterCode: "FA26", propertyId: room.id, weekday: 3, slot: 4 };
    const results = await Promise.allSettled([allocate({ ...input, clubId: first.id }, first.name),
      allocate({ ...input, clubId: second.id }, second.name)]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((item) => item.status === "rejected");
    expect(rejected?.status === "rejected" && rejected.reason).toMatchObject({ kind: "conflict" });
    expect(rejected?.status === "rejected" && (rejected.reason as { details: unknown[] }).details).toHaveLength(4);
    expect(await m.propertyBookings!.countDocuments()).toBe(4);
    await allocate({ ...input, slot: 3, clubId: second.id }, second.name);
    expect(await m.propertyBookings!.countDocuments({ state: "Approved" })).toBe(8);
  });

  it("rejects the whole allocation when one date clashes with an approved event in the room", async () => {
    const club = await clubFixture("HEBE"); const room = await roomFixture();
    await m.events!.create({ organizerType: "CLUB", clubId: new Types.ObjectId(club.id), clubName: club.name, title: "Workshop",
      startAt: new Date("2026-09-23T15:00:00+07:00"), endAt: new Date("2026-09-23T17:00:00+07:00"), semesterCode: "FA26",
      propertyId: new Types.ObjectId(room.id), audienceScope: "PUBLIC", capacity: 20, state: "Upcoming", createdAt: now });
    await expect(allocate({ semesterCode: "FA26", clubId: club.id, propertyId: room.id, weekday: 3, slot: 4 }, club.name))
      .rejects.toMatchObject({ kind: "conflict", details: [{ source: "event", title: "Workshop" }] });
    expect(await m.propertyBookings!.countDocuments()).toBe(0);
    expect(await m.auditLogs!.countDocuments({ entityType: "RoomAllocation" })).toBe(0);
    // The grid shows the event before the officer tries (UC58 A3); allocation sessions are not listed here.
    expect(await repo.roomCommitments(room.id, semester.startAt, semester.endAt)).toEqual([{ source: "event", title: "Workshop",
      clubName: "HEBE", startAt: new Date("2026-09-23T15:00:00+07:00"), endAt: new Date("2026-09-23T17:00:00+07:00") }]);
  });

  it("revokes once: frees future dates, keeps used ones as history and lets the slot be allocated again", async () => {
    const club = await clubFixture("HEBE"); const other = await clubFixture("FDS"); const room = await roomFixture();
    const input = { semesterCode: "FA26", propertyId: room.id, weekday: 3, slot: 4 };
    const created = await allocate({ ...input, clubId: club.id }, club.name);
    const firstEnd = created.occurrences[0]!.endAt;
    expect(await bookings.advanceLifecycle(firstEnd)).toMatchObject({ completed: 1 });
    const revoked = await repo.revoke(created.id, "Club moved to another room", officer, firstEnd);
    expect(revoked).toMatchObject({ revokeReason: "Club moved to another room" });
    expect(revoked.occurrences.map((item) => item.state)).toEqual(["Completed", "Released", "Released", "Released"]);
    expect(await m.notifications!.countDocuments({ eventCode: "ROOM_ALLOCATION_REVOKED" })).toBe(1);
    await expect(repo.revoke(created.id, "Again", officer, firstEnd)).rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.revoke(new Types.ObjectId().toString(), "Missing", officer, firstEnd)).rejects.toMatchObject({ kind: "not_found" });
    const again = await allocate({ ...input, clubId: other.id }, other.name, firstEnd);
    expect(again.occurrences).toHaveLength(3);
  });

  it("releases future occurrences through the existing club suspension cascade", async () => {
    const club = await clubFixture("HEBE"); const room = await roomFixture();
    await allocate({ semesterCode: "FA26", clubId: club.id, propertyId: room.id, weekday: 1, slot: 1 }, club.name);
    const result = await mongoClubLifecycleRepository().suspend(club.id, { reason: "Compliance review", until: null }, officer, now);
    expect(result.cancelledBookings).toBe(4);
    expect(await m.propertyBookings!.countDocuments({ state: "Approved" })).toBe(0);
  });
});
