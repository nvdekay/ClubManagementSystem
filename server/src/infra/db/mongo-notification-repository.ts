import { Types } from "mongoose";
import {
  NOTIFICATION_CHANNEL_EMAIL, type ClaimedEmail, type InboxNotification, type MailOutboxRepository,
  type NotificationRepository,
} from "../../domain/notification.js";
import { ROOM_ALLOCATION_ENTITY } from "../../domain/room-allocation.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;

/** Collection holding each notification entity type, used to find the club it belongs to. */
const clubOwningCollection: Readonly<Record<string, string>> = {
  Event: "events", PropertyBooking: "propertyBookings", TransitionPlan: "transitionPlans",
  EventRegistration: "eventRegistrations", RecruitmentApplication: "recruitmentApplications",
  RecruitmentCampaign: "recruitmentCampaigns", BoardNomination: "boardNominations", Violation: "violations",
  ClubMembership: "clubMemberships", SuspensionRequest: "suspensionRequests", PeriodicReport: "periodicReports",
  MembershipWithdrawalRequest: "membershipWithdrawalRequests", EventBudget: "eventBudgets",
  EventInvitation: "eventInvitations", Evaluation: "evaluations",
};

function idText(value: unknown): string | undefined {
  if (value instanceof Types.ObjectId) return String(value);
  return typeof value === "string" && /^[0-9a-f]{24}$/i.test(value) ? value : undefined;
}

/** Club ids for a page of notifications: payload first, then one lookup per entity type. */
async function clubIdsFor(docs: Doc[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const pending = new Map<string, Types.ObjectId[]>();
  for (const doc of docs) {
    const key = String(doc._id);
    const payload = (doc.payload ?? {}) as Doc;
    const direct = idText(payload.clubId) ?? idText(payload.createdClubId)
      ?? (doc.entityType === "Club" ? idText(doc.entityId) : undefined);
    if (direct) { result.set(key, direct); continue; }
    const type = String(doc.entityType ?? "");
    if (!doc.entityId || (!clubOwningCollection[type] && type !== ROOM_ALLOCATION_ENTITY)) continue;
    pending.set(type, [...pending.get(type) ?? [], doc.entityId as Types.ObjectId]);
  }
  const owners = new Map<string, string>();
  await Promise.all([...pending].map(async ([type, ids]) => {
    if (type === ROOM_ALLOCATION_ENTITY) {
      const audits = await m.auditLogs!.find({ entityType: type, entityId: { $in: ids }, action: "ROOM_ALLOCATED" })
        .select({ entityId: 1, after: 1 }).lean();
      for (const audit of audits) {
        const clubId = idText((audit.after as Doc | undefined)?.clubId);
        if (clubId) owners.set(`${type}:${String(audit.entityId)}`, clubId);
      }
      return;
    }
    const rows = await m[clubOwningCollection[type]!]!.find({ _id: { $in: ids } }).select({ clubId: 1 }).lean();
    for (const row of rows) if (row.clubId) owners.set(`${type}:${String(row._id)}`, String(row.clubId));
  }));
  for (const doc of docs) {
    const owner = owners.get(`${String(doc.entityType)}:${String(doc.entityId)}`);
    if (owner && !result.has(String(doc._id))) result.set(String(doc._id), owner);
  }
  return result;
}

function inboxItem(doc: Doc, clubId: string | undefined): InboxNotification {
  return {
    id: String(doc._id), eventCode: String(doc.eventCode), payload: (doc.payload ?? {}) as Record<string, unknown>,
    createdAt: doc.createdAt as Date,
    ...(doc.entityType ? { entityType: String(doc.entityType) } : {}),
    ...(doc.entityId ? { entityId: String(doc.entityId) } : {}),
    ...(clubId ? { clubId } : {}),
    ...(doc.readAt ? { readAt: doc.readAt as Date } : {}),
  };
}

/**
 * Inbox reads go by `readAt` (index `ix_notification_inbox`). Reading also moves a delivered row to
 * `Read`; a row whose email is still queued keeps `Queued` so the mail worker still sends it.
 */
export function mongoNotificationRepository(): NotificationRepository {
  const notifications = m.notifications!;
  async function settleReadState(filter: Doc): Promise<void> {
    await notifications.updateMany({ ...filter, readAt: { $ne: null }, state: { $in: ["Queued", "Sent"] },
      $or: [{ state: "Sent" }, { channels: { $ne: NOTIFICATION_CHANNEL_EMAIL } }] }, { $set: { state: "Read" } });
  }
  return {
    async listMine(userId, query) {
      const recipientUserId = new Types.ObjectId(userId);
      const docs = await notifications.find({ recipientUserId, ...(query.unreadOnly ? { readAt: null } : {}),
        ...(query.before ? { createdAt: { $lt: query.before } } : {}) })
        .sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).lean();
      const page = docs.slice(0, query.limit);
      const clubs = await clubIdsFor(page);
      const unread = await notifications.countDocuments({ recipientUserId, readAt: null });
      const last = page.at(-1);
      return { items: page.map((doc) => inboxItem(doc, clubs.get(String(doc._id)))), unread,
        ...(docs.length > query.limit && last ? { nextBefore: (last.createdAt as Date).toISOString() } : {}) };
    },
    unreadCount(userId) {
      return notifications.countDocuments({ recipientUserId: new Types.ObjectId(userId), readAt: null });
    },
    async markRead(userId, id, now) {
      const filter = { _id: new Types.ObjectId(id), recipientUserId: new Types.ObjectId(userId) };
      const found = await notifications.findOneAndUpdate({ ...filter, readAt: null }, { $set: { readAt: now } }).lean();
      if (!found && !await notifications.exists(filter)) return false;
      await settleReadState(filter);
      return true;
    },
    async markAllRead(userId, now) {
      const recipientUserId = new Types.ObjectId(userId);
      const changed = await notifications.updateMany({ recipientUserId, readAt: null }, { $set: { readAt: now } });
      await settleReadState({ recipientUserId });
      return changed.modifiedCount;
    },
  };
}

/**
 * Outbox for SCH-10. The claim is one atomic `findOneAndUpdate` that moves `dueAt` past a lease and
 * counts the attempt, so two app instances never send the same row at once (NTF-07); a worker that
 * dies mid-send leaves the row to be retried when the lease runs out.
 */
export function mongoMailOutboxRepository(): MailOutboxRepository {
  const notifications = m.notifications!;
  const logs = m.emailDeliveryLogs!;
  return {
    async drainInApp(now) {
      const changed = await notifications.updateMany({ state: "Queued", dueAt: { $lte: now },
        channels: { $ne: NOTIFICATION_CHANNEL_EMAIL } }, { $set: { state: "Sent" } });
      return changed.modifiedCount;
    },
    async claimNextEmail(now, leaseMs): Promise<ClaimedEmail | null> {
      const doc = await notifications.findOneAndUpdate(
        { state: "Queued", dueAt: { $lte: now }, channels: NOTIFICATION_CHANNEL_EMAIL },
        { $set: { dueAt: new Date(now.getTime() + leaseMs) }, $inc: { attempts: 1 } },
        { sort: { dueAt: 1, _id: 1 }, new: true },
      ).lean();
      if (!doc) return null;
      const user = await m.users!.findById(doc.recipientUserId).select({ email: 1, displayName: 1 }).lean();
      return { id: String(doc._id), attempt: Number(doc.attempts), eventCode: String(doc.eventCode),
        payload: (doc.payload ?? {}) as Record<string, unknown>,
        ...(typeof user?.email === "string" && user.email ? { toEmail: user.email } : {}),
        ...(typeof user?.displayName === "string" && user.displayName ? { displayName: user.displayName } : {}) };
    },
    async recordSent(claim, toEmail, providerResponse, now) {
      await logs.create({ notificationId: new Types.ObjectId(claim.id), toEmail, status: "Sent", attempt: claim.attempt,
        ...(providerResponse ? { providerResponse } : {}), at: now });
      await notifications.updateOne({ _id: new Types.ObjectId(claim.id), state: "Queued", attempts: claim.attempt },
        // Already opened in the inbox → straight to Read, like a delivered in-app row.
        [{ $set: { state: { $cond: [{ $eq: [{ $ifNull: ["$readAt", null] }, null] }, "Sent", "Read"] } } },
          { $unset: "lastError" }]);
    },
    async recordFailed(claim, toEmail, error, retryAt, now) {
      await logs.create({ notificationId: new Types.ObjectId(claim.id), toEmail: toEmail || "-",
        status: retryAt ? "Retrying" : "Failed", attempt: claim.attempt, providerResponse: error, at: now });
      await notifications.updateOne({ _id: new Types.ObjectId(claim.id), state: "Queued", attempts: claim.attempt },
        { $set: retryAt ? { dueAt: retryAt, lastError: error } : { state: "Failed", lastError: error } });
    },
  };
}
