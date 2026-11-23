import { randomUUID } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { ucmsModels as m } from "./ucms-models.js";

export async function assertAccountabilityOfficer(
  session: ClientSession,
  actorId: Types.ObjectId,
) {
  if (
    !(await m.users!.findOneAndUpdate(
      { _id: actorId, accountState: "Active" },
      { $inc: { __v: 1 } },
      { session },
    ))
  ) {
    throw new DomainError("account is not active", "locked");
  }
  const roles = await m
    .roles!.find({ code: "ICPDP_OFFICER", scope: "system" })
    .session(session)
    .lean();
  if (
    !(await m.userRoleAssignments!.findOneAndUpdate(
      {
        userId: actorId,
        roleId: { $in: roles.map((r) => r._id) },
        revokedAt: null,
      },
      { $inc: { __v: 1 } },
      { session },
    ))
  )
    throw new DomainError("ICPDP officer role required", "forbidden");
}
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
  await m.auditLogs!.create(
    [
      {
        entityType,
        entityId,
        action,
        actorId,
        actorRole: officer ? "ICPDP_OFFICER" : "Club Member",
        after,
        reason,
        correlationId: randomUUID(),
        at: now,
      },
    ],
    { session },
  );
  const submitted = await m
    .auditLogs!.findOne({
      entityType,
      entityId,
      action: entityType === "Event" ? "REPORT_SUBMIT" : "SETTLEMENT_SUBMIT",
    })
    .sort({ at: -1, _id: -1 })
    .session(session)
    .lean();
  await queueNotifications(
    session,
    [...(await clubBoardUserIds(clubId, session)), submitted?.actorId],
    action,
    entityType,
    entityId,
    { action, reason },
    now,
  );
}
export async function accountabilityTask(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
) {
  return m
    .approvalTasks!.findOne({ entityType, entityId, state: "Open" })
    .sort({ openedAt: -1, _id: -1 })
    .session(session)
    .lean();
}
export async function openAccountabilityTask(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
  clubId: Types.ObjectId,
  title: string,
  now: Date,
) {
  if (await accountabilityTask(session, entityType, entityId))
    throw new DomainError("an open review task already exists", "conflict");
  await m.approvalTasks!.create(
    [{ entityType, entityId, clubId, title, state: "Open", openedAt: now }],
    { session },
  );
}
export async function claimAccountabilityTask(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
  actorId: Types.ObjectId,
) {
  const task = await accountabilityTask(session, entityType, entityId);
  if (!task || (task.assigneeId && String(task.assigneeId) !== String(actorId)))
    throw new DomainError("review is assigned or unavailable", "conflict");
  await m.approvalTasks!.updateOne(
    { _id: task._id },
    { $set: { assigneeId: actorId } },
    { session },
  );
}
export async function decideAccountabilityTask(
  session: ClientSession,
  entityType: string,
  entityId: Types.ObjectId,
  actorId: Types.ObjectId,
  outcome: "Approve" | "Request revision",
  reason: string,
  now: Date,
) {
  const task = await accountabilityTask(session, entityType, entityId);
  if (!task || String(task.assigneeId) !== String(actorId))
    throw new DomainError("claim the review before deciding", "conflict");
  await m.approvalDecisions!.create(
    [{ approvalTaskId: task._id, outcome, reason, actorId, at: now }],
    { session },
  );
  await m.approvalTasks!.updateOne(
    { _id: task._id },
    { $set: { state: "Decided", closedAt: now } },
    { session },
  );
}
