import { randomUUID } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import {
  approvalStep, resolveApprovalRoute, type RoutingFacts, type RoutingRule,
} from "../../domain/approval-routing.js";
import { DomainError } from "../../domain/errors.js";
import { queueNotifications } from "./club-board.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const HOUR_MS = 3_600_000;
const OPEN_VIOLATION_STATES = ["Open", "Under Investigation", "Awaiting Club Response", "Decision Issued", "Corrective Action"];

/** Compliance history fact (UC05): the club's UC40 cases that are not resolved or closed. */
export async function openViolationCount(clubId: unknown, session?: ClientSession): Promise<number> {
  if (!clubId) return 0;
  return m.violations!.countDocuments({ clubId, state: { $in: OPEN_VIOLATION_STATES } }).session(session ?? null);
}

/** Task fields frozen when a UC08 / UC26 / UC46 review opens: the active rule set decides the levels (BR16). */
export async function routedTaskFields(session: ClientSession, facts: RoutingFacts, now: Date) {
  const active = await m.routingRuleSets!.findOne({ state: "Active" }).session(session).lean();
  const route = resolveApprovalRoute(active ? { id: String(active._id), rules: (active.rules ?? []) as RoutingRule[] } : null, facts);
  return { ...(route.routingRuleSetId ? { routingRuleSetId: new Types.ObjectId(route.routingRuleSetId) } : {}),
    ...(route.routingRuleId ? { routingRuleId: route.routingRuleId } : {}), requiredLevel: route.requiredLevel, currentLevel: 1,
    ...(route.slaHours ? { slaDueAt: new Date(now.getTime() + route.slaHours * HOUR_MS) } : {}) };
}

export async function systemRoleUserIds(code: string, session?: ClientSession): Promise<Types.ObjectId[]> {
  const roles = await m.roles!.find({ code, scope: "system" }).session(session ?? null).lean();
  const ids = await m.userRoleAssignments!.distinct("userId", { roleId: { $in: roles.map((role) => role._id) }, revokedAt: null })
    .session(session ?? null);
  return ids.map((value) => new Types.ObjectId(String(value)));
}

/** D1: level 2 is claimed and decided only by a holder of ICPDP_HEAD (checked inside the transaction). */
export async function assertApprovalLevelReviewer(session: ClientSession, task: Doc, actorId: string): Promise<void> {
  if (Number(task.currentLevel ?? 1) < 2) return;
  const heads = await systemRoleUserIds("ICPDP_HEAD", session);
  if (!heads.some((id) => String(id) === actorId)) throw new DomainError("ICPDP_HEAD role required for the second approval level", "forbidden");
}

/** Level of this decision and whether it takes effect; enforces the level-2 reviewer. */
export async function approvalDecisionStep(session: ClientSession, task: Doc, actorId: string, outcome: string) {
  await assertApprovalLevelReviewer(session, task, actorId);
  // Four eyes: whoever approved level 1 cannot also decide level 2.
  if (Number(task.currentLevel ?? 1) >= 2
    && await m.approvalDecisions!.exists({ approvalTaskId: task._id, level: 1, actorId: new Types.ObjectId(actorId) }).session(session)) {
    throw new DomainError("the second level must be decided by another ICPDP_HEAD", "forbidden");
  }
  return approvalStep({ requiredLevel: Number(task.requiredLevel ?? 1), currentLevel: Number(task.currentLevel ?? 1) }, outcome);
}

/**
 * A level-1 approval of a two-level request: the decision is recorded, the task moves to level 2 and
 * back to the shared queue for ICPDP_HEAD, and the entity keeps its state — no final side effect.
 */
export async function advanceToSecondLevel(session: ClientSession, input: { task: Doc; decision: Doc; actorId: string;
  auditEntityType: string; entityId: Types.ObjectId; now: Date }): Promise<void> {
  const { task, now } = input;
  await m.approvalDecisions!.create([{ ...input.decision, approvalTaskId: task._id, level: 1, outcome: "Approve",
    actorId: new Types.ObjectId(input.actorId), at: now }], { session });
  const rule = task.routingRuleSetId ? await m.routingRuleSets!.findById(task.routingRuleSetId).session(session).lean() : null;
  const slaHours = ((rule?.rules ?? []) as RoutingRule[]).find((item) => item.id === task.routingRuleId)?.slaHours;
  const moved = await m.approvalTasks!.updateOne({ _id: task._id, state: "Open", currentLevel: { $ne: 2 } },
    { $set: { currentLevel: 2, ...(slaHours ? { slaDueAt: new Date(now.getTime() + slaHours * HOUR_MS) } : {}) },
      $unset: { assigneeId: "" } }, { session });
  if (moved.modifiedCount !== 1) throw new DomainError("the review changed meanwhile; reload and retry", "conflict");
  await m.auditLogs!.create([{ entityType: input.auditEntityType, entityId: input.entityId, action: "APPROVAL_LEVEL1_APPROVED",
    actorId: new Types.ObjectId(input.actorId), actorRole: "ICPDP Officer", after: { requiredLevel: 2, currentLevel: 2,
      routingRuleSetId: task.routingRuleSetId ? String(task.routingRuleSetId) : undefined, routingRuleId: task.routingRuleId },
    reason: typeof input.decision.reason === "string" ? input.decision.reason : undefined, correlationId: randomUUID(), at: now }], { session });
  const heads = await systemRoleUserIds("ICPDP_HEAD", session);
  await queueNotifications(session, heads, "APPROVAL_LEVEL2_REQUIRED",
    String(task.entityType), input.entityId, { title: String(task.title ?? ""), entityType: String(task.entityType) }, now);
}
