import { z } from "zod";
import { DomainError } from "../domain/errors.js";
import {
  MAIL_LEASE_MS, MAIL_MAX_ATTEMPTS, mailRetryDelayMs, NOTIFICATION_AUDIENCES, renderNotificationEmail,
  type MailOutboxRepository, type MailTransport, type NotificationInbox, type NotificationRepository,
  type NotificationScope,
} from "../domain/notification.js";
import type { AccessActor } from "./access.js";

const mongoId = /^[0-9a-f]{24}$/i;

const scopeFields = {
  /** Workspace whose notifications to return; absent = all of them. */
  scope: z.enum(NOTIFICATION_AUDIENCES).optional(),
  /** Only with `scope=club`: keep the notifications about this club. */
  clubId: z.string().regex(mongoId).optional(),
};

export const notificationScopeQuery = z.object(scopeFields).strict();

export const notificationInboxQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime().optional(),
  unreadOnly: z.enum(["true", "false"]).optional(),
  ...scopeFields,
}).strict();

function scopeOf(data: { scope?: NotificationScope["audience"]; clubId?: string }): NotificationScope | undefined {
  if (data.clubId && data.scope !== "club") throw new DomainError("clubId requires scope=club", "validation");
  if (!data.scope) return undefined;
  return { audience: data.scope, ...(data.clubId ? { clubId: data.clubId } : {}) };
}

function parseScope(query: unknown): NotificationScope | undefined {
  const parsed = notificationScopeQuery.safeParse(query ?? {});
  if (!parsed.success) throw new DomainError("invalid notification scope", "validation", parsed.error.issues);
  return scopeOf(parsed.data);
}

function active(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState !== "Active") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!mongoId.test(actor.id)) throw new DomainError("invalid user id", "validation");
  return actor.id;
}

export async function myNotifications(repo: NotificationRepository, actor: AccessActor | null,
  query: unknown): Promise<NotificationInbox> {
  const userId = active(actor);
  const parsed = notificationInboxQuery.safeParse(query ?? {});
  if (!parsed.success) throw new DomainError("invalid notification query", "validation", parsed.error.issues);
  const scope = scopeOf(parsed.data);
  return repo.listMine(userId, { limit: parsed.data.limit, unreadOnly: parsed.data.unreadOnly === "true",
    ...(parsed.data.before ? { before: new Date(parsed.data.before) } : {}), ...(scope ? { scope } : {}) });
}

export async function myUnreadNotificationCount(repo: NotificationRepository, actor: AccessActor | null,
  query: unknown = {}): Promise<{ unread: number }> {
  const userId = active(actor);
  return { unread: await repo.unreadCount(userId, parseScope(query)) };
}

export async function markNotificationRead(repo: NotificationRepository, actor: AccessActor | null, id: string,
  now: Date): Promise<{ unread: number }> {
  const userId = active(actor);
  if (!mongoId.test(id)) throw new DomainError("invalid notification id", "validation");
  if (!await repo.markRead(userId, id, now)) throw new DomainError("notification not found", "not_found");
  return { unread: await repo.unreadCount(userId) };
}

/** `unread` in the reply is counted in the same scope that was marked. */
export async function markAllNotificationsRead(repo: NotificationRepository, actor: AccessActor | null,
  now: Date, query: unknown = {}): Promise<{ marked: number; unread: number }> {
  const userId = active(actor);
  const scope = parseScope(query);
  const marked = await repo.markAllRead(userId, now, scope);
  return { marked, unread: await repo.unreadCount(userId, scope) };
}

function message(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 500);
}

/**
 * SCH-10: drains the outbox. In-app rows are marked delivered; each due email row is claimed under a
 * lease, sent once, logged to `emailDeliveryLogs`, and retried with backoff until `MAIL_MAX_ATTEMPTS`.
 * A send failure never touches the business change that queued it (CON-09).
 */
export async function deliverNotifications(repo: MailOutboxRepository, transport: MailTransport, now: Date,
  options: { batchSize?: number; appUrl?: string } = {}): Promise<{ inApp: number; sent: number; retried: number; failed: number }> {
  const result = { inApp: await repo.drainInApp(now), sent: 0, retried: 0, failed: 0 };
  for (let index = 0; index < (options.batchSize ?? 20); index += 1) {
    const claim = await repo.claimNextEmail(now, MAIL_LEASE_MS);
    if (!claim) break;
    if (!claim.toEmail) {
      // No address to retry against; give up at once instead of burning attempts.
      await repo.recordFailed(claim, "", "recipient has no email address", null, now);
      result.failed += 1;
      continue;
    }
    try {
      const response = await transport.send(renderNotificationEmail(claim, claim.toEmail, options.appUrl));
      await repo.recordSent(claim, claim.toEmail, response.providerResponse, now);
      result.sent += 1;
    } catch (error) {
      const retryAt = claim.attempt < MAIL_MAX_ATTEMPTS ? new Date(now.getTime() + mailRetryDelayMs(claim.attempt)) : null;
      await repo.recordFailed(claim, claim.toEmail, message(error), retryAt, now);
      if (retryAt) result.retried += 1; else result.failed += 1;
    }
  }
  return result;
}
