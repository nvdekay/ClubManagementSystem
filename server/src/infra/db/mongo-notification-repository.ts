import { Types } from "mongoose";
import {
  CLUB_NOTIFICATION_CODES, ICPDP_NOTIFICATION_CODES, LEGACY_ICPDP_PAYLOAD_KEYS, NOTIFICATION_CHANNEL_EMAIL,
  type ClaimedEmail, type InboxNotification, type MailOutboxRepository, type NotificationRepository,
  type NotificationScope,
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

/** Rows written before a code was split whose payload marks them as the ICPDP copy. */
function legacyIcpdpRows(): Doc[] {
  return Object.entries(LEGACY_ICPDP_PAYLOAD_KEYS).map(([eventCode, key]) => ({ eventCode, [`payload.${key}`]: { $exists: true } }));
}

/** DB filter for the codes of one audience; unknown codes fall to the student's own inbox. */
function audienceFilter(scope: NotificationScope | undefined): Doc {
  if (!scope) return {};
  const legacy = legacyIcpdpRows();
  if (scope.audience === "icpdp") return { $or: [{ eventCode: { $in: ICPDP_NOTIFICATION_CODES } }, ...legacy] };
  if (scope.audience === "club") return { eventCode: { $in: CLUB_NOTIFICATION_CODES } };
  return { eventCode: { $nin: [...ICPDP_NOTIFICATION_CODES, ...CLUB_NOTIFICATION_CODES] },
    ...(legacy.length ? { $nor: legacy } : {}) };
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
  /**
   * Club scope narrowed to one club: the club is resolved per row (payload or owning entity), which a
   * query cannot express, so the user's club rows are resolved first. Inbox volumes are small.
   */
  async function clubRows(recipientUserId: Types.ObjectId, clubId: string, extra: Doc = {}) {
    const docs = await notifications.find({ recipientUserId, eventCode: { $in: CLUB_NOTIFICATION_CODES }, ...extra })
      .sort({ createdAt: -1, _id: -1 }).lean();
    const clubs = await clubIdsFor(docs);
    // A school event belongs to ICPDP; older invitation rows carry no club, so match them by this club's invitation.
    const unresolved = docs.filter((doc) => !clubs.has(String(doc._id)) && doc.entityType === "Event" && doc.entityId);
    if (unresolved.length) {
      const invited = new Set((await m.eventInvitations!.find({ clubId: new Types.ObjectId(clubId),
        eventId: { $in: unresolved.map((doc) => doc.entityId as Types.ObjectId) } }).select({ eventId: 1 }).lean())
        .map((row) => String(row.eventId)));
      for (const doc of unresolved) if (invited.has(String(doc.entityId))) clubs.set(String(doc._id), clubId);
    }
    return { docs: docs.filter((doc) => clubs.get(String(doc._id)) === clubId), clubs };
  }
  return {
    async listMine(userId, query) {
      const recipientUserId = new Types.ObjectId(userId);
      if (query.scope?.audience === "club" && query.scope.clubId) {
        const { docs, clubs } = await clubRows(recipientUserId, query.scope.clubId);
        const unread = docs.filter((doc) => !doc.readAt).length;
        const matching = docs.filter((doc) => (!query.unreadOnly || !doc.readAt)
          && (!query.before || (doc.createdAt as Date) < query.before));
        const page = matching.slice(0, query.limit);
        const last = page.at(-1);
        return { items: page.map((doc) => inboxItem(doc, clubs.get(String(doc._id)))), unread,
          ...(matching.length > query.limit && last ? { nextBefore: (last.createdAt as Date).toISOString() } : {}) };
      }
      const scoped = { recipientUserId, ...audienceFilter(query.scope) };
      const docs = await notifications.find({ ...scoped, ...(query.unreadOnly ? { readAt: null } : {}),
        ...(query.before ? { createdAt: { $lt: query.before } } : {}) })
        .sort({ createdAt: -1, _id: -1 }).limit(query.limit + 1).lean();
      const page = docs.slice(0, query.limit);
      const clubs = await clubIdsFor(page);
      const unread = await notifications.countDocuments({ ...scoped, readAt: null });
      const last = page.at(-1);
      return { items: page.map((doc) => inboxItem(doc, clubs.get(String(doc._id)))), unread,
        ...(docs.length > query.limit && last ? { nextBefore: (last.createdAt as Date).toISOString() } : {}) };
    },
    async unreadCount(userId, scope) {
      const recipientUserId = new Types.ObjectId(userId);
      if (scope?.audience === "club" && scope.clubId) {
        return (await clubRows(recipientUserId, scope.clubId, { readAt: null })).docs.length;
      }
      return notifications.countDocuments({ recipientUserId, readAt: null, ...audienceFilter(scope) });
    },
    async markRead(userId, id, now) {
      const filter = { _id: new Types.ObjectId(id), recipientUserId: new Types.ObjectId(userId) };
      const found = await notifications.findOneAndUpdate({ ...filter, readAt: null }, { $set: { readAt: now } }).lean();
      if (!found && !await notifications.exists(filter)) return false;
      await settleReadState(filter);
      return true;
    },
    async markAllRead(userId, now, scope) {
      const recipientUserId = new Types.ObjectId(userId);
      const filter = scope?.audience === "club" && scope.clubId
        ? { _id: { $in: (await clubRows(recipientUserId, scope.clubId, { readAt: null })).docs.map((doc) => doc._id) } }
        : audienceFilter(scope);
      const changed = await notifications.updateMany({ recipientUserId, readAt: null, ...filter }, { $set: { readAt: now } });
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
