import { assertAccountabilityOfficer } from './accountability-workflow.js'
import { cancelEventInSession } from './event-cancellation.js'
import { releaseFacilityBookingsInSession } from './mongo-facility-booking-repository.js'
import { randomUUID } from 'node:crypto'
import mongoose, { Types, type ClientSession } from 'mongoose'
import {
  SUSPENSION_REMINDER_MS,
  type CascadeResult,
  type ClubDissolution,
  type ClubLifecycleRepository,
  type ClubLifecycleStepResult,
  type ClubLifecycleSummary,
  type ClubSuspension,
  type OutstandingObligations,
  type UnreconciledBudget,
} from '../../domain/club-lifecycle.js'
import { DomainError } from '../../domain/errors.js'
import { overduePeriodicReports } from './periodic-report-obligations.js'
import { conflict, icpdpOfficerIds, queueNotifications, writeAudit } from './repo-helpers.js'
import { ucmsModels } from './ucms-models.js'

type Doc = Record<string, unknown>
const scheduledEventStates = ['Approved', 'Upcoming', 'CREATED', 'PUBLIC']
/** Các đề xuất và sự kiện còn có thể diễn ra; BR45 huỷ những cái kết thúc sau học kỳ giải thể. */
const liveEventStates = [
  'Draft',
  'Pending Approval',
  'Under Review',
  'Revision Requested',
  'Re-defense Pending',
  'Approved',
  'Upcoming',
  'DRAFT',
  'CREATED',
  'PUBLIC',
]
const undecidedProposalStates = [
  'Pending Approval',
  'Under Review',
  'Revision Requested',
  'Re-defense Pending',
]
const undecidedBookingStates = ['Draft', 'Requested', 'Under Review', 'Revision Requested']
const openCampaignStates = ['Published', 'Accepting Applications']
const settledBudgetStates = ['Reconciled', 'Closed', 'Cancelled']
const ALERT_REPEAT_MS = 24 * 60 * 60 * 1000

// Ánh xạ dữ liệu đình chỉ CLB thành ClubSuspension
function suspensionFrom(raw: unknown): ClubSuspension | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const value = raw as Doc
  return {
    reason: String(value.reason ?? ''),
    suspendedAt: value.suspendedAt as Date,
    suspendedBy: String(value.suspendedBy ?? ''),
    until: value.until instanceof Date ? value.until : null,
    ...(value.reminderSentAt instanceof Date ? { reminderSentAt: value.reminderSentAt } : {}),
  }
}

// Ánh xạ dữ liệu giải thể CLB thành ClubDissolution
function dissolutionFrom(raw: unknown): ClubDissolution | undefined {
  if (!raw || typeof raw !== 'object') {
    return undefined
  }
  const value = raw as Doc
  if (!(value.effectiveFrom instanceof Date) || !(value.effectiveTo instanceof Date)) {
    return undefined
  }
  return {
    decidedAt: value.decidedAt as Date,
    decidedBy: String(value.decidedBy ?? ''),
    reason: String(value.reason ?? ''),
    effectiveSemester: String(value.effectiveSemester ?? ''),
    effectiveFrom: value.effectiveFrom,
    effectiveTo: value.effectiveTo,
    ...(value.archivedAt instanceof Date ? { archivedAt: value.archivedAt } : {}),
    ...(value.outstanding && typeof value.outstanding === 'object'
      ? { outstanding: value.outstanding as OutstandingObligations }
      : {}),
  }
}

// Liệt kê ngân sách sự kiện của CLB chưa quyết toán xong
/** UC15 E1: mọi ngân sách của CLB chưa tới bước đối soát. */
async function unreconciledBudgets(
  clubId: Types.ObjectId,
  session: ClientSession | null = null,
): Promise<UnreconciledBudget[]> {
  const budgets = await ucmsModels
    .eventBudgets!.find({ clubId, state: { $nin: settledBudgetStates } })
    .select('eventId state')
    .session(session)
    .lean()
  const events = await ucmsModels
    .events!.find({ _id: { $in: budgets.map((item) => item.eventId) } })
    .select('title')
    .session(session)
    .lean()
  const title = new Map(events.map((item) => [String(item._id), String(item.title)]))
  return budgets.map((item) => ({
    id: String(item._id),
    eventTitle: title.get(String(item.eventId)) ?? '',
    state: String(item.state),
  }))
}

// Tổng hợp nghĩa vụ CLB còn dang dở (báo cáo quá hạn, nháp, sự kiện, ngân sách)
/** UC15 bước 6: những gì CLB còn nợ khi bị lưu trữ — báo cáo chưa nộp và ngân sách chưa đối soát. */
async function outstandingObligations(
  clubId: Types.ObjectId,
  now: Date,
  session: ClientSession,
): Promise<OutstandingObligations> {
  const overdue = await overduePeriodicReports(clubId, now, session)
  const drafts = await ucmsModels
    .periodicReports!.find({ clubId, state: { $in: ['Draft', 'Returned for correction'] } })
    .select('periodCode')
    .session(session)
    .lean()
  const completed = await ucmsModels
    .events!.find({ clubId, organizerType: { $ne: 'ICPDP' }, state: 'Completed' })
    .select('title audienceScope')
    .session(session)
    .lean()
  const budgets = await unreconciledBudgets(clubId, session)
  const postEventReports: OutstandingObligations['postEventReports'] = []
  for (const event of completed) {
    // Sự kiện chỉ dành cho thành viên chỉ nợ báo cáo khi có ngân sách (cùng quy tắc với kiểm tra quá hạn).
    if (
      event.audienceScope === 'MEMBERS_ONLY' &&
      !(await ucmsModels.eventBudgets!.exists({ eventId: event._id }).session(session))
    ) {
      continue
    }
    const latest = await ucmsModels
      .postEventReports!.findOne({ eventId: event._id })
      .sort({ versionNo: -1 })
      .select('state')
      .session(session)
      .lean()
    if (!latest || !['Submitted', 'Accepted'].includes(String(latest.state))) {
      postEventReports.push({ eventId: String(event._id), title: String(event.title) })
    }
  }
  return {
    periodicReports: [...new Set([...overdue, ...drafts.map((item) => String(item.periodCode))])],
    postEventReports,
    budgets,
  }
}

// Lấy thông báo lỗi dạng chuỗi
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// Repository vòng đời CLB: đình chỉ, kích hoạt lại, giải thể
export function mongoClubLifecycleRepository(): ClubLifecycleRepository {
  const m = ucmsModels

  function summaryFrom(doc: Doc, activeMembers: number): ClubLifecycleSummary {
    const suspension = suspensionFrom(doc.suspension)
    const dissolution = dissolutionFrom(doc.dissolution)
    return {
      id: String(doc._id),
      code: String(doc.code),
      name: String(doc.name),
      field: String(doc.field ?? ''),
      state: String(doc.state),
      activeMembers,
      ...(suspension ? { suspension } : {}),
      ...(typeof doc.logoUrl === 'string' && doc.logoUrl ? { logoUrl: doc.logoUrl } : {}),
      ...(typeof doc.contactEmail === 'string' && doc.contactEmail
        ? { contactEmail: doc.contactEmail }
        : {}),
      ...(dissolution ? { dissolution } : {}),
    }
  }

  async function summaries(filter: Doc): Promise<ClubLifecycleSummary[]> {
    const docs = await m.clubs!.find(filter).sort({ name: 1 }).collation({ locale: 'vi' }).lean()
    const counts = await m.clubMemberships!.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { clubId: { $in: docs.map((doc) => doc._id) }, state: 'Active' } },
      { $group: { _id: '$clubId', count: { $sum: 1 } } },
    ])
    const byClub = new Map(counts.map((item) => [String(item._id), item.count]))
    return docs.map((doc) => summaryFrom(doc, byClub.get(String(doc._id)) ?? 0))
  }

  async function audit(
    session: ClientSession,
    clubId: Types.ObjectId,
    action: string,
    actorId: string | null,
    before: unknown,
    after: unknown,
    reason: string | undefined,
    at: Date,
    correlationId: string,
    auditId?: Types.ObjectId,
  ): Promise<void> {
    await writeAudit(session, {
      ...(auditId ? { _id: auditId } : {}),
      entityType: 'Club',
      entityId: clubId,
      action,
      ...(actorId
        ? { actorId: new Types.ObjectId(actorId), actorRole: 'ICPDP_OFFICER' }
        : { actorRole: 'SYSTEM' }),
      before,
      after,
      ...(reason ? { reason } : {}),
      correlationId,
      at,
    })
  }

  async function officerIds(): Promise<string[]> {
    return (await icpdpOfficerIds()).map(String)
  }

  async function memberIds(clubId: Types.ObjectId, session: ClientSession): Promise<unknown[]> {
    return m.clubMemberships!.find({ clubId, state: 'Active' }).session(session).distinct('userId')
  }

  /** Cascade của hệ thống (UC28 A1 / UC47 A1): huỷ sự kiện và booking, giải phóng đăng ký, gửi thông báo. */
  async function cascade(
    session: ClientSession,
    clubId: Types.ObjectId,
    eventFilter: Doc,
    bookingFilter: Doc,
    source: 'SUSPENSION' | 'DISSOLUTION',
    reason: string,
    now: Date,
    decisionId: Types.ObjectId,
  ): Promise<CascadeResult> {
    const events = await m
      .events!.find({ clubId, ...eventFilter })
      .session(session)
      .lean()
    let cancelledRegistrations = 0
    for (const event of events) {
      cancelledRegistrations += await cancelEventInSession(
        session,
        event,
        reason,
        now,
        source,
        24,
        undefined,
        decisionId,
      )
    }
    const cancelledBookings = await releaseFacilityBookingsInSession(
      session,
      { clubId, ...bookingFilter },
      source,
      reason,
      now,
      'Cancelled',
    )
    return { cancelledEvents: events.length, cancelledRegistrations, cancelledBookings }
  }

  return {
    // Liệt kê tóm tắt mọi CLB
    list() {
      return summaries({})
    },
    // Lấy chi tiết CLB kèm đợt tuyển, sự kiện, nhiệm kỳ và ngân sách chưa quyết toán
    async detail(clubId, now) {
      const id = new Types.ObjectId(clubId)
      const [summary] = await summaries({ _id: id })
      if (!summary) {
        return null
      }
      const [campaigns, events, term, history, budgets] = await Promise.all([
        m
          .recruitmentCampaigns!.find({
            clubId: id,
            state: { $in: openCampaignStates },
            windowEnd: { $gt: now },
          })
          .select('title windowEnd')
          .lean(),
        m
          .events!.find({ clubId: id, state: { $in: scheduledEventStates }, startAt: { $gt: now } })
          .sort({ startAt: 1 })
          .select('title startAt endAt confirmedRegistrationCount')
          .lean(),
        m.clubTerms!.findOne({ clubId: id, state: 'Active' }).sort({ startAt: -1 }).lean(),
        m.auditLogs!.find({ entityType: 'Club', entityId: id }).sort({ at: -1 }).limit(50).lean(),
        unreconciledBudgets(id),
      ])
      const actors = await m
        .users!.find({
          _id: { $in: history.flatMap((item) => (item.actorId ? [item.actorId] : [])) },
        })
        .select('displayName')
        .lean()
      const actorName = new Map(actors.map((user) => [String(user._id), String(user.displayName)]))
      return {
        ...summary,
        openCampaigns: campaigns.map((item) => ({
          id: String(item._id),
          title: String(item.title),
          windowEnd: item.windowEnd as Date,
        })),
        upcomingEvents: events.map((item) => ({
          id: String(item._id),
          title: String(item.title),
          startAt: item.startAt as Date,
          endAt: item.endAt as Date,
          registrations: Number(item.confirmedRegistrationCount ?? 0),
        })),
        ...(term
          ? {
              activeTerm: {
                name: String(term.name),
                startAt: term.startAt as Date,
                endAt: term.endAt as Date,
              },
            }
          : {}),
        unreconciledBudgets: budgets,
        history: history.map((item) => ({
          action: String(item.action),
          ...(typeof item.reason === 'string' ? { reason: item.reason } : {}),
          ...(item.actorId
            ? { actorName: actorName.get(String(item.actorId)) ?? String(item.actorId) }
            : {}),
          at: item.at as Date,
        })),
      }
    },
    // ICPDP đình chỉ CLB (có thể theo yêu cầu đình chỉ của CLB), ghi audit và thông báo
    async suspend(clubId, input, actorId, now) {
      return mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(clubId)
        if (input.requestId) {
          await assertAccountabilityOfficer(session, new Types.ObjectId(actorId))
          const request = await m
            .suspensionRequests!.findOne({
              _id: new Types.ObjectId(input.requestId),
              clubId: id,
              state: 'Pending',
            })
            .session(session)
            .lean()
          if (!request || (request.until as Date) <= now) {
            throw new DomainError('suspension request is unavailable or expired', 'conflict')
          }
          input = { ...input, reason: String(request.reason), until: request.until as Date }
        }
        const suspension = {
          reason: input.reason,
          suspendedAt: now,
          suspendedBy: new Types.ObjectId(actorId),
          until: input.until,
        }
        const changed = await m.clubs!.updateOne(
          { _id: id, state: 'Active' },
          { $set: { state: 'Suspended', suspension, updatedAt: now } },
          { session },
        )
        if (changed.modifiedCount !== 1) {
          return conflict('only an active club can be suspended')
        }
        const decisionId = new Types.ObjectId()
        // Tuyển thành viên vẫn mở (quyết định 2026-10-10): thay vào đó chặn việc ứng tuyển trong lúc bị đình chỉ.
        // FR-UC15-04: các sự kiện đã duyệt trong tương lai và mọi đề xuất còn chờ quyết định đều bị huỷ.
        const result = await cascade(
          session,
          id,
          {
            $or: [
              { state: { $in: scheduledEventStates }, startAt: { $gt: now } },
              { state: { $in: undecidedProposalStates } },
            ],
          },
          { state: 'Approved', startAt: { $gt: now } },
          'SUSPENSION',
          input.reason,
          now,
          decisionId,
        )
        const correlationId = randomUUID()
        await audit(
          session,
          id,
          'CLUB_SUSPENDED',
          actorId,
          { state: 'Active' },
          { state: 'Suspended', until: input.until, ...result },
          input.reason,
          now,
          correlationId,
          decisionId,
        )
        await queueNotifications(session, await memberIds(id, session), {
          eventCode: 'CLUB_SUSPENDED',
          entityType: 'Club',
          entityId: id,
          payload: { reason: input.reason, until: input.until },
          now,
        })
        if (input.requestId) {
          const requestId = new Types.ObjectId(input.requestId)
          await m.suspensionRequests!.updateOne(
            { _id: requestId, state: 'Pending' },
            {
              $set: {
                state: 'Approved',
                decidedBy: new Types.ObjectId(actorId),
                decidedAt: now,
                decisionReason: input.decisionReason,
              },
            },
            { session },
          )
          const task = await m
            .approvalTasks!.findOne({
              entityType: 'SUSPENSION_REQUEST',
              entityId: requestId,
              state: 'Open',
            })
            .session(session)
            .lean()
          if (!task) {
            throw new DomainError('suspension review task not found', 'conflict')
          }
          await m.approvalTasks!.updateOne(
            { _id: task._id },
            { $set: { state: 'Decided', closedAt: now, assigneeId: new Types.ObjectId(actorId) } },
            { session },
          )
          await m.approvalDecisions!.create(
            [
              {
                approvalTaskId: task._id,
                outcome: 'Approve',
                reason: input.decisionReason,
                actorId: new Types.ObjectId(actorId),
                at: now,
              },
            ],
            { session },
          )
          await writeAudit(session, {
            entityType: 'SuspensionRequest',
            entityId: requestId,
            action: 'SUSPENSION_REQUEST_APPROVED',
            actorId: new Types.ObjectId(actorId),
            actorRole: 'ICPDP_OFFICER',
            after: result,
            reason: input.decisionReason,
            correlationId,
            at: now,
          })
        }
        return result
      })
    },
    // ICPDP kích hoạt lại CLB đang Suspended
    async reactivate(clubId, reason, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(clubId)
        const changed = await m.clubs!.updateOne(
          { _id: id, state: 'Suspended' },
          { $set: { state: 'Active', updatedAt: now }, $unset: { suspension: '' } },
          { session },
        )
        if (changed.modifiedCount !== 1) {
          return conflict('only a suspended club can be reactivated')
        }
        await audit(
          session,
          id,
          'CLUB_REACTIVATED',
          actorId,
          { state: 'Suspended' },
          { state: 'Active' },
          reason,
          now,
          randomUUID(),
        )
        await queueNotifications(session, await memberIds(id, session), {
          eventCode: 'CLUB_REACTIVATED',
          entityType: 'Club',
          entityId: id,
          payload: { reason, automatic: actorId === null },
          now,
        })
      })
    },
    // ICPDP quyết định giải thể CLB và lưu học kỳ có hiệu lực
    async decideDissolution(clubId, decision, now) {
      return mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(clubId)
        const changed = await m.clubs!.updateOne(
          { _id: id, state: { $in: ['Active', 'Suspended'] }, dissolution: { $exists: false } },
          {
            $set: {
              updatedAt: now,
              dissolution: { ...decision, decidedBy: new Types.ObjectId(decision.decidedBy) },
            },
          },
          { session },
        )
        if (changed.modifiedCount !== 1) {
          return conflict('this club cannot be scheduled for dissolution')
        }
        const decisionId = new Types.ObjectId()
        // BR45: không có gì của CLB này được kết thúc sau học kỳ Dissolving của nó.
        const result = await cascade(
          session,
          id,
          { state: { $in: liveEventStates }, endAt: { $gt: decision.effectiveTo } },
          {
            state: { $in: [...undecidedBookingStates, 'Approved'] },
            endAt: { $gt: decision.effectiveTo },
          },
          'DISSOLUTION',
          decision.reason,
          now,
          decisionId,
        )
        await audit(
          session,
          id,
          'CLUB_DISSOLUTION_DECIDED',
          decision.decidedBy,
          null,
          {
            effectiveSemester: decision.effectiveSemester,
            effectiveFrom: decision.effectiveFrom,
            effectiveTo: decision.effectiveTo,
            ...result,
          },
          decision.reason,
          now,
          randomUUID(),
          decisionId,
        )
        await queueNotifications(session, await memberIds(id, session), {
          eventCode: 'CLUB_DISSOLUTION_DECIDED',
          entityType: 'Club',
          entityId: id,
          payload: { reason: decision.reason, effectiveSemester: decision.effectiveSemester },
          now,
        })
        return result
      })
    },
    // Lấy CLB Suspended sắp hết hạn đình chỉ chưa được nhắc
    suspensionsDueForReminder(now) {
      return summaries({
        state: 'Suspended',
        'suspension.until': {
          $ne: null,
          $lte: new Date(now.getTime() + SUSPENSION_REMINDER_MS),
          $gt: now,
        },
        'suspension.reminderSentAt': { $exists: false },
      })
    },
    // Đánh dấu đã nhắc hết hạn đình chỉ và thông báo officer
    async markReminded(clubId, officerIds, now) {
      await mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(clubId)
        const club = await m
          .clubs!.findOneAndUpdate(
            { _id: id, state: 'Suspended', 'suspension.reminderSentAt': { $exists: false } },
            { $set: { 'suspension.reminderSentAt': now } },
            { session },
          )
          .lean()
        if (!club) {
          return
        } // một lần chạy khác đã nhắc rồi
        await queueNotifications(session, officerIds, {
          eventCode: 'CLUB_SUSPENSION_ENDING',
          entityType: 'Club',
          entityId: id,
          payload: { clubName: club.name, until: (club.suspension as Doc | undefined)?.until },
          now,
        })
      })
    },
    // Lấy CLB Suspended đã quá hạn đình chỉ
    expiredSuspensions(now) {
      return summaries({ state: 'Suspended', 'suspension.until': { $ne: null, $lte: now } })
    },
    // Chuyển CLB đến hạn giải thể sang Dissolving
    async startDissolving(now) {
      const due = await m
        .clubs!.find({
          state: { $in: ['Active', 'Suspended'] },
          'dissolution.effectiveFrom': { $lte: now },
        })
        .select('_id state')
        .lean()
      const result: ClubLifecycleStepResult = { done: [], failed: [] }
      for (const club of due) {
        try {
          await mongoose.connection.transaction(async (session) => {
            const changed = await m.clubs!.updateOne(
              { _id: club._id, state: club.state },
              { $set: { state: 'Dissolving', updatedAt: now }, $unset: { suspension: '' } },
              { session },
            )
            if (changed.modifiedCount !== 1) {
              return
            }
            await audit(
              session,
              club._id as Types.ObjectId,
              'CLUB_DISSOLVING',
              null,
              { state: club.state },
              { state: 'Dissolving' },
              undefined,
              now,
              randomUUID(),
            )
            await queueNotifications(
              session,
              await memberIds(club._id as Types.ObjectId, session),
              {
                eventCode: 'CLUB_DISSOLVING',
                entityType: 'Club',
                entityId: club._id as Types.ObjectId,
                payload: {},
                now,
              },
            )
            result.done.push(String(club._id))
          })
        } catch (error) {
          result.failed.push({
            clubId: String(club._id),
            step: 'dissolving',
            message: errorMessage(error),
          })
        }
      }
      return result
    },
    // Hoàn tất giải thể CLB đến hạn và thông báo officer
    async completeDissolutions(now) {
      const due = await m
        .clubs!.find({ state: 'Dissolving', 'dissolution.effectiveTo': { $lte: now } })
        .select('_id name')
        .lean()
      const officers = due.length ? await officerIds() : []
      const result: ClubLifecycleStepResult = { done: [], failed: [] }
      for (const club of due) {
        const id = club._id as Types.ObjectId
        try {
          // UC15 bước 6 là một bước duy nhất: nếu bất kỳ phần nào lỗi thì transaction rollback và CLB vẫn ở Dissolving.
          await mongoose.connection.transaction(async (session) => {
            const changed = await m.clubs!.updateOne(
              { _id: id, state: 'Dissolving' },
              { $set: { state: 'Dissolved', updatedAt: now } },
              { session },
            )
            if (changed.modifiedCount !== 1) {
              return
            }
            const members = await memberIds(id, session)
            const decisionId = new Types.ObjectId()
            // Các đề xuất và yêu cầu booking còn chờ quyết định bị huỷ.
            const proposals = await m
              .events!.find({
                clubId: id,
                state: { $in: ['Draft', 'DRAFT', ...undecidedProposalStates] },
              })
              .session(session)
              .lean()
            for (const proposal of proposals) {
              await cancelEventInSession(
                session,
                proposal,
                'Club dissolved',
                now,
                'DISSOLUTION',
                24,
                undefined,
                decisionId,
              )
            }
            const bookings = await releaseFacilityBookingsInSession(
              session,
              { clubId: id, state: { $in: undecidedBookingStates } },
              'DISSOLUTION',
              'Club dissolved',
              now,
              'Cancelled',
            )
            const campaigns = await m.recruitmentCampaigns!.updateMany(
              { clubId: id, state: { $in: [...openCampaignStates, 'Draft'] } },
              { $set: { state: 'Cancelled' } },
              { session },
            )
            // Quyền quản lý bị thu hồi.
            const terms = await m.clubTerms!.updateMany(
              { clubId: id, state: { $in: ['Active', 'Planned'] } },
              { $set: { state: 'Closed' } },
              { session },
            )
            const assignments = await m.clubPositionAssignments!.updateMany(
              { clubId: id, effectiveTo: null },
              { $set: { effectiveTo: now } },
              { session },
            )
            // Các nghĩa vụ chưa hoàn thành được ghi là còn tồn đọng trên CLB đã lưu trữ.
            const outstanding = await outstandingObligations(id, now, session)
            await m.clubs!.updateOne(
              { _id: id },
              { $set: { 'dissolution.archivedAt': now, 'dissolution.outstanding': outstanding } },
              { session },
            )
            await audit(
              session,
              id,
              'CLUB_DISSOLVED',
              null,
              { state: 'Dissolving' },
              {
                state: 'Dissolved',
                cancelledProposals: proposals.length,
                cancelledBookings: bookings,
                cancelledCampaigns: campaigns.modifiedCount,
                closedTerms: terms.modifiedCount,
                endedAssignments: assignments.modifiedCount,
                outstanding,
              },
              undefined,
              now,
              randomUUID(),
              decisionId,
            )
            await queueNotifications(session, members, {
              eventCode: 'CLUB_DISSOLVED',
              entityType: 'Club',
              entityId: id,
              payload: {},
              now,
            })
            await queueNotifications(session, officers, {
              eventCode: 'CLUB_DISSOLUTION_COMPLETED',
              entityType: 'Club',
              entityId: id,
              payload: {
                clubName: club.name,
                outstandingPeriodicReports: outstanding.periodicReports.length,
                outstandingPostEventReports: outstanding.postEventReports.length,
                outstandingBudgets: outstanding.budgets.length,
              },
              now,
            })
            result.done.push(String(id))
          })
        } catch (error) {
          result.failed.push({
            clubId: String(id),
            step: 'dissolved',
            message: errorMessage(error),
          })
        }
      }
      return result
    },
    officerIds,
    // Cảnh báo ICPDP officer khi bước vòng đời CLB thất bại (chống lặp)
    async alertOfficers(alert, officers, now) {
      const clubId = alert.clubId ? new Types.ObjectId(alert.clubId) : null
      const since = new Date(now.getTime() - ALERT_REPEAT_MS)
      // Lỗi của một CLB cũng được lưu trong lịch sử của nó, nên được khử trùng lặp kể cả khi không có cán bộ nào.
      const repeated = clubId
        ? await m.auditLogs!.exists({
            entityType: 'Club',
            entityId: clubId,
            action: 'CLUB_LIFECYCLE_FAILED',
            'after.step': alert.step,
            at: { $gt: since },
          })
        : await m.notifications!.exists({
            eventCode: 'CLUB_LIFECYCLE_FAILED',
            entityType: 'ClubLifecycleJob',
            createdAt: { $gt: since },
          })
      if (repeated) {
        return false
      }
      await mongoose.connection.transaction(async (session) => {
        const club = clubId
          ? await m.clubs!.findById(clubId).select('name').session(session).lean()
          : null
        const payload = {
          step: alert.step,
          message: alert.message,
          ...(club ? { clubName: club.name } : {}),
        }
        if (clubId) {
          await audit(
            session,
            clubId,
            'CLUB_LIFECYCLE_FAILED',
            null,
            null,
            payload,
            alert.message,
            now,
            randomUUID(),
          )
          await queueNotifications(session, officers, {
            eventCode: 'CLUB_LIFECYCLE_FAILED',
            entityType: 'Club',
            entityId: clubId,
            payload,
            now,
          })
          return
        }
        await queueNotifications(session, officers, {
          eventCode: 'CLUB_LIFECYCLE_FAILED',
          entityType: 'ClubLifecycleJob',
          payload,
          now,
        })
      })
      return true
    },
  }
}
