import { DomainError } from "./errors.js";

export type BookingReviewOutcome = "Request revision" | "Approve" | "Reject";
export type ClubObligation = "overdueSettlement" | "overdueRefund" | "overdueReport";

export interface BookingTask {
  id: string;
  bookingId: string;
  state: "Open" | "Decided" | "Closed";
  assigneeId?: string;
  openedAt: Date;
}

export interface BookingSummary {
  id: string;
  clubId: string;
  clubName: string;
  property: { id: string; code: string; name: string; type: string; location: string; capacity?: number };
  purpose: string;
  startAt: Date;
  endAt: Date;
  semesterCode: string;
  headcount?: number;
  state: string;
  currentVersionNo: number;
  conflictResult?: string;
  event?: { id: string; title: string; state: string };
}

/** Something already holding the property during the booking (BR15 / BR33). */
export interface BookingConflict {
  kind: "booking" | "event";
  id: string;
  title: string;
  startAt: Date;
  endAt: Date;
  state: string;
  /** An approved booking or busy event blocks approval unless the policy allows overbooking (BR33). */
  blocking: boolean;
}

export interface BookingDecision {
  id: string;
  outcome: BookingReviewOutcome;
  reason?: string;
  reviewNote?: string;
  alternative?: BookingAlternative;
  versionNo?: number;
  actorId: string;
  at: Date;
}

/** An officer's suggestion the club can take when it resubmits (UC46 A1). */
export interface BookingAlternative {
  propertyId?: string;
  propertyLabel?: string;
  startAt?: Date;
  endAt?: Date;
}

export interface BookingQueueItem {
  task: BookingTask;
  booking: BookingSummary;
}

export interface BookingDetail extends BookingQueueItem {
  club: { id: string; name: string; state: string; obligations: ClubObligation[] };
  conflicts: BookingConflict[];
  allowOverbooking: boolean;
  /** Outside the property's bookable hours or inside one of its blackouts. */
  outsideHours: boolean;
  decisions: BookingDecision[];
}

export interface BookingDecisionInput {
  outcome: BookingReviewOutcome;
  reason?: string;
  reviewNote?: string;
  alternative?: { propertyId?: string; startAt?: Date; endAt?: Date };
}

export interface NormalizedBookingDecision {
  outcome: BookingReviewOutcome;
  reason?: string;
  reviewNote?: string;
  alternative?: { propertyId?: string; startAt?: Date; endAt?: Date };
}

export interface BookingReviewRepository {
  listOpen(): Promise<BookingQueueItem[]>;
  find(bookingId: string, now: Date): Promise<BookingDetail | null>;
  claim(bookingId: string, officerId: string, now: Date): Promise<BookingDetail>;
  /** Re-checks BR33 and BR34 inside its transaction before an approval. */
  decide(bookingId: string, officerId: string, input: NormalizedBookingDecision, now: Date): Promise<BookingDetail>;
}

function trimmed(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function normalizedBookingDecision(input: BookingDecisionInput, now: Date): NormalizedBookingDecision {
  const reason = trimmed(input.reason);
  const reviewNote = trimmed(input.reviewNote);
  // BR05: a refusal or a revision request always says why.
  if (!reason && input.outcome !== "Approve") {
    throw new DomainError("decision reason is required", "validation", { field: "reason" });
  }
  if (reason && reason.length > 5_000 || reviewNote && reviewNote.length > 5_000) {
    throw new DomainError("review text is too long", "validation");
  }
  const raw = input.alternative;
  const alternative = raw && (raw.propertyId || raw.startAt || raw.endAt) ? { ...raw } : undefined;
  if (alternative && input.outcome !== "Request revision") {
    throw new DomainError("an alternative only goes with a revision request", "validation", { field: "alternative" });
  }
  if (alternative && Boolean(alternative.startAt) !== Boolean(alternative.endAt)) {
    throw new DomainError("an alternative time needs both a start and an end", "validation", { field: "alternative" });
  }
  if (alternative?.startAt && alternative.endAt
    && (alternative.endAt <= alternative.startAt || alternative.startAt <= now)) {
    throw new DomainError("the alternative time must be in the future and end after it starts", "validation",
      { field: "alternative" });
  }
  return { outcome: input.outcome, reason, reviewNote, ...(alternative ? { alternative } : {}) };
}

/** UC46 E1 / BR33: the conflicts that stop this booking from being approved. */
export function blockingConflicts(conflicts: readonly BookingConflict[], allowOverbooking: boolean): BookingConflict[] {
  return allowOverbooking ? [] : conflicts.filter((item) => item.blocking);
}

/** Campus time (UTC+7, no daylight saving) — bookable hours are written in it. */
const CAMPUS_OFFSET_MS = 7 * 60 * 60 * 1000;

function campusClock(at: Date): { day: number; minutes: number; date: string } {
  const local = new Date(at.getTime() + CAMPUS_OFFSET_MS);
  return { day: local.getUTCDay() || 7, minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
    date: local.toISOString().slice(0, 10) };
}

function minutesOf(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** A warning for the officer: the slot is not within one bookable window of the property, or hits a blackout. */
export function outsideBookableHours(property: { bookableHours: readonly { day: number; open: string; close: string }[];
  blackouts: readonly { startAt: Date; endAt: Date }[] }, startAt: Date, endAt: Date): boolean {
  if (property.blackouts.some((item) => item.startAt < endAt && item.endAt > startAt)) return true;
  if (!property.bookableHours.length) return false;
  const start = campusClock(startAt);
  const end = campusClock(new Date(endAt.getTime() - 60_000));
  if (start.date !== end.date) return true;
  return !property.bookableHours.some((window) => window.day === start.day
    && minutesOf(window.open) <= start.minutes && end.minutes + 1 <= minutesOf(window.close));
}
