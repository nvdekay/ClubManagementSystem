/** UC50, redefined on 2026-10-09: one-way feedback from a student to a club or to ICPDP (no ticket workflow). */
export type FeedbackRecipient = "CLUB" | "ICPDP";
export const feedbackCategories = ["suggestion", "praise", "issue"] as const;
export type FeedbackCategory = (typeof feedbackCategories)[number];
export const MAX_FEEDBACK_MESSAGE = 2_000;

export interface StudentFeedbackInput {
  recipient: FeedbackRecipient;
  clubId?: string;
  eventId?: string;
  category: FeedbackCategory;
  message: string;
  isAnonymous: boolean;
}

/** What the author sees of their own feedback. */
export interface SentFeedback {
  id: string;
  recipient: FeedbackRecipient;
  clubId?: string;
  clubName?: string;
  eventId?: string;
  eventTitle?: string;
  category: FeedbackCategory;
  message: string;
  isAnonymous: boolean;
  submittedAt: Date;
}

/** What a club or ICPDP reader sees; `sender` is absent for anonymous feedback. */
export interface ReceivedFeedback extends SentFeedback {
  sender?: { displayName: string; email: string };
}

export interface StudentFeedbackRepository {
  /** null when the club does not exist (the use case rejects Dissolved clubs). */
  club(clubId: string): Promise<{ id: string; name: string; state: string } | null>;
  eventBelongsToClub(eventId: string, clubId: string): Promise<boolean>;
  submit(input: StudentFeedbackInput & { studentId: string; now: Date }): Promise<SentFeedback>;
  listMine(studentId: string): Promise<SentFeedback[]>;
  inbox(recipient: FeedbackRecipient, clubId?: string): Promise<ReceivedFeedback[]>;
}

export function normalizeFeedbackMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) throw new Error("message is required");
  if (trimmed.length > MAX_FEEDBACK_MESSAGE) throw new Error(`message must be at most ${MAX_FEEDBACK_MESSAGE} characters`);
  return trimmed;
}
