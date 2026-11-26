import { Types } from 'mongoose'
import { summarizeFeedback, FEEDBACK_CRITERION } from '../../domain/event-feedback.js'
import {
  publicEventPayload,
  type ClubEvent,
  type ClubEventDetail,
  type ClubFeedbackSummary,
  type EventCancellationRequest,
  type EventParticipant,
} from '../../domain/club-event.js'
import { DomainError } from '../../domain/errors.js'
import { ucmsModels as m } from './ucms-models.js'

type Doc = Record<string, unknown>
// Chuyển chuỗi id thành ObjectId
function oid(id: string) {
  return new Types.ObjectId(id)
}
// Chuyển giá trị tiền (Decimal/chuỗi) sang number
export function eventMoney(value: unknown): number {
  return Number(String(value ?? 0))
}
// Ánh xạ document sự kiện + payload thành ClubEvent của domain
export function clubEventFrom(
  doc: Doc,
  payload: Doc = {},
  cancellationRequest?: EventCancellationRequest,
): ClubEvent {
  return {
    ...publicEventPayload(payload),
    ...(cancellationRequest ? { cancellationRequest } : {}),
    id: String(doc._id),
    clubId: String(doc.clubId),
    clubName: String(doc.clubName),
    title: String(doc.title),
    objective: String(doc.objective ?? ''),
    plan: String(payload.plan ?? ''),
    startAt: doc.startAt as Date,
    endAt: doc.endAt as Date,
    semesterCode: String(doc.semesterCode),
    venueText: doc.venueText as string | undefined,
    propertyId: doc.propertyId ? String(doc.propertyId) : undefined,
    audienceScope: doc.audienceScope as ClubEvent['audienceScope'],
    capacity: Number(doc.capacity),
    budgetLines: (payload.budgetLines ?? []) as ClubEvent['budgetLines'],
    bookingIds: (payload.bookingIds ?? []) as string[],
    state: doc.state as ClubEvent['state'],
    version: Number(doc.__v ?? 0),
    currentRevisionNo: Number(doc.currentRevisionNo ?? 0),
    confirmedRegistrationCount: Number(doc.confirmedRegistrationCount ?? 0),
    approvalConditions: (doc.approvalConditions ?? []) as string[],
    attendanceFinalized: doc.attendanceFinalized === true,
    conflictResult: doc.conflictResult as string | undefined,
    conflictDetail: doc.conflictDetail,
    publishedAt: doc.publishedAt as Date | undefined,
    registrationOpenAt: doc.registrationOpenAt as Date | undefined,
    registrationCloseAt: doc.registrationCloseAt as Date | undefined,
    checkInCode: doc.checkInCode as string | undefined,
    checkInOpenAt: doc.checkInOpenAt as Date | undefined,
    checkInCloseAt: doc.checkInCloseAt as Date | undefined,
    allowWalkIn: doc.allowWalkIn === true,
    waitlistEnabled: doc.waitlistEnabled === true,
    revisionDeadlineAt: doc.revisionDeadlineAt as Date | undefined,
  }
}
/** Các audit action có `after.payload` chứa dữ liệu đầu vào mới nhất của sự kiện (nội dung kế hoạch, bookingIds, dòng ngân sách). */
export const EVENT_PAYLOAD_ACTIONS = [
  'EVENT_DRAFT_CREATED',
  'EVENT_DRAFT_SAVED',
  'EVENT_PROPOSAL_SUBMITTED',
  'RECORD_INTERNAL',
  'EVENT_RESCHEDULED',
  'INTERNAL_EVENT_DRAFT_SAVED',
  'INTERNAL_EVENT_CREATED',
  'INTERNAL_EVENT_SAVED',
  'EVENT_PROPOSAL_DOCUMENT_UPLOADED',
]
// Đọc payload bản nháp/đề xuất mới nhất của sự kiện từ audit log
export async function eventDraftPayload(eventId: Types.ObjectId): Promise<Doc> {
  const audit = await m
    .auditLogs!.findOne({
      entityType: 'Event',
      entityId: eventId,
      action: { $in: EVENT_PAYLOAD_ACTIONS },
    })
    .sort({ 'after.eventVersion': -1, at: -1, _id: -1 })
    .lean()
  return ((audit?.after as Doc | undefined)?.payload ?? {}) as Doc
}
export const EVENT_CANCELLATION_ACTIONS = [
  'EVENT_CANCELLATION_REQUESTED',
  'EVENT_CANCELLATION_APPROVED',
  'EVENT_CANCELLATION_REJECTED',
] as const
// Đọc yêu cầu hủy sự kiện gần nhất và trạng thái duyệt từ audit log
export async function eventCancellationRequest(
  eventId: Types.ObjectId,
): Promise<EventCancellationRequest | undefined> {
  const audit = await m
    .auditLogs!.findOne({
      entityType: 'Event',
      entityId: eventId,
      action: { $in: EVENT_CANCELLATION_ACTIONS },
    })
    .sort({ at: -1, _id: -1 })
    .lean()
  return audit ? cancellationFromAudit(audit) : undefined
}
// Dựng yêu cầu hủy từ dòng audit hủy sự kiện gần nhất
function cancellationFromAudit(audit: Doc): EventCancellationRequest {
  const after = (audit.after as Doc | undefined) ?? {}
  const action = String(audit.action)
  const state =
    action === 'EVENT_CANCELLATION_REQUESTED'
      ? 'Pending'
      : action === 'EVENT_CANCELLATION_APPROVED'
        ? 'Approved'
        : 'Rejected'
  return {
    state,
    reason: String(after.reason ?? audit.reason ?? ''),
    requestedAt: (after.requestedAt as Date | undefined) ?? (audit.at as Date),
    ...(after.reviewReason ? { reviewReason: String(after.reviewReason) } : {}),
    ...(state !== 'Pending' ? { decidedAt: audit.at as Date } : {}),
  }
}
// Lấy dòng audit mới nhất theo từng sự kiện bằng một aggregation (bản theo lô của các hàm trên)
async function latestEventAudits(
  eventIds: Types.ObjectId[],
  actions: readonly string[],
  sort: Record<string, 1 | -1>,
): Promise<Map<string, Doc>> {
  if (!eventIds.length) {
    return new Map()
  }
  const rows = (await m.auditLogs!.aggregate([
    { $match: { entityType: 'Event', entityId: { $in: eventIds }, action: { $in: actions } } },
    { $sort: sort },
    { $group: { _id: '$entityId', audit: { $first: '$$ROOT' } } },
  ])) as { _id: unknown; audit: Doc }[]
  return new Map(rows.map((row) => [String(row._id), row.audit]))
}
// Payload bản nháp/đề xuất mới nhất của nhiều sự kiện, giống eventDraftPayload
export async function eventDraftPayloads(eventIds: Types.ObjectId[]): Promise<Map<string, Doc>> {
  const audits = await latestEventAudits(eventIds, EVENT_PAYLOAD_ACTIONS, {
    'after.eventVersion': -1,
    at: -1,
    _id: -1,
  })
  return new Map(
    [...audits].map(([id, audit]) => [
      id,
      ((audit.after as Doc | undefined)?.payload ?? {}) as Doc,
    ]),
  )
}
// Yêu cầu hủy gần nhất của nhiều sự kiện, giống eventCancellationRequest
export async function eventCancellationRequests(
  eventIds: Types.ObjectId[],
): Promise<Map<string, EventCancellationRequest>> {
  const audits = await latestEventAudits(eventIds, EVENT_CANCELLATION_ACTIONS, { at: -1, _id: -1 })
  return new Map([...audits].map(([id, audit]) => [id, cancellationFromAudit(audit)]))
}
// Đọc chi tiết sự kiện CLB gồm phiên bản, quyết định, booking, ngân sách
export async function readClubEvent(
  clubId: string,
  eventId: string,
): Promise<ClubEventDetail | null> {
  const doc = await m
    .events!.findOne({
      _id: oid(eventId),
      clubId: oid(clubId),
      organizerType: 'CLUB',
      audienceScope: 'PUBLIC',
    })
    .lean()
  if (!doc) {
    return null
  }
  const [payload, cancellation, versions, tasks, bookings, budget] = await Promise.all([
    eventDraftPayload(doc._id as Types.ObjectId),
    eventCancellationRequest(doc._id as Types.ObjectId),
    m.eventProposalVersions!.find({ eventId: doc._id }).sort({ revisionNo: 1 }).lean(),
    m.approvalTasks!.find({ entityType: 'EVENT_PROPOSAL', entityId: doc._id }).lean(),
    m.propertyBookings!.find({ eventId: doc._id }).lean(),
    m.eventBudgets!.findOne({ eventId: doc._id }).lean(),
  ])
  const submitterIds = [
    ...new Set(
      versions
        .map((v) => v.submittedBy)
        .filter(Boolean)
        .map((id) => String(id)),
    ),
  ].map(oid)
  const [decisions, properties, submitters] = await Promise.all([
    m
      .approvalDecisions!.find({ approvalTaskId: { $in: tasks.map((task) => task._id) } })
      .sort({ at: 1 })
      .lean(),
    m.properties!.find({ _id: { $in: bookings.map((item) => item.propertyId) } }).lean(),
    submitterIds.length
      ? m
          .users!.find({ _id: { $in: submitterIds } })
          .select({ displayName: 1 })
          .lean()
      : Promise.resolve([]),
  ])
  const submitterNames = new Map(
    submitters.map((u) => [String(u._id), String(u.displayName ?? '')]),
  )
  const current = Object.keys(payload).length ? payload : ((versions.at(-1)?.payload ?? {}) as Doc)
  return {
    event: clubEventFrom(
      doc,
      { ...current, budgetLines: current.budgetLines ?? versions.at(-1)?.budgetLines ?? [] },
      cancellation,
    ),
    versions: versions.map((v) => {
      const budgetLines = (v.budgetLines ?? []) as ClubEvent['budgetLines']
      const submittedBy = v.submittedBy ? String(v.submittedBy) : undefined
      const submittedByName = submittedBy ? submitterNames.get(submittedBy) || undefined : undefined
      return {
        revisionNo: Number(v.revisionNo),
        payload: publicEventPayload(v.payload),
        budgetLines,
        requestedBudgetTotal:
          v.requestedBudgetTotal !== undefined
            ? eventMoney(v.requestedBudgetTotal)
            : budgetLines.reduce((sum, line) => sum + Number(line.amount ?? 0), 0),
        ...(v.conflictResult ? { conflictResult: String(v.conflictResult) } : {}),
        ...(submittedBy ? { submittedBy } : {}),
        ...(submittedByName ? { submittedByName } : {}),
        submittedAt: v.submittedAt as Date,
      }
    }),
    decisions: decisions.map((d) => ({
      outcome: String(d.outcome),
      reason: d.reason as string | undefined,
      comments: d.comments,
      at: d.at as Date,
    })),
    bookings: bookings.map((b) => ({
      id: String(b._id),
      state: String(b.state),
      propertyId: String(b.propertyId),
      propertyName: String(
        properties.find((p) => String(p._id) === String(b.propertyId))?.name ?? '',
      ),
      startAt: b.startAt as Date,
      endAt: b.endAt as Date,
    })),
    ...(budget
      ? {
          budget: {
            id: String(budget._id),
            state: String(budget.state),
            approvedTotal: eventMoney(budget.approvedTotal),
            disbursedTotal: eventMoney(budget.disbursedTotal),
          },
        }
      : {}),
  }
}
// Liệt kê người tham gia sự kiện kèm đăng ký, điểm danh, cờ bất thường
export async function readEventParticipants(
  clubId: string,
  eventId: string,
): Promise<EventParticipant[]> {
  const event = await m
    .events!.findOne({ _id: oid(eventId), clubId: oid(clubId), organizerType: 'CLUB' })
    .select({ endAt: 1 })
    .lean()
  if (!event) {
    throw new DomainError('event not found', 'not_found')
  }
  // Đăng ký đã xác nhận mà không check-in chỉ tính là vắng mặt khi sự kiện đã kết thúc.
  const ended = (event.endAt as Date) <= new Date()
  const [registrations, attendances] = await Promise.all([
    m
      .eventRegistrations!.find({ eventId: oid(eventId) })
      .sort({ waitlistPosition: 1, createdAt: 1 })
      .lean(),
    m.attendances!.find({ eventId: oid(eventId) }).lean(),
  ])
  const ids = [...new Set([...registrations, ...attendances].map((item) => String(item.studentId)))]
  const users = await m
    .users!.find({ _id: { $in: ids.map(oid) } })
    .select({ displayName: 1, email: 1 })
    .lean()
  return ids.map((studentId) => {
    const r = registrations.find((item) => String(item.studentId) === studentId)
    const a = attendances.find((item) => String(item.studentId) === studentId)
    const u = users.find((item) => String(item._id) === studentId)
    return {
      studentId,
      name: String(u?.displayName ?? ''),
      email: String(u?.email ?? ''),
      registrationId: r ? String(r._id) : undefined,
      state: r?.state as string | undefined,
      waitlistPosition: r?.waitlistPosition as number | undefined,
      attendanceId: a ? String(a._id) : undefined,
      checkedInAt: a?.checkedInAt as Date | undefined,
      method: a?.method as string | undefined,
      abnormalFlags: (a?.abnormalFlags ??
        (r?.state === 'Confirmed' && ended ? ['no-show'] : [])) as string[],
      correctionReason: a?.correctionReason as string | undefined,
      finalized: a?.finalized === true,
    }
  })
}
// Tổng hợp feedback sự kiện cho CLB, ẩn khi chưa đủ số người phản hồi tối thiểu
export async function readClubFeedback(
  clubId: string,
  eventIds: string[],
  now: Date,
): Promise<ClubFeedbackSummary[]> {
  const events = await m
    .events!.find({
      _id: { $in: eventIds.map(oid) },
      clubId: oid(clubId),
      organizerType: 'CLUB',
      audienceScope: 'PUBLIC',
    })
    .lean()
  if (events.length !== eventIds.length) {
    throw new DomainError('event not found', 'not_found')
  }
  const policy = await m
    .policyVersions!.findOne({ effectiveFrom: { $lte: now } })
    .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
    .lean()
  if (!policy) {
    throw new DomainError('policy is not configured', 'unavailable')
  }
  const docs = await m
    .eventFeedbacks!.find({ eventId: { $in: events.map((event) => event._id) } })
    .select({ eventId: 1, scores: 1, comment: 1, _id: 0 })
    .sort({ submittedAt: 1 })
    .lean()
  return events.map((event) => {
    const items = docs.filter((doc) => String(doc.eventId) === String(event._id))
    const ratings = items.map((doc) =>
      Number((doc.scores as Doc[]).find((s) => s.criterionCode === FEEDBACK_CRITERION)?.score ?? 0),
    )
    const summary = summarizeFeedback(ratings, Number(policy.feedbackMinRespondents))
    return {
      ...summary,
      eventId: String(event._id),
      title: String(event.title),
      ...(summary.visible
        ? { comments: items.map((doc) => String(doc.comment ?? '')).filter(Boolean) }
        : {}),
    }
  })
}
