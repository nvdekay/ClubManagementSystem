import { Types, type ClientSession } from 'mongoose'
import { notificationChannels } from '../../domain/notification.js'
import { ucmsModels } from './ucms-models.js'
import { VICE_LEADER_SEAT_CODES } from '../../domain/access.js'

// BR47, BR55: chỉ ghế Chủ nhiệm và Phó chủ nhiệm là ghế ban chủ nhiệm; chức danh khác không phải ghế
export const LEADER_SEAT_FILTER = {
  $or: [{ isLeaderRole: true }, { isBoardSeat: true, code: { $in: [...VICE_LEADER_SEAT_CODES] } }],
}

// Lấy user giữ chức Club Leader hoặc ghế ban chủ nhiệm đang hiệu lực
/** Id các user hiện giữ vai trò leader hoặc một ghế ban chủ nhiệm của CLB — những người ICPDP cần thông báo. */
export async function clubBoardUserIds(
  clubId: Types.ObjectId,
  session?: ClientSession,
): Promise<Types.ObjectId[]> {
  const m = ucmsModels
  const positionIds = await m
    .clubPositions!.find({
      clubId,
      isActive: true,
      ...LEADER_SEAT_FILTER,
    })
    .session(session ?? null)
    .distinct('_id')
  if (!positionIds.length) {
    return []
  }
  const membershipIds = await m
    .clubPositionAssignments!.find({ clubId, positionId: { $in: positionIds }, effectiveTo: null })
    .session(session ?? null)
    .distinct('membershipId')
  if (!membershipIds.length) {
    return []
  }
  const userIds = await m
    .clubMemberships!.find({ _id: { $in: membershipIds }, state: 'Active' })
    .session(session ?? null)
    .distinct('userId')
  return userIds.map((userId) => new Types.ObjectId(String(userId)))
}

// Xếp hàng thông báo cho người nhận (không trùng) trong transaction
/** Xếp hàng một thông báo cho mỗi người nhận (không trùng) trong transaction của bên gọi (kèm email cho các sự kiện SRS §8.2). */
export async function queueNotifications(
  session: ClientSession,
  recipients: readonly unknown[],
  eventCode: string,
  entityType: string,
  entityId: Types.ObjectId,
  payload: Record<string, unknown>,
  now: Date,
): Promise<void> {
  const unique = [...new Set(recipients.filter(Boolean).map(String))]
  if (!unique.length) {
    return
  }
  await ucmsModels.notifications!.insertMany(
    unique.map((userId) => ({
      recipientUserId: new Types.ObjectId(userId),
      eventCode,
      entityType,
      entityId,
      channels: notificationChannels(eventCode),
      payload,
      state: 'Queued',
      dueAt: now,
      attempts: 0,
      createdAt: now,
    })),
    { session },
  )
}

// BR06: tìm user đã là Club Leader CLB khác trong nhiệm kỳ chồng lấn
/**
 * BR06: các user thuộc những membership này mà đã giữ vai trò leader của CLB khác trong một
 * nhiệm kỳ chồng lấn [startAt, endAt). Nhiệm kỳ sắp kết thúc của chính CLB được bỏ qua, nên
 * leader được bầu lại vẫn đủ điều kiện.
 */
export async function otherClubLeaderUserIds(
  session: ClientSession,
  clubId: Types.ObjectId,
  membershipIds: readonly Types.ObjectId[],
  startAt: Date,
  endAt: Date,
): Promise<Set<string>> {
  const m = ucmsModels
  if (!membershipIds.length) {
    return new Set()
  }
  const userIds = await m
    .clubMemberships!.find({ _id: { $in: membershipIds } })
    .session(session)
    .distinct('userId')
  const termIds = await m
    .clubTerms!.find({
      clubId: { $ne: clubId },
      state: { $in: ['Active', 'Planned'] },
      startAt: { $lt: endAt },
      endAt: { $gt: startAt },
    })
    .session(session)
    .distinct('_id')
  if (!userIds.length || !termIds.length) {
    return new Set()
  }
  const leaderPositionIds = await m
    .clubPositions!.find({ clubId: { $ne: clubId }, isLeaderRole: true, isActive: true })
    .session(session)
    .distinct('_id')
  const heldBy = await m
    .clubPositionAssignments!.find({
      termId: { $in: termIds },
      positionId: { $in: leaderPositionIds },
      effectiveTo: null,
    })
    .session(session)
    .distinct('membershipId')
  if (!heldBy.length) {
    return new Set()
  }
  const users = await m
    .clubMemberships!.find({ _id: { $in: heldBy }, userId: { $in: userIds } })
    .session(session)
    .distinct('userId')
  return new Set(users.map(String))
}
