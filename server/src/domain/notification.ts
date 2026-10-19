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

export interface NotificationInboxQuery {
  limit: number;
  before?: Date;
  unreadOnly: boolean;
}

export interface NotificationRepository {
  listMine(userId: string, query: NotificationInboxQuery): Promise<NotificationInbox>;
  unreadCount(userId: string): Promise<number>;
  /** False when the notification does not exist or belongs to someone else. */
  markRead(userId: string, id: string, now: Date): Promise<boolean>;
  markAllRead(userId: string, now: Date): Promise<number>;
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
