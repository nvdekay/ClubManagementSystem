import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import { BOOKING_SLOTS, assertBookingNotice, assessBooking, bookingId, bookingReason, validateBookingInput,
  type RoomReservationInput, type RoomOverbookingInput, type BookingDecisionInput, type BookingInput, type FacilityBookingRepository } from "../domain/facility-booking.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { PropertyRepository } from "../domain/property.js";
import { assertClubAccess, type AccessActor } from "./access.js";

export interface BookingDeps {
  repo: FacilityBookingRepository; access: ClubAccessRepository; auth: Pick<AuthRepository, "systemRoleCodes">;
  properties: PropertyRepository; policy: PolicyRepository;
}
async function officer(deps: BookingDeps, actor: AccessActor | null) {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError("account locked", "locked");
  if (!(await deps.auth.systemRoleCodes(bookingId(actor.id))).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actor.id;
}
async function member(deps: BookingDeps, actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(deps.access, actor, clubId, "club.booking.manage", now);
  return actor!.id;
}
async function owned(deps: BookingDeps, clubId: string, id: string, now: Date) {
  const detail = await deps.repo.find(bookingId(id), now);
  if (!detail || detail.booking.clubId !== bookingId(clubId)) throw new DomainError("booking not found", "not_found");
  return detail;
}
async function check(deps: BookingDeps, clubId: string, input: BookingInput, now: Date, excludeId?: string, requireNotice = true) {
  if (requireNotice) assertBookingNotice(input, now);
  const [club, property, policy] = await Promise.all([deps.repo.club(bookingId(clubId)),
    deps.properties.find(input.propertyId), deps.policy.findEffective(now)]);
  if (!club || !property) throw new DomainError("club or property not found", "not_found");
  if (!policy) throw new DomainError("policy is not configured", "unavailable");
  if (input.eventId && !(await deps.repo.eventBelongsToClub(input.eventId, clubId))) {
    throw new DomainError("event is not available in this club", "validation");
  }
  return assessBooking(input, property, club, policy,
    await deps.repo.conflicts(input, policy.conflictThresholdMinutes, excludeId), now);
}
export async function listBookingProperties(deps: BookingDeps, actor: AccessActor | null, clubId: string, now: Date) {
  await member(deps, actor, clubId, now);
  return (await deps.properties.list()).filter((item) => item.isActive);
}
export async function listBookingEvents(deps: BookingDeps, actor: AccessActor | null, clubId: string, now: Date) {
  await member(deps, actor, clubId, now);
  return deps.repo.events(bookingId(clubId));
}
export async function listBookings(deps: BookingDeps, actor: AccessActor | null, clubId: string | null, now: Date) {
  if (clubId) await member(deps, actor, clubId, now); else await officer(deps, actor);
  return deps.repo.list(clubId ? bookingId(clubId) : undefined);
}
export async function getBooking(deps: BookingDeps, actor: AccessActor | null, clubId: string | null, id: string, now: Date) {
  if (clubId) { await member(deps, actor, clubId, now); return owned(deps, clubId, id, now); }
  await officer(deps, actor);
  const detail = await deps.repo.find(bookingId(id), now);
  if (!detail) throw new DomainError("booking not found", "not_found");
  return detail;
}
export async function bookingAvailability(deps: BookingDeps, actor: AccessActor | null, clubId: string,
  input: BookingInput, now: Date, asOfficer = false) {
  if (asOfficer) await officer(deps, actor); else await member(deps, actor, clubId, now);
  const result = await check(deps, clubId, validateBookingInput(input), now, undefined, false);
  return !asOfficer && result.conflicts.length ? { ...result, conflictResult: "Blocking Conflict" } : result;
}
export async function saveBooking(deps: BookingDeps, actor: AccessActor | null, clubId: string,
  id: string | null, raw: BookingInput, now: Date, expectedVersion = 0) {
  const actorId = await member(deps, actor, clubId, now);
  const input = validateBookingInput(raw);
  await check(deps, clubId, input, now, id ?? undefined);
  if (!id) return deps.repo.create(bookingId(clubId), input, actorId, now);
  const detail = await owned(deps, clubId, id, now);
  if (!["Draft", "Revision Requested"].includes(detail.booking.state)) {
    throw new DomainError("booking cannot be edited", "conflict");
  }
  return deps.repo.save(bookingId(id), bookingId(clubId), input, expectedVersion, actorId, now);
}
export async function submitBooking(deps: BookingDeps, actor: AccessActor | null, clubId: string,
  id: string, expectedVersion: number, now: Date) {
  const actorId = await member(deps, actor, clubId, now);
  const detail = await owned(deps, clubId, id, now);
  const result = await check(deps, clubId, detail.booking, now, id);
  if (result.conflictResult === "Blocking Conflict") {
    throw new DomainError("booking slot is unavailable", "conflict", result);
  }
  return deps.repo.submit(bookingId(id), bookingId(clubId), expectedVersion, actorId, now);
}
export async function claimBooking(deps: BookingDeps, actor: AccessActor | null, id: string, now: Date) {
  return deps.repo.claim(bookingId(id), await officer(deps, actor), now);
}
export async function decideBooking(deps: BookingDeps, actor: AccessActor | null,
  id: string, input: BookingDecisionInput, now: Date) {
  const actorId = await officer(deps, actor);
  if (!["Approve", "Reject", "Request revision"].includes(input.outcome)) {
    throw new DomainError("invalid booking decision", "validation");
  }
  const reason = bookingReason(input.reason);
  const overbookingReason = input.overbookingReason === undefined ? undefined : bookingReason(input.overbookingReason);
  if (overbookingReason && input.outcome !== "Approve") throw new DomainError("overbooking requires approval", "validation");
  if (input.reviewNote && input.reviewNote.length > 2000) throw new DomainError("review note is too long", "validation");
  if (input.alternative) {
    if (input.outcome !== "Request revision") throw new DomainError("alternative requires revision", "validation");
    const detail = await getBooking(deps, actor, null, id, now);
    await check(deps, detail.booking.clubId, validateBookingInput({ ...detail.booking, ...input.alternative,
      equipment: [] }), now, id, false);
  }
  return deps.repo.decide(bookingId(id), actorId, { ...input, reason, overbookingReason }, now);
}
export async function cancelBooking(deps: BookingDeps, actor: AccessActor | null, clubId: string,
  id: string, reason: string, now: Date) {
  const actorId = await member(deps, actor, clubId, now);
  await owned(deps, clubId, id, now);
  return deps.repo.cancel(bookingId(id), bookingId(clubId), bookingReason(reason), actorId, now);
}
export async function propertyBookingConflicts(deps: BookingDeps, actor: AccessActor | null, id: string) {
  await officer(deps, actor);
  return deps.repo.blackoutConflicts(bookingId(id));
}
export async function releaseBookings(repo: FacilityBookingRepository,
  input: Parameters<FacilityBookingRepository["release"]>[0]) {
  if ((input.source === "event" && !input.eventId) || (input.source === "club" && !input.clubId)) {
    throw new DomainError("booking release requires a scope", "validation");
  }
  return repo.release({ ...input, reason: bookingReason(input.reason),
    ...(input.clubId ? { clubId: bookingId(input.clubId) } : {}),
    ...(input.eventId ? { eventId: bookingId(input.eventId) } : {}) });
}

export async function runBookingLifecycleJob(repo: FacilityBookingRepository, now: Date) {
  return repo.advanceLifecycle(now);
}

export function listBookingSlots() { return BOOKING_SLOTS; }

export async function bookingResponsible(deps: BookingDeps, actor: AccessActor | null, clubId: string, now: Date, asOfficer = false) {
  if (asOfficer) await officer(deps, actor); else await member(deps, actor, clubId, now);
  const responsible = await deps.repo.responsibleLeader(bookingId(clubId), now);
  if (!responsible) throw new DomainError("club has no active confirmed leader", "conflict");
  return responsible;
}
export async function reserveRoom(deps: BookingDeps, actor: AccessActor | null, clubId: string,
  raw: RoomReservationInput, now: Date) {
  const actorId = await member(deps, actor, clubId, now);
  const input = validateBookingInput({ propertyId: raw.propertyId, startAt: raw.startAt, endAt: raw.endAt,
    purpose: "Club room reservation", headcount: 1, equipment: [] });
  const property = await deps.properties.find(input.propertyId);
  if (!property || property.type !== "ROOM") throw new DomainError("room not found", "not_found");
  const result = await check(deps, clubId, input, now, undefined, false);
  if (result.conflicts.length) throw new DomainError("booking slot is unavailable", "conflict");
  await bookingResponsible(deps, actor, clubId, now);
  return deps.repo.reserve(bookingId(clubId), input, actorId, now);
}

export async function overbookRoom(deps: BookingDeps, actor: AccessActor | null, clubId: string,
  raw: RoomOverbookingInput, now: Date) {
  const actorId = await officer(deps, actor);
  const reason = bookingReason(raw.reason);
  const input = validateBookingInput({ propertyId: raw.propertyId, startAt: raw.startAt, endAt: raw.endAt,
    purpose: "Club room reservation", headcount: 1, equipment: [] });
  const property = await deps.properties.find(input.propertyId);
  if (!property || property.type !== "ROOM") throw new DomainError("room not found", "not_found");
  const result = await check(deps, clubId, input, now, undefined, false);
  if (!result.conflicts.length) throw new DomainError("overbooking requires an occupied slot", "conflict");
  if (result.conflictResult === "Blocking Conflict") throw new DomainError("overbooking is disabled by policy", "conflict");
  await bookingResponsible(deps, actor, clubId, now, true);
  return deps.repo.reserve(bookingId(clubId), input, actorId, now, { reason });
}
