import type { ClubEventInput, EventProposalDocument, EventPublishInput } from "./club-event.js";
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
export const INTERNAL_EVENT_NOTICE_HOURS = 24;
export const APPROVED_EVENT_CANCEL_NOTICE_HOURS = 72;
/** An approved ICPDP event can only request cancellation at least 72 hours before startAt. */
export function assertApprovedEventCancellationNotice(startAt: Date, now: Date, noticeHours = APPROVED_EVENT_CANCEL_NOTICE_HOURS): void {
  if (startAt.getTime() - now.getTime() < noticeHours * 3600000) {
    throw new DomainError(`cancellation request must be submitted at least ${noticeHours} hours before the event starts`, "conflict",
      { noticeHours });
  }
}
/** An internal event becomes official (CREATED/PUBLIC) or moves its CREATED schedule only 24 hours ahead. */
export function assertInternalEventNotice(startAt: Date, now: Date): void {
  if (startAt.getTime() - now.getTime() < INTERNAL_EVENT_NOTICE_HOURS * 3600000) {
    throw new DomainError(`internal event must start at least ${INTERNAL_EVENT_NOTICE_HOURS} hours from now`, "validation",
      { noticeHours: INTERNAL_EVENT_NOTICE_HOURS });
  }
}
/** Only DRAFT and CREATED internal events are editable; once published the schedule is locked. */
export function assertInternalEventEditable(state: string): void {
  if (state === "PUBLIC" || state === "ONGOING") {
    throw new DomainError("published internal event schedule is locked; only cancellation is allowed", "conflict");
  }
  if (state !== "DRAFT" && state !== "CREATED") throw new DomainError("internal event cannot be edited in its current state", "conflict");
}
/** Plan B: an ICPDP proposal is PUBLIC, or MEMBERS_ONLY with at least one requested budget line. */
export function assertProposalAudience(input: Pick<ClubEventInput, "audienceScope" | "budgetLines">): void {
  if (input.audienceScope === "MEMBERS_ONLY" && input.budgetLines.length === 0) {
    throw new DomainError("internal events without university budget must use the internal event flow", "validation");
  }
}
export function validateClubEventInput(input: ClubEventInput, calendar: readonly AcademicSemester[], now: Date): string {
  if (!input.title.trim() || !input.objective.trim() || !input.plan.trim()) throw new DomainError("title, objective and plan are required", "validation");
  const hasTopVenue = Boolean(input.venueText?.trim() || input.propertyId);
  if (!hasTopVenue && !input.occurrences?.length) throw new DomainError("choose a property or enter a venue", "validation");
  if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new DomainError("invalid capacity", "validation");
  const semester = assertEventSchedule(input.startAt, input.endAt, calendar, now);
  for (const occurrence of input.occurrences ?? []) {
    if (assertEventSchedule(occurrence.startAt, occurrence.endAt, calendar, now) !== semester || occurrence.startAt < input.startAt || occurrence.endAt > input.endAt) {
      throw new DomainError("all occurrences must be inside the event dates and the same semester", "validation");
    }
    if (!occurrence.venueText?.trim() && !occurrence.propertyId && !hasTopVenue) {
      throw new DomainError("choose a property or enter a venue", "validation");
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

export const PROPOSAL_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const extensionForMime: Record<string, string> = { [PDF]: "pdf", [DOCX]: "docx", [XLSX]: "xlsx" };
export const PROPOSAL_DOCUMENT_MIME_TYPES: ReadonlySet<string> = new Set([PDF, DOCX]);
export const PROPOSAL_TEMPLATE_MIME_TYPES: ReadonlySet<string> = new Set([PDF, DOCX, XLSX]);
function signatureMatches(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === PDF) return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  const zip = bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && bytes.includes(Buffer.from("[Content_Types].xml"));
  return zip && bytes.includes(Buffer.from(mimeType === DOCX ? "word/" : "xl/"));
}
/** Checks name, size, declared type, extension and magic bytes of an uploaded proposal document or template; returns the trimmed name. */
export function validateEventProposalFile(fileName: string, mimeType: string, bytes: Buffer, allowedMimes: ReadonlySet<string>): string {
  const name = fileName.trim();
  const extension = extensionForMime[mimeType];
  // eslint-disable-next-line no-control-regex
  if (!name || name.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(name) || !allowedMimes.has(mimeType) || !extension ||
    !name.toLowerCase().endsWith(`.${extension}`) || bytes.length === 0 || bytes.length > PROPOSAL_DOCUMENT_MAX_BYTES ||
    !signatureMatches(mimeType, bytes)) {
    throw new DomainError("invalid event proposal file", "validation", { maxBytes: PROPOSAL_DOCUMENT_MAX_BYTES, mimeTypes: [...allowedMimes] });
  }
  return name;
}
export function assertProposalDocumentPresent(document: EventProposalDocument | undefined): void {
  if (!document) throw new DomainError("event proposal document is required before submission", "validation", { field: "proposalDocument" });
}
