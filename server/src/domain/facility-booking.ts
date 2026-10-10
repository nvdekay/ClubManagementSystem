import { DomainError } from "./errors.js";
import type { PolicyVersion } from "./policy.js";
import type { Property } from "./property.js";

export const BOOKING_STATES = ["Draft", "Requested", "Under Review", "Revision Requested", "Approved",
  "Rejected", "In Use", "Completed", "Cancelled", "Released"] as const;
export type BookingState = typeof BOOKING_STATES[number];
export const BOOKING_CANCELLATION_NOTICE_HOURS = 24;
export const BOOKING_SLOTS = [
  { number: 1, start: "07:30", end: "09:50" },
  { number: 2, start: "10:00", end: "12:20" },
  { number: 3, start: "12:50", end: "15:10" },
  { number: 4, start: "15:20", end: "17:40" },
] as const;

/** Match an exact campus slot in Vietnam time, including seconds and milliseconds. */
export function bookingSlot(startAt: Date, endAt: Date): typeof BOOKING_SLOTS[number] | undefined {
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime())) return undefined;
  const start = new Date(startAt.getTime() + 7 * 3600000).toISOString();
  const end = new Date(endAt.getTime() + 7 * 3600000).toISOString();
  if (start.slice(0, 10) !== end.slice(0, 10)) return undefined;
  return BOOKING_SLOTS.find((slot) => start.slice(11) === `${slot.start}:00.000Z`
    && end.slice(11) === `${slot.end}:00.000Z`);
}

export function bookingIntervalsConflict(start: Date, end: Date, otherStart: Date, otherEnd: Date,
  thresholdMinutes: number): boolean {
  return slotsConflict(start, end, otherStart, otherEnd,
    bookingSlot(start, end) && bookingSlot(otherStart, otherEnd) ? 0 : thresholdMinutes);
}
/** Same-day notice rule agreed for the four campus slots. */
export function bookingDeadline(startAt: Date, endAt: Date): Date {
  const slot = bookingSlot(startAt, endAt);
  if (!slot) throw new DomainError("booking must match one campus slot (1-4)", "validation");
  const day = new Date(startAt.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const cutoff = slot.number <= 2 ? BOOKING_SLOTS[0].start : BOOKING_SLOTS[slot.number - 3]!.end;
  return new Date(`${day}T${cutoff}:00+07:00`);
}
export function assertBookingNotice(input: { startAt: Date; endAt: Date }, now: Date): void {
  if (now >= bookingDeadline(input.startAt, input.endAt)) {
    throw new DomainError("booking submission deadline has passed", "validation");
  }
}

export interface BookingInput {
  propertyId: string; purpose: string; startAt: Date; endAt: Date;
  headcount: number; equipment: string[]; eventId?: string;
}
export interface Booking extends BookingInput {
  id: string; clubId: string; clubName: string; semesterCode: string; state: BookingState;
  currentVersionNo: number; conflictResult?: string; isLateCancellation: boolean;
  decisionReason?: string; cancelReason?: string;
}
export interface BookingTask {
  id: string; state: string; assigneeId?: string; openedAt: Date;
}
export interface BookingVersion {
  versionNo: number; payload: BookingInput; submittedBy: string; submittedAt: Date;
}
export interface BookingDecisionInput {
  outcome: "Approve" | "Reject" | "Request revision"; reason: string; reviewNote?: string;
  alternative?: { propertyId: string; startAt: Date; endAt: Date };
}
export interface BookingDecision extends BookingDecisionInput {
  id: string; taskId: string; actorId: string; at: Date;
}
export interface BookingConflict { id: string; startAt: Date; endAt: Date; source: "booking" | "event" }
export interface BookingCheck {
  conflicts: BookingConflict[]; capacityWarning: boolean; conflictResult: string;
}
export interface BookingClub {
  id: string; name: string; state: string; dissolutionSemester?: string;
}
export interface BookingResponsible { id: string; displayName: string; email: string }
export type RoomReservationInput = Pick<BookingInput, "propertyId" | "startAt" | "endAt">;
export interface BookingDetail {
  responsible?: BookingResponsible;
  booking: Booking; property: Property | null; club: BookingClub | null;
  task: BookingTask | null; versions: BookingVersion[]; decisions: BookingDecision[];
  check: BookingCheck | null; obligations: string[];
}
export interface FacilityBookingRepository {
  responsibleLeader(clubId: string, now: Date): Promise<BookingResponsible | null>;
  reserve(clubId: string, input: BookingInput, actorId: string, now: Date): Promise<BookingDetail>;
  list(clubId?: string): Promise<Booking[]>;
  find(id: string, now: Date): Promise<BookingDetail | null>;
  club(id: string): Promise<BookingClub | null>;
  events(clubId: string): Promise<Array<{ id: string; title: string; startAt: Date }>>;
  eventBelongsToClub(eventId: string, clubId: string): Promise<boolean>;
  conflicts(input: BookingInput, thresholdMinutes: number, excludeId?: string): Promise<BookingConflict[]>;
  create(clubId: string, input: BookingInput, actorId: string, now: Date): Promise<BookingDetail>;
  save(id: string, clubId: string, input: BookingInput, expectedVersion: number,
    actorId: string, now: Date): Promise<BookingDetail>;
  submit(id: string, clubId: string, expectedVersion: number, actorId: string, now: Date): Promise<BookingDetail>;
  claim(id: string, officerId: string, now: Date): Promise<BookingDetail>;
  decide(id: string, officerId: string, input: BookingDecisionInput, now: Date): Promise<BookingDetail>;
  cancel(id: string, clubId: string, reason: string, actorId: string, now: Date): Promise<BookingDetail>;
  release(input: { clubId?: string; eventId?: string; source: "event" | "club";
    reason: string; now: Date }): Promise<number>;
  advanceLifecycle(now: Date): Promise<{ started: number; completed: number }>;
  blackoutConflicts(propertyId: string): Promise<Booking[]>;
}

export function bookingId(value: string): string {
  if (!/^[0-9a-f]{24}$/i.test(value)) throw new DomainError("invalid booking identifier", "validation");
  return value.toLowerCase();
}
export function bookingReason(value: string): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 2000) {
    throw new DomainError("booking reason is required (maximum 2000 characters)", "validation");
  }
  return value.trim();
}
export function validateBookingInput(input: BookingInput): BookingInput {
  const propertyId = bookingId(input.propertyId);
  const purpose = bookingReason(input.purpose);
  if (!(input.startAt instanceof Date) || !(input.endAt instanceof Date)
    || !Number.isFinite(input.startAt.getTime()) || !Number.isFinite(input.endAt.getTime())
    || input.startAt >= input.endAt) throw new DomainError("invalid booking interval", "validation");
  if (!bookingSlot(input.startAt, input.endAt)) throw new DomainError("booking must match one campus slot (1-4)", "validation");
  if (!Number.isInteger(input.headcount) || input.headcount < 1 || input.headcount > 10000) {
    throw new DomainError("invalid booking headcount", "validation");
  }
  if (!Array.isArray(input.equipment) || input.equipment.length > 30
    || input.equipment.some((item) => typeof item !== "string" || !item.trim() || item.length > 60)) {
    throw new DomainError("invalid booking equipment", "validation");
  }
  const equipment = input.equipment.map((item) => item.trim());
  if (new Set(equipment).size !== equipment.length) throw new DomainError("duplicate booking equipment", "validation");
  return { propertyId, purpose, startAt: input.startAt, endAt: input.endAt,
    headcount: input.headcount, equipment, ...(input.eventId ? { eventId: bookingId(input.eventId) } : {}) };
}

export function slotsConflict(startAt: Date, endAt: Date, otherStart: Date, otherEnd: Date,
  thresholdMinutes: number): boolean {
  const buffer = thresholdMinutes * 60000;
  return startAt.getTime() < otherEnd.getTime() + buffer && endAt.getTime() + buffer > otherStart.getTime();
}

export function isLateBookingCancellation(startAt: Date, now: Date): boolean {
  return startAt.getTime() - now.getTime() < BOOKING_CANCELLATION_NOTICE_HOURS * 3600000;
}

export function assessBooking(input: BookingInput, property: Property, club: BookingClub,
  policy: PolicyVersion, conflicts: BookingConflict[], now: Date): BookingCheck & { semesterCode: string } {
  validateBookingInput(input);
  if (!["Active", "Dissolving"].includes(club.state)) throw new DomainError("club cannot request bookings", "conflict");
  if (!property.isActive) throw new DomainError("property is inactive", "conflict");
  if (input.startAt <= now) throw new DomainError("booking must start in the future", "validation");
  const semester = policy.academicCalendar.find((item) => input.startAt >= item.startAt && input.endAt <= item.endAt);
  if (!semester) throw new DomainError("booking must fit within one academic semester", "validation");
  if (club.dissolutionSemester || club.state === "Dissolving") {
    const cutoff = policy.academicCalendar.find((item) => item.code === club.dissolutionSemester);
    if (!cutoff || input.endAt > cutoff.endAt) throw new DomainError("booking exceeds dissolution semester", "conflict");
  }
  // University bookable hours are expressed in Vietnam local time, independent of server TZ.
  const start = new Date(input.startAt.getTime() + 7 * 3600000);
  const end = new Date(input.endAt.getTime() + 7 * 3600000);
  function minutes(date: Date) { return date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 60000; }
  function clock(value: string) { return Number(value.slice(0, 2)) * 60 + Number(value.slice(3)); }
  const window = property.bookableHours.find((item) => item.day === (start.getUTCDay() || 7));
  if (!window || start.toISOString().slice(0, 10) !== end.toISOString().slice(0, 10)
    || minutes(start) < clock(window.open) || minutes(end) > clock(window.close)) {
    throw new DomainError("booking is outside bookable hours", "validation");
  }
  if (property.blackouts.some((item) => slotsConflict(input.startAt, input.endAt, item.startAt, item.endAt, 0))) {
    throw new DomainError("booking overlaps a blackout", "conflict");
  }
  if (input.equipment.some((item) => !property.equipment.includes(item))) {
    throw new DomainError("equipment is not available at this property", "validation");
  }
  const capacityWarning = property.capacity !== undefined && input.headcount > property.capacity;
  return { semesterCode: semester.code, conflicts, capacityWarning,
    conflictResult: conflicts.length && !policy.allowOverbooking ? "Blocking Conflict"
      : conflicts.length || capacityWarning ? "Warning" : "No Conflict" };
}
