import { Types } from 'mongoose'
import {
  CLUB_NOTIFICATION_CODES,
  ICPDP_NOTIFICATION_CODES,
  LEGACY_ICPDP_PAYLOAD_KEYS,
  NOTIFICATION_CHANNEL_EMAIL,
  type ClaimedEmail,
  type InboxNotification,
  type MailOutboxRepository,
  type NotificationRepository,
  type NotificationScope,
} from '../../domain/notification.js'
import { ROOM_ALLOCATION_ENTITY } from '../../domain/room-allocation.js'
import { ucmsModels as m } from './ucms-models.js'

type Doc = Record<string, unknown>

/** Collection chứa từng loại entity của thông báo, dùng để tìm CLB mà thông báo thuộc về. */
const clubOwningCollection: Readonly<Record<string, string>> = {
  Event: 'events',
  PropertyBooking: 'propertyBookings',
  TransitionPlan: 'transitionPlans',
  EventRegistration: 'eventRegistrations',
  RecruitmentApplication: 'recruitmentApplications',
  RecruitmentCampaign: 'recruitmentCampaigns',
  BoardNomination: 'boardNominations',
  Violation: 'violations',
  ClubMembership: 'clubMemberships',
  SuspensionRequest: 'suspensionRequests',
  PeriodicReport: 'periodicReports',
  MembershipWithdrawalRequest: 'membershipWithdrawalRequests',
  EventBudget: 'eventBudgets',
  EventInvitation: 'eventInvitations',
  Evaluation: 'evaluations',
}

// Chuẩn hóa id ObjectId hoặc chuỗi hex 24 ký tự thành chuỗi
function idText(value: unknown): string | undefined {
  if (value instanceof Types.ObjectId) {
    return String(value)
  }
  return typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value) ? value : undefined
}

// Suy ra club id của từng thông báo từ entity hoặc payload
/** Id CLB cho một trang thông báo: ưu tiên payload, sau đó tra một lần cho mỗi loại entity. */
async function clubIdsFor(docs: Doc[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const pending = new Map<string, Types.ObjectId[]>()
  for (const doc of docs) {
    const key = String(doc._id)
    const payload = (doc.payload ?? {}) as Doc
    const direct =
      idText(payload.clubId) ??
      idText(payload.createdClubId) ??
      (doc.entityType === 'Club' ? idText(doc.entityId) : undefined)
    if (direct) {
      result.set(key, direct)
      continue
    }
    const type = String(doc.entityType ?? '')
    if (!doc.entityId || (!clubOwningCollection[type] && type !== ROOM_ALLOCATION_ENTITY)) {
      continue
    }
    pending.set(type, [...(pending.get(type) ?? []), doc.entityId as Types.ObjectId])
  }
  const owners = new Map<string, string>()
  await Promise.all(
    [...pending].map(async ([type, ids]) => {
      if (type === ROOM_ALLOCATION_ENTITY) {
        const audits = await m
          .auditLogs!.find({ entityType: type, entityId: { $in: ids }, action: 'ROOM_ALLOCATED' })
          .select({ entityId: 1, after: 1 })
          .lean()
        for (const audit of audits) {
          const clubId = idText((audit.after as Doc | undefined)?.clubId)
          if (clubId) {
            owners.set(`${type}:${String(audit.entityId)}`, clubId)
          }
        }
        return
      }
      const rows = await m[clubOwningCollection[type]!]!.find({ _id: { $in: ids } })
        .select({ clubId: 1 })
        .lean()
      for (const row of rows) {
        if (row.clubId) {
          owners.set(`${type}:${String(row._id)}`, String(row.clubId))
        }
      }
    }),
  )
  for (const doc of docs) {
    const owner = owners.get(`${String(doc.entityType)}:${String(doc.entityId)}`)
    if (owner && !result.has(String(doc._id))) {
      result.set(String(doc._id), owner)
    }
  }
  return result
}

// Điều kiện nhận diện thông báo ICPDP kiểu cũ qua khoá payload
/** Các dòng ghi trước khi một mã được tách ra mà payload đánh dấu là bản của ICPDP. */
function legacyIcpdpRows(): Doc[] {
  return Object.entries(LEGACY_ICPDP_PAYLOAD_KEYS).map(([eventCode, key]) => ({
    eventCode,
    [`payload.${key}`]: { $exists: true },
  }))
}

// Dựng điều kiện lọc inbox theo audience
/** Bộ lọc DB cho các mã của một audience; mã không xác định rơi vào inbox riêng của sinh viên. */
function audienceFilter(scope: NotificationScope | undefined): Doc {
  if (!scope) {
    return {}
  }
  const legacy = legacyIcpdpRows()
  if (scope.audience === 'icpdp') {
    return { $or: [{ eventCode: { $in: ICPDP_NOTIFICATION_CODES } }, ...legacy] }
  }
  if (scope.audience === 'club') {
    return { eventCode: { $in: CLUB_NOTIFICATION_CODES } }
  }
  return {
    eventCode: { $nin: [...ICPDP_NOTIFICATION_CODES, ...CLUB_NOTIFICATION_CODES] },
    ...(legacy.length ? { $nor: legacy } : {}),
  }
}

// Ánh xạ document thông báo sang InboxNotification
function inboxItem(doc: Doc, clubId: string | undefined): InboxNotification {
  return {
    id: String(doc._id),
    eventCode: String(doc.eventCode),
    payload: (doc.payload ?? {}) as Record<string, unknown>,
    createdAt: doc.createdAt as Date,
    ...(doc.entityType ? { entityType: String(doc.entityType) } : {}),
    ...(doc.entityId ? { entityId: String(doc.entityId) } : {}),
    ...(clubId ? { clubId } : {}),
    ...(doc.readAt ? { readAt: doc.readAt as Date } : {}),
  }
}

// Repository inbox thông báo của người dùng
/**
 * Inbox đọc theo `readAt` (index `ix_notification_inbox`). Đọc cũng chuyển dòng đã gửi sang
 * `Read`; dòng có email còn đang xếp hàng giữ `Queued` để mail worker vẫn gửi.
 */
export function mongoNotificationRepository(): NotificationRepository {
  const notifications = m.notifications!
  // Chuyển thông báo đã đọc sang state Read khi đủ điều kiện
  async function settleReadState(filter: Doc): Promise<void> {
    await notifications.updateMany(
      {
        ...filter,
        readAt: { $ne: null },
        state: { $in: ['Queued', 'Sent'] },
        $or: [{ state: 'Sent' }, { channels: { $ne: NOTIFICATION_CHANNEL_EMAIL } }],
      },
      { $set: { state: 'Read' } },
    )
  }
  // Điền clubId cho các dòng CLB của người dùng chưa được xác định CLB (dòng mới hoặc dòng cũ)
  /**
   * CLB của một dòng được suy theo payload hoặc entity sở hữu (`clubIdsFor`) rồi lưu vào `clubId`
   * (null = không thuộc CLB nào), nên mỗi dòng chỉ phải suy một lần và inbox CLB lọc, phân trang ở DB.
   */
  async function resolveClubIds(recipientUserId: Types.ObjectId): Promise<void> {
    const docs = await notifications
      .find({
        recipientUserId,
        eventCode: { $in: CLUB_NOTIFICATION_CODES },
        clubId: { $exists: false },
      })
      .select({ entityType: 1, entityId: 1, payload: 1 })
      .lean()
    if (!docs.length) {
      return
    }
    const clubs = await clubIdsFor(docs)
    await notifications.bulkWrite(
      docs.map((doc) => {
        const clubId = clubs.get(String(doc._id))
        return {
          updateOne: {
            filter: { _id: doc._id, clubId: { $exists: false } },
            update: { $set: { clubId: clubId ? new Types.ObjectId(clubId) : null } },
          },
        }
      }),
      { ordered: false },
    )
  }
  // Bộ lọc DB cho các thông báo CLB của người dùng thuộc về một CLB
  async function clubFilter(recipientUserId: Types.ObjectId, clubId: string): Promise<Doc> {
    await resolveClubIds(recipientUserId)
    const club = new Types.ObjectId(clubId)
    const base = { recipientUserId, eventCode: { $in: CLUB_NOTIFICATION_CODES } }
    // Sự kiện của trường thuộc về ICPDP; các dòng lời mời cũ không có CLB, nên khớp theo lời mời của CLB này.
    const orphanEvents = await notifications.distinct('entityId', {
      ...base,
      clubId: { $type: 'null' },
      entityType: 'Event',
      entityId: { $ne: null },
    })
    const invited = orphanEvents.length
      ? await m.eventInvitations!.distinct('eventId', {
          clubId: club,
          eventId: { $in: orphanEvents },
        })
      : []
    return {
      ...base,
      $or: [
        { clubId: club },
        ...(invited.length
          ? [{ clubId: { $type: 'null' }, entityType: 'Event', entityId: { $in: invited } }]
          : []),
      ],
    }
  }
  return {
    // Liệt kê thông báo của người dùng theo workspace
    async listMine(userId, query) {
      const recipientUserId = new Types.ObjectId(userId)
      if (query.scope?.audience === 'club' && query.scope.clubId) {
        const scoped = await clubFilter(recipientUserId, query.scope.clubId)
        const docs = await notifications
          .find({
            ...scoped,
            ...(query.unreadOnly ? { readAt: null } : {}),
            ...(query.before ? { createdAt: { $lt: query.before } } : {}),
          })
          .sort({ createdAt: -1, _id: -1 })
          .limit(query.limit + 1)
          .lean()
        const page = docs.slice(0, query.limit)
        const unread = await notifications.countDocuments({ ...scoped, readAt: null })
        const last = page.at(-1)
        return {
          items: page.map((doc) => inboxItem(doc, query.scope!.clubId)),
          unread,
          ...(docs.length > query.limit && last
            ? { nextBefore: (last.createdAt as Date).toISOString() }
            : {}),
        }
      }
      const scoped = { recipientUserId, ...audienceFilter(query.scope) }
      const docs = await notifications
        .find({
          ...scoped,
          ...(query.unreadOnly ? { readAt: null } : {}),
          ...(query.before ? { createdAt: { $lt: query.before } } : {}),
        })
        .sort({ createdAt: -1, _id: -1 })
        .limit(query.limit + 1)
        .lean()
      const page = docs.slice(0, query.limit)
      const clubs = await clubIdsFor(page)
      const unread = await notifications.countDocuments({ ...scoped, readAt: null })
      const last = page.at(-1)
      return {
        items: page.map((doc) => inboxItem(doc, clubs.get(String(doc._id)))),
        unread,
        ...(docs.length > query.limit && last
          ? { nextBefore: (last.createdAt as Date).toISOString() }
          : {}),
      }
    },
    // Đếm thông báo chưa đọc theo workspace
    async unreadCount(userId, scope) {
      const recipientUserId = new Types.ObjectId(userId)
      if (scope?.audience === 'club' && scope.clubId) {
        return notifications.countDocuments({
          ...(await clubFilter(recipientUserId, scope.clubId)),
          readAt: null,
        })
      }
      return notifications.countDocuments({
        recipientUserId,
        readAt: null,
        ...audienceFilter(scope),
      })
    },
    // Đánh dấu một thông báo đã đọc
    async markRead(userId, id, now) {
      const filter = { _id: new Types.ObjectId(id), recipientUserId: new Types.ObjectId(userId) }
      const found = await notifications
        .findOneAndUpdate({ ...filter, readAt: null }, { $set: { readAt: now } })
        .lean()
      if (!found && !(await notifications.exists(filter))) {
        return false
      }
      await settleReadState(filter)
      return true
    },
    // Đánh dấu tất cả thông báo trong workspace đã đọc
    async markAllRead(userId, now, scope) {
      const recipientUserId = new Types.ObjectId(userId)
      const filter =
        scope?.audience === 'club' && scope.clubId
          ? await clubFilter(recipientUserId, scope.clubId)
          : audienceFilter(scope)
      const changed = await notifications.updateMany(
        { recipientUserId, readAt: null, ...filter },
        { $set: { readAt: now } },
      )
      await settleReadState({ recipientUserId })
      return changed.modifiedCount
    },
  }
}

// Repository outbox gửi thông báo in-app và email
/**
 * Outbox cho SCH-10. Việc claim là một `findOneAndUpdate` nguyên tử đẩy `dueAt` qua một lease và
 * đếm lần thử, nên hai instance app không bao giờ gửi cùng một dòng cùng lúc (NTF-07); worker
 * chết giữa lúc gửi thì dòng được thử lại khi lease hết hạn.
 */
export function mongoMailOutboxRepository(): MailOutboxRepository {
  const notifications = m.notifications!
  const logs = m.emailDeliveryLogs!
  return {
    // Chuyển thông báo in-app đến hạn sang Sent
    async drainInApp(now) {
      const changed = await notifications.updateMany(
        { state: 'Queued', dueAt: { $lte: now }, channels: { $ne: NOTIFICATION_CHANNEL_EMAIL } },
        { $set: { state: 'Sent' } },
      )
      return changed.modifiedCount
    },
    // Nhận (lease) email đến hạn kế tiếp để gửi
    async claimNextEmail(now, leaseMs): Promise<ClaimedEmail | null> {
      const doc = await notifications
        .findOneAndUpdate(
          { state: 'Queued', dueAt: { $lte: now }, channels: NOTIFICATION_CHANNEL_EMAIL },
          { $set: { dueAt: new Date(now.getTime() + leaseMs) }, $inc: { attempts: 1 } },
          { sort: { dueAt: 1, _id: 1 }, returnDocument: 'after' },
        )
        .lean()
      if (!doc) {
        return null
      }
      const user = await m
        .users!.findById(doc.recipientUserId)
        .select({ email: 1, displayName: 1 })
        .lean()
      return {
        id: String(doc._id),
        attempt: Number(doc.attempts),
        eventCode: String(doc.eventCode),
        payload: (doc.payload ?? {}) as Record<string, unknown>,
        ...(typeof user?.email === 'string' && user.email ? { toEmail: user.email } : {}),
        ...(typeof user?.displayName === 'string' && user.displayName
          ? { displayName: user.displayName }
          : {}),
      }
    },
    // Ghi log gửi email thành công
    async recordSent(claim, toEmail, providerResponse, now) {
      await logs.create({
        notificationId: new Types.ObjectId(claim.id),
        toEmail,
        status: 'Sent',
        attempt: claim.attempt,
        ...(providerResponse ? { providerResponse } : {}),
        at: now,
      })
      await notifications.updateOne(
        { _id: new Types.ObjectId(claim.id), state: 'Queued', attempts: claim.attempt },
        // Đã mở trong inbox → chuyển thẳng sang Read, như dòng in-app đã gửi.
        [
          {
            $set: {
              state: { $cond: [{ $eq: [{ $ifNull: ['$readAt', null] }, null] }, 'Sent', 'Read'] },
            },
          },
          { $unset: 'lastError' },
        ],
        // Mongoose 9 rejects update pipelines unless they are opted into per call.
        { updatePipeline: true },
      )
    },
    // Ghi log gửi email lỗi, đặt lịch thử lại nếu còn lượt
    async recordFailed(claim, toEmail, error, retryAt, now) {
      await logs.create({
        notificationId: new Types.ObjectId(claim.id),
        toEmail: toEmail || '-',
        status: retryAt ? 'Retrying' : 'Failed',
        attempt: claim.attempt,
        providerResponse: error,
        at: now,
      })
      await notifications.updateOne(
        { _id: new Types.ObjectId(claim.id), state: 'Queued', attempts: claim.attempt },
        {
          $set: retryAt
            ? { dueAt: retryAt, lastError: error }
            : { state: 'Failed', lastError: error },
        },
      )
    },
  }
}
