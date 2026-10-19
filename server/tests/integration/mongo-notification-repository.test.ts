import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MAIL_LEASE_MS } from "../../src/domain/notification.js";
import { mongoMailOutboxRepository, mongoNotificationRepository } from "../../src/infra/db/mongo-notification-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";
import { deliverNotifications } from "../../src/usecase/notification.js";

const uri = process.env.MONGO_URI;
const now = new Date("2026-10-19T03:00:00.000Z");
const user = new Types.ObjectId(), other = new Types.ObjectId(), clubId = new Types.ObjectId();
const eventId = new Types.ObjectId();

function row(input: { recipient?: Types.ObjectId; eventCode: string; channels?: string[]; minutesAgo: number;
  entityType?: string; entityId?: Types.ObjectId; payload?: Record<string, unknown> }) {
  const at = new Date(now.getTime() - input.minutesAgo * 60_000);
  return { recipientUserId: input.recipient ?? user, eventCode: input.eventCode, channels: input.channels ?? ["IN_APP"],
    payload: input.payload ?? {}, state: "Queued", dueAt: at, attempts: 0, createdAt: at,
    ...(input.entityType ? { entityType: input.entityType, entityId: input.entityId } : {}) };
}

describe.skipIf(!uri)("Mongo notification inbox and mail outbox", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-notification-test-${process.pid}` });
    await ensureUcmsDatabase();
    await m.users!.create([
      { _id: user, email: "inbox@fpt.edu.vn", displayName: "Inbox User", accountState: "Active", createdAt: now },
      { _id: other, email: "other@fpt.edu.vn", displayName: "Other", accountState: "Active", createdAt: now },
    ]);
    await m.events!.create({ _id: eventId, clubId, organizerType: "CLUB", title: "Robotics Day", eventType: "Workshop",
      audienceScope: "PUBLIC", startAt: now, endAt: new Date(now.getTime() + 3_600_000), capacity: 10,
      state: "Upcoming", semesterCode: "Fall 2026", createdAt: now });
  }, 30_000);
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("lists own notifications newest first with paging, club ids and unread count", async () => {
    await m.notifications!.create([
      row({ eventCode: "EVENT_CANCELLED", minutesAgo: 3, entityType: "Event", entityId: eventId }),
      row({ eventCode: "CLUB_MEMBERSHIP_ONBOARDED", minutesAgo: 2, payload: { clubId: String(clubId) } }),
      row({ eventCode: "EVENT_PROPOSAL_APPROVED", minutesAgo: 1, channels: ["IN_APP", "EMAIL"] }),
      row({ recipient: other, eventCode: "EVENT_CANCELLED", minutesAgo: 0 }),
    ]);
    const repo = mongoNotificationRepository();
    const first = await repo.listMine(String(user), { limit: 2, unreadOnly: false });
    expect(first.items.map((item) => item.eventCode)).toEqual(["EVENT_PROPOSAL_APPROVED", "CLUB_MEMBERSHIP_ONBOARDED"]);
    expect(first.items[1]?.clubId).toBe(String(clubId));
    expect(first.unread).toBe(3);
    expect(first.nextBefore).toBeDefined();
    const second = await repo.listMine(String(user), { limit: 2, unreadOnly: false, before: new Date(first.nextBefore!) });
    expect(second.items.map((item) => item.eventCode)).toEqual(["EVENT_CANCELLED"]);
    expect(second.items[0]?.clubId).toBe(String(clubId));
    expect(second.nextBefore).toBeUndefined();
  });

  it("marks read without cancelling a queued email, and refuses someone else's notification", async () => {
    const repo = mongoNotificationRepository();
    const [email] = await m.notifications!.find({ recipientUserId: user, eventCode: "EVENT_PROPOSAL_APPROVED" }).lean();
    const [foreign] = await m.notifications!.find({ recipientUserId: other }).lean();
    expect(await repo.markRead(String(user), String(foreign!._id), now)).toBe(false);
    expect(await repo.markRead(String(user), String(email!._id), now)).toBe(true);
    expect(await m.notifications!.findById(email!._id).lean()).toMatchObject({ state: "Queued", readAt: now });
    expect(await repo.markAllRead(String(user), now)).toBe(2);
    expect(await repo.unreadCount(String(user))).toBe(0);
    expect(await repo.unreadCount(String(other))).toBe(1);
    expect(await m.notifications!.countDocuments({ recipientUserId: user, state: "Read" })).toBe(2);
    expect((await repo.listMine(String(user), { limit: 10, unreadOnly: true })).items).toEqual([]);
  });

  it("claims an email once under a lease, logs each attempt, retries, then sends", async () => {
    const outbox = mongoMailOutboxRepository();
    const first = await outbox.claimNextEmail(now, MAIL_LEASE_MS);
    expect(first).toMatchObject({ attempt: 1, eventCode: "EVENT_PROPOSAL_APPROVED", toEmail: "inbox@fpt.edu.vn" });
    // A second worker sees nothing while the lease holds.
    expect(await outbox.claimNextEmail(now, MAIL_LEASE_MS)).toBeNull();

    const failing = { name: "test", send: async () => { throw new Error("SMTP 421"); } };
    const later = new Date(now.getTime() + MAIL_LEASE_MS + 1);
    expect(await deliverNotifications(outbox, failing, later)).toMatchObject({ retried: 1 });
    const retrying = await m.notifications!.findById(first!.id).lean();
    expect(retrying).toMatchObject({ state: "Queued", attempts: 2, lastError: "SMTP 421" });

    const working = { name: "test", send: async () => ({ providerResponse: "250 OK" }) };
    expect(await deliverNotifications(outbox, working, new Date(later.getTime() + 2 * 60_000 + 1))).toMatchObject({ sent: 1 });
    // Already opened in the inbox, so it lands on Read rather than Sent.
    expect(await m.notifications!.findById(first!.id).lean()).toMatchObject({ state: "Read", attempts: 3 });
    const logs = await m.emailDeliveryLogs!.find({ notificationId: new Types.ObjectId(first!.id) }).sort({ attempt: 1 }).lean();
    expect(logs.map((log) => [log.attempt, log.status])).toEqual([[2, "Retrying"], [3, "Sent"]]);
  });

  it("drains due in-app-only rows to Sent and leaves read and future rows alone", async () => {
    const outbox = mongoMailOutboxRepository();
    // The worker run above already drained the other user's in-app row.
    expect(await m.notifications!.countDocuments({ recipientUserId: other, state: "Sent" })).toBe(1);
    await m.notifications!.create([row({ recipient: other, eventCode: "EVENT_RESCHEDULED", minutesAgo: 0 }),
      row({ recipient: other, eventCode: "EVENT_RESCHEDULED", minutesAgo: -10 })]);
    expect(await outbox.drainInApp(now)).toBe(1);
    expect(await m.notifications!.countDocuments({ recipientUserId: user, state: "Read" })).toBe(3);
  });
});
