import { randomUUID } from 'node:crypto'
import mongoose, { Types, type ClientSession } from 'mongoose'
import type { AccountabilityReminderRepository } from '../../domain/accountability-reminder.js'
import { DomainError } from '../../domain/errors.js'
import { clubBoardUserIds, queueNotifications } from './club-board.js'
import { postEventDeadline } from './post-event-report-deadlines.js'
import { ucmsModels as m } from './ucms-models.js'
const OFFICER_CODES: Readonly<Record<string, string>> = {
  REPORT_ESCALATED: 'REPORT_ESCALATED_TO_ICPDP',
  REFUND_OVERDUE: 'REFUND_OVERDUE_TO_ICPDP',
}
// Gửi nhắc hạn/leo thang một lần cho báo cáo hoặc quyết toán và ghi audit
async function remindOnce(
  session: ClientSession,
  type: string,
  id: Types.ObjectId,
  clubId: Types.ObjectId,
  code: string,
  dueAt: Date,
  now: Date,
  lock: () => PromiseLike<unknown>,
): Promise<number> {
  if (
    await m
      .auditLogs!.exists({
        entityType: type,
        entityId: id,
        action: code,
        'after.dueAt': dueAt,
      })
      .session(session)
  ) {
    return 0
  }
  // Chỉ khoá (tăng __v) khi thật sự gửi: nếu thực thể đổi sau khi transaction đọc, lệnh ghi này
  // xung đột và transaction chạy lại; tăng __v mỗi lượt quét làm editor đang mở bị 409.
  await lock()
  await m.auditLogs!.create(
    [
      {
        entityType: type,
        entityId: id,
        action: code,
        actorRole: 'SYSTEM',
        after: { dueAt },
        correlationId: randomUUID(),
        at: now,
      },
    ],
    { session },
  )
  await queueNotifications(
    session,
    await clubBoardUserIds(clubId, session),
    code,
    type,
    id,
    { dueAt },
    now,
  )
  // Leo thang cũng gửi tới ICPDP, dưới mã riêng để hiện trong workspace của cán bộ.
  const officerCode = OFFICER_CODES[code]
  if (officerCode) {
    const roles = await m
      .roles!.find({ code: 'ICPDP_OFFICER', scope: 'system' })
      .session(session)
      .lean()
    const assignments = await m
      .userRoleAssignments!.find({
        roleId: { $in: roles.map((r) => r._id) },
        revokedAt: null,
      })
      .session(session)
      .lean()
    await queueNotifications(
      session,
      assignments.map((a) => a.userId),
      officerCode,
      type,
      id,
      { dueAt },
      now,
    )
  }
  return 1
}
// Repository nhắc hạn nộp báo cáo sau sự kiện và quyết toán ngân sách
export function mongoAccountabilityReminderRepository(): AccountabilityReminderRepository {
  return {
    // Quét sự kiện và ngân sách để gửi nhắc, cảnh báo quá hạn
    async remind(now) {
      let count = 0
      const events = await m
        .events!.find({ organizerType: 'CLUB', state: 'Completed' })
        .select({ _id: 1 })
        .lean()
      for (const eventRef of events) {
        let changed = 0
        await mongoose.connection.transaction(async (session) => {
          changed = 0
          const event = await m
            .events!.findOne({ _id: eventRef._id, state: 'Completed' })
            .session(session)
            .lean()
          if (!event) {
            return
          }
          function lock() {
            return m.events!.updateOne(
              { _id: eventRef._id, state: 'Completed' },
              { $inc: { __v: 1 } },
              { session },
            )
          }
          if (
            event.audienceScope === 'MEMBERS_ONLY' &&
            !(await m.eventBudgets!.exists({ eventId: event._id }).session(session))
          ) {
            return
          }
          const latest = await m
            .postEventReports!.findOne({ eventId: event._id })
            .sort({ versionNo: -1 })
            .session(session)
            .lean()
          if (latest && ['Submitted', 'Accepted'].includes(String(latest.state))) {
            return
          }
          let deadline
          try {
            deadline = await postEventDeadline(event, session)
          } catch (error) {
            if (error instanceof DomainError && error.kind === 'unavailable') {
              return
            }
            throw error
          }
          if (now >= deadline.reminderAt) {
            changed += await remindOnce(
              session,
              'Event',
              event._id as Types.ObjectId,
              event.clubId as Types.ObjectId,
              'REPORT_DUE_SOON',
              deadline.dueAt,
              now,
              lock,
            )
          }
          if (now > deadline.dueAt) {
            changed += await remindOnce(
              session,
              'Event',
              event._id as Types.ObjectId,
              event.clubId as Types.ObjectId,
              'REPORT_DEADLINE_PASSED',
              deadline.dueAt,
              now,
              lock,
            )
          }
          if (now > deadline.escalationAt) {
            changed += await remindOnce(
              session,
              'Event',
              event._id as Types.ObjectId,
              event.clubId as Types.ObjectId,
              'REPORT_ESCALATED',
              deadline.dueAt,
              now,
              lock,
            )
          }
        })
        count += changed
      }
      const budgets = await m
        .eventBudgets!.find({
          state: {
            $in: ['Disbursed', 'Reconciliation Pending', 'Recovery Pending'],
          },
        })
        .select({ _id: 1 })
        .lean()
      for (const budgetRef of budgets) {
        let changed = 0
        await mongoose.connection.transaction(async (session) => {
          changed = 0
          const open = {
            _id: budgetRef._id,
            state: {
              $in: ['Disbursed', 'Reconciliation Pending', 'Recovery Pending'],
            },
          }
          const budget = await m.eventBudgets!.findOne(open).session(session).lean()
          if (!budget) {
            return
          }
          function lock() {
            return m.eventBudgets!.updateOne(open, { $inc: { __v: 1 } }, { session })
          }
          const refund = budget.state === 'Recovery Pending'
          const dueAt = (refund ? budget.recoveryDueAt : budget.settlementDueAt) as Date | undefined
          if (!dueAt) {
            return
          }
          const id = budget._id as Types.ObjectId,
            club = budget.clubId as Types.ObjectId
          if (now >= new Date(dueAt.getTime() - 2 * 86400000)) {
            changed += await remindOnce(
              session,
              'EventBudget',
              id,
              club,
              refund ? 'REFUND_DUE_SOON' : 'SETTLEMENT_DUE_SOON',
              dueAt,
              now,
              lock,
            )
          }
          if (now > dueAt) {
            changed += await remindOnce(
              session,
              'EventBudget',
              id,
              club,
              refund ? 'REFUND_OVERDUE' : 'SETTLEMENT_OVERDUE',
              dueAt,
              now,
              lock,
            )
          }
        })
        count += changed
      }
      return count
    },
  }
}
