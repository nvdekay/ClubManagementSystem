import mongoose, { Types, type ClientSession } from 'mongoose'
import { DomainError } from '../../domain/errors.js'
import { bookingIntervalsConflict } from '../../domain/facility-booking.js'
import {
  ROOM_ALLOCATION_ENTITY,
  ROOM_ALLOCATION_PURPOSE,
  type RoomAllocation,
  type RoomAllocationClub,
  type RoomAllocationConflict,
  type RoomAllocationRepository,
} from '../../domain/room-allocation.js'
import { clubBoardUserIds } from './club-board.js'
import { ucmsModels as m } from './ucms-models.js'
import { found, oid, queueNotifications, writeAudit } from './repo-helpers.js'

type Doc = Record<string, unknown>
const ALLOCATED = 'ROOM_ALLOCATED'
const REVOKED = 'ROOM_ALLOCATION_REVOKED'
/** Bản phân phòng nằm trong audit trail; không có collection riêng (không đổi schema). */
interface AllocationRecord {
  semesterCode: string
  clubId: string
  clubName: string
  propertyId: string
  weekday: number
  slot: number
  note?: string
  bookingIds: string[]
}

// Ném DomainError loại conflict kèm chi tiết xung đột
function conflict(message: string, details?: unknown): never {
  throw new DomainError(message, 'conflict', details)
}
// Ánh xạ document CLB sang RoomAllocationClub
function clubFrom(doc: Doc): RoomAllocationClub {
  const dissolution = doc.dissolution as
    { effectiveSemester?: string; effectiveTo?: Date } | undefined
  return {
    id: String(doc._id),
    name: String(doc.name),
    state: String(doc.state),
    ...(dissolution?.effectiveSemester
      ? { dissolutionSemester: dissolution.effectiveSemester }
      : {}),
    ...(dissolution?.effectiveTo instanceof Date
      ? { dissolutionEffectiveTo: dissolution.effectiveTo }
      : {}),
  }
}

// Ghép bản ghi phân bổ phòng với thông tin thu hồi từ audit log
/** Ghép các bản ghi phân phòng với phần thu hồi, các buổi, phòng và cán bộ của chúng. */
async function hydrate(records: Doc[]): Promise<RoomAllocation[]> {
  if (!records.length) {
    return []
  }
  const revocations = await m
    .auditLogs!.find({
      entityType: ROOM_ALLOCATION_ENTITY,
      action: REVOKED,
      entityId: { $in: records.map((record) => record.entityId) },
    })
    .lean()
  const after = records.map((record) => record.after as AllocationRecord)
  const bookingDocs = await m
    .propertyBookings!.find({ _id: { $in: after.flatMap((item) => item.bookingIds.map(oid)) } })
    .select({ startAt: 1, endAt: 1, state: 1 })
    .lean()
  const propertyDocs = await m
    .properties!.find({ _id: { $in: after.map((item) => oid(item.propertyId)) } })
    .select({ name: 1, location: 1 })
    .lean()
  const userDocs = await m
    .users!.find({ _id: { $in: records.map((record) => record.actorId) } })
    .select({ displayName: 1, email: 1 })
    .lean()
  const bookingById = new Map(bookingDocs.map((doc) => [String(doc._id), doc]))
  const propertyById = new Map(propertyDocs.map((doc) => [String(doc._id), doc]))
  const userById = new Map(userDocs.map((doc) => [String(doc._id), doc]))
  const revocationById = new Map(revocations.map((doc) => [String(doc.entityId), doc]))
  return records.map((record, index): RoomAllocation => {
    const item = after[index]!
    const property = propertyById.get(item.propertyId)
    const user = userById.get(String(record.actorId))
    const revocation = revocationById.get(String(record.entityId))
    return {
      id: String(record.entityId),
      semesterCode: item.semesterCode,
      clubId: item.clubId,
      clubName: item.clubName,
      propertyId: item.propertyId,
      propertyName: String(property?.name ?? ''),
      location: String(property?.location ?? ''),
      weekday: item.weekday,
      slot: item.slot,
      ...(item.note ? { note: item.note } : {}),
      allocatedBy: String(record.actorId),
      ...(user ? { allocatedByName: String(user.displayName || user.email) } : {}),
      allocatedAt: record.at as Date,
      ...(revocation
        ? { revokedAt: revocation.at as Date, revokeReason: String(revocation.reason ?? '') }
        : {}),
      occurrences: item.bookingIds
        .flatMap((bookingId) => {
          const doc = bookingById.get(bookingId)
          return doc
            ? [
                {
                  bookingId,
                  startAt: doc.startAt as Date,
                  endAt: doc.endAt as Date,
                  state: String(doc.state),
                },
              ]
            : []
        })
        .sort((a, b) => a.startAt.getTime() - b.startAt.getTime()),
    }
  })
}

// Repository phân bổ phòng cố định cho CLB của ICPDP
export function mongoRoomAllocationRepository(): RoomAllocationRepository {
  // Khoá CLB và phòng để tuần tự hoá các ghi đồng thời
  async function lock(propertyId: Types.ObjectId, clubId: Types.ObjectId, session: ClientSession) {
    // Cùng khoá ghi như booking cơ sở vật chất, nên phân phòng, yêu cầu và cascade CLB được tuần tự hoá theo từng phòng.
    await m.clubs!.updateOne({ _id: clubId }, { $inc: { __v: 1 } }, { session })
    await m.properties!.updateOne({ _id: propertyId }, { $inc: { __v: 1 } }, { session })
  }
  // Ghi audit log cho phân bổ phòng
  async function audit(
    id: Types.ObjectId,
    action: string,
    actorId: string,
    after: unknown,
    now: Date,
    session: ClientSession,
    reason?: string,
  ) {
    await writeAudit(session, {
      entityType: ROOM_ALLOCATION_ENTITY,
      entityId: id,
      action,
      actorId: oid(actorId),
      after,
      ...(reason ? { reason } : {}),
      at: now,
    })
  }
  // Lấy một phân bổ phòng theo id
  async function find(id: string): Promise<RoomAllocation | null> {
    const record = await m
      .auditLogs!.findOne({
        entityType: ROOM_ALLOCATION_ENTITY,
        entityId: oid(id),
        action: ALLOCATED,
      })
      .lean()
    return record ? (await hydrate([record]))[0]! : null
  }
  return {
    // Liệt kê CLB Active/Dissolving để phân bổ phòng
    async clubs() {
      const docs = await m
        .clubs!.find({ state: { $in: ['Active', 'Dissolving'] } })
        .select({ name: 1, state: 1, dissolution: 1 })
        .collation({ locale: 'vi' })
        .sort({ name: 1 })
        .lean()
      return docs.map(clubFrom)
    },
    // Lấy thông tin CLB phục vụ phân bổ phòng
    async club(id) {
      const doc = await m.clubs!.findById(oid(id)).lean()
      return doc ? clubFrom(doc) : null
    },
    // Liệt kê phân bổ phòng theo học kỳ hoặc CLB
    async list(filter) {
      const records = await m
        .auditLogs!.find({
          entityType: ROOM_ALLOCATION_ENTITY,
          action: ALLOCATED,
          ...(filter.semesterCode ? { 'after.semesterCode': filter.semesterCode } : {}),
          ...(filter.clubId ? { 'after.clubId': filter.clubId } : {}),
        })
        .sort({ at: -1, _id: -1 })
        .lean()
      return hydrate(records)
    },
    find,
    // Liệt kê booking, sự kiện, buổi bảo vệ đang chiếm phòng trong khoảng thời gian
    async roomCommitments(propertyId, from, to) {
      const property = oid(propertyId)
      const window = { startAt: { $lt: to }, endAt: { $gt: from } }
      const [bookingDocs, eventDocs, defenseDocs] = await Promise.all([
        m
          .propertyBookings!.find({
            propertyId: property,
            state: { $in: ['Approved', 'In Use'] },
            purpose: { $ne: ROOM_ALLOCATION_PURPOSE },
            ...window,
          })
          .sort({ startAt: 1 })
          .lean(),
        m
          .events!.find({
            propertyId: property,
            state: { $in: ['Approved', 'Upcoming', 'Ongoing', 'CREATED', 'PUBLIC', 'ONGOING'] },
            ...window,
          })
          .sort({ startAt: 1 })
          .lean(),
        m
          .eventDefenseSessions!.find({
            propertyId: property,
            state: { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS'] },
            ...window,
          })
          .sort({ startAt: 1 })
          .lean(),
      ])
      return [
        ...bookingDocs.map((doc) => ({
          source: 'booking' as const,
          title: String(doc.purpose),
          doc,
        })),
        ...eventDocs.map((doc) => ({ source: 'event' as const, title: String(doc.title), doc })),
        ...defenseDocs.map((doc) => ({
          source: 'defense' as const,
          title: String(doc.title),
          doc,
        })),
      ].map(({ source, title, doc }) => ({
        startAt: doc.startAt as Date,
        endAt: doc.endAt as Date,
        source,
        title,
        ...(doc.clubName ? { clubName: String(doc.clubName) } : {}),
      }))
    },
    // ICPDP phân bổ phòng cho CLB theo kế hoạch đã kiểm tra xung đột
    async allocate(plan, clubName, thresholdMinutes, officerId, now) {
      const id = new Types.ObjectId()
      const { input, dates } = plan
      await mongoose.connection.transaction(async (session) => {
        const propertyId = oid(input.propertyId)
        const clubId = oid(input.clubId)
        await lock(propertyId, clubId, session)
        const club = await m.clubs!.findById(clubId).session(session).lean()
        if (!club || !['Active', 'Dissolving'].includes(String(club.state))) {
          conflict('club cannot receive room allocations')
        }
        const property = await m.properties!.findById(propertyId).session(session).lean()
        if (!property || property.type !== 'ROOM' || property.isActive === false) {
          conflict('room is not available for allocation')
        }
        const buffer = thresholdMinutes * 60000
        const window = {
          startAt: { $lt: new Date(dates.at(-1)!.endAt.getTime() + buffer) },
          endAt: { $gt: new Date(dates[0]!.startAt.getTime() - buffer) },
        }
        const bookingDocs = await m
          .propertyBookings!.find({ propertyId, state: { $in: ['Approved', 'In Use'] }, ...window })
          .session(session)
          .lean()
        const eventDocs = await m
          .events!.find({
            propertyId,
            state: { $in: ['Approved', 'Upcoming', 'Ongoing', 'CREATED', 'PUBLIC', 'ONGOING'] },
            ...window,
          })
          .session(session)
          .lean()
        const defenseDocs = await m
          .eventDefenseSessions!.find({
            propertyId,
            state: { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS'] },
            ...window,
          })
          .session(session)
          .lean()
        const taken = [
          ...bookingDocs.map((doc) => ({
            doc,
            source: 'booking' as const,
            title: String(doc.purpose),
          })),
          ...eventDocs.map((doc) => ({ doc, source: 'event' as const, title: String(doc.title) })),
          ...defenseDocs.map((doc) => ({
            doc,
            source: 'defense' as const,
            title: String(doc.title),
          })),
        ]
        const conflicts: RoomAllocationConflict[] = dates.flatMap((date) =>
          taken
            .filter(({ doc }) =>
              bookingIntervalsConflict(
                date.startAt,
                date.endAt,
                doc.startAt as Date,
                doc.endAt as Date,
                thresholdMinutes,
              ),
            )
            .map(({ doc, source, title }) => ({
              startAt: date.startAt,
              endAt: date.endAt,
              source,
              title,
              ...(doc.clubName ? { clubName: String(doc.clubName) } : {}),
            })),
        )
        if (conflicts.length) {
          conflict('room slot is already allocated or booked', conflicts)
        }
        const docs = dates.map((date) => ({
          _id: new Types.ObjectId(),
          propertyId,
          clubId,
          clubName,
          purpose: ROOM_ALLOCATION_PURPOSE,
          startAt: date.startAt,
          endAt: date.endAt,
          semesterCode: input.semesterCode,
          state: 'Approved',
          currentVersionNo: 0,
          conflictResult: 'No Conflict',
          decidedBy: oid(officerId),
          decidedAt: now,
          createdAt: now,
        }))
        await m.propertyBookings!.insertMany(docs, { session })
        const record: AllocationRecord = {
          semesterCode: input.semesterCode,
          clubId: input.clubId,
          clubName,
          propertyId: input.propertyId,
          weekday: input.weekday,
          slot: input.slot,
          ...(input.note ? { note: input.note } : {}),
          bookingIds: docs.map((doc) => String(doc._id)),
        }
        await audit(id, ALLOCATED, officerId, { ...record, skipped: plan.skipped }, now, session)
        await queueNotifications(session, await clubBoardUserIds(clubId, session), {
          eventCode: ALLOCATED,
          entityType: ROOM_ALLOCATION_ENTITY,
          entityId: id,
          payload: {
            semesterCode: input.semesterCode,
            propertyName: String(property.name),
            weekday: input.weekday,
            slot: input.slot,
          },
          now,
        })
      })
      return (await find(String(id)))!
    },
    // ICPDP thu hồi phân bổ phòng kèm lý do
    async revoke(id, reason, officerId, now) {
      await mongoose.connection.transaction(async (session) => {
        const record = found(
          await m
            .auditLogs!.findOne({
              entityType: ROOM_ALLOCATION_ENTITY,
              entityId: oid(id),
              action: ALLOCATED,
            })
            .session(session)
            .lean(),
          'room allocation not found',
        )
        const item = record.after as AllocationRecord
        await lock(oid(item.propertyId), oid(item.clubId), session)
        if (
          await m
            .auditLogs!.exists({
              entityType: ROOM_ALLOCATION_ENTITY,
              entityId: oid(id),
              action: REVOKED,
            })
            .session(session)
        ) {
          conflict('room allocation is already revoked')
        }
        // Các buổi đã bắt đầu hoặc đã kết thúc giữ làm lịch sử; chỉ các buổi tương lai mới giải phóng phòng.
        const released = await m.propertyBookings!.updateMany(
          { _id: { $in: item.bookingIds.map(oid) }, state: 'Approved', startAt: { $gt: now } },
          {
            $set: {
              state: 'Released',
              cancelReason: reason,
              cancelledAt: now,
              releasedBy: REVOKED,
              isLateCancellation: false,
            },
          },
          { session },
        )
        await audit(
          oid(id),
          REVOKED,
          officerId,
          { released: released.modifiedCount },
          now,
          session,
          reason,
        )
        await queueNotifications(session, await clubBoardUserIds(oid(item.clubId), session), {
          eventCode: REVOKED,
          entityType: ROOM_ALLOCATION_ENTITY,
          entityId: oid(id),
          payload: {
            semesterCode: item.semesterCode,
            weekday: item.weekday,
            slot: item.slot,
            reason,
          },
          now,
        })
      })
      return (await find(id))!
    },
  }
}
