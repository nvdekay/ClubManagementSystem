/** The single criterion chosen for UC48: overall satisfaction on a 1–5 star scale (feeds D3). */
export const FEEDBACK_CRITERION = "overall";
export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_COMMENT_LENGTH = 2_000;

/** What the author sees of their own feedback; never shown to the club with identity (BR37, A1). */
export interface MyEventFeedback {
  id: string;
  eventId: string;
  eventTitle: string;
  clubName: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  submittedAt: Date;
}

export interface FeedbackTarget {
  attendance: { id: string; clubId: string; checkedInAt: Date; eventEndAt: Date } | null;
  feedback: MyEventFeedback | null;
}

export interface EventFeedbackRepository {
  target(eventId: string, studentId: string): Promise<FeedbackTarget | null>;
  /** Inserts the immutable record; duplicate submissions surface as a `conflict` DomainError. */
  submit(input: { eventId: string; studentId: string; attendanceId: string; clubId: string;
    rating: number; comment: string; isAnonymous: boolean; now: Date }): Promise<MyEventFeedback>;
  listMine(studentId: string): Promise<MyEventFeedback[]>;
}

export function validateFeedback(input: { rating: number; comment: string }): { rating: number; comment: string } {
  if (!Number.isInteger(input.rating) || input.rating < MIN_RATING || input.rating > MAX_RATING) {
    throw new Error(`rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}`);
  }
  const comment = input.comment.trim();
  if (!comment) throw new Error("comment is required");
  if (comment.length > MAX_COMMENT_LENGTH) throw new Error(`comment must be at most ${MAX_COMMENT_LENGTH} characters`);
  return { rating: input.rating, comment };
}

/** BR36: open from the attendee's own check-in until `feedbackWindowHours` after the event ends. */
export function feedbackWindowFor(attendance: NonNullable<FeedbackTarget["attendance"]>, hours: number | null) {
  return { opensAt: attendance.checkedInAt,
    closesAt: hours === null ? null : new Date(attendance.eventEndAt.getTime() + hours * 3_600_000) };
}

export function isFeedbackWindowOpen(window: { opensAt: Date; closesAt: Date | null }, now: Date): boolean {
  return window.opensAt <= now && (window.closesAt === null || now < window.closesAt);
}

export type FeedbackSummary =
  | { respondents: number; visible: false }
  | { respondents: number; visible: true; averageRating: number; distribution: Record<1 | 2 | 3 | 4 | 5, number> };

/**
 * BR40: below the configured minimum only the existence of feedback is revealed, never its content.
 * Takes ratings only, so an aggregate can never carry identities (BR37, A1); the club-side reader is UC49.
 */
export function summarizeFeedback(ratings: readonly number[], minRespondents: number): FeedbackSummary {
  const respondents = ratings.length;
  if (respondents === 0 || respondents < minRespondents) return { respondents, visible: false };
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const rating of ratings) distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / respondents;
  return { respondents, visible: true, averageRating: Math.round(average * 100) / 100, distribution };
}
