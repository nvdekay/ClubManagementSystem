import { DomainError } from "./errors.js";
import { BOOKING_SLOTS, bookingIntervalsConflict, slotsConflict } from "./facility-booking.js";
import type { AcademicSemester } from "./policy.js";
import type { Property } from "./property.js";

/** Purpose stored on every booking generated from an ICPDP room allocation. */
export const ROOM_ALLOCATION_PURPOSE = "ICPDP room allocation";
export const ROOM_ALLOCATION_ENTITY = "RoomAllocation";

export interface RoomAllocationInput {
  semesterCode: string; clubId: string; propertyId: string;
  /** 1 = Monday … 7 = Sunday, Vietnam time. */
  weekday: number; slot: number; note?: string;
}
export interface RoomAllocationOccurrence { bookingId: string; startAt: Date; endAt: Date; state: string }
export interface RoomAllocation {
  id: string; semesterCode: string; clubId: string; clubName: string;
  propertyId: string; propertyName: string; location: string;
  weekday: number; slot: number; note?: string;
  allocatedBy: string; allocatedByName?: string; allocatedAt: Date;
  revokedAt?: Date; revokeReason?: string;
  occurrences: RoomAllocationOccurrence[];
}
export interface RoomAllocationClub { id: string; name: string; state: string; dissolutionSemester?: string }
export interface RoomAllocationConflict { startAt: Date; endAt: Date; source: "booking" | "event"; title: string; clubName?: string }
/** One weekly grid cell (UC58 A3) and the approved events or bookings that would block it. */
export interface RoomOccupancyCell { weekday: number; slot: number; items: RoomAllocationConflict[] }
export interface RoomAllocationPlan { input: RoomAllocationInput; dates: Array<{ startAt: Date; endAt: Date }>; skipped: Date[] }
export interface RoomAllocationOptions {
  semesters: AcademicSemester[];
  clubs: RoomAllocationClub[];
  rooms: Property[];
}

export interface RoomAllocationRepository {
  /** Clubs that may receive rooms (Active or Dissolving), sorted by name. */
  clubs(): Promise<RoomAllocationClub[]>;
  club(id: string): Promise<RoomAllocationClub | null>;
  list(filter: { semesterCode?: string; clubId?: string }): Promise<RoomAllocation[]>;
  find(id: string): Promise<RoomAllocation | null>;
  /** Re-checks conflicts under a property lock, then writes all occurrences or nothing. */
  allocate(plan: RoomAllocationPlan, clubName: string, thresholdMinutes: number,
    officerId: string, now: Date): Promise<RoomAllocation>;
  revoke(id: string, reason: string, officerId: string, now: Date): Promise<RoomAllocation>;
  /** Approved events and bookings (not allocation sessions) on the room inside the window. */
  roomCommitments(propertyId: string, from: Date, to: Date): Promise<RoomAllocationConflict[]>;
}

const OBJECT_ID = /^[0-9a-f]{24}$/i;

export function allocationId(value: string): string {
  if (typeof value !== "string" || !OBJECT_ID.test(value)) throw new DomainError("invalid room allocation identifier", "validation");
  return value.toLowerCase();
}

export function allocationReason(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 2000) {
    throw new DomainError("revoke reason is required (maximum 2000 characters)", "validation");
  }
  return value.trim();
}

export function validateRoomAllocationInput(raw: RoomAllocationInput): RoomAllocationInput {
  const semesterCode = typeof raw.semesterCode === "string" ? raw.semesterCode.trim() : "";
  if (!semesterCode) throw new DomainError("semester is required", "validation");
  if (!Number.isInteger(raw.weekday) || raw.weekday < 1 || raw.weekday > 7) throw new DomainError("invalid weekday", "validation");
  if (!BOOKING_SLOTS.some((slot) => slot.number === raw.slot)) throw new DomainError("booking must match one campus slot (1-4)", "validation");
  const note = typeof raw.note === "string" ? raw.note.trim() : "";
  if (note.length > 500) throw new DomainError("note is too long", "validation");
  return { semesterCode, clubId: allocationId(raw.clubId), propertyId: allocationId(raw.propertyId),
    weekday: raw.weekday, slot: raw.slot, ...(note ? { note } : {}) };
}

/** Vietnam calendar day (YYYY-MM-DD) and ISO weekday of an instant. */
function vietnamDay(at: Date): { day: string; weekday: number } {
  const local = new Date(at.getTime() + 7 * 3600000);
  return { day: local.toISOString().slice(0, 10), weekday: local.getUTCDay() || 7 };
}

/** Every not-yet-started occurrence of the weekly slot inside the semester. */
export function weeklySlotDates(semester: AcademicSemester, weekday: number, slotNumber: number,
  now: Date): Array<{ startAt: Date; endAt: Date }> {
  const slot = BOOKING_SLOTS.find((item) => item.number === slotNumber);
  if (!slot) return [];
  const dates: Array<{ startAt: Date; endAt: Date }> = [];
  const first = vietnamDay(semester.startAt);
  const cursor = new Date(`${first.day}T00:00:00+07:00`);
  cursor.setUTCDate(cursor.getUTCDate() + ((weekday - first.weekday + 7) % 7));
  for (; cursor < semester.endAt; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
    const day = vietnamDay(cursor).day;
    const startAt = new Date(`${day}T${slot.start}:00+07:00`);
    const endAt = new Date(`${day}T${slot.end}:00+07:00`);
    if (startAt >= semester.startAt && endAt <= semester.endAt && startAt > now) dates.push({ startAt, endAt });
  }
  return dates;
}

/**
 * UC58 A3: places each approved event or booking on the weekday × slot cells it would block, with the
 * same conflict rule the allocation uses, so the grid shows what E1 would reject before submitting.
 */
export function roomOccupancy(commitments: readonly RoomAllocationConflict[], thresholdMinutes: number): RoomOccupancyCell[] {
  const cells = new Map<string, RoomOccupancyCell>();
  for (const item of commitments) {
    const { day, weekday } = vietnamDay(item.startAt);
    for (const slot of BOOKING_SLOTS) {
      const startAt = new Date(`${day}T${slot.start}:00+07:00`);
      const endAt = new Date(`${day}T${slot.end}:00+07:00`);
      if (!bookingIntervalsConflict(startAt, endAt, item.startAt, item.endAt, thresholdMinutes)) continue;
      const key = `${weekday}-${slot.number}`;
      const cell = cells.get(key) ?? { weekday, slot: slot.number, items: [] };
      cell.items.push(item);
      cells.set(key, cell);
    }
  }
  return [...cells.values()].sort((a, b) => a.weekday - b.weekday || a.slot - b.slot);
}

/** Validates the allocation against catalogue, club and calendar rules; blackout dates are skipped. */
export function planRoomAllocation(input: RoomAllocationInput, property: Property | null, club: RoomAllocationClub | null,
  calendar: readonly AcademicSemester[], now: Date): RoomAllocationPlan {
  const semester = calendar.find((item) => item.code === input.semesterCode);
  if (!semester) throw new DomainError("semester not found in the academic calendar", "validation");
  if (semester.endAt <= now) throw new DomainError("semester has already ended", "conflict");
  if (!club) throw new DomainError("club not found", "not_found");
  if (!["Active", "Dissolving"].includes(club.state)) throw new DomainError("club cannot receive room allocations", "conflict");
  if (club.dissolutionSemester || club.state === "Dissolving") {
    const cutoff = calendar.find((item) => item.code === club.dissolutionSemester);
    if (!cutoff || semester.startAt > cutoff.endAt) throw new DomainError("allocation exceeds dissolution semester", "conflict");
  }
  if (!property || property.type !== "ROOM") throw new DomainError("room not found", "not_found");
  if (!property.isActive) throw new DomainError("property is inactive", "conflict");
  const slot = BOOKING_SLOTS.find((item) => item.number === input.slot)!;
  const window = property.bookableHours.find((item) => item.day === input.weekday);
  if (!window || slot.start < window.open || slot.end > window.close) {
    throw new DomainError("booking is outside bookable hours", "validation");
  }
  const skipped: Date[] = [];
  const dates = weeklySlotDates(semester, input.weekday, input.slot, now).filter((date) => {
    const blocked = property.blackouts.some((item) => slotsConflict(date.startAt, date.endAt, item.startAt, item.endAt, 0));
    if (blocked) skipped.push(date.startAt);
    return !blocked;
  });
  if (!dates.length) throw new DomainError("no upcoming dates remain for this weekday and slot", "validation");
  return { input, dates, skipped };
}
