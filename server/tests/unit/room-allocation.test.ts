import { describe, expect, it, vi } from "vitest";
import type { ClubAccessSnapshot } from "../../src/domain/access.js";
import { DEFAULT_FORM_REQUIREMENTS, type PolicyVersion } from "../../src/domain/policy.js";
import type { Property } from "../../src/domain/property.js";
import { planRoomAllocation, roomOccupancy, validateRoomAllocationInput, weeklySlotDates,
  type RoomAllocation, type RoomAllocationRepository } from "../../src/domain/room-allocation.js";
import { roomAllocationBody, roomAllocationRevokeBody } from "../../src/interface/http/room-allocation-routes.js";
import { allocateRoom, clubRoomAllocations, listRoomAllocations, revokeRoomAllocation, roomAllocationOccupancy, roomAllocationOptions,
  type RoomAllocationDeps } from "../../src/usecase/room-allocation.js";

const ids = { club: "a".repeat(24), property: "b".repeat(24), user: "c".repeat(24), allocation: "d".repeat(24) };
const now = new Date("2026-09-01T00:00:00+07:00");
const semester = { code: "FA26", startAt: new Date("2026-09-07T00:00:00+07:00"), endAt: new Date("2026-11-01T23:59:59+07:00") };
const room: Property = { id: ids.property, code: "PH-001", type: "ROOM", name: "DE312", location: "Delta building",
  capacity: 40, equipment: [], isActive: true, blackouts: [],
  bookableHours: Array.from({ length: 7 }, (_, day) => ({ day: day + 1, open: "07:30", close: "17:40" })) };
const club = { id: ids.club, name: "HEBE", state: "Active" };
const input = { semesterCode: "FA26", clubId: ids.club, propertyId: ids.property, weekday: 3, slot: 4 };
const policy: PolicyVersion = { id: "e".repeat(24), minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS,
  reportDeadlines: [], conflictThresholdMinutes: 30, feedbackWindowHours: 24, feedbackMinRespondents: 5,
  allowOverbooking: false, enforceOverdueReportBlock: true,
  academicCalendar: [semester, { code: "SU26", startAt: new Date("2026-05-01"), endAt: new Date("2026-08-31") }],
  effectiveFrom: new Date("2026-01-01"), createdBy: ids.user, createdAt: now };
const actor = { id: ids.user, accountState: "Active" as const };
function local(date: Date) { return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16); }

function allocation(overrides: Partial<RoomAllocation> = {}): RoomAllocation {
  return { id: ids.allocation, semesterCode: "FA26", clubId: ids.club, clubName: "HEBE", propertyId: ids.property,
    propertyName: "DE312", location: "Delta building", weekday: 3, slot: 4, allocatedBy: ids.user, allocatedAt: now,
    occurrences: [
      { bookingId: "1".repeat(24), startAt: new Date("2026-09-09T15:20:00+07:00"), endAt: new Date("2026-09-09T17:40:00+07:00"), state: "Completed" },
      { bookingId: "2".repeat(24), startAt: new Date("2026-09-16T15:20:00+07:00"), endAt: new Date("2026-09-16T17:40:00+07:00"), state: "Approved" },
      { bookingId: "3".repeat(24), startAt: new Date("2026-09-23T15:20:00+07:00"), endAt: new Date("2026-09-23T17:40:00+07:00"), state: "Released" },
    ], ...overrides };
}
function deps(withBookingPermission = false): RoomAllocationDeps {
  const snapshot: ClubAccessSnapshot = { clubId: ids.club, clubName: "HEBE", clubState: "Active",
    membership: { id: "member", clubId: ids.club, state: "Active" }, isApprovedFounder: false,
    terms: [{ id: "term", clubId: ids.club, state: "Active", startAt: new Date("2026-01-01"), endAt: semester.endAt }],
    assignments: withBookingPermission ? [{ clubId: ids.club, termId: "term", positionId: "vice",
      membershipId: "member", effectiveFrom: now, confirmedBy: ids.user }] : [],
    positions: [{ id: "vice", clubId: ids.club, isActive: true, isLeaderRole: false, isBoardSeat: true }] };
  const repo: RoomAllocationRepository = { clubs: vi.fn(async () => [club]), club: vi.fn(async () => club),
    list: vi.fn(async () => [allocation()]), find: vi.fn(async () => allocation()),
    allocate: vi.fn(async () => allocation()), revoke: vi.fn(async () => allocation({ revokedAt: now })),
    roomCommitments: vi.fn(async () => []) };
  return { repo, access: { findSnapshot: vi.fn(async () => snapshot) }, auth: { systemRoleCodes: vi.fn(async () => ["ICPDP_OFFICER"]) },
    policy: { findEffective: vi.fn(async () => policy) },
    properties: { list: vi.fn(async () => [room, { ...room, id: "f".repeat(24), type: "HALL" as const }, { ...room, id: "9".repeat(24), isActive: false }]),
      find: vi.fn(async () => room), create: vi.fn(), update: vi.fn(), setActive: vi.fn(), remove: vi.fn(), hasBookings: vi.fn() } };
}

describe("room allocation rules", () => {
  it("expands one weekday and slot to every week of the semester in Vietnam time", () => {
    const dates = weeklySlotDates(semester, 3, 4, now);
    expect(dates.map((item) => local(item.startAt))).toEqual(["2026-09-09T15:20", "2026-09-16T15:20", "2026-09-23T15:20",
      "2026-09-30T15:20", "2026-10-07T15:20", "2026-10-14T15:20", "2026-10-21T15:20", "2026-10-28T15:20"]);
    expect(dates.every((item) => local(item.endAt).endsWith("17:40"))).toBe(true);
    expect(weeklySlotDates(semester, 1, 1, now)[0]!.startAt).toEqual(new Date("2026-09-07T07:30:00+07:00"));
    expect(weeklySlotDates(semester, 7, 2, now).map((item) => local(item.startAt).slice(0, 10)).at(-1)).toBe("2026-11-01");
  });
  it("generates only dates whose slot has not started when allocating mid-semester", () => {
    const midSlot = new Date("2026-09-16T15:20:00+07:00");
    expect(local(weeklySlotDates(semester, 3, 4, midSlot)[0]!.startAt)).toBe("2026-09-23T15:20");
    expect(local(weeklySlotDates(semester, 3, 4, new Date(midSlot.getTime() - 1))[0]!.startAt)).toBe("2026-09-16T15:20");
  });
  it("places approved events and bookings on the weekly grid cells they would block (UC58 A3)", () => {
    const event = { startAt: new Date("2026-09-16T14:00:00+07:00"), endAt: new Date("2026-09-16T16:00:00+07:00"),
      source: "event" as const, title: "Workshop", clubName: "FDS" };
    const booking = { startAt: new Date("2026-09-18T07:30:00+07:00"), endAt: new Date("2026-09-18T09:50:00+07:00"),
      source: "booking" as const, title: "Rehearsal" };
    // A free-form event spans slots 3 and 4 on Wednesday; an exact slot booking blocks only its own slot.
    expect(roomOccupancy([event, booking], 30)).toEqual([
      { weekday: 3, slot: 3, items: [event] }, { weekday: 3, slot: 4, items: [event] },
      { weekday: 5, slot: 1, items: [booking] }]);
  });

  it("reads the room's commitments from the rest of the semester only", async () => {
    const d = deps();
    await expect(roomAllocationOccupancy(d, actor, "FA26", ids.property, new Date("2026-09-10T00:00:00+07:00"))).resolves.toEqual([]);
    expect(d.repo.roomCommitments).toHaveBeenCalledWith(ids.property, new Date("2026-09-10T00:00:00+07:00"), semester.endAt);
    await expect(roomAllocationOccupancy(d, actor, "XX99", ids.property, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(roomAllocationOccupancy(d, actor, "SU26", ids.property, now)).resolves.toEqual([]);
  });

  it("skips blackout dates instead of rejecting the whole allocation", () => {
    const blackout = { startAt: new Date("2026-09-30T00:00:00+07:00"), endAt: new Date("2026-10-01T00:00:00+07:00"), reason: "Holiday" };
    const plan = planRoomAllocation(input, { ...room, blackouts: [blackout] }, club, policy.academicCalendar, now);
    expect(plan.dates).toHaveLength(7);
    expect(plan.skipped.map(local)).toEqual(["2026-09-30T15:20"]);
  });
  it("accepts only active rooms, eligible clubs, open semesters and bookable hours", () => {
    expect(() => planRoomAllocation(input, { ...room, type: "HALL" }, club, policy.academicCalendar, now)).toThrow("room not found");
    expect(() => planRoomAllocation(input, null, club, policy.academicCalendar, now)).toThrow("room not found");
    expect(() => planRoomAllocation(input, { ...room, isActive: false }, club, policy.academicCalendar, now)).toThrow("inactive");
    for (const state of ["Suspended", "Dissolved", "Pending Setup"]) {
      expect(() => planRoomAllocation(input, room, { ...club, state }, policy.academicCalendar, now)).toThrow("cannot receive");
    }
    expect(() => planRoomAllocation(input, room, null, policy.academicCalendar, now)).toThrow("club not found");
    expect(() => planRoomAllocation({ ...input, semesterCode: "XX" }, room, club, policy.academicCalendar, now)).toThrow("semester not found");
    expect(() => planRoomAllocation({ ...input, semesterCode: "SU26" }, room, club, policy.academicCalendar, now)).toThrow("ended");
    expect(() => planRoomAllocation(input, { ...room, bookableHours: [{ day: 3, open: "07:30", close: "15:10" }] }, club,
      policy.academicCalendar, now)).toThrow("bookable hours");
    expect(() => planRoomAllocation(input, room, club, policy.academicCalendar, semester.endAt)).toThrow("ended");
    expect(() => planRoomAllocation(input, room, club, policy.academicCalendar, new Date("2026-10-30T00:00:00+07:00")))
      .toThrow("no upcoming dates");
  });
  it("lets a dissolving club receive rooms only up to its dissolution semester (BR45)", () => {
    expect(planRoomAllocation(input, room, { ...club, state: "Dissolving", dissolutionSemester: "FA26" }, policy.academicCalendar, now).dates).toHaveLength(8);
    expect(() => planRoomAllocation(input, room, { ...club, state: "Dissolving", dissolutionSemester: "SU26" },
      policy.academicCalendar, now)).toThrow("dissolution");
  });
  it("validates identifiers, weekday, slot and note; route bodies are strict", () => {
    expect(validateRoomAllocationInput({ ...input, note: "  Weekly meeting " }).note).toBe("Weekly meeting");
    for (const change of [{ weekday: 0 }, { weekday: 8 }, { slot: 5 }, { clubId: "bad" }, { propertyId: "bad" },
      { semesterCode: " " }, { note: "x".repeat(501) }]) {
      expect(() => validateRoomAllocationInput({ ...input, ...change })).toThrow();
    }
    expect(roomAllocationBody.safeParse(input).success).toBe(true);
    expect(roomAllocationBody.safeParse({ ...input, startAt: "2026-09-09" }).success).toBe(false);
    expect(roomAllocationBody.safeParse({ ...input, clubId: { $ne: null } }).success).toBe(false);
    expect(roomAllocationRevokeBody.safeParse({ reason: " " }).success).toBe(false);
  });
});

describe("room allocation use cases", () => {
  it("restricts every ICPDP path to an active officer", async () => {
    const d = deps();
    await expect(listRoomAllocations(d, null)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(allocateRoom(d, { ...actor, accountState: "Locked" }, input, now)).rejects.toMatchObject({ kind: "locked" });
    vi.mocked(d.auth.systemRoleCodes).mockResolvedValue([]);
    await expect(roomAllocationOptions(d, actor, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(allocateRoom(d, actor, input, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(revokeRoomAllocation(d, actor, ids.allocation, "Changed", now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.repo.allocate).not.toHaveBeenCalled(); expect(d.repo.revoke).not.toHaveBeenCalled();
  });
  it("offers open semesters, eligible clubs and active rooms only", async () => {
    const options = await roomAllocationOptions(deps(), actor, now);
    expect(options.semesters.map((item) => item.code)).toEqual(["FA26"]);
    expect(options.rooms.map((item) => item.id)).toEqual([ids.property]);
    expect(options.clubs).toEqual([club]);
  });
  it("plans the allocation and hands the repository the dates, club name and conflict buffer", async () => {
    const d = deps();
    await allocateRoom(d, actor, { ...input, note: " Practice " }, now);
    const [plan, clubName, threshold, officerId] = vi.mocked(d.repo.allocate).mock.calls[0]!;
    expect(plan.input).toMatchObject({ ...input, note: "Practice" });
    expect(plan.dates).toHaveLength(8);
    expect([clubName, threshold, officerId]).toEqual(["HEBE", 30, ids.user]);
    vi.mocked(d.properties.find).mockResolvedValue({ ...room, type: "EQUIPMENT" });
    await expect(allocateRoom(d, actor, input, now)).rejects.toMatchObject({ kind: "not_found" });
  });
  it("requires a revoke reason", async () => {
    const d = deps();
    await expect(revokeRoomAllocation(d, actor, ids.allocation, " ", now)).rejects.toMatchObject({ kind: "validation" });
    await revokeRoomAllocation(d, actor, ids.allocation, " Club moved ", now);
    expect(d.repo.revoke).toHaveBeenCalledWith(ids.allocation, "Club moved", ids.user, now);
  });
  it("shows authorized facility managers only active allocations with their remaining usable dates", async () => {
    const d = deps(true);
    const at = new Date("2026-09-10T00:00:00+07:00");
    const result = await clubRoomAllocations(d, actor, ids.club, at);
    expect(result).toHaveLength(1);
    expect(result[0]!.occurrences.map((item) => item.bookingId)).toEqual(["2".repeat(24)]);
    vi.mocked(d.repo.list).mockResolvedValue([allocation({ revokedAt: at }), allocation({ id: "e".repeat(24),
      occurrences: [allocation().occurrences[0]!] })]);
    expect(await clubRoomAllocations(d, actor, ids.club, at)).toEqual([]);
    vi.mocked(d.access.findSnapshot).mockResolvedValue(null);
    await expect(clubRoomAllocations(d, actor, ids.club, at)).rejects.toMatchObject({ kind: "forbidden" });
  });
  it("rejects room reads without a current booking permission before fetching allocations", async () => {
    const d = deps();
    await expect(clubRoomAllocations(d, actor, ids.club, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.repo.list).not.toHaveBeenCalled();

    for (const expired of ["membership", "assignment", "term", "position"] as const) {
      const authorized = deps(true);
      const snapshot = (await authorized.access.findSnapshot(actor.id, ids.club))!;
      if (expired === "membership") snapshot.membership = { ...snapshot.membership!, state: "Inactive" };
      if (expired === "assignment") snapshot.assignments = snapshot.assignments.map((item) => ({ ...item, effectiveTo: now }));
      if (expired === "term") snapshot.terms = snapshot.terms.map((item) => ({ ...item, endAt: now }));
      if (expired === "position") snapshot.positions = snapshot.positions.map((item) => ({ ...item, isActive: false }));
      await expect(clubRoomAllocations(authorized, actor, ids.club, now)).rejects.toMatchObject({ kind: "forbidden" });
      expect(authorized.repo.list).not.toHaveBeenCalled();
    }
  });
  it("checks authentication, account state and permission in the requested club", async () => {
    const d = deps(true);
    const snapshot = (await d.access.findSnapshot(actor.id, ids.club))!;
    vi.mocked(d.access.findSnapshot).mockImplementation(async (_userId, clubId) => clubId === ids.club ? snapshot : null);
    await expect(clubRoomAllocations(d, null, ids.club, now)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(clubRoomAllocations(d, { ...actor, accountState: "Locked" }, ids.club, now)).rejects.toMatchObject({ kind: "locked" });
    await expect(clubRoomAllocations(d, actor, "f".repeat(24), now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.repo.list).not.toHaveBeenCalled();
  });
  it("allows only Club Leaders whose board seat ICPDP has confirmed", async () => {
    const d = deps(true);
    const snapshot = (await d.access.findSnapshot(actor.id, ids.club))!;
    snapshot.assignments = snapshot.assignments.map((item) => ({ ...item, confirmedBy: null }));
    await expect(clubRoomAllocations(d, actor, ids.club, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.repo.list).not.toHaveBeenCalled();

    snapshot.assignments = snapshot.assignments.map((item) => ({ ...item, confirmedBy: ids.user }));
    expect(await clubRoomAllocations(d, actor, ids.club, now)).toHaveLength(1);

    snapshot.positions = snapshot.positions.map((item) => ({ ...item, isBoardSeat: false, isLeaderRole: true }));
    expect(await clubRoomAllocations(d, actor, ids.club, now)).toHaveLength(1);
  });
  it("rechecks permission on every read after the board seat ends", async () => {
    const d = deps(true);
    expect(await clubRoomAllocations(d, actor, ids.club, now)).toHaveLength(1);
    vi.mocked(d.repo.list).mockClear();
    const snapshot = (await d.access.findSnapshot(actor.id, ids.club))!;
    snapshot.assignments = [];
    await expect(clubRoomAllocations(d, actor, ids.club, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.repo.list).not.toHaveBeenCalled();
  });
});
