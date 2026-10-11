import { describe, expect, it, vi } from "vitest";
import { BOOKING_SLOTS, assertBookingNotice, bookingDeadline, bookingIntervalsConflict, bookingSlot,
  assessBooking, isLateBookingCancellation, slotsConflict, validateBookingInput,
  type BookingDetail, type BookingInput, type FacilityBookingRepository } from "../../src/domain/facility-booking.js";
import type { Property } from "../../src/domain/property.js";
import { DEFAULT_FORM_REQUIREMENTS, type PolicyVersion } from "../../src/domain/policy.js";
import type { ClubAccessSnapshot } from "../../src/domain/access.js";
import { overbookRoom, bookingResponsible, reserveRoom, bookingAvailability, cancelBooking, claimBooking, decideBooking, getBooking, listBookingEvents, listBookingProperties,
  listBookings, releaseBookings, saveBooking, submitBooking, type BookingDeps } from "../../src/usecase/facility-booking.js";
import { roomOverbookingBody, roomReservationBody, bookingBody, bookingDecisionBody } from "../../src/interface/http/facility-booking-routes.js";

const ids = { club: "a".repeat(24), property: "b".repeat(24), user: "c".repeat(24), booking: "d".repeat(24) };
const now = new Date("2026-10-10T01:00:00Z");
const input: BookingInput = { propertyId: ids.property, purpose: "Club meeting", startAt: new Date("2026-10-12T00:30:00Z"),
  endAt: new Date("2026-10-12T02:50:00Z"), headcount: 30, equipment: ["Projector"] };
const property: Property = { id: ids.property, code: "PH-001", type: "ROOM", name: "Room A", location: "Alpha",
  capacity: 20, equipment: ["Projector"], isActive: true, blackouts: [], bookableHours: [{ day: 1, open: "07:00", close: "21:00" }] };
const club = { id: ids.club, name: "Club A", state: "Active" };
const policy: PolicyVersion = { id: "e".repeat(24), minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS,
  reportDeadlines: [], conflictThresholdMinutes: 30, feedbackWindowHours: 24, feedbackMinRespondents: 5,
  allowOverbooking: false, enforceOverdueReportBlock: true,
  academicCalendar: [{ code: "FA26", startAt: new Date("2026-09-01"), endAt: new Date("2026-12-31") }],
  effectiveFrom: new Date("2026-01-01"), createdBy: ids.user, createdAt: now };
const actor = { id: ids.user, accountState: "Active" as const };
function deps(): BookingDeps {
  const detail: BookingDetail = { booking: { ...input, id: ids.booking, clubId: ids.club, clubName: club.name,
    semesterCode: "FA26", state: "Draft", currentVersionNo: 0, isLateCancellation: false },
  property, club, task: null, check: null, versions: [], decisions: [], obligations: [] };
  const snapshot: ClubAccessSnapshot = { clubId: ids.club, clubName: club.name, clubState: "Active",
    membership: { id: "member", clubId: ids.club, state: "Active" }, terms: [], assignments: [], isApprovedFounder: false,
    positions: [{ id: "members", clubId: ids.club, isActive: true, isLeaderRole: false,
      isDefaultMemberRole: true, permissionCodes: ["club.booking.manage"] }] };
  const repo: FacilityBookingRepository = { responsibleLeader: vi.fn(async () => ({ id: ids.user, displayName: "Leader A", email: "leader@example.com" })), reserve: vi.fn(async () => ({ ...detail, booking: { ...detail.booking, state: "Approved" as const } })), events: vi.fn(async () => []), list: vi.fn(async () => [detail.booking]), find: vi.fn(async () => detail),
    club: vi.fn(async () => club), eventBelongsToClub: vi.fn(async () => true), conflicts: vi.fn(async () => []),
    create: vi.fn(async () => detail), save: vi.fn(async () => detail), submit: vi.fn(async () => detail),
    claim: vi.fn(async () => detail), decide: vi.fn(async () => detail), cancel: vi.fn(async () => detail),
    release: vi.fn(async () => 1), advanceLifecycle: vi.fn(async () => ({ started: 0, completed: 0 })),
    blackoutConflicts: vi.fn(async () => []) };
  return { repo, access: { findSnapshot: vi.fn(async () => snapshot) }, auth: { systemRoleCodes: vi.fn(async () => ["ICPDP_OFFICER"]) },
    policy: { findEffective: vi.fn(async () => policy) }, properties: { list: vi.fn(async () => [property]),
      find: vi.fn(async () => property), create: vi.fn(), update: vi.fn(), setActive: vi.fn(), remove: vi.fn(), hasBookings: vi.fn() } };
}
describe("facility booking rules", () => {
  it("uses Vietnam hours, fits a semester and treats capacity as a warning", () => {
    expect(assessBooking(input, property, club, policy, [], now)).toMatchObject({ capacityWarning: true,
      semesterCode: "FA26", conflictResult: "Warning" });
    const conflicts = [{ id: "other", startAt: input.startAt, endAt: input.endAt, source: "booking" as const }];
    expect(assessBooking(input, property, club, policy, conflicts, now).conflictResult).toBe("Blocking Conflict");
    expect(assessBooking(input, property, club, { ...policy, allowOverbooking: true }, conflicts, now).conflictResult).toBe("Warning");
  });
  it("allows exactly the buffer, rejects overlapping and shorter adjacent gaps", () => {
    expect(slotsConflict(input.startAt, input.endAt, new Date("2026-10-12T03:20:00Z"), new Date("2026-10-12T05:00:00Z"), 30)).toBe(false);
    expect(slotsConflict(input.startAt, input.endAt, new Date("2026-10-12T03:19:59Z"), new Date("2026-10-12T05:00:00Z"), 30)).toBe(true);
    expect(slotsConflict(input.startAt, input.endAt, input.endAt, new Date("2026-10-12T05:00:00Z"), 0)).toBe(false);
    expect(slotsConflict(input.startAt, input.endAt, input.startAt, input.endAt, 0)).toBe(true);
  });
  it("rejects inactive clubs/properties, blackouts, unavailable equipment, hours and calendar", () => {
    for (const state of ["Suspended", "Dissolved", "Pending Setup"]) {
      expect(() => assessBooking(input, property, { ...club, state }, policy, [], now)).toThrow("club cannot request");
    }
    expect(() => assessBooking(input, { ...property, isActive: false }, club, policy, [], now)).toThrow("inactive");
    expect(() => assessBooking(input, { ...property, blackouts: [{ startAt: input.startAt, endAt: input.endAt, reason: "Maintenance" }] }, club, policy, [], now)).toThrow("blackout");
    expect(() => assessBooking({ ...input, equipment: ["Unknown"] }, property, club, policy, [], now)).toThrow("equipment");
    expect(() => assessBooking(input, { ...property, bookableHours: [] }, club, policy, [], now)).toThrow("hours");
    expect(() => assessBooking({ ...input, startAt: new Date("2026-10-12T00:00:00Z"), endAt: new Date("2026-10-12T14:00:01Z") }, property, club, policy, [], now)).toThrow("slot");
    expect(() => assessBooking({ ...input, endAt: new Date("2026-10-13T00:00:00Z") }, property, club, policy, [], now)).toThrow("slot");
    expect(() => assessBooking(input, property, club, { ...policy, academicCalendar: [] }, [], now)).toThrow("semester");
    expect(() => assessBooking(input, property, club, policy, [], input.startAt)).toThrow("future");
  });
  it("allows Dissolving only until its dissolution semester ends (BR45)", () => {
    const dissolving = { ...club, state: "Dissolving", dissolutionSemester: "FA26" };
    expect(assessBooking(input, property, dissolving, policy, [], now).semesterCode).toBe("FA26");
    expect(() => assessBooking(input, property, { ...club, dissolutionSemester: "SU26" }, policy, [], now)).toThrow("dissolution");
    expect(() => assessBooking(input, property, { ...dissolving, dissolutionSemester: "SU26" }, policy, [], now)).toThrow("dissolution");
  });
  it("validates identifiers, equipment, headcount and time", () => {
    expect(validateBookingInput({ ...input, purpose: "  Meeting  " }).purpose).toBe("Meeting");
    for (const change of [{ propertyId: "bad" }, { eventId: "bad" }, { purpose: " " }, { headcount: 0 },
      { startAt: input.endAt }, { startAt: new Date("invalid") }, { equipment: ["X", "X"] }]) {
      expect(() => validateBookingInput({ ...input, ...change })).toThrow();
    }
    expect(bookingBody.safeParse({ ...input, propertyId: { $ne: null } }).success).toBe(false);
    expect(bookingDecisionBody.safeParse({ outcome: "Approve", reason: " " }).success).toBe(false);
  });
  it("records late cancellation strictly below 24 hours", () => {
    expect(isLateBookingCancellation(new Date(now.getTime() + 24 * 3600000), now)).toBe(false);
    expect(isLateBookingCancellation(new Date(now.getTime() + 24 * 3600000 - 1), now)).toBe(true);
  });
});
describe("facility booking use cases", () => {
  it("allows only officers to overbook with enabled policy and a nonempty reason", async () => {
    const d = deps();
    const raw = { ...input, reason: " Shared room for a joint activity " };
    vi.mocked(d.repo.conflicts).mockResolvedValue([{ id: "other", startAt: input.startAt, endAt: input.endAt, source: "booking" }]);
    await expect(overbookRoom(d, null, ids.club, raw, now)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(overbookRoom(d, { ...actor, accountState: "Locked" }, ids.club, raw, now)).rejects.toMatchObject({ kind: "locked" });
    vi.mocked(d.auth.systemRoleCodes).mockResolvedValue([]);
    await expect(overbookRoom(d, actor, ids.club, raw, now)).rejects.toMatchObject({ kind: "forbidden" });
    vi.mocked(d.auth.systemRoleCodes).mockResolvedValue(["ICPDP_OFFICER"]);
    await expect(overbookRoom(d, actor, ids.club, { ...raw, reason: " " }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(overbookRoom(d, actor, ids.club, raw, now)).rejects.toThrow("disabled by policy");
    expect(d.repo.reserve).not.toHaveBeenCalled();
    vi.mocked(d.policy.findEffective).mockResolvedValue({ ...policy, allowOverbooking: true });
    await overbookRoom(d, actor, ids.club, raw, now);
    expect(d.repo.reserve).toHaveBeenCalledWith(ids.club, { propertyId: input.propertyId, startAt: input.startAt,
      endAt: input.endAt, purpose: "Club room reservation", headcount: 1, equipment: [] }, actor.id, now,
    { reason: "Shared room for a joint activity" });
    expect(d.access.findSnapshot).not.toHaveBeenCalled();
    expect(await bookingAvailability(d, actor, ids.club, input, now)).toMatchObject({ conflictResult: "Blocking Conflict" });
    expect(await bookingAvailability(d, actor, ids.club, input, now, true)).toMatchObject({ conflictResult: "Warning" });
    vi.mocked(d.repo.conflicts).mockResolvedValue([]);
    await expect(overbookRoom(d, actor, ids.club, raw, now)).rejects.toThrow("occupied slot");
  });
  it("never lets an overbooking exception bypass blackouts, club state or leader requirements", async () => {
    const d = deps();
    const raw = { ...input, reason: "Joint activity" };
    vi.mocked(d.policy.findEffective).mockResolvedValue({ ...policy, allowOverbooking: true });
    vi.mocked(d.repo.conflicts).mockResolvedValue([{ id: "other", startAt: input.startAt, endAt: input.endAt, source: "event" }]);
    vi.mocked(d.properties.find).mockResolvedValue({ ...property, blackouts: [{ startAt: input.startAt, endAt: input.endAt, reason: "Maintenance" }] });
    await expect(overbookRoom(d, actor, ids.club, raw, now)).rejects.toThrow("blackout");
    vi.mocked(d.properties.find).mockResolvedValue(property);
    vi.mocked(d.repo.club).mockResolvedValue({ ...club, state: "Suspended" });
    await expect(overbookRoom(d, actor, ids.club, raw, now)).rejects.toThrow("club cannot request");
    vi.mocked(d.repo.club).mockResolvedValue(club);
    vi.mocked(d.repo.responsibleLeader).mockResolvedValue(null);
    await expect(overbookRoom(d, actor, ids.club, raw, now)).rejects.toThrow("leader");
    expect(d.repo.reserve).not.toHaveBeenCalled();
  });
  it("validates overbooking reasons and rejects exception fields on the club reservation body", () => {
    const body = { propertyId: input.propertyId, startAt: input.startAt.toISOString(), endAt: input.endAt.toISOString() };
    expect(roomReservationBody.safeParse({ ...body, reason: "Override" }).success).toBe(false);
    expect(roomOverbookingBody.safeParse(body).success).toBe(false);
    expect(roomOverbookingBody.safeParse({ ...body, reason: " " }).success).toBe(false);
    expect(roomOverbookingBody.safeParse({ ...body, reason: "x".repeat(2001) }).success).toBe(false);
    expect(roomOverbookingBody.parse({ ...body, reason: " Joint activity " }).reason).toBe("Joint activity");
    expect(bookingDecisionBody.safeParse({ outcome: "Approve", reason: "Approved", overbookingReason: " " }).success).toBe(false);
  });
  it("requires a separate valid reason for a legacy overbooking approval", async () => {
    const d = deps();
    await expect(decideBooking(d, actor, ids.booking, { outcome: "Approve", reason: "Allowed", overbookingReason: " " }, now)).rejects.toThrow("reason");
    await expect(decideBooking(d, actor, ids.booking, { outcome: "Reject", reason: "Denied", overbookingReason: "Override" }, now)).rejects.toThrow("requires approval");
    await decideBooking(d, actor, ids.booking, { outcome: "Approve", reason: "Allowed", overbookingReason: " Shared activity " }, now);
    expect(d.repo.decide).toHaveBeenCalledWith(ids.booking, actor.id,
      { outcome: "Approve", reason: "Allowed", overbookingReason: "Shared activity" }, now);
  });
  it("enforces the same-day deadline when submitting, including the exact boundary", async () => {
    const d = deps();
    await submitBooking(d, actor, ids.club, ids.booking, 0, new Date("2026-10-12T00:29:59Z"));
    vi.mocked(d.repo.submit).mockClear();
    await expect(submitBooking(d, actor, ids.club, ids.booking, 0, new Date("2026-10-12T00:30:00Z")))
      .rejects.toThrow("deadline");
    expect(d.repo.submit).not.toHaveBeenCalled();
  });
  it("requires authentication, active account and club.booking.manage", async () => {
    const d = deps();
    await expect(listBookings(d, null, ids.club, now)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(saveBooking(d, { ...actor, accountState: "Locked" }, ids.club, null, input, now)).rejects.toMatchObject({ kind: "locked" });
    vi.mocked(d.access.findSnapshot).mockResolvedValue(null);
    await expect(cancelBooking(d, actor, ids.club, ids.booking, "Unused", now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.repo.cancel).not.toHaveBeenCalled();
  });
  it("requires ICPDP for all review paths", async () => {
    const d = deps(); vi.mocked(d.auth.systemRoleCodes).mockResolvedValue([]);
    await expect(listBookings(d, actor, null, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(claimBooking(d, actor, ids.booking, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(decideBooking(d, actor, ids.booking, { outcome: "Approve", reason: "Allowed" }, now)).rejects.toMatchObject({ kind: "forbidden" });
  });
  it("hides cross-club booking IDs and rejects event attachment outside scope", async () => {
    const d = deps(); const found = await d.repo.find(ids.booking, now);
    vi.mocked(d.repo.find).mockResolvedValue({ ...found!, booking: { ...found!.booking, clubId: "f".repeat(24) } });
    await expect(getBooking(d, actor, ids.club, ids.booking, now)).rejects.toMatchObject({ kind: "not_found" });
    vi.mocked(d.repo.eventBelongsToClub).mockResolvedValue(false);
    await expect(saveBooking(d, actor, ids.club, null, { ...input, eventId: "f".repeat(24) }, now)).rejects.toThrow("event");
  });
  it("exposes active catalog/availability, creates draft and submits with version guard", async () => {
    const d = deps();
    expect(await listBookingProperties(d, actor, ids.club, now)).toEqual([property]);
    expect(await listBookingEvents(d, actor, ids.club, now)).toEqual([]);
    expect(d.repo.events).toHaveBeenCalledWith(ids.club);
    expect(await bookingAvailability(d, actor, ids.club, input, now)).toMatchObject({ capacityWarning: true });
    await saveBooking(d, actor, ids.club, null, input, now);
    expect(d.repo.create).toHaveBeenCalledWith(ids.club, input, actor.id, now);
    await submitBooking(d, actor, ids.club, ids.booking, 0, now);
    expect(d.repo.submit).toHaveBeenCalledWith(ids.booking, ids.club, 0, actor.id, now);
    vi.mocked(d.repo.conflicts).mockResolvedValue([{ id: "other", startAt: input.startAt, endAt: input.endAt, source: "booking" }]);
    await expect(submitBooking(d, actor, ids.club, ids.booking, 0, now)).rejects.toMatchObject({ kind: "conflict" });
  });
  it("edits only draft/revision and validates a proposed replacement", async () => {
    const d = deps();
    await saveBooking(d, actor, ids.club, ids.booking, input, now, 0);
    const found = await d.repo.find(ids.booking, now);
    vi.mocked(d.repo.find).mockResolvedValue({ ...found!, booking: { ...found!.booking, state: "Approved" } });
    await expect(saveBooking(d, actor, ids.club, ids.booking, input, now, 0)).rejects.toThrow("cannot be edited");
    await expect(decideBooking(d, actor, ids.booking, { outcome: "Approve", reason: "OK",
      alternative: { propertyId: input.propertyId, startAt: input.startAt, endAt: input.endAt } }, now)).rejects.toThrow("requires revision");
    await decideBooking(d, actor, ids.booking, { outcome: "Request revision", reason: "Use another slot",
      alternative: { propertyId: input.propertyId, startAt: input.startAt, endAt: input.endAt } }, now);
    expect(d.repo.decide).toHaveBeenCalledOnce();
  });
  it("requires cancellation reason and a scope for system release", async () => {
    const d = deps();
    await expect(cancelBooking(d, actor, ids.club, ids.booking, " ", now)).rejects.toMatchObject({ kind: "validation" });
    await expect(releaseBookings(d.repo, { source: "club", reason: "Suspension", now })).rejects.toMatchObject({ kind: "validation" });
    await releaseBookings(d.repo, { clubId: ids.club, source: "club", reason: "Suspension", now });
    expect(d.repo.release).toHaveBeenCalledOnce();
  });
});

describe("campus slots and notice", () => {
  it("accepts exactly four slots with strict same-day submission deadlines", () => {
    const deadlines = ["07:30", "07:30", "09:50", "12:20"];
    for (const [index, slot] of BOOKING_SLOTS.entries()) {
      const interval = { startAt: new Date(`2026-10-12T${slot.start}:00+07:00`),
        endAt: new Date(`2026-10-12T${slot.end}:00+07:00`) };
      expect(bookingSlot(interval.startAt, interval.endAt)?.number).toBe(slot.number);
      expect(validateBookingInput({ ...input, ...interval })).toMatchObject(interval);
      const deadline = new Date(`2026-10-12T${deadlines[index]}:00+07:00`);
      expect(bookingDeadline(interval.startAt, interval.endAt)).toEqual(deadline);
      expect(() => assertBookingNotice(interval, new Date(deadline.getTime() - 1))).not.toThrow();
      expect(() => assertBookingNotice(interval, deadline)).toThrow("deadline");
      expect(() => assertBookingNotice(interval, new Date(deadline.getTime() + 1))).toThrow("deadline");
    }
    for (const interval of [
      { startAt: new Date("2026-10-12T07:30:01+07:00"), endAt: input.endAt },
      { startAt: input.startAt, endAt: new Date("2026-10-12T12:20:00+07:00") },
      { startAt: input.startAt, endAt: new Date("2026-10-13T09:50:00+07:00") },
      { startAt: new Date("2026-10-12T18:00:00+07:00"), endAt: new Date("2026-10-12T20:20:00+07:00") },
    ]) expect(() => validateBookingInput({ ...input, ...interval })).toThrow("slot");
  });
  it("allows consecutive fixed slots and preserves buffer rules for legacy intervals", () => {
    expect(bookingIntervalsConflict(input.startAt, input.endAt,
      new Date("2026-10-12T10:00:00+07:00"), new Date("2026-10-12T12:20:00+07:00"), 30)).toBe(false);
    expect(bookingIntervalsConflict(input.startAt, input.endAt, input.startAt, input.endAt, 30)).toBe(true);
    expect(bookingIntervalsConflict(input.startAt, input.endAt,
      new Date("2026-10-12T10:00:00+07:00"), new Date("2026-10-12T11:00:00+07:00"), 30)).toBe(true);
  });
});

describe("immediate room reservations", () => {
  it("accepts a minimal request and rejects spoofed responsibility or extra detail fields", () => {
    const body = { propertyId: input.propertyId, startAt: input.startAt.toISOString(), endAt: input.endAt.toISOString() };
    expect(roomReservationBody.safeParse(body).success).toBe(true);
    for (const extra of [{ responsible: { id: ids.user } }, { purpose: "Custom" }, { headcount: 100 }, { propertyId: { $ne: null } }]) {
      expect(roomReservationBody.safeParse({ ...body, ...extra }).success).toBe(false);
    }
  });

  it("accepts only room and slot; assigns the leader and reserves without a review", async () => {
    const d = deps();
    const result = await reserveRoom(d, actor, ids.club, input, now);
    expect(result.booking.state).toBe("Approved");
    expect(d.repo.reserve).toHaveBeenCalledWith(ids.club, { propertyId: input.propertyId, startAt: input.startAt,
      endAt: input.endAt, purpose: "Club room reservation", headcount: 1, equipment: [] }, actor.id, now);
    expect(d.repo.create).not.toHaveBeenCalled();
    expect(d.repo.submit).not.toHaveBeenCalled();
    expect(d.repo.claim).not.toHaveBeenCalled();
    expect(d.repo.decide).not.toHaveBeenCalled();
  });
  it("allows a free future slot after the old submission cutoff", async () => {
    const d = deps();
    const sameDay = new Date("2026-10-12T08:00:00+07:00");
    const slot2 = { ...input, startAt: new Date("2026-10-12T10:00:00+07:00"), endAt: new Date("2026-10-12T12:20:00+07:00") };
    await reserveRoom(d, actor, ids.club, slot2, sameDay);
    expect(d.repo.reserve).toHaveBeenCalledOnce();
    expect(await bookingAvailability(d, actor, ids.club, slot2, sameDay)).toMatchObject({ conflicts: [] });
  });
  it("blocks occupied rooms even when policy allows overbooking", async () => {
    const d = deps();
    vi.mocked(d.policy.findEffective).mockResolvedValue({ ...policy, allowOverbooking: true });
    for (const source of ["booking", "event"] as const) {
      vi.mocked(d.repo.conflicts).mockResolvedValue([{ id: "other", startAt: input.startAt, endAt: input.endAt, source }]);
      await expect(reserveRoom(d, actor, ids.club, input, now)).rejects.toMatchObject({ kind: "conflict" });
    }
    expect(d.repo.reserve).not.toHaveBeenCalled();
  });
  it("requires a confirmed leader and club permission, and accepts rooms only", async () => {
    const d = deps();
    await expect(reserveRoom(d, null, ids.club, input, now)).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(reserveRoom(d, { ...actor, accountState: "Locked" }, ids.club, input, now)).rejects.toMatchObject({ kind: "locked" });
    vi.mocked(d.repo.responsibleLeader).mockResolvedValue(null);
    await expect(reserveRoom(d, actor, ids.club, input, now)).rejects.toThrow("leader");
    await expect(bookingResponsible(d, actor, ids.club, now)).rejects.toThrow("leader");
    vi.mocked(d.properties.find).mockResolvedValue({ ...property, type: "HALL" });
    await expect(reserveRoom(d, actor, ids.club, input, now)).rejects.toMatchObject({ kind: "not_found" });
    vi.mocked(d.access.findSnapshot).mockResolvedValue(null);
    await expect(reserveRoom(d, actor, ids.club, input, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.repo.reserve).not.toHaveBeenCalled();
  });
});
