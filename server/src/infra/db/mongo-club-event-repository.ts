import { overduePostEventReports } from './post-event-report-deadlines.js'
import { randomInt, randomUUID } from 'node:crypto'
import mongoose, { Types, type ClientSession } from 'mongoose'
import type {
  ClubEventInput,
  ClubEventRepository,
  EventProposalDocument,
  EventPublishInput,
} from '../../domain/club-event.js'
import { eventActionPermission } from '../../domain/club-event.js'
import {
  assertApprovedEventCancellationNotice,
  assertEventNotice,
  assertProposalAudience,
  assertProposalDocumentPresent,
  eventConflictResult,
  validateClubEventInput,
  validateEventPublication,
} from '../../domain/club-event-rules.js'
import { DomainError } from '../../domain/errors.js'
import {
  bookingCoversEventSchedule,
  mergeConsecutiveBookingIntervals,
  type BookingTimeInterval,
} from '../../domain/facility-booking.js'
import type { AcademicSemester } from '../../domain/policy.js'
import { checkInCode } from '../../domain/school-event.js'
import { openViolationCount, routedTaskFields } from './approval-routing.js'
import { queueNotifications } from './club-board.js'
import { assertEventWriteAccess } from './club-event-access.js'
import {
  clubEventFrom,
  EVENT_PAYLOAD_ACTIONS,
  eventCancellationRequest,
  eventDraftPayload,
  readClubEvent,
  readClubFeedback,
  readEventParticipants,
} from './club-event-readers.js'
import { applyEventAttendanceAction } from './event-attendance-actions.js'
import { loadDefaultEventProposalTemplate } from '../files/event-proposal-files.js'
import { cancelEventInSession } from './event-cancellation.js'
import { promoteEventWaitlist } from './event-waitlist.js'
import { releaseFacilityBookingsInSession } from './mongo-facility-booking-repository.js'
import { ucmsModels as m } from './ucms-models.js'
import { overduePeriodicReports } from './periodic-report-obligations.js'

type Doc = Record<string, unknown>
/** Entity audit cố định cho mẫu đề xuất sự kiện của ICPDP: chỉ có một mẫu và chỉ được thay thế. */
const PROPOSAL_TEMPLATE_ENTITY = new Types.ObjectId('000000000000000000000e01')
export interface ClubEventRules {
  proposalNoticeHours: number
  cancellationNoticeHours: number
}
// Chuyển chuỗi id thành ObjectId
function oid(id: string) {
  return new Types.ObjectId(id)
}
// Ném lỗi conflict với thông báo cho trước
function conflict(message: string): never {
  throw new DomainError(message, 'conflict')
}
// Chuẩn hóa các trường cơ bản của sự kiện từ input
function fields(input: ClubEventInput, semesterCode: string) {
  const first = input.occurrences?.[0]
  const venueText = input.venueText?.trim() || first?.venueText?.trim()
  const propertyId = input.propertyId ?? first?.propertyId
  return {
    title: input.title.trim(),
    objective: input.objective.trim(),
    startAt: input.startAt,
    endAt: input.endAt,
    venueText,
    propertyId: propertyId ? oid(propertyId) : null,
    audienceScope: input.audienceScope,
    capacity: input.capacity,
    semesterCode,
  }
}
// Ghi audit log của sự kiện kèm phiên bản hiện tại
async function audit(
  session: ClientSession,
  id: Types.ObjectId,
  action: string,
  actorId: Types.ObjectId,
  after: unknown,
  now: Date,
  reason?: string,
) {
  const event = await m.events!.findById(id).select({ __v: 1 }).session(session).lean()
  await m.auditLogs!.create(
    [
      {
        entityType: 'Event',
        entityId: id,
        action,
        actorId,
        actorRole: 'Club Member',
        after: { ...(after as Doc), eventVersion: Number(event?.__v ?? 0) },
        reason,
        correlationId: randomUUID(),
        at: now,
      },
    ],
    { session },
  )
}
// Đọc payload sự kiện mới nhất trong transaction, ưu tiên audit rồi tới phiên bản đề xuất
async function payloadInSession(session: ClientSession, id: Types.ObjectId): Promise<Doc> {
  const log = await m
    .auditLogs!.findOne({
      entityType: 'Event',
      entityId: id,
      action: { $in: EVENT_PAYLOAD_ACTIONS },
    })
    .sort({ 'after.eventVersion': -1, at: -1, _id: -1 })
    .session(session)
    .lean()
  if (log) {
    return ((log.after as Doc)?.payload ?? {}) as Doc
  }
  const version = await m
    .eventProposalVersions!.findOne({ eventId: id })
    .sort({ revisionNo: -1 })
    .session(session)
    .lean()
  return {
    ...((version?.payload ?? {}) as Doc),
    budgetLines: version?.budgetLines ?? [],
    bookingIds: [],
  }
}
// Lấy policy đang hiệu lực, báo lỗi nếu chưa cấu hình
async function currentPolicy(session: ClientSession, now: Date) {
  const policy = await m
    .policyVersions!.findOne({ effectiveFrom: { $lte: now } })
    .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
    .session(session)
    .lean()
  if (!policy) {
    throw new DomainError('policy is not configured', 'unavailable')
  }
  return policy
}
// Chặn CLB còn nghĩa vụ quá hạn (quyết toán, hoàn tiền) khi tạo đề xuất
async function assertObligations(
  session: ClientSession,
  clubId: Types.ObjectId,
  now: Date,
  policy: Doc,
) {
  if (!policy.enforceOverdueReportBlock) {
    return
  }
  const obligations: string[] = []
  if (
    await m
      .eventBudgets!.exists({
        clubId,
        state: { $nin: ['Cancelled', 'Closed'] },
        settlementDueAt: { $lt: now },
        settlementSubmittedAt: null,
      })
      .session(session)
  ) {
    obligations.push('overdueSettlement')
  }
  if (
    await m
      .eventBudgets!.exists({ clubId, state: 'Recovery Pending', recoveryDueAt: { $lt: now } })
      .session(session)
  ) {
    obligations.push('overdueRefund')
  }
  for (const code of await overduePeriodicReports(clubId, now, session)) {
    obligations.push(`overduePeriodicReport:${code}`)
  }
  for (const id of await overduePostEventReports(clubId, now, session)) {
    obligations.push(`overduePostEventReport:${String(id)}`)
  }
  if (obligations.length) {
    throw new DomainError('overdue club obligations prevent proposal submission', 'conflict', {
      obligations,
    })
  }
}
// Đánh giá đề xuất sự kiện: CLB Active, thời hạn, xung đột lịch, nghĩa vụ
async function assess(
  session: ClientSession,
  clubId: Types.ObjectId,
  input: ClubEventInput,
  eventId: Types.ObjectId | undefined,
  now: Date,
  submitting: boolean,
  rules: ClubEventRules,
) {
  const club = await m.clubs!.findById(clubId).session(session).lean()
  if (!club || club.state !== 'Active') {
    conflict('club is not active for event proposals')
  }
  const policy = await currentPolicy(session, now)
  const semesterCode = validateClubEventInput(
    input,
    policy.academicCalendar as AcademicSemester[],
    now,
  )
  const dissolution = club.dissolution as { effectiveTo?: Date } | undefined
  if (dissolution?.effectiveTo && input.endAt > dissolution.effectiveTo) {
    conflict('event ends after the dissolution semester')
  }
  if (submitting) {
    assertEventNotice(input.startAt, now, rules.proposalNoticeHours)
    await assertObligations(session, clubId, now, policy)
  }
  const found: Doc[] = []
  const overlaps: number[] = []
  const intervals = input.occurrences?.length
    ? input.occurrences.map((o) => ({
        startAt: o.startAt,
        endAt: o.endAt,
        propertyId: o.propertyId ?? input.propertyId,
      }))
    : [{ startAt: input.startAt, endAt: input.endAt, propertyId: input.propertyId }]
  for (const interval of intervals) {
    if (!interval.propertyId) {
      continue
    }
    const property = await m
      .properties!.findOneAndUpdate(
        { _id: oid(interval.propertyId), isActive: true },
        { $inc: { __v: 1 } },
        { session },
      )
      .lean()
    if (!property) {
      throw new DomainError('active property not found', 'validation')
    }
    const blackouts = (property.blackouts ?? []) as { startAt: Date; endAt: Date }[]
    if (
      blackouts.some(
        (b) => new Date(b.startAt) < interval.endAt && new Date(b.endAt) > interval.startAt,
      )
    ) {
      conflict('property is blacked out during the event')
    }
    const overlap = { startAt: { $lt: interval.endAt }, endAt: { $gt: interval.startAt } }
    const intervalConflicts: Doc[] = []
    intervalConflicts.push(
      ...(await m
        .events!.find({
          propertyId: property._id,
          ...(eventId ? { _id: { $ne: eventId } } : {}),
          state: { $in: ['Approved', 'Upcoming', 'Ongoing', 'CREATED', 'PUBLIC', 'ONGOING'] },
          ...overlap,
        })
        .session(session)
        .lean()),
    )
    const bookings = await m
      .propertyBookings!.find({
        propertyId: property._id,
        state: { $in: ['Approved', 'In Use'] },
        _id: { $nin: input.bookingIds.map(oid) },
        ...(eventId ? { eventId: { $ne: eventId } } : {}),
        ...overlap,
      })
      .session(session)
      .lean()
    // UC58: phân phòng của chính CLB phủ trọn khung giờ (hoặc các khung liên tiếp) là quyền sử dụng phòng của CLB, không phải xung đột.
    const ownRoomWindows =
      property.type === 'ROOM'
        ? mergeConsecutiveBookingIntervals(
            bookings
              .filter((b) => String(b.clubId) === String(clubId))
              .map((b) => ({ startAt: b.startAt as Date, endAt: b.endAt as Date })),
          )
        : []
    const coveredByOwnRoom = ownRoomWindows.some(
      (w) => w.startAt <= interval.startAt && w.endAt >= interval.endAt,
    )
    intervalConflicts.push(
      ...bookings.filter((b) => !(coveredByOwnRoom && String(b.clubId) === String(clubId))),
    )
    intervalConflicts.push(
      ...(await m
        .eventDefenseSessions!.find({
          propertyId: property._id,
          state: { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS'] },
          ...overlap,
        })
        .session(session)
        .lean()),
    )
    found.push(...intervalConflicts)
    overlaps.push(
      ...intervalConflicts.map(
        (item) =>
          (Math.min((item.endAt as Date).getTime(), interval.endAt.getTime()) -
            Math.max((item.startAt as Date).getTime(), interval.startAt.getTime())) /
          60000,
      ),
    )
  }
  const sessionPropertyIds = new Set(
    intervals.map((iv) => iv.propertyId).filter((id): id is string => Boolean(id)),
  )
  const checkedBookings: Array<{
    bookingId: string
    propertyId: string
    propertyType: string
    interval: BookingTimeInterval
  }> = []
  for (const bookingId of input.bookingIds) {
    const booking = await m
      .propertyBookings!.findOne({
        _id: oid(bookingId),
        clubId,
        state: { $in: ['Draft', 'Requested', 'Under Review', 'Revision Requested', 'Approved'] },
      })
      .session(session)
      .lean()
    const bookingProperty = booking
      ? await m.properties!.findById(booking.propertyId).session(session).lean()
      : null
    if (bookingProperty?.type === 'ROOM') {
      throw new DomainError(
        'room allocations cannot be attached to an event proposal',
        'validation',
        { bookingId, bookingError: 'room_allocation' },
      )
    }
    if (!booking) {
      throw new DomainError(
        'booking does not belong to the club or is no longer available',
        'validation',
        { bookingId, bookingError: 'not_available' },
      )
    }
    if (booking.eventId && String(booking.eventId) !== String(eventId)) {
      throw new DomainError('booking is already attached to another event', 'validation', {
        bookingId,
        bookingError: 'already_linked',
      })
    }
    if (
      bookingProperty?.type !== 'EQUIPMENT' &&
      !sessionPropertyIds.has(String(booking.propertyId))
    ) {
      throw new DomainError(
        'booking facility does not match the selected event facility',
        'validation',
        { bookingId, bookingError: 'property_mismatch' },
      )
    }
    checkedBookings.push({
      bookingId,
      propertyId: String(booking.propertyId),
      propertyType: String(bookingProperty?.type ?? ''),
      interval: { startAt: booking.startAt as Date, endAt: booking.endAt as Date },
    })
  }
  for (const item of checkedBookings) {
    const samePropertyIntervals = checkedBookings
      .filter((other) => other.propertyId === item.propertyId)
      .map((other) => other.interval)
    const targetIntervals =
      item.propertyType === 'EQUIPMENT'
        ? intervals
        : intervals.filter((iv) => iv.propertyId === item.propertyId)
    if (!bookingCoversEventSchedule(item.interval, samePropertyIntervals, targetIntervals)) {
      throw new DomainError('booking time slot does not cover the event schedule', 'validation', {
        bookingId: item.bookingId,
        bookingError: 'schedule_not_covered',
      })
    }
  }
  const conflictResult = eventConflictResult(
    overlaps,
    Number(policy.conflictThresholdMinutes),
    policy.allowOverbooking === true,
  )
  if (submitting && conflictResult === 'Blocking Conflict') {
    throw new DomainError('event schedule has blocking conflicts', 'conflict', {
      conflicts: found.map((d) => String(d._id)),
    })
  }
  return {
    club,
    semesterCode,
    conflictResult,
    conflictDetail: found.map((d) => ({
      id: String(d._id),
      title: String(d.title ?? d.purpose ?? ''),
      startAt: d.startAt,
      endAt: d.endAt,
    })),
  }
}
// Nộp một phiên bản đề xuất sự kiện và mở task review ICPDP
async function submitVersion(
  session: ClientSession,
  event: Doc,
  input: ClubEventInput,
  actorId: Types.ObjectId,
  now: Date,
  assessment: Awaited<ReturnType<typeof assess>>,
  requireBookingPermission = true,
) {
  const revisionNo = Number(event.currentRevisionNo ?? 0) + 1
  const existingBudget = await m
    .eventBudgets!.findOne({ eventId: event._id })
    .session(session)
    .lean()
  if (existingBudget && !input.budgetLines.length) {
    conflict('an event with an approved budget must keep its budget lines when resubmitting')
  }
  const activeDefense = await m
    .eventDefenseSessions!.findOne({
      eventId: event._id,
      state: { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS'] },
    })
    .session(session)
    .lean()
  const state = activeDefense ? 'Under Review' : 'Pending Approval'
  await m.eventProposalVersions!.create(
    [
      {
        eventId: event._id,
        revisionNo,
        payload: input,
        budgetLines: input.budgetLines,
        requestedBudgetTotal: Types.Decimal128.fromString(
          String(input.budgetLines.reduce((sum, line) => sum + line.amount, 0)),
        ),
        conflictResult: assessment.conflictResult,
        submittedBy: actorId,
        submittedAt: now,
      },
    ],
    { session },
  )
  await m.events!.updateOne(
    { _id: event._id },
    {
      $set: {
        ...fields(input, assessment.semesterCode),
        state,
        currentRevisionNo: revisionNo,
        conflictResult: assessment.conflictResult,
        conflictDetail: assessment.conflictDetail,
      },
      $unset: { revisionDeadlineAt: '' },
    },
    { session },
  )
  // UC05: ngân sách, rủi ro và các vụ việc đang mở của CLB quyết định, một lần duy nhất, SLA của review này.
  await m.approvalTasks!.create(
    [
      {
        entityType: 'EVENT_PROPOSAL',
        entityId: event._id,
        clubId: event.clubId,
        title: input.title,
        state: 'Open',
        openedAt: now,
        ...(activeDefense ? { assigneeId: activeDefense.leadOfficerId } : {}),
        ...(await routedTaskFields(
          session,
          {
            requestType: 'EVENT_PROPOSAL',
            amount: input.budgetLines.reduce((sum, line) => sum + line.amount, 0),
            openViolations: await openViolationCount(event.clubId, session),
          },
          now,
        )),
      },
    ],
    { session },
  )
  await linkEventBookings(
    session,
    event._id as Types.ObjectId,
    event.clubId as Types.ObjectId,
    input.bookingIds,
    actorId,
    now,
    requireBookingPermission,
  )
  await syncProposalSessionBookings(
    session,
    event._id as Types.ObjectId,
    event.clubId as Types.ObjectId,
    String(assessment.club.name),
    input,
    assessment.semesterCode,
    assessment.conflictResult,
    'Under Review',
    now,
  )
  await audit(
    session,
    event._id as Types.ObjectId,
    'EVENT_PROPOSAL_SUBMITTED',
    actorId,
    { payload: input, state, revisionNo },
    now,
  )
}
// Gắn các booking đã chọn vào sự kiện
async function linkEventBookings(
  session: ClientSession,
  eventId: Types.ObjectId,
  clubId: Types.ObjectId,
  bookingIds: string[],
  actorId: Types.ObjectId,
  now: Date,
  requireBookingPermission: boolean,
) {
  const linked = await m
    .propertyBookings!.find({ eventId, currentVersionNo: { $ne: 0 } })
    .session(session)
    .lean()
  if (
    requireBookingPermission &&
    (linked.length !== bookingIds.length ||
      linked.some((booking) => !bookingIds.includes(String(booking._id))))
  ) {
    await assertEventWriteAccess(session, clubId, actorId, 'club.booking.manage', now)
  }
  await m.propertyBookings!.updateMany(
    { eventId, currentVersionNo: { $ne: 0 }, _id: { $nin: bookingIds.map(oid) } },
    { $unset: { eventId: '' } },
    { session },
  )
  for (const bookingId of bookingIds) {
    await m.propertyBookings!.updateOne(
      { _id: oid(bookingId), clubId },
      { $set: { eventId } },
      { session },
    )
  }
}
// Đồng bộ booking nháp theo các buổi trong đề xuất sự kiện
async function syncProposalSessionBookings(
  session: ClientSession,
  eventId: Types.ObjectId,
  clubId: Types.ObjectId,
  clubName: string,
  input: ClubEventInput,
  semesterCode: string,
  conflictResult: string,
  bookingState: 'Draft' | 'Under Review',
  now: Date,
) {
  await m.propertyBookings!.deleteMany({ eventId, currentVersionNo: 0 }, { session })
  if (input.bookingIds.length) {
    await m.propertyBookings!.updateMany(
      {
        _id: { $in: input.bookingIds.map(oid) },
        clubId,
        state: { $in: ['Draft', 'Revision Requested', 'Under Review'] },
      },
      { $set: { state: bookingState } },
      { session },
    )
  }
  const intervals = input.occurrences?.length
    ? input.occurrences.map((o) => ({
        startAt: o.startAt,
        endAt: o.endAt,
        propertyId: o.propertyId ?? input.propertyId,
      }))
    : [{ startAt: input.startAt, endAt: input.endAt, propertyId: input.propertyId }]
  const explicitBookings = input.bookingIds.length
    ? await m
        .propertyBookings!.find({ _id: { $in: input.bookingIds.map(oid) }, clubId })
        .session(session)
        .lean()
    : []
  for (const iv of intervals) {
    if (!iv.propertyId) {
      continue
    }
    const prop = await m.properties!.findById(oid(iv.propertyId)).session(session).lean()
    if (!prop || prop.type === 'ROOM') {
      continue
    }
    const sameProp = explicitBookings
      .filter((b) => String(b.propertyId) === iv.propertyId)
      .map((b) => ({ startAt: b.startAt as Date, endAt: b.endAt as Date }))
    if (
      mergeConsecutiveBookingIntervals(sameProp).some(
        (w) => w.startAt <= iv.startAt && w.endAt >= iv.endAt,
      )
    ) {
      continue
    }
    await m.propertyBookings!.create(
      [
        {
          propertyId: prop._id,
          clubId,
          clubName,
          eventId,
          purpose: input.title.trim(),
          startAt: iv.startAt,
          endAt: iv.endAt,
          semesterCode,
          headcount: input.capacity,
          state: bookingState,
          currentVersionNo: 0,
          conflictResult,
          createdAt: now,
        },
      ],
      { session },
    )
  }
}
// Công bố sự kiện: mở đăng ký, tạo mã check-in và thông báo thành viên
async function publishInSession(
  session: ClientSession,
  id: Types.ObjectId,
  clubId: Types.ObjectId,
  title: string,
  startAt: Date,
  endAt: Date,
  input: EventPublishInput,
  state: 'Upcoming' | 'PUBLIC',
  actorId: Types.ObjectId,
  now: Date,
) {
  validateEventPublication(input, startAt, endAt, now)
  const { notifyMembers, ...schedule } = input
  const code = checkInCode(() => randomInt(1000000) / 1000000)
  await m.events!.updateOne(
    { _id: id },
    { $set: { ...schedule, state, publishedAt: now, checkInCode: code } },
    { session },
  )
  await audit(session, id, 'EVENT_PUBLISHED', actorId, { state, ...input }, now)
  if (state === 'PUBLIC' && notifyMembers) {
    const userIds = await m
      .clubMemberships!.find({ clubId, state: 'Active' })
      .session(session)
      .distinct('userId')
    await queueNotifications(
      session,
      userIds,
      'EVENT_PUBLISHED',
      'Event',
      id,
      { clubId: String(clubId), title, startAt, endAt },
      now,
    )
  }
}
// Chuyển input sự kiện nội bộ thành input sự kiện chuẩn (chỉ thành viên)
/** Sự kiện nội bộ dùng lại cấu trúc đầu vào của đề xuất: luôn chỉ dành cho thành viên và không bao giờ có ngân sách của trường. */
export function mongoClubEventRepository(rules: ClubEventRules): ClubEventRepository {
  async function required(clubId: string, eventId: string) {
    const detail = await readClubEvent(clubId, eventId)
    if (!detail) {
      throw new DomainError('event not found', 'not_found')
    }
    return detail
  }
  return {
    // Lấy tài sản và booking CLB có thể gắn vào sự kiện
    async options(clubId) {
      const [properties, bookings] = await Promise.all([
        m.properties!.find({ isActive: true }).sort({ name: 1 }).lean(),
        m
          .propertyBookings!.find({
            clubId: oid(clubId),
            currentVersionNo: { $ne: 0 },
            state: {
              $in: ['Draft', 'Requested', 'Under Review', 'Revision Requested', 'Approved'],
            },
          })
          .lean(),
      ])
      const requestBookings = bookings.filter((b) => {
        const property = properties.find((p) => String(p._id) === String(b.propertyId))
        return property && property.type !== 'ROOM'
      })
      return {
        properties: properties.map((p) => ({ id: String(p._id), name: String(p.name) })),
        bookings: requestBookings.map((b) => ({
          id: String(b._id),
          propertyId: String(b.propertyId),
          propertyType: String(
            properties.find((p) => String(p._id) === String(b.propertyId))!.type,
          ),
          ...(b.eventId ? { eventId: String(b.eventId) } : {}),
          title: String(b.purpose),
          startAt: b.startAt as Date,
          endAt: b.endAt as Date,
        })),
      }
    },
    // Liệt kê sự kiện do CLB tổ chức, mới nhất trước
    async list(clubId) {
      const docs = await m
        .events!.find({ clubId: oid(clubId), organizerType: 'CLUB', audienceScope: 'PUBLIC' })
        .sort({ startAt: -1, _id: -1 })
        .lean()
      return Promise.all(
        docs.map(async (doc) =>
          clubEventFrom(
            doc,
            await eventDraftPayload(doc._id as Types.ObjectId),
            await eventCancellationRequest(doc._id as Types.ObjectId),
          ),
        ),
      )
    },
    // Đọc chi tiết sự kiện, danh sách người tham gia và feedback
    find: readClubEvent,
    participants: readEventParticipants,
    feedback: readClubFeedback,
    // Lấy tài liệu đề xuất của sự kiện theo phiên bản
    async proposalDocument(eventId, revision) {
      const event = await m
        .events!.findOne({ _id: oid(eventId), organizerType: 'CLUB' })
        .select({ clubId: 1 })
        .lean()
      if (!event) {
        return null
      }
      const versions = m
        .eventProposalVersions!.findOne({
          eventId: event._id,
          ...(typeof revision === 'number' ? { revisionNo: revision } : {}),
        })
        .sort({ revisionNo: -1 })
        .select({ payload: 1 })
      let payload = revision === 'draft' ? await eventDraftPayload(event._id as Types.ObjectId) : {}
      // Sự kiện tạo trước khi có audit bản nháp thì dùng revision mới nhất, giống readClubEvent.
      if (!Object.keys(payload).length) {
        payload = ((await versions.lean())?.payload ?? {}) as Doc
      }
      return {
        clubId: String(event.clubId),
        document: (payload.proposalDocument as EventProposalDocument | undefined) ?? null,
      }
    },
    // Lấy mẫu tài liệu đề xuất đang dùng (mẫu ICPDP tải lên hoặc mặc định)
    async proposalTemplate() {
      const log = await m
        .auditLogs!.findOne({
          entityType: 'SystemTemplate',
          entityId: PROPOSAL_TEMPLATE_ENTITY,
          action: 'EVENT_PROPOSAL_TEMPLATE_UPDATED',
        })
        .sort({ at: -1, _id: -1 })
        .lean()
      const uploaded = log?.after as EventProposalDocument | undefined
      if (uploaded) {
        return {
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          bytes: uploaded.bytes,
          updatedAt: uploaded.uploadedAt,
          isSystemDefault: false as const,
          assetId: uploaded.assetId,
        }
      }
      const fallback = await loadDefaultEventProposalTemplate()
      return { ...fallback, bytes: fallback.content.length, isSystemDefault: true as const }
    },
    // ICPDP lưu mẫu tài liệu đề xuất mới (append-only)
    async saveProposalTemplate(document, actorId, now) {
      // Chỉ thêm, không sửa: bản ghi mới nhất là mẫu đang dùng; các bản cũ giữ làm lịch sử.
      await m.auditLogs!.create({
        entityType: 'SystemTemplate',
        entityId: PROPOSAL_TEMPLATE_ENTITY,
        action: 'EVENT_PROPOSAL_TEMPLATE_UPDATED',
        actorId: oid(actorId),
        actorRole: 'ICPDP Officer',
        after: document,
        correlationId: randomUUID(),
        at: now,
      })
      return {
        fileName: document.fileName,
        mimeType: document.mimeType,
        bytes: document.bytes,
        updatedAt: document.uploadedAt,
        isSystemDefault: false,
      }
    },
    // Tạo bản nháp đề xuất sự kiện của CLB
    async create(clubId, input, actorId, now) {
      assertProposalAudience(input)
      const id = new Types.ObjectId()
      await mongoose.connection.transaction(async (session) => {
        await assertEventWriteAccess(session, oid(clubId), oid(actorId), 'club.event.manage', now)
        const assessment = await assess(session, oid(clubId), input, undefined, now, false, rules)
        await m.events!.create(
          [
            {
              _id: id,
              organizerType: 'CLUB',
              clubId: oid(clubId),
              clubName: assessment.club.name,
              ...fields(input, assessment.semesterCode),
              state: 'Draft',
              currentRevisionNo: 0,
              createdAt: now,
              conflictResult: assessment.conflictResult,
              conflictDetail: assessment.conflictDetail,
            },
          ],
          { session },
        )
        await linkEventBookings(session, id, oid(clubId), input.bookingIds, oid(actorId), now, true)
        await syncProposalSessionBookings(
          session,
          id,
          oid(clubId),
          String(assessment.club.name),
          input,
          assessment.semesterCode,
          assessment.conflictResult,
          'Draft',
          now,
        )
        await audit(session, id, 'EVENT_DRAFT_CREATED', oid(actorId), { payload: input }, now)
      })
      return required(clubId, String(id))
    },
    // Tạo hoặc nháp sự kiện nội bộ của CLB, có thể công bố ngay
    // Thực hiện hành động trên sự kiện: lưu, nộp, hủy, dời lịch, công bố, điểm danh
    async act(clubId, eventId, action, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const permissions = await assertEventWriteAccess(
          session,
          oid(clubId),
          oid(actorId),
          action.kind === 'unlock' ? 'ATTENDANCE_UNLOCK' : eventActionPermission(action),
          now,
        )
        const event = await m
          .events!.findOneAndUpdate(
            {
              _id: oid(eventId),
              clubId: oid(clubId),
              organizerType: 'CLUB',
              ...('expectedVersion' in action ? { __v: action.expectedVersion } : {}),
            },
            { $inc: { __v: 1 } },
            { session },
          )
          .lean()
        if (!event) {
          conflict('event changed or is not available in this club; reload and retry')
        }
        const payload = await payloadInSession(session, event._id as Types.ObjectId)
        // Document đã lưu giữ asset id của nó, nên nộp và dời lịch sẽ đóng băng đầy đủ metadata vào revision.
        const proposalDocument = payload.proposalDocument as EventProposalDocument | undefined
        const input = {
          ...clubEventFrom(event, payload),
          budgetLines: (payload.budgetLines ?? []) as ClubEventInput['budgetLines'],
          ...(proposalDocument ? { proposalDocument } : {}),
        }
        if (
          action.kind === 'save' ||
          action.kind === 'submit' ||
          action.kind === 'attach-document'
        ) {
          if (!['Draft', 'Revision Requested'].includes(String(event.state))) {
            conflict('event cannot be edited or submitted')
          }
          if (event.revisionDeadlineAt && (event.revisionDeadlineAt as Date) <= now) {
            conflict('revision deadline has passed')
          }
          if (action.kind === 'attach-document') {
            await audit(
              session,
              oid(eventId),
              'EVENT_PROPOSAL_DOCUMENT_UPLOADED',
              oid(actorId),
              { payload: { ...payload, proposalDocument: action.document } },
              now,
            )
            return
          }
          // Lưu các trường văn bản vẫn giữ document đã đính kèm trước đó.
          const next =
            action.kind === 'save'
              ? { ...action.input, ...(proposalDocument ? { proposalDocument } : {}) }
              : input
          assertProposalAudience(next)
          if (action.kind === 'submit') {
            assertProposalDocumentPresent(proposalDocument)
          }
          const assessment = await assess(
            session,
            oid(clubId),
            next,
            oid(eventId),
            now,
            action.kind === 'submit',
            rules,
          )
          if (action.kind === 'save') {
            await m.events!.updateOne(
              { _id: event._id },
              {
                $set: {
                  ...fields(next, assessment.semesterCode),
                  conflictResult: assessment.conflictResult,
                  conflictDetail: assessment.conflictDetail,
                },
              },
              { session },
            )
            await linkEventBookings(
              session,
              oid(eventId),
              oid(clubId),
              next.bookingIds,
              oid(actorId),
              now,
              true,
            )
            await syncProposalSessionBookings(
              session,
              oid(eventId),
              oid(clubId),
              String(assessment.club.name),
              next,
              assessment.semesterCode,
              assessment.conflictResult,
              'Draft',
              now,
            )
            await audit(
              session,
              oid(eventId),
              'EVENT_DRAFT_SAVED',
              oid(actorId),
              { payload: next },
              now,
            )
          } else {
            await submitVersion(session, event, next, oid(actorId), now, assessment)
          }
        } else if (action.kind === 'publish') {
          if (event.state !== 'Approved') {
            conflict('only approved events can be published')
          }
          if (
            await m
              .approvalTasks!.exists({
                entityType: 'EVENT_CANCELLATION',
                entityId: event._id,
                state: 'Open',
              })
              .session(session)
          ) {
            conflict('event has a pending cancellation request')
          }
          await publishInSession(
            session,
            event._id as Types.ObjectId,
            oid(clubId),
            String(event.title),
            event.startAt as Date,
            event.endAt as Date,
            action.input,
            'Upcoming',
            oid(actorId),
            now,
          )
        } else if (action.kind === 'cancel') {
          if (['Approved', 'Upcoming', 'Ongoing'].includes(String(event.state))) {
            if (event.attendanceFinalized === true) {
              conflict('finalized attendance prevents cancellation')
            }
            assertApprovedEventCancellationNotice(event.startAt as Date, now)
            if (
              await m
                .approvalTasks!.exists({
                  entityType: 'EVENT_CANCELLATION',
                  entityId: event._id,
                  state: 'Open',
                })
                .session(session)
            ) {
              conflict('event cancellation request is already pending ICPDP confirmation')
            }
            const changed = await m.events!.updateOne(
              { _id: event._id, state: event.state, attendanceFinalized: { $ne: true } },
              { $inc: { __v: 1 } },
              { session },
            )
            if (changed.modifiedCount !== 1) {
              conflict('event changed while cancelling')
            }
            await m.approvalTasks!.create(
              [
                {
                  entityType: 'EVENT_CANCELLATION',
                  entityId: event._id,
                  clubId: oid(clubId),
                  title: String(event.title),
                  state: 'Open',
                  openedAt: now,
                },
              ],
              { session },
            )
            await audit(
              session,
              oid(eventId),
              'EVENT_CANCELLATION_REQUESTED',
              oid(actorId),
              { reason: action.reason, requestedAt: now },
              now,
              action.reason,
            )
            const officerRoles = await m
              .roles!.find({ code: 'ICPDP_OFFICER', scope: 'system' })
              .session(session)
              .distinct('_id')
            const officers = await m
              .userRoleAssignments!.find({ roleId: { $in: officerRoles }, revokedAt: null })
              .session(session)
              .distinct('userId')
            await queueNotifications(
              session,
              officers,
              'EVENT_CANCELLATION_REQUESTED',
              'Event',
              event._id as Types.ObjectId,
              { title: event.title, clubId, clubName: event.clubName, reason: action.reason },
              now,
            )
          } else if (['DRAFT', 'CREATED', 'PUBLIC', 'ONGOING'].includes(String(event.state))) {
            await cancelEventInSession(
              session,
              event,
              action.reason,
              now,
              'CMB',
              rules.cancellationNoticeHours,
              oid(actorId),
            )
          } else {
            conflict('event cannot be cancelled in its current state')
          }
        } else if (action.kind === 'reschedule') {
          if (
            !['Approved', 'Upcoming'].includes(String(event.state)) ||
            event.attendanceFinalized === true
          ) {
            conflict('only an unstarted approved event can be rescheduled')
          }
          if (
            await m
              .approvalTasks!.exists({
                entityType: 'EVENT_CANCELLATION',
                entityId: event._id,
                state: 'Open',
              })
              .session(session)
          ) {
            conflict('event has a pending cancellation request')
          }
          if (await m.attendances!.exists({ eventId: event._id }).session(session)) {
            conflict('an event with check-ins cannot be rescheduled')
          }
          const offset = action.startAt.getTime() - input.startAt.getTime()
          const next = {
            ...input,
            startAt: action.startAt,
            endAt: action.endAt,
            propertyId: action.propertyId,
            venueText: action.venueText,
            bookingIds: [],
            occurrences: input.occurrences?.map((occurrence) => ({
              ...occurrence,
              startAt: new Date(occurrence.startAt.getTime() + offset),
              endAt: new Date(occurrence.endAt.getTime() + offset),
            })),
          }
          const assessment = await assess(
            session,
            oid(clubId),
            next,
            oid(eventId),
            now,
            false,
            rules,
          )
          if (assessment.conflictResult === 'Blocking Conflict') {
            conflict('event schedule has blocking conflicts')
          }
          await releaseFacilityBookingsInSession(
            session,
            {
              eventId: event._id,
              state: {
                $in: ['Draft', 'Requested', 'Under Review', 'Revision Requested', 'Approved'],
              },
            },
            'EVENT_RESCHEDULE',
            action.reason,
            now,
          )
          await submitVersion(session, event, next, oid(actorId), now, assessment, false)
          await audit(
            session,
            oid(eventId),
            'EVENT_RESCHEDULED',
            oid(actorId),
            { payload: next, previousStartAt: event.startAt, previousEndAt: event.endAt },
            now,
            action.reason,
          )
          const registrations = await m
            .eventRegistrations!.find({
              eventId: event._id,
              state: { $in: ['Confirmed', 'Waitlisted'] },
            })
            .session(session)
            .lean()
          if (registrations.length) {
            await m.notifications!.create(
              registrations.map((r) => ({
                recipientUserId: r.studentId,
                eventCode: 'EVENT_RESCHEDULED',
                entityType: 'Event',
                entityId: event._id,
                channels: ['IN_APP'],
                payload: {
                  title: event.title,
                  startAt: action.startAt,
                  endAt: action.endAt,
                  reason: action.reason,
                },
                state: 'Queued',
                dueAt: now,
                attempts: 0,
                createdAt: now,
              })),
              { session, ordered: true },
            )
          }
        } else if (action.kind === 'capacity' || action.kind === 'promote') {
          if (
            !['Upcoming', 'PUBLIC'].includes(String(event.state)) ||
            (event.startAt as Date) <= now ||
            !(event.registrationOpenAt instanceof Date) ||
            !(event.registrationCloseAt instanceof Date) ||
            event.registrationOpenAt > now ||
            event.registrationCloseAt <= now
          ) {
            conflict('registration is not open')
          }
          if (action.kind === 'capacity') {
            if (action.capacity < Number(event.confirmedRegistrationCount)) {
              const affected = await m
                .eventRegistrations!.find({ eventId: event._id, state: 'Confirmed' })
                .session(session)
                .distinct('_id')
              throw new DomainError(
                'capacity cannot be below confirmed registrations',
                'conflict',
                { registrationIds: affected.map(String) },
              )
            }
            await m.events!.updateOne(
              { _id: event._id },
              { $set: { capacity: action.capacity } },
              { session },
            )
            await promoteEventWaitlist(session, oid(eventId), now, oid(actorId))
          } else {
            await promoteEventWaitlist(
              session,
              oid(eventId),
              now,
              oid(actorId),
              oid(action.registrationId),
            )
          }
          await audit(
            session,
            oid(eventId),
            `EVENT_${action.kind.toUpperCase()}`,
            oid(actorId),
            action,
            now,
          )
        } else {
          const version = await m
            .eventProposalVersions!.findOne({
              eventId: event._id,
              revisionNo: event.currentRevisionNo,
            })
            .session(session)
            .lean()
          const direct =
            event.audienceScope === 'MEMBERS_ONLY' &&
            Number(String(version?.requestedBudgetTotal ?? 0)) === 0 &&
            !(await m.eventBudgets!.exists({ eventId: event._id }).session(session))
          await applyEventAttendanceAction(
            session,
            event,
            action,
            oid(actorId),
            now,
            direct,
            permissions.includes('club.event.manage'),
          )
          await audit(
            session,
            oid(eventId),
            `EVENT_ATTENDANCE_${action.kind.toUpperCase()}`,
            oid(actorId),
            action,
            now,
            'reason' in action ? action.reason : undefined,
          )
        }
      })
      return required(clubId, eventId)
    },
  }
}
