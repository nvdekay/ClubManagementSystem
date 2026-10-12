import type { ClubEventInput, EventPublishInput } from "./club-event.js";
import { DomainError } from "./errors.js";
import type { AcademicSemester } from "./policy.js";
import { semesterOf } from "./school-event.js";

export function assertEventSchedule(startAt: Date, endAt: Date, calendar: readonly AcademicSemester[], now: Date): string {
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || startAt <= now || endAt <= startAt) {
    throw new DomainError("event dates must be in the future and end after the start", "validation");
  }
  return semesterOf(calendar, startAt, endAt);
}
export function assertEventNotice(startAt: Date, now: Date, noticeHours: number): void {
  if (startAt.getTime() - now.getTime() < noticeHours * 3600000) {
    throw new DomainError(`submit at least ${noticeHours} hours before the event starts`, "validation", { noticeHours });
  }
}
export function validateClubEventInput(input: ClubEventInput, calendar: readonly AcademicSemester[], now: Date): string {
  if (!input.title.trim() || !input.objective.trim() || !input.plan.trim()) throw new DomainError("title, objective and plan are required", "validation");
  if (!input.venueText?.trim() && !input.propertyId) throw new DomainError("choose a property or enter a venue", "validation");
  if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new DomainError("invalid capacity", "validation");
  const semester = assertEventSchedule(input.startAt, input.endAt, calendar, now);
  for (const occurrence of input.occurrences ?? []) {
    if (assertEventSchedule(occurrence.startAt, occurrence.endAt, calendar, now) !== semester || occurrence.startAt < input.startAt || occurrence.endAt > input.endAt) {
      throw new DomainError("all occurrences must be inside the event dates and the same semester", "validation");
    }
  }
  const occurrences = [...(input.occurrences ?? [])].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  if (occurrences.some((o, i) => i > 0 && o.startAt < occurrences[i - 1]!.endAt)) throw new DomainError("occurrences must not overlap", "validation");
  if (input.budgetLines.some((line) => !line.category.trim() || !line.purpose.trim() || !Number.isSafeInteger(line.amount) || line.amount <= 0) ||
    !Number.isSafeInteger(input.budgetLines.reduce((sum, line) => sum + line.amount, 0))) throw new DomainError("invalid requested budget", "validation");
  if (new Set(input.bookingIds).size !== input.bookingIds.length) throw new DomainError("booking ids must be unique", "validation");
  const form = input.registrationForm ?? [];
  if (new Set(form.map((f) => f.key)).size !== form.length || form.some((f) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(f.key) ||
    ["__proto__", "constructor", "prototype"].includes(f.key) || (["select", "radio", "checkbox"].includes(f.type) && !f.options?.length))) {
    throw new DomainError("invalid registration form fields", "validation");
  }
  return semester;
}
export function validateEventPublication(input: EventPublishInput, startAt: Date, endAt: Date, now: Date): void {
  if (startAt <= now) throw new DomainError("event has already started", "conflict");
  if (Boolean(input.registrationOpenAt) !== Boolean(input.registrationCloseAt) ||
    (input.registrationOpenAt && input.registrationCloseAt && (input.registrationOpenAt >= input.registrationCloseAt || input.registrationCloseAt > startAt))) {
    throw new DomainError("registration must open before closing and close no later than the start", "validation");
  }
  if (!input.registrationOpenAt && !input.allowWalkIn) throw new DomainError("an event without registration must allow walk-ins", "validation");
  if (input.checkInOpenAt >= input.checkInCloseAt || input.checkInCloseAt > endAt) {
    throw new DomainError("invalid check-in window", "validation");
  }
}
export function eventConflictResult(overlaps: number[], thresholdMinutes: number, allowOverbooking: boolean) {
  if (!overlaps.length) return "No Conflict";
  return !allowOverbooking && overlaps.some((minutes) => minutes >= thresholdMinutes) ? "Blocking Conflict" : "Warning";
}
export function eventCancellationIsLate(startAt: Date, now: Date, noticeHours: number): boolean {
  return startAt.getTime() - now.getTime() < noticeHours * 3600000;
}
