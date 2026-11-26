import { overduePostEventReports } from './post-event-report-deadlines.js'
import { cancelEventInSession } from './event-cancellation.js'
import { clubBoardUserIds, queueNotifications } from './club-board.js'
import { eventCancellationRequest } from './club-event-readers.js'
import { randomUUID } from 'node:crypto'
import mongoose, { Types } from 'mongoose'
import { publicEventPayload } from '../../domain/club-event.js'
import { DomainError } from '../../domain/errors.js'
import { ACTIVE_DEFENSE_STATES } from '../../domain/event-defense.js'
import {
  type ClubObligation,
  type EventBudgetSummary,
  type EventProposalDetail,
  type EventProposalReviewRepository,
  type EventProposalSummary,
  type EventProposalTask,
  type EventProposalVersion,
  type EventReviewDecision,
} from '../../domain/event-proposal-review.js'
import {
  applyProposalDecisionInSession,
  approvedLines,
  conflict,
  mapDefenseSession,
  money,
  optionalText,
  requestedLines,
} from './event-defense-helpers.js'
import { ucmsModels } from './ucms-models.js'
import { overduePeriodicReports } from './periodic-report-obligations.js'

type Doc = Record<string, unknown>
const TASK_TYPE = 'EVENT_PROPOSAL'
const CANCELLATION_TASK_TYPE = 'EVENT_CANCELLATION'
const reviewableStates = ['Pending Approval', 'Under Review', 'Re-defense Pending']
const cancellableStates = ['Approved', 'Upcoming', 'Ongoing']
const approvedStates = [...cancellableStates, 'Completed']

// Ánh xạ approval task thành EventProposalTask
function taskFrom(doc: Doc): EventProposalTask {
  return {
    id: String(doc._id),
    eventId: String(doc.entityId),
    title: String(doc.title),
    state: doc.state as EventProposalTask['state'],
    assigneeId: doc.assigneeId ? String(doc.assigneeId) : undefined,
    openedAt: doc.openedAt as Date,
    slaDueAt: doc.slaDueAt as Date | undefined,
  }
}

// Ánh xạ approval decision thành EventReviewDecision
function decisionFrom(doc: Doc): EventReviewDecision {
  const comments = doc.comments as { sections?: string[]; conditions?: string[] } | undefined
  return {
    id: String(doc._id),
    taskId: String(doc.approvalTaskId),
    outcome: doc.outcome as EventReviewDecision['outcome'],
    reason: optionalText(doc.reason),
    sections: comments?.sections ?? [],
    conditions: comments?.conditions ?? [],
    reviewNote: optionalText(doc.reviewNote),
    actorId: String(doc.actorId),
    at: doc.at as Date,
  }
}

// Ánh xạ ngân sách sự kiện thành EventBudgetSummary
function budgetFrom(doc: Doc, eventTitle?: string): EventBudgetSummary {
  return {
    id: String(doc._id),
    eventId: String(doc.eventId),
    ...(eventTitle ? { eventTitle } : {}),
    state: String(doc.state),
    requestedTotal: money(doc.requestedTotal),
    approvedTotal: money(doc.approvedTotal),
    lines: approvedLines(doc.lines),
  }
}

// Ánh xạ document sự kiện thành EventProposalSummary
function eventFrom(
  doc: Doc,
  requestedBudgetTotal: number,
  property?: EventProposalSummary['property'],
  hasPendingCancellation?: boolean,
): EventProposalSummary {
  return {
    id: String(doc._id),
    clubId: String(doc.clubId ?? ''),
    clubName: String(doc.clubName ?? ''),
    title: String(doc.title),
    objective: optionalText(doc.objective),
    startAt: doc.startAt as Date,
    endAt: doc.endAt as Date,
    semesterCode: String(doc.semesterCode ?? ''),
    venueText: optionalText(doc.venueText),
    ...(property ? { property } : {}),
    audienceScope: String(doc.audienceScope ?? 'PUBLIC'),
    capacity: Number(doc.capacity ?? 0),
    state: String(doc.state),
    conflictResult: optionalText(doc.conflictResult),
    conflictDetail: doc.conflictDetail ?? undefined,
    approvalConditions: Array.isArray(doc.approvalConditions)
      ? doc.approvalConditions.map(String)
      : [],
    currentRevisionNo: Number(doc.currentRevisionNo ?? 1),
    revisionDeadlineAt: doc.revisionDeadlineAt as Date | undefined,
    requestedBudgetTotal,
    ...(hasPendingCancellation ? { hasPendingCancellation: true } : {}),
  }
}

// Repository ICPDP thẩm định đề xuất sự kiện và yêu cầu hủy (UC26)
export function mongoEventProposalReviewRepository(): EventProposalReviewRepository {
  const m = ucmsModels
  const events = m.events!
  const versions = m.eventProposalVersions!
  const tasks = m.approvalTasks!
  const decisions = m.approvalDecisions!
  const budgets = m.eventBudgets!
  const audits = m.auditLogs!
  const notifications = m.notifications!

  async function obligations(clubId: Types.ObjectId, now: Date): Promise<ClubObligation[]> {
    const [settlement, refund, report, postReports] = await Promise.all([
      budgets.exists({
        clubId,
        settlementDueAt: { $lt: now },
        settlementSubmittedAt: { $exists: false },
        state: { $nin: ['Cancelled', 'Closed'] },
      }),
      budgets.exists({ clubId, recoveryDueAt: { $lt: now }, state: 'Recovery Pending' }),
      overduePeriodicReports(clubId, now),
      overduePostEventReports(clubId, now),
    ])
    return [
      ...(settlement ? ['overdueSettlement' as const] : []),
      ...(refund ? ['overdueRefund' as const] : []),
      ...(report.length || postReports.length ? ['overdueReport' as const] : []),
    ]
  }

  async function detail(eventId: Types.ObjectId, now: Date): Promise<EventProposalDetail | null> {
    const [event, taskDocs, cancelTaskDocs, cancellation, versionDocs] = await Promise.all([
      events.findById(eventId).lean(),
      tasks
        .find({ entityType: TASK_TYPE, entityId: eventId })
        .sort({ openedAt: -1, _id: -1 })
        .lean(),
      tasks
        .find({ entityType: CANCELLATION_TASK_TYPE, entityId: eventId })
        .sort({ openedAt: -1, _id: -1 })
        .lean(),
      eventCancellationRequest(eventId),
      versions.find({ eventId }).sort({ revisionNo: 1 }).lean(),
    ])
    const openCancelTask = cancelTaskDocs.find((item) => item.state === 'Open')
    const task = openCancelTask ?? taskDocs[0]
    if (!event || !task || !event.clubId) {
      return null
    }
    const clubId = event.clubId as Types.ObjectId
    const [decisionDocs, club, property, submitters, bookingDocs, budgetDocs, owed, defenseDocs] =
      await Promise.all([
        decisions
          .find({ approvalTaskId: { $in: taskDocs.map((item) => item._id) } })
          .sort({ at: 1 })
          .lean(),
        m.clubs!.findById(clubId).select({ name: 1, state: 1 }).lean(),
        event.propertyId
          ? m.properties!.findById(event.propertyId).select({ code: 1, name: 1 }).lean()
          : null,
        m
          .users!.find({ _id: { $in: versionDocs.map((version) => version.submittedBy) } })
          .select({ displayName: 1, email: 1 })
          .lean(),
        m.propertyBookings!.find({ eventId }).sort({ startAt: 1 }).lean(),
        budgets
          .find({ clubId, $or: [{ eventId }, { periodCode: event.semesterCode }] })
          .sort({ createdAt: -1 })
          .lean(),
        obligations(clubId, now),
        m.eventDefenseSessions!.find({ eventId }).sort({ createdAt: -1, _id: -1 }).lean(),
      ])
    const propertyIds = bookingDocs.map((booking) => booking.propertyId)
    const [bookingProperties, budgetEvents] = await Promise.all([
      m
        .properties!.find({ _id: { $in: propertyIds } })
        .select({ code: 1, name: 1 })
        .lean(),
      events
        .find({ _id: { $in: budgetDocs.map((budget) => budget.eventId) } })
        .select({ title: 1 })
        .lean(),
    ])
    const propertyById = new Map(bookingProperties.map((item) => [String(item._id), item]))
    const titleById = new Map(budgetEvents.map((item) => [String(item._id), String(item.title)]))
    const nameById = new Map(
      submitters.map((user) => [
        String(user._id),
        optionalText(user.displayName) ?? String(user.email),
      ]),
    )
    const mappedVersions: EventProposalVersion[] = versionDocs.map((version) => ({
      id: String(version._id),
      revisionNo: Number(version.revisionNo),
      payload: publicEventPayload((version.payload ?? {}) as Record<string, unknown>),
      budgetLines: requestedLines(version.budgetLines),
      requestedBudgetTotal: money(version.requestedBudgetTotal),
      conflictResult: optionalText(version.conflictResult),
      submittedBy: String(version.submittedBy),
      submittedByName: nameById.get(String(version.submittedBy)),
      submittedAt: version.submittedAt as Date,
    }))
    const current =
      mappedVersions.find((version) => version.revisionNo === Number(event.currentRevisionNo)) ??
      mappedVersions.at(-1)
    const own = budgetDocs.find((budget) => String(budget.eventId) === String(eventId))
    const defenseHistory = defenseDocs.map(mapDefenseSession)
    const activeDefenseSession = defenseHistory.find(
      (session) =>
        ACTIVE_DEFENSE_STATES.has(session.state) ||
        (session.state === 'DEFENDED' && !session.outcome),
    )
    return {
      task: taskFrom(task),
      event: eventFrom(
        event,
        current?.requestedBudgetTotal ?? 0,
        property
          ? { id: String(property._id), code: String(property.code), name: String(property.name) }
          : undefined,
        Boolean(openCancelTask),
      ),
      versions: mappedVersions,
      decisions: decisionDocs.map(decisionFrom),
      club: {
        id: String(clubId),
        name: String(club?.name ?? event.clubName ?? ''),
        state: String(club?.state ?? ''),
        obligations: owed,
      },
      bookings: bookingDocs.map((booking) => {
        const item = propertyById.get(String(booking.propertyId))
        return {
          id: String(booking._id),
          propertyId: booking.propertyId ? String(booking.propertyId) : undefined,
          propertyCode: optionalText(item?.code),
          propertyName: optionalText(item?.name),
          startAt: booking.startAt as Date,
          endAt: booking.endAt as Date,
          state: String(booking.state),
        }
      }),
      semesterBudgets: budgetDocs
        .filter((budget) => budget !== own)
        .map((budget) => budgetFrom(budget, titleById.get(String(budget.eventId)))),
      ...(own ? { budget: budgetFrom(own, String(event.title)) } : {}),
      ...(activeDefenseSession ? { activeDefenseSession } : {}),
      ...(defenseHistory.length ? { defenseHistory } : {}),
      ...(cancellation
        ? {
            cancellationRequest: {
              ...cancellation,
              ...(openCancelTask
                ? {
                    taskId: String(openCancelTask._id),
                    assigneeId: openCancelTask.assigneeId
                      ? String(openCancelTask.assigneeId)
                      : undefined,
                  }
                : {}),
            },
          }
        : {}),
    }
  }

  async function required(eventId: Types.ObjectId, now: Date) {
    const found = await detail(eventId, now)
    if (!found) {
      throw new DomainError('event proposal not found', 'not_found')
    }
    return found
  }

  // Chuyển trạng thái theo lịch của các sự kiện khớp bộ lọc và ghi audit từng sự kiện như luồng hết hạn
  async function transitionEvents(
    filter: Record<string, unknown>,
    state: string,
    action: string,
    now: Date,
  ): Promise<number> {
    return mongoose.connection.transaction(async (session) => {
      const due = await events.find(filter).select({ _id: 1, state: 1 }).session(session).lean()
      if (!due.length) {
        return 0
      }
      // Cùng bộ lọc trong transaction: một lượt job song song sửa cùng sự kiện sẽ xung đột và chạy lại
      const changed = await events.updateMany(
        { ...filter, _id: { $in: due.map((event) => event._id) } },
        { $set: { state } },
        { session },
      )
      await audits.insertMany(
        due.map((event) => ({
          entityType: 'Event',
          entityId: event._id,
          action,
          actorRole: 'SYSTEM',
          before: { state: event.state },
          after: { state },
          correlationId: randomUUID(),
          at: now,
        })),
        { session },
      )
      return changed.modifiedCount
    })
  }
  return {
    // Liệt kê task thẩm định đề xuất và yêu cầu hủy đang Open
    async listOpen(view = 'pending') {
      const approved = view === 'approved'
      const taskDocs = await tasks
        .find(
          approved
            ? { entityType: TASK_TYPE, state: 'Decided' }
            : { entityType: { $in: [TASK_TYPE, CANCELLATION_TASK_TYPE] }, state: 'Open' },
        )
        .sort({ openedAt: -1, _id: -1 })
        .lean()
      if (!taskDocs.length) {
        return []
      }
      const eventDocs = await events
        .find({
          _id: { $in: taskDocs.map((task) => task.entityId) },
          state: { $in: approved ? approvedStates : [...reviewableStates, ...cancellableStates] },
        })
        .lean()
      const versionDocs = await versions
        .find({ eventId: { $in: eventDocs.map((event) => event._id) } })
        .select({ eventId: 1, revisionNo: 1, requestedBudgetTotal: 1 })
        .lean()
      const totals = new Map(
        versionDocs.map((version) => [
          `${String(version.eventId)}:${String(version.revisionNo)}`,
          money(version.requestedBudgetTotal),
        ]),
      )
      const byId = new Map(eventDocs.map((event) => [String(event._id), event]))
      const included = new Set<string>()
      return taskDocs.flatMap((task) => {
        const event = byId.get(String(task.entityId))
        if (!event || (approved && included.has(String(event._id)))) {
          return []
        }
        const isCancel = task.entityType === CANCELLATION_TASK_TYPE
        if (
          !approved &&
          (isCancel
            ? !cancellableStates.includes(String(event.state))
            : !reviewableStates.includes(String(event.state)))
        ) {
          return []
        }
        included.add(String(event._id))
        const total =
          totals.get(`${String(event._id)}:${String(event.currentRevisionNo ?? 1)}`) ?? 0
        return [{ task: taskFrom(task), event: eventFrom(event, total, undefined, isCancel) }]
      })
    },

    // Lấy chi tiết đề xuất sự kiện đang thẩm định
    async find(eventId, now) {
      return detail(new Types.ObjectId(eventId), now)
    },

    // ICPDP officer nhận (claim) task thẩm định đề xuất hoặc yêu cầu hủy
    async claim(eventId, officerId, now) {
      const id = new Types.ObjectId(eventId)
      const actorId = new Types.ObjectId(officerId)
      await mongoose.connection.transaction(async (session) => {
        const cancelTask = await tasks
          .findOne({ entityType: CANCELLATION_TASK_TYPE, entityId: id, state: 'Open' })
          .sort({ openedAt: -1 })
          .session(session)
          .lean()
        if (cancelTask) {
          if (cancelTask.assigneeId && String(cancelTask.assigneeId) !== officerId) {
            return conflict('event proposal review is assigned to another officer')
          }
          const claimedCancel = await tasks.updateOne(
            {
              _id: cancelTask._id,
              state: 'Open',
              $or: [
                { assigneeId: { $exists: false } },
                { assigneeId: null },
                { assigneeId: actorId },
              ],
            },
            { $set: { assigneeId: actorId } },
            { session },
          )
          if (claimedCancel.matchedCount !== 1) {
            return conflict('event proposal review was claimed')
          }
          return
        }
        const task = await tasks
          .findOne({ entityType: TASK_TYPE, entityId: id, state: 'Open' })
          .sort({ openedAt: -1 })
          .session(session)
          .lean()
        if (!task) {
          return conflict('event proposal review is no longer open')
        }
        if (task.assigneeId && String(task.assigneeId) !== officerId) {
          return conflict('event proposal review is assigned to another officer')
        }
        const claimed = await tasks.updateOne(
          {
            _id: task._id,
            state: 'Open',
            $or: [
              { assigneeId: { $exists: false } },
              { assigneeId: null },
              { assigneeId: actorId },
            ],
          },
          { $set: { assigneeId: actorId } },
          { session },
        )
        if (claimed.matchedCount !== 1) {
          return conflict('event proposal review was claimed')
        }
        const changed = await events.updateOne(
          { _id: id, state: 'Pending Approval' },
          { $set: { state: 'Under Review' } },
          { session },
        )
        if (
          changed.matchedCount === 0 &&
          !(await events.exists({ _id: id, state: 'Under Review' }).session(session))
        ) {
          return conflict('event proposal cannot be reviewed in its current state')
        }
        if (changed.modifiedCount === 1) {
          await audits.create(
            [
              {
                entityType: 'Event',
                entityId: id,
                action: 'EVENT_PROPOSAL_REVIEW_CLAIMED',
                actorId,
                actorRole: 'ICPDP_OFFICER',
                before: { state: 'Pending Approval' },
                after: { state: 'Under Review' },
                correlationId: randomUUID(),
                at: now,
              },
            ],
            { session },
          )
        }
      })
      return required(id, now)
    },

    // ICPDP ghi quyết định cho đề xuất sự kiện
    async decide(eventId, officerId, input, now) {
      const id = new Types.ObjectId(eventId)
      await mongoose.connection.transaction(async (session) => {
        await applyProposalDecisionInSession(session, id, officerId, input, now, {
          requireDefendedSession: false,
        })
      })
      return required(id, now)
    },

    // ICPDP duyệt hoặc từ chối yêu cầu hủy sự kiện đã được duyệt
    async decideCancellation(eventId, officerId, input, now) {
      const id = new Types.ObjectId(eventId)
      const actorId = new Types.ObjectId(officerId)
      await mongoose.connection.transaction(async (session) => {
        const task = await tasks
          .findOne({ entityType: CANCELLATION_TASK_TYPE, entityId: id, state: 'Open' })
          .sort({ openedAt: -1 })
          .session(session)
          .lean()
        if (!task) {
          return conflict('event cancellation request is no longer open')
        }
        if (task.assigneeId && String(task.assigneeId) !== officerId) {
          return conflict('event proposal review is assigned to another officer')
        }
        const event = await events.findById(id).session(session).lean()
        if (!event || !cancellableStates.includes(String(event.state))) {
          return conflict('event cannot be cancelled in its current state')
        }
        const requestAudit = await audits
          .findOne({ entityType: 'Event', entityId: id, action: 'EVENT_CANCELLATION_REQUESTED' })
          .sort({ at: -1, _id: -1 })
          .session(session)
          .lean()
        const after = (requestAudit?.after as Doc | undefined) ?? {}
        const requestedReason = String(after.reason ?? requestAudit?.reason ?? 'Approved by ICPDP')
        const requestedAt =
          (after.requestedAt as Date | undefined) ?? (requestAudit?.at as Date | undefined) ?? now
        await tasks.updateOne(
          { _id: task._id, state: 'Open' },
          { $set: { state: 'Decided', assigneeId: actorId, closedAt: now } },
          { session },
        )
        if (input.approve) {
          await cancelEventInSession(session, event, requestedReason, now, 'CMB', 24, actorId)
          await audits.create(
            [
              {
                entityType: 'Event',
                entityId: id,
                action: 'EVENT_CANCELLATION_APPROVED',
                actorId,
                actorRole: 'ICPDP_OFFICER',
                reason: input.reason,
                after: {
                  reason: requestedReason,
                  requestedAt,
                  reviewReason: input.reason,
                  decidedAt: now,
                },
                correlationId: randomUUID(),
                at: now,
              },
            ],
            { session },
          )
        } else {
          await events.updateOne({ _id: id }, { $inc: { __v: 1 } }, { session })
          await audits.create(
            [
              {
                entityType: 'Event',
                entityId: id,
                action: 'EVENT_CANCELLATION_REJECTED',
                actorId,
                actorRole: 'ICPDP_OFFICER',
                reason: input.reason,
                after: {
                  reason: requestedReason,
                  requestedAt,
                  reviewReason: input.reason,
                  decidedAt: now,
                },
                correlationId: randomUUID(),
                at: now,
              },
            ],
            { session },
          )
        }
        if (event.clubId) {
          const recipients = await clubBoardUserIds(event.clubId as Types.ObjectId, session)
          await queueNotifications(
            session,
            recipients,
            'EVENT_CANCELLATION_DECIDED',
            'Event',
            id,
            {
              title: event.title,
              clubId: String(event.clubId),
              approved: input.approve,
              reason: input.reason ?? requestedReason,
            },
            now,
          )
        }
      })
      return required(id, now)
    },

    // Chuyển đề xuất quá hạn chỉnh sửa sang Expired và ghi audit
    async advanceLifecycle(now) {
      const overdue = await events
        .find({ state: 'Revision Requested', revisionDeadlineAt: { $lt: now } })
        .select({ _id: 1, title: 1, currentRevisionNo: 1 })
        .lean()
      let expired = 0
      for (const event of overdue) {
        // Đếm theo giá trị trả về của transaction: callback có thể chạy lại khi lỗi tạm thời
        const didExpire = await mongoose.connection.transaction(async (session) => {
          const changed = await events.updateOne(
            { _id: event._id, state: 'Revision Requested' },
            { $set: { state: 'Expired' } },
            { session },
          )
          if (changed.modifiedCount !== 1) {
            return false
          }
          await m.eventDefenseSessions!.updateMany(
            {
              eventId: event._id,
              state: { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS'] },
            },
            {
              $set: {
                state: 'CANCELLED',
                cancelReason: 'Proposal revision deadline expired',
                updatedAt: now,
              },
            },
            { session },
          )
          if (
            await audits
              .exists({ entityType: 'Event', entityId: event._id, action: 'EVENT_RESCHEDULED' })
              .session(session)
          ) {
            const expiredEvent = await events.findById(event._id).session(session).lean()
            if (expiredEvent) {
              await cancelEventInSession(
                session,
                expiredEvent,
                'Reschedule revision expired',
                now,
                'PROPOSAL_EXPIRY',
                24,
              )
              await events.updateOne(
                { _id: event._id, state: 'Cancelled' },
                { $set: { state: 'Expired' } },
                { session },
              )
            }
          }
          await audits.create(
            [
              {
                entityType: 'Event',
                entityId: event._id,
                action: 'EVENT_PROPOSAL_EXPIRED',
                actorRole: 'SYSTEM',
                before: { state: 'Revision Requested' },
                after: { state: 'Expired' },
                correlationId: randomUUID(),
                at: now,
              },
            ],
            { session },
          )
          const version = await versions
            .findOne({ eventId: event._id, revisionNo: event.currentRevisionNo ?? 1 })
            .session(session)
            .lean()
          if (version) {
            await notifications.create(
              [
                {
                  recipientUserId: version.submittedBy,
                  eventCode: 'EVENT_PROPOSAL_EXPIRED',
                  entityType: 'Event',
                  entityId: event._id,
                  channels: ['IN_APP'],
                  payload: { title: event.title },
                  state: 'Queued',
                  dueAt: now,
                  attempts: 0,
                  createdAt: now,
                },
              ],
              { session },
            )
          }
          return true
        })
        if (didExpire) {
          expired += 1
        }
      }
      const completed = await transitionEvents(
        { state: { $in: ['Upcoming', 'Ongoing'] }, endAt: { $lte: now } },
        'Completed',
        'EVENT_COMPLETED',
        now,
      )
      const started = await transitionEvents(
        { state: 'Upcoming', startAt: { $lte: now }, endAt: { $gt: now } },
        'Ongoing',
        'EVENT_STARTED',
        now,
      )
      return { expired, started, completed }
    },
  }
}
