import { randomUUID } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { VICE_LEADER_SEAT_CODES } from "../../domain/access.js";
import { settlementDueAt } from "../../domain/budget-disbursement.js";
import { DomainError } from "../../domain/errors.js";
import {
  assertRevisionDeadlineBeforeDefense,
  normalizeDefenseOutcome,
  type DefenseOfficerNote,
  type DefenseOutcome,
  type EventDefenseSession,
  type EventDefenseState,
} from "../../domain/event-defense.js";
import {
  approvedBudget,
  type ApprovedBudgetLine,
  type NormalizedEventDecision,
  type RequestedBudgetLine,
} from "../../domain/event-proposal-review.js";
import { notificationChannels } from "../../domain/notification.js";
import { cancelEventInSession } from "./event-cancellation.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;

export function oid(value: string): Types.ObjectId {
  return new Types.ObjectId(value);
}

export function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

export function money(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}

export function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

export function requestedLines(raw: unknown): RequestedBudgetLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const line = item as Doc;
    return [{
      category: String(line.category ?? ""),
      amount: money(line.amount),
      purpose: String(line.purpose ?? ""),
      ...(optionalText(line.plannedItems) ? { plannedItems: String(line.plannedItems) } : {}),
    }];
  });
}

export function approvedLines(raw: unknown): ApprovedBudgetLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Doc) => ({
    category: String(item.category ?? ""),
    requestedAmount: money(item.requestedAmount),
    approvedAmount: money(item.approvedAmount),
    ...(optionalText(item.reason) ? { reason: String(item.reason) } : {}),
  }));
}

function mapNotes(raw: unknown): DefenseOfficerNote[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== "object") return [];
    const note = entry as Doc;
    return [{
      officerId: String(note.officerId ?? ""),
      officerName: String(note.officerName ?? ""),
      content: String(note.content ?? ""),
      updatedAt: note.updatedAt instanceof Date ? note.updatedAt : new Date(String(note.updatedAt ?? 0)),
    }];
  });
}

export function mapDefenseSession(doc: Doc): EventDefenseSession {
  return {
    id: String(doc._id),
    eventId: String(doc.eventId),
    revisionNo: Number(doc.revisionNo ?? 1),
    title: String(doc.title ?? ""),
    startAt: doc.startAt as Date,
    endAt: doc.endAt as Date,
    durationMinutes: Number(doc.durationMinutes ?? 60),
    propertyId: String(doc.propertyId),
    propertyName: String(doc.propertyName ?? ""),
    ...(optionalText(doc.note) ? { note: String(doc.note) } : {}),
    state: String(doc.state ?? "SCHEDULED") as EventDefenseState,
    ...(optionalText(doc.rescheduleReason) ? { rescheduleReason: String(doc.rescheduleReason) } : {}),
    ...(doc.confirmedAt instanceof Date ? { confirmedAt: doc.confirmedAt } : {}),
    ...(doc.confirmedBy ? { confirmedBy: String(doc.confirmedBy) } : {}),
    ...(doc.startedAt instanceof Date ? { startedAt: doc.startedAt } : {}),
    ...(doc.endedAt instanceof Date ? { endedAt: doc.endedAt } : {}),
    leadOfficerId: String(doc.leadOfficerId),
    notes: mapNotes(doc.notes),
    ...(optionalText(doc.outcome) ? { outcome: String(doc.outcome) as DefenseOutcome } : {}),
    ...(optionalText(doc.outcomeReason) ? { outcomeReason: String(doc.outcomeReason) } : {}),
    ...(optionalText(doc.cancelReason) ? { cancelReason: String(doc.cancelReason) } : {}),
    createdAt: doc.createdAt as Date,
    updatedAt: doc.updatedAt as Date,
  };
}

export async function clubEventManagerRecipients(
  clubId: Types.ObjectId,
  fallbackUserId: unknown,
  session?: ClientSession,
): Promise<Types.ObjectId[]> {
  const posQuery = m.clubPositions!.find({
    clubId,
    isActive: true,
    $or: [{ isLeaderRole: true }, { isBoardSeat: true, code: { $in: [...VICE_LEADER_SEAT_CODES] } }],
  }).select({ _id: 1 });
  if (session) posQuery.session(session);
  const posDocs = await posQuery.lean();
  const posIds = posDocs.map((p) => p._id);
  const ids = new Map<string, Types.ObjectId>();
  if (fallbackUserId) {
    const fb = oid(String(fallbackUserId));
    ids.set(String(fb), fb);
  }
  if (posIds.length) {
    const assignQuery = m.clubPositionAssignments!.find({
      clubId,
      positionId: { $in: posIds },
      $or: [{ effectiveTo: null }, { effectiveTo: { $exists: false } }],
    }).select({ membershipId: 1 });
    if (session) assignQuery.session(session);
    const assignDocs = await assignQuery.lean();
    const memberIds = assignDocs.map((a) => a.membershipId);
    if (memberIds.length) {
      const memQuery = m.clubMemberships!.find({ _id: { $in: memberIds }, state: "Active" }).select({ userId: 1 });
      if (session) memQuery.session(session);
      const memDocs = await memQuery.lean();
      for (const mem of memDocs) {
        if (mem.userId) {
          const userObjId = oid(String(mem.userId));
          ids.set(String(userObjId), userObjId);
        }
      }
    }
  }
  return [...ids.values()];
}

export async function applyProposalDecisionInSession(
  session: ClientSession,
  eventId: Types.ObjectId,
  officerId: string,
  input: NormalizedEventDecision,
  now: Date,
  options: { requireDefendedSession: boolean },
): Promise<void> {
  const events = m.events!;
  const tasks = m.approvalTasks!;
  const versions = m.eventProposalVersions!;
  const decisions = m.approvalDecisions!;
  const budgets = m.eventBudgets!;
  const audits = m.auditLogs!;
  const notifications = m.notifications!;
  const defenseSessions = m.eventDefenseSessions!;

  const actorId = oid(officerId);
  const event = await events.findOne({
    _id: eventId,
    state: { $in: ["Under Review", "Re-defense Pending"] },
  }).session(session).lean();
  const task = await tasks.findOne({
    entityType: "EVENT_PROPOSAL",
    entityId: eventId,
    state: "Open",
    assigneeId: actorId,
  }).sort({ openedAt: -1 }).session(session).lean();
  if (!event || !task) conflict("event proposal cannot be decided");

  const activeDefense = await defenseSessions.findOne({
    eventId,
    state: { $in: ["SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED", "IN_PROGRESS"] },
  }).sort({ createdAt: -1 }).session(session).lean();

  const pendingDefended = await defenseSessions.findOne({
    eventId,
    state: "DEFENDED",
    $or: [{ outcome: { $exists: false } }, { outcome: null }],
  }).sort({ createdAt: -1 }).session(session).lean();

  if (options.requireDefendedSession && !pendingDefended) {
    conflict("defense session must be ended before submitting a post-defense decision");
  }
  if (activeDefense) {
    if (input.outcome === "Approve" || input.outcome === "Reject" || input.outcome === "Re-defense") {
      conflict("cannot approve, reject, or request re-defense while an active defense session exists");
    }
    if (input.outcome === "Request revision" && input.revisionDeadlineAt) {
      assertRevisionDeadlineBeforeDefense(input.revisionDeadlineAt, activeDefense.startAt as Date);
    }
  }
  if (input.outcome === "Re-defense" && !pendingDefended) {
    conflict("re-defense decision requires a completed defense session");
  }

  const version = await versions.findOne({
    eventId,
    revisionNo: event.currentRevisionNo ?? 1,
  }).session(session).lean();
  if (!version) conflict("submitted proposal revision is missing");

  const lines = input.outcome === "Approve"
    ? approvedBudget(requestedLines(version.budgetLines), input.budgetLines)
    : [];

  const decisionId = new Types.ObjectId();
  await decisions.create([{
    _id: decisionId,
    approvalTaskId: task._id,
    level: 1,
    outcome: input.outcome,
    reason: input.reason,
    reviewNote: input.reviewNote,
    comments: {
      sections: input.sections,
      conditions: input.conditions,
      ...(lines.length ? { budgetLines: lines } : {}),
    },
    actorId,
    at: now,
  }], { session });

  const nextState = input.outcome === "Approve"
    ? "Approved"
    : input.outcome === "Reject"
      ? "Rejected"
      : input.outcome === "Re-defense"
        ? "Re-defense Pending"
        : "Revision Requested";

  const changed = await events.updateOne(
    { _id: eventId, state: event.state },
    {
      $set: {
        state: nextState,
        ...(input.revisionDeadlineAt ? { revisionDeadlineAt: input.revisionDeadlineAt } : {}),
        ...(input.outcome === "Approve" ? { approvalConditions: input.conditions } : {}),
      },
      ...(!input.revisionDeadlineAt ? { $unset: { revisionDeadlineAt: "" } } : {}),
    },
    { session },
  );
  if (changed.modifiedCount !== 1) conflict("event proposal changed while deciding");

  if (input.outcome !== "Re-defense") {
    await tasks.updateOne({ _id: task._id, state: "Open" }, { $set: { state: "Decided", closedAt: now } }, { session });
  }

  if (pendingDefended) {
    await defenseSessions.updateOne(
      { _id: pendingDefended._id, state: "DEFENDED" },
      {
        $set: {
          outcome: normalizeDefenseOutcome(input.outcome),
          ...(input.reason ? { outcomeReason: input.reason } : {}),
          updatedAt: now,
        },
      },
      { session },
    );
  }

  if (input.outcome === "Reject" && await audits.exists({ entityType: "Event", entityId: eventId, action: "EVENT_RESCHEDULED" }).session(session)) {
    await cancelEventInSession(session, { ...event, state: nextState }, input.reason ?? "Reschedule rejected", now, "PROPOSAL_REJECTION", 24, actorId, decisionId);
    await events.updateOne({ _id: eventId, state: "Cancelled" }, { $set: { state: nextState } }, { session });
  }

  let budgetId: Types.ObjectId | undefined;
  if (lines.length) {
    const requestedTotal = lines.reduce((sum, line) => sum + line.requestedAmount, 0);
    const approvedTotal = lines.reduce((sum, line) => sum + line.approvedAmount, 0);
    const existingBudget = await budgets.findOne({ eventId }).session(session).lean();
    if (existingBudget) {
      budgetId = existingBudget._id as Types.ObjectId;
      const disbursed = money(existingBudget.disbursedTotal);
      const existingLines = approvedLines(existingBudget.lines);
      if (disbursed > 0 && (
        approvedTotal !== money(existingBudget.approvedTotal)
        || lines.length !== existingLines.length
        || lines.some((line, index) => line.category !== existingLines[index]?.category || line.approvedAmount !== existingLines[index]?.approvedAmount)
      )) {
        conflict("a reschedule cannot change an already disbursed budget");
      }
      if (approvedTotal < disbursed) conflict("approved budget cannot be less than the amount already disbursed");
      await budgets.updateOne(
        { _id: budgetId },
        {
          $set: {
            lines: lines.map((line) => ({ ...line })),
            requestedTotal: decimal(requestedTotal),
            approvedTotal: decimal(approvedTotal),
            approvedByDecisionId: decisionId,
            periodCode: event.semesterCode,
            ...(disbursed === 0 ? { state: "Approved" } : { settlementDueAt: settlementDueAt(event.endAt as Date) }),
          },
          $inc: { __v: 1 },
        },
        { session },
      );
    } else {
      budgetId = new Types.ObjectId();
      await budgets.create([{
        _id: budgetId,
        eventId,
        clubId: event.clubId,
        lines: lines.map((line) => ({ ...line })),
        requestedTotal: decimal(requestedTotal),
        approvedTotal: decimal(approvedTotal),
        approvedByDecisionId: decisionId,
        disbursedTotal: decimal(0),
        refundedTotal: decimal(0),
        isSettlementLate: false,
        state: "Approved",
        periodCode: event.semesterCode,
        createdAt: now,
      }], { session });
    }
  }

  const action = `EVENT_PROPOSAL_${nextState.toUpperCase().replace(/ /g, "_")}`;
  await audits.create([{
    entityType: "Event",
    entityId: eventId,
    action,
    actorId,
    actorRole: "ICPDP_OFFICER",
    before: { state: event.state },
    after: { state: nextState, revisionNo: version.revisionNo, budgetId },
    reason: input.reason,
    correlationId: randomUUID(),
    at: now,
  }], { session });

  await notifications.create([{
    recipientUserId: version.submittedBy,
    eventCode: action,
    entityType: "Event",
    entityId: eventId,
    channels: notificationChannels(action),
    payload: {
      title: event.title,
      outcome: input.outcome,
      reason: input.reason,
      sections: input.sections,
      revisionDeadlineAt: input.revisionDeadlineAt,
      conditions: input.conditions,
    },
    state: "Queued",
    dueAt: now,
    attempts: 0,
    createdAt: now,
  }], { session });
}
