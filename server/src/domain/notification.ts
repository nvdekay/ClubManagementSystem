/** One row of a user's in-app notification inbox (NTF-04). */
export interface InboxNotification {
  id: string;
  eventCode: string;
  entityType?: string;
  entityId?: string;
  /** Club the notification is about, resolved from the payload or the entity, so the client can link to it. */
  clubId?: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date;
}

export interface NotificationInbox {
  items: InboxNotification[];
  unread: number;
  /** Pass as `before` to read the next (older) page; absent on the last page. */
  nextBefore?: string;
}

/**
 * Which workspace a notification belongs to: the student personally (applicant, registrant, member,
 * founder, recruitment candidate), ICPDP officers, or a club's management acting for that club.
 */
export type NotificationAudience = "student" | "icpdp" | "club";
export const NOTIFICATION_AUDIENCES = ["student", "icpdp", "club"] as const satisfies readonly NotificationAudience[];

/** Codes sent to a student about their own application, registration, membership or club. */
export const STUDENT_NOTIFICATION_CODES: readonly string[] = [
  "CLUB_APPLICATION_SUBMITTED", "CLUB_APPLICATION_WITHDRAWN", "CLUB_APPLICATION_APPROVED",
  "CLUB_APPLICATION_REJECTED", "CLUB_APPLICATION_REVISION_REQUESTED", "CLUB_APPLICATION_EXPIRED",
  "EVENT_REGISTRATION_CONFIRMED", "EVENT_REGISTRATION_WAITLISTED", "EVENT_REGISTRATION_PROMOTED",
  "EVENT_REGISTRATION_CANCELLED", "EVENT_CANCELLED", "EVENT_RESCHEDULED", "EVENT_CHECKED_IN",
  "RECRUITMENT_APPLICATION_ACCEPTED", "RECRUITMENT_APPLICATION_REJECTED", "RECRUITMENT_APPLICATION_WAITLISTED",
  "RECRUITMENT_APPLICATION_ONBOARDED", "RECRUITMENT_APPLICATION_DECLINED", "RECRUITMENT_CAMPAIGN_CANCELLED",
  "CLUB_MEMBERSHIP_ONBOARDED", "CLUB_MEMBERSHIP_ACTIVE", "CLUB_MEMBERSHIP_INACTIVE", "CLUB_MEMBERSHIP_BANNED",
  "CLUB_MEMBERSHIP_LEFT", "MEMBERSHIP_RECONFIRMATION_REQUIRED", "MEMBERSHIP_RECONFIRMATION_EXPIRED",
  "CLUB_SUSPENDED", "CLUB_REACTIVATED", "CLUB_DISSOLUTION_DECIDED", "CLUB_DISSOLVING", "CLUB_DISSOLVED",
  // No longer sent (UC23 withdrawn); kept so old rows stay in the member's own inbox.
  "CLUB_ROLE_ASSIGNED", "CLUB_ROLE_REVOKED", "CLUB_ROLE_UPDATED",
  // UC50/UC51: the complainant hears the triage outcome and the final close or escalation.
  "COMPLAINT_TRIAGED", "COMPLAINT_CLOSED", "COMPLAINT_ESCALATED",
];

/** Codes sent to ICPDP officers: work waiting in a review queue or an alert about a club. */
export const ICPDP_NOTIFICATION_CODES: readonly string[] = [
  "BOOKING_SUBMITTED", "BOOKING_CANCELLED", "BOOKING_RELEASED", "BOARD_NOMINATION_SUBMITTED",
  "SUSPENSION_REQUEST_SUBMITTED", "PERIODIC_REPORT_SUBMITTED", "VIOLATION_RESPONSE_SUBMITTED",
  "CORRECTIVE_ACTION_SUBMITTED", "EVENT_INVITATION_ACCEPTED", "EVENT_INVITATION_DECLINED",
  "CLUB_SUSPENSION_ENDING", "CLUB_LIFECYCLE_FAILED", "CLUB_DISSOLUTION_COMPLETED",
  "REPORT_ESCALATED_TO_ICPDP", "REFUND_OVERDUE_TO_ICPDP",
  "COMPLAINT_SUBMITTED", "COMPLAINT_CLUB_RESPONDED", "COMPLAINT_RESPONSE_OVERDUE",
  "EVENT_DEFENSE_CONFIRMED", "EVENT_DEFENSE_RESCHEDULE_REQUESTED", "EVENT_DEFENSE_CONFIRM_OVERDUE",
];

/** Codes sent to the people running a club (leader, board, reviewers, the member who filed the request). */
export const CLUB_NOTIFICATION_CODES: readonly string[] = [
  "EVENT_PROPOSAL_APPROVED", "EVENT_PROPOSAL_REJECTED", "EVENT_PROPOSAL_REVISION_REQUESTED", "EVENT_PROPOSAL_EXPIRED",
  "EVENT_PROPOSAL_RE-DEFENSE_PENDING", "EVENT_DEFENSE_SCHEDULED", "EVENT_DEFENSE_CANCELLED",
  "EVENT_DEFENSE_RESCHEDULE_DECIDED", "EVENT_DEFENSE_NO_SHOW",
  "PROPERTY_BOOKING_STATUS", "ROOM_ALLOCATED", "ROOM_ALLOCATION_REVOKED",
  "RECRUITMENT_APPLICATION_SUBMITTED", "RECRUITMENT_APPLICATION_WITHDRAWN", "MEMBERSHIP_WITHDRAWAL_REQUESTED",
  "TRANSITION_PLAN_RETURNED", "LEADERSHIP_TRANSITION_CONFIRMED", "BOARD_NOMINATION_DECIDED",
  "SUSPENSION_REQUEST_REJECTED", "COMPLAINT_FORWARDED",
  "VIOLATION_RESPONSE_REQUESTED", "VIOLATION_CLOSED_NO_VIOLATION", "VIOLATION_DECIDED", "VIOLATION_ACTIONS_ASSIGNED",
  "VIOLATION_ACTION_VERIFIED", "VIOLATION_ACTION_FAILED", "VIOLATION_RESOLVED",
  "PERIODIC_REPORT_OPENED", "PERIODIC_REPORT_ACCEPTED", "PERIODIC_REPORT_RETURNED", "PERIODIC_REPORT_MISSING", "EVALUATION_PUBLISHED",
  "SCHOOL_EVENT_INVITATION", "SCHOOL_EVENT_INVITATION_WITHDRAWN",
  "REPORT_DUE_SOON", "REPORT_DEADLINE_PASSED", "REPORT_ESCALATED",
  "REPORT_SAVE", "REPORT_SUBMIT", "REPORT_CLAIM", "REPORT_DECISION", "REPORT_OVERDUE",
  "SETTLEMENT_DUE_SOON", "SETTLEMENT_OVERDUE", "REFUND_DUE_SOON", "REFUND_OVERDUE",
  "SETTLEMENT_EXPENSE", "SETTLEMENT_EVIDENCE", "SETTLEMENT_SUBMIT", "SETTLEMENT_CLAIM", "SETTLEMENT_RETURN",
  "SETTLEMENT_FINALIZE",
  "BUDGET_ADVANCE_RECORDED", "BUDGET_TOPUP_RECORDED", "BUDGET_REFUND_RECORDED",
];

/**
 * Codes that used to go to two audiences before they were split. A row written before the split is
 * the ICPDP copy when its payload carries this key (CLUB_DISSOLVED → CLUB_DISSOLUTION_COMPLETED).
 */
export const LEGACY_ICPDP_PAYLOAD_KEYS: Readonly<Record<string, string>> = {
  CLUB_DISSOLVED: "outstandingPeriodicReports",
};

const audienceByCode = new Map<string, NotificationAudience>([
  ...STUDENT_NOTIFICATION_CODES.map((code) => [code, "student"] as const),
  ...ICPDP_NOTIFICATION_CODES.map((code) => [code, "icpdp"] as const),
  ...CLUB_NOTIFICATION_CODES.map((code) => [code, "club"] as const),
]);

/** Audience of one notification; an unknown code is treated as the student's own. */
export function notificationAudience(eventCode: string, payload: Record<string, unknown> = {}): NotificationAudience {
  const legacyKey = LEGACY_ICPDP_PAYLOAD_KEYS[eventCode];
  if (legacyKey && payload[legacyKey] !== undefined) return "icpdp";
  return audienceByCode.get(eventCode) ?? "student";
}

/** Inbox filter for one workspace; `clubId` narrows the club scope to a single club. */
export interface NotificationScope {
  audience: NotificationAudience;
  clubId?: string;
}

export interface NotificationInboxQuery {
  limit: number;
  before?: Date;
  unreadOnly: boolean;
  /** Absent: every notification of the user. */
  scope?: NotificationScope;
}

export interface NotificationRepository {
  listMine(userId: string, query: NotificationInboxQuery): Promise<NotificationInbox>;
  unreadCount(userId: string, scope?: NotificationScope): Promise<number>;
  /** False when the notification does not exist or belongs to someone else. */
  markRead(userId: string, id: string, now: Date): Promise<boolean>;
  markAllRead(userId: string, now: Date, scope?: NotificationScope): Promise<number>;
}

export const NOTIFICATION_CHANNEL_IN_APP = "IN_APP";
export const NOTIFICATION_CHANNEL_EMAIL = "EMAIL";

/**
 * Events that also go out by email, per the notification matrix in SRS §8.2: founding application
 * revision/decision, event proposal decision, booking decision and violation case opened/decided.
 */
export const EMAIL_EVENT_CODES: ReadonlySet<string> = new Set([
  "CLUB_APPLICATION_REVISION_REQUESTED", "CLUB_APPLICATION_APPROVED", "CLUB_APPLICATION_REJECTED",
  "EVENT_PROPOSAL_APPROVED", "EVENT_PROPOSAL_REJECTED",
  "EVENT_DEFENSE_SCHEDULED", "EVENT_DEFENSE_CANCELLED", "EVENT_DEFENSE_RESCHEDULE_DECIDED", "EVENT_DEFENSE_NO_SHOW",
  "PROPERTY_BOOKING_STATUS",
  "VIOLATION_RESPONSE_REQUESTED", "VIOLATION_DECIDED", "VIOLATION_CLOSED_NO_VIOLATION",
]);

export function notificationChannels(eventCode: string): string[] {
  return EMAIL_EVENT_CODES.has(eventCode)
    ? [NOTIFICATION_CHANNEL_IN_APP, NOTIFICATION_CHANNEL_EMAIL] : [NOTIFICATION_CHANNEL_IN_APP];
}

/** A queued email notification claimed by one worker for `MAIL_LEASE_MS` (NTF-07). */
export interface ClaimedEmail {
  id: string;
  /** Attempt number of this send, starting at 1. */
  attempt: number;
  eventCode: string;
  payload: Record<string, unknown>;
  toEmail?: string;
  displayName?: string;
}

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

/** Delivery adapter (SMTP, provider API, log). Throws when the message was not accepted. */
export interface MailTransport {
  readonly name: string;
  send(email: OutgoingEmail): Promise<{ providerResponse?: string }>;
}

export interface MailOutboxRepository {
  /** Marks due in-app-only notifications as delivered; they are already readable in the inbox. */
  drainInApp(now: Date): Promise<number>;
  /** Atomically claims the oldest due email notification, pushing its `dueAt` past the lease. */
  claimNextEmail(now: Date, leaseMs: number): Promise<ClaimedEmail | null>;
  recordSent(claim: ClaimedEmail, toEmail: string, providerResponse: string | undefined, now: Date): Promise<void>;
  /** `retryAt` null means the notification is given up as `Failed`. */
  recordFailed(claim: ClaimedEmail, toEmail: string, error: string, retryAt: Date | null, now: Date): Promise<void>;
}

export const MAIL_MAX_ATTEMPTS = 5;
export const MAIL_LEASE_MS = 5 * 60_000;

/** Backoff before the next try after a failed attempt: 1, 2, 4, 8 minutes, capped at one hour. */
export function mailRetryDelayMs(attempt: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 3_600_000);
}

function humanize(code: string): string {
  const words = code.toLowerCase().split("_").filter(Boolean).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Plain bilingual email for a notification; the inbox in UCMS remains the place to see full details. */
export function renderNotificationEmail(claim: ClaimedEmail, toEmail: string, appUrl?: string): OutgoingEmail {
  const subject = text(claim.payload.title) ?? text(claim.payload.clubName);
  const lines = [
    `${claim.displayName ? `Xin chào ${claim.displayName},` : "Xin chào,"}`,
    "",
    `UCMS có cập nhật mới: ${humanize(claim.eventCode)}${subject ? ` — ${subject}` : ""}.`,
    ...(text(claim.payload.state) ? [`Trạng thái / State: ${text(claim.payload.state)}`] : []),
    ...(text(claim.payload.reason) ? [`Lý do / Reason: ${text(claim.payload.reason)}`] : []),
    "",
    `Xem chi tiết trong hộp thông báo UCMS${appUrl ? `: ${appUrl}` : "."}`,
    "",
    "—",
    `UCMS update: ${humanize(claim.eventCode)}${subject ? ` — ${subject}` : ""}. Open the UCMS notification inbox for details.`,
  ];
  return { to: toEmail, subject: `[UCMS] ${humanize(claim.eventCode)}${subject ? `: ${subject}` : ""}`, text: lines.join("\n") };
}
