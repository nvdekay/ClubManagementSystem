import { Types, type ClientSession } from 'mongoose'
import { DomainError } from '../../domain/errors.js'
import {
  lockActiveUser,
  lockIcpdpOfficerRole,
  queueNotifications,
  writeAudit,
} from './repo-helpers.js'
import { clubBoardUserIds } from './club-board.js'
import { ucmsModels as m } from './ucms-models.js'

// Khóa tài khoản và xác nhận actor là ICPDP officer đang Active
export async function assertAccountabilityOfficer(session: ClientSession, actorId: Types.ObjectId) {
  await lockActiveUser(session, actorId)
  await lockIcpdpOfficerRole(session, actorId)
}
// Ghi audit log báo cáo/quyết toán và queue thông báo cho ban chủ nhiệm
export async function accountabilityAudit(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
  clubId: Types.ObjectId,
  actorId: Types.ObjectId,
  action: string,
  after: unknown,
  now: Date,
  officer: boolean,
  reason?: string,
) {
  await writeAudit(session, {
    entityType,
    entityId,
    action,
    actorId,
    actorRole: officer ? 'ICPDP_OFFICER' : 'Club Member',
    after,
    reason,
    at: now,
  })
  const submitted = await m
    .auditLogs!.findOne({
      entityType,
      entityId,
      action: entityType === 'Event' ? 'REPORT_SUBMIT' : 'SETTLEMENT_SUBMIT',
    })
    .sort({ at: -1, _id: -1 })
    .session(session)
    .lean()
  await queueNotifications(
    session,
    [...(await clubBoardUserIds(clubId, session)), submitted?.actorId],
    { eventCode: action, entityType, entityId, payload: { action, reason }, now },
  )
}
// Tìm task review đang Open mới nhất của một đối tượng
export async function accountabilityTask(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
) {
  return m
    .approvalTasks!.findOne({ entityType, entityId, state: 'Open' })
    .sort({ openedAt: -1, _id: -1 })
    .session(session)
    .lean()
}
// Mở task review mới, từ chối nếu đã có task Open
export async function openAccountabilityTask(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
  clubId: Types.ObjectId,
  title: string,
  now: Date,
) {
  if (await accountabilityTask(session, entityType, entityId)) {
    throw new DomainError('an open review task already exists', 'conflict')
  }
  await m.approvalTasks!.create(
    [{ entityType, entityId, clubId, title, state: 'Open', openedAt: now }],
    { session },
  )
}
// ICPDP nhận (claim) task review chưa có người xử lý
export async function claimAccountabilityTask(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
  actorId: Types.ObjectId,
) {
  const task = await accountabilityTask(session, entityType, entityId)
  if (!task || (task.assigneeId && String(task.assigneeId) !== String(actorId))) {
    throw new DomainError('review is assigned or unavailable', 'conflict')
  }
  await m.approvalTasks!.updateOne(
    { _id: task._id },
    { $set: { assigneeId: actorId } },
    { session },
  )
}
// Ghi quyết định Approve/Request revision và đóng task review
export async function decideAccountabilityTask(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
  actorId: Types.ObjectId,
  outcome: 'Approve' | 'Request revision',
  reason: string,
  now: Date,
) {
  const task = await accountabilityTask(session, entityType, entityId)
  if (!task || String(task.assigneeId) !== String(actorId)) {
    throw new DomainError('claim the review before deciding', 'conflict')
  }
  await m.approvalDecisions!.create(
    [{ approvalTaskId: task._id, outcome, reason, actorId, at: now }],
    { session },
  )
  await m.approvalTasks!.updateOne(
    { _id: task._id },
    { $set: { state: 'Decided', closedAt: now } },
    { session },
  )
}
