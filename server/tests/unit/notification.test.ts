import { describe, expect, it, vi } from "vitest";
import {
  MAIL_MAX_ATTEMPTS, mailRetryDelayMs, notificationChannels, renderNotificationEmail,
  type ClaimedEmail, type MailOutboxRepository, type MailTransport, type NotificationRepository,
} from "../../src/domain/notification.js";
import {
  deliverNotifications, markAllNotificationsRead, markNotificationRead, myNotifications,
} from "../../src/usecase/notification.js";

const now = new Date("2026-10-19T03:00:00Z");
const actor = { id: "0123456789abcdef01234567", accountState: "Active" as const };

function inbox(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    listMine: vi.fn(async () => ({ items: [], unread: 0 })),
    unreadCount: vi.fn(async () => 2),
    markRead: vi.fn(async () => true),
    markAllRead: vi.fn(async () => 3),
    ...overrides,
  };
}

function outbox(claims: ClaimedEmail[]) {
  const queue = [...claims];
  const sent: string[] = [];
  const failed: Array<{ id: string; retryAt: Date | null; error: string }> = [];
  const repo: MailOutboxRepository = {
    drainInApp: async () => 4,
    claimNextEmail: async () => queue.shift() ?? null,
    recordSent: async (claim) => { sent.push(claim.id); },
    recordFailed: async (claim, _to, error, retryAt) => { failed.push({ id: claim.id, retryAt, error }); },
  };
  return { repo, sent, failed };
}

function claim(id: string, attempt = 1, toEmail: string | null = "a@fpt.edu.vn"): ClaimedEmail {
  return { id, attempt, eventCode: "EVENT_PROPOSAL_APPROVED", payload: { title: "Robotics Day", reason: "OK" },
    ...(toEmail ? { toEmail } : {}) };
}

describe("notification channels and email rendering", () => {
  it("sends email only for the SRS §8.2 email events", () => {
    expect(notificationChannels("EVENT_PROPOSAL_APPROVED")).toEqual(["IN_APP", "EMAIL"]);
    expect(notificationChannels("CLUB_APPLICATION_REVISION_REQUESTED")).toEqual(["IN_APP", "EMAIL"]);
    expect(notificationChannels("EVENT_REGISTRATION_CONFIRMED")).toEqual(["IN_APP"]);
  });

  it("backs off exponentially and caps at one hour", () => {
    expect([1, 2, 3, 4].map(mailRetryDelayMs)).toEqual([60_000, 120_000, 240_000, 480_000]);
    expect(mailRetryDelayMs(20)).toBe(3_600_000);
  });

  it("renders a subject from the payload title", () => {
    const email = renderNotificationEmail(claim("n1"), "a@fpt.edu.vn", "https://ucms.example");
    expect(email.subject).toBe("[UCMS] Event proposal approved: Robotics Day");
    expect(email.text).toContain("Lý do / Reason: OK");
    expect(email.text).toContain("https://ucms.example");
  });
});

describe("deliverNotifications (SCH-10)", () => {
  it("sends every claimed email and drains in-app rows", async () => {
    const { repo, sent } = outbox([claim("n1"), claim("n2")]);
    const transport: MailTransport = { name: "test", send: vi.fn(async () => ({ providerResponse: "250 OK" })) };
    expect(await deliverNotifications(repo, transport, now)).toEqual({ inApp: 4, sent: 2, retried: 0, failed: 0 });
    expect(sent).toEqual(["n1", "n2"]);
  });

  it("retries a failed send with backoff and gives up after the last attempt", async () => {
    const { repo, failed } = outbox([claim("n1", 1), claim("n2", MAIL_MAX_ATTEMPTS)]);
    const transport: MailTransport = { name: "test", send: async () => { throw new Error("SMTP 421"); } };
    expect(await deliverNotifications(repo, transport, now)).toMatchObject({ sent: 0, retried: 1, failed: 1 });
    expect(failed[0]).toEqual({ id: "n1", retryAt: new Date(now.getTime() + 60_000), error: "SMTP 421" });
    expect(failed[1]).toEqual({ id: "n2", retryAt: null, error: "SMTP 421" });
  });

  it("fails a recipient without an email address without calling the transport", async () => {
    const { repo, failed } = outbox([claim("n1", 1, null)]);
    const send = vi.fn();
    expect(await deliverNotifications(repo, { name: "test", send }, now)).toMatchObject({ failed: 1 });
    expect(send).not.toHaveBeenCalled();
    expect(failed[0]?.retryAt).toBeNull();
  });

  it("stops at the batch size", async () => {
    const { repo, sent } = outbox([claim("n1"), claim("n2"), claim("n3")]);
    await deliverNotifications(repo, { name: "test", send: async () => ({}) }, now, { batchSize: 2 });
    expect(sent).toEqual(["n1", "n2"]);
  });
});

describe("notification inbox usecases (NTF-04)", () => {
  it("requires an active session", async () => {
    await expect(myNotifications(inbox(), null, {})).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(myNotifications(inbox(), { ...actor, accountState: "Locked" }, {}))
      .rejects.toMatchObject({ kind: "locked" });
  });

  it("validates and forwards the query", async () => {
    const repo = inbox();
    await myNotifications(repo, actor, { limit: "5", unreadOnly: "true", before: "2026-10-18T00:00:00.000Z" });
    expect(repo.listMine).toHaveBeenCalledWith(actor.id, { limit: 5, unreadOnly: true,
      before: new Date("2026-10-18T00:00:00.000Z") });
    await expect(myNotifications(repo, actor, { limit: "500" })).rejects.toMatchObject({ kind: "validation" });
    await expect(myNotifications(repo, actor, { owner: "x" })).rejects.toMatchObject({ kind: "validation" });
  });

  it("marks one or all notifications read and returns the unread count", async () => {
    expect(await markNotificationRead(inbox(), actor, "abcdefabcdefabcdefabcdef", now)).toEqual({ unread: 2 });
    await expect(markNotificationRead(inbox(), actor, "nope", now)).rejects.toMatchObject({ kind: "validation" });
    await expect(markNotificationRead(inbox({ markRead: async () => false }), actor, "abcdefabcdefabcdefabcdef", now))
      .rejects.toMatchObject({ kind: "not_found" });
    expect(await markAllNotificationsRead(inbox(), actor, now)).toEqual({ marked: 3, unread: 2 });
  });
});
