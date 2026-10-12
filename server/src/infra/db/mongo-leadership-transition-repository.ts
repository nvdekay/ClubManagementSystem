import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { GRANTABLE_CLUB_PERMISSIONS, LEADER_ONLY_CLUB_PERMISSIONS } from "../../domain/access.js";
import { DomainError } from "../../domain/errors.js";
import type {
  LeadershipTransition,
  LeadershipTransitionRepository,
  TransitionBoardRole,
  TransitionCandidate,
  TransitionDecision,
  TransitionDecisionInput,
  TransitionHandover,
  TransitionObligation,
  TransitionTerm,
} from "../../domain/leadership-transition.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

function notFound(message: string): never {
  throw new DomainError(message, "not_found");
}

function term(doc: Doc): TransitionTerm {
  return { id: String(doc._id), name: String(doc.name), startAt: doc.startAt as Date,
    endAt: doc.endAt as Date, state: String(doc.state) };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function rawObjects(value: unknown): Doc[] {
  return Array.isArray(value) ? value.filter((item): item is Doc => Boolean(item)
    && typeof item === "object" && !Array.isArray(item)) : [];
}

function obligations(value: unknown): TransitionObligation[] {
  return rawObjects(value).flatMap((item) => {
    if (typeof item.id !== "string" || typeof item.type !== "string"
      || typeof item.description !== "string" || typeof item.assigneeMembershipId !== "string") return [];
    return [{ id: item.id, type: item.type, description: item.description,
      assigneeMembershipId: item.assigneeMembershipId,
      ...(typeof item.entityId === "string" ? { entityId: item.entityId } : {}) }];
  });
}

function boardRoles(value: unknown): TransitionBoardRole[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return rawObjects(value).flatMap((item) => {
    if (typeof item.code !== "string" || typeof item.name !== "string") return [];
    return [{ code: item.code, name: item.name,
      ...(typeof item.unit === "string" ? { unit: item.unit } : {}),
      isLeaderRole: item.isLeaderRole === true, isSingleHolder: item.isSingleHolder !== false,
      permissionCodes: stringArray(item.permissionCodes) }];
  });
}

function handover(value: unknown): TransitionHandover {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { items: [] };
  const source = value as Doc;
  const items = rawObjects(source.items).flatMap((item) => typeof item.id === "string"
    && typeof item.description === "string" ? [{ id: item.id, description: item.description }] : []);
  const proposedBoardRoles = boardRoles(source.proposedBoardRoles);
  return { items, ...(proposedBoardRoles ? { proposedBoardRoles } : {}) };
}

export function roleSnapshot(doc: Doc) {
  return { positionId: String(doc._id), code: String(doc.code), name: String(doc.name),
    ...(typeof doc.unit === "string" ? { unit: doc.unit } : {}),
    isBoardSeat: doc.isBoardSeat === true, isLeaderRole: doc.isLeaderRole === true,
    isDefaultMemberRole: doc.isDefaultMemberRole === true,
    isSingleHolder: doc.isSingleHolder !== false, permissionCodes: stringArray(doc.permissionCodes) };
}

export function mongoLeadershipTransitionRepository(): LeadershipTransitionRepository {
  const plans = ucmsModels.transitionPlans!;
  const clubs = ucmsModels.clubs!;
  const terms = ucmsModels.clubTerms!;
  const positions = ucmsModels.clubPositions!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const memberships = ucmsModels.clubMemberships!;
  const users = ucmsModels.users!;
  const versions = ucmsModels.clubRoleStructureVersions!;
  const tasks = ucmsModels.approvalTasks!;
  const decisions = ucmsModels.approvalDecisions!;
  const audits = ucmsModels.auditLogs!;
  const notifications = ucmsModels.notifications!;

  async function detail(planId: Types.ObjectId,
    session?: ClientSession): Promise<LeadershipTransition | null> {
    const [plan, taskDoc] = await Promise.all([
      plans.findById(planId).session(session ?? null).lean(),
      tasks.findOne({ entityType: "TRANSITION_PLAN", entityId: planId })
        .sort({ openedAt: -1 }).session(session ?? null).lean(),
    ]);
    if (!plan || !taskDoc) return null;
    const [club, fromTerm, toTerm, decisionDocs] = await Promise.all([
      clubs.findById(plan.clubId).session(session ?? null).lean(),
      terms.findById(plan.fromTermId).session(session ?? null).lean(),
      terms.findById(plan.toTermId).session(session ?? null).lean(),
      decisions.find({ approvalTaskId: taskDoc._id }).sort({ at: 1 }).session(session ?? null).lean(),
    ]);
    if (!club || !fromTerm || !toTerm) return null;
    const candidateDocs = rawObjects(plan.candidates);
    const membershipIds = candidateDocs.flatMap((item) => typeof item.membershipId === "string"
      && Types.ObjectId.isValid(item.membershipId) ? [new Types.ObjectId(item.membershipId)] : []);
    const [positionDocs, membershipDocs] = await Promise.all([
      positions.find({ clubId: plan.clubId }).session(session ?? null).lean(),
      memberships.find({ _id: { $in: membershipIds } }).session(session ?? null).lean(),
    ]);
    const userDocs = await users.find({
      _id: { $in: membershipDocs.map((item) => item.userId) },
    }).session(session ?? null).lean();
    const byCode = new Map(positionDocs.map((item) => [String(item.code), item]));
    const byMembership = new Map(membershipDocs.map((item) => [String(item._id), item]));
    const byUser = new Map(userDocs.map((item) => [String(item._id), item]));
    const proposedByCode = new Map((handover(plan.handoverItems).proposedBoardRoles ?? [])
      .map((item) => [item.code, item]));
    const candidates: TransitionCandidate[] = candidateDocs.flatMap((item) => {
      if (typeof item.positionCode !== "string" || typeof item.membershipId !== "string") return [];
      const position = byCode.get(item.positionCode);
      const proposedRole = proposedByCode.get(item.positionCode);
      const membership = byMembership.get(item.membershipId);
      const user = membership ? byUser.get(String(membership.userId)) : undefined;
      return (position || proposedRole) && membership && user ? [{ positionCode: item.positionCode,
        positionName: String(position?.name ?? proposedRole?.name), membershipId: item.membershipId,
        userId: String(user._id), displayName: String(user.displayName ?? user.email) }] : [];
    });
    const mappedDecisions: TransitionDecision[] = decisionDocs.map((item) => ({
      id: String(item._id), outcome: item.outcome as TransitionDecision["outcome"],
      ...(typeof item.reason === "string" ? { reason: item.reason } : {}),
      followUpObligationIds: stringArray((item.comments as Doc | undefined)?.followUpObligationIds),
      actorId: String(item.actorId), at: item.at as Date,
    }));
    return { id: String(plan._id), clubId: String(plan.clubId), clubName: String(club.name),
      clubState: String(club.state), fromTerm: term(fromTerm), toTerm: term(toTerm), candidates,
      outstandingObligations: obligations(plan.outstandingObligations), handover: handover(plan.handoverItems),
      state: String(plan.state), submittedBy: String(plan.submittedBy), submittedAt: plan.submittedAt as Date,
      followUpConditions: obligations(plan.followUpConditions),
      task: { id: String(taskDoc._id), state: String(taskDoc.state),
        ...(taskDoc.assigneeId ? { assigneeId: String(taskDoc.assigneeId) } : {}),
        openedAt: taskDoc.openedAt as Date }, decisions: mappedDecisions };
  }

  async function recipients(plan: Doc, session: ClientSession): Promise<Types.ObjectId[]> {
    const boardPositions = await positions.find({ clubId: plan.clubId, isBoardSeat: true })
      .select({ _id: 1 }).session(session).lean();
    const oldAssignments = await assignments.find({ clubId: plan.clubId, termId: plan.fromTermId,
      positionId: { $in: boardPositions.map((item) => item._id) } }).session(session).lean();
    const candidateIds = rawObjects(plan.candidates).flatMap((item) => typeof item.membershipId === "string"
      && Types.ObjectId.isValid(item.membershipId) ? [new Types.ObjectId(item.membershipId)] : []);
    const memberDocs = await memberships.find({
      _id: { $in: [...oldAssignments.map((item) => item.membershipId), ...candidateIds] },
    }).session(session).lean();
    return [...new Set([String(plan.submittedBy), ...memberDocs.map((item) => String(item.userId))])]
      .map((id) => new Types.ObjectId(id));
  }

  function validateProposal(proposed: TransitionBoardRole[], current: Doc[]): void {
    if (!proposed.length || new Set(proposed.map((item) => item.code)).size !== proposed.length) {
      conflict("proposed board roles are invalid");
    }
    const leaders = proposed.filter((item) => item.isLeaderRole);
    const currentLeader = current.find((item) => item.isLeaderRole === true);
    if (leaders.length !== 1 || !currentLeader || leaders[0]?.code !== currentLeader.code) {
      conflict("the fixed President role must be preserved");
    }
    const grantable = new Set<string>(GRANTABLE_CLUB_PERMISSIONS);
    if (proposed.some((role) => role.permissionCodes.some((code) =>
      LEADER_ONLY_CLUB_PERMISSIONS.some((reserved) => reserved === code) || !grantable.has(code)))) {
      conflict("proposed board role contains a non-grantable permission");
    }
  }

  return {
    async listOpen() {
      const open = await tasks.find({ entityType: "TRANSITION_PLAN", state: { $in: ["Open", "Escalated"] } })
        .sort({ openedAt: 1 }).lean();
      return (await Promise.all(open.map((item) => detail(item.entityId as Types.ObjectId))))
        .filter((item): item is LeadershipTransition => Boolean(item));
    },

    async find(planId) {
      return detail(new Types.ObjectId(planId));
    },

    async claim(planId, officerId, now) {
      const id = new Types.ObjectId(planId);
      const officer = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const taskDoc = await tasks.findOne({ entityType: "TRANSITION_PLAN", entityId: id,
          state: { $in: ["Open", "Escalated"] } }).session(session).lean();
        if (!taskDoc) return conflict("transition plan is no longer open");
        if (taskDoc.assigneeId && String(taskDoc.assigneeId) !== officerId) {
          return conflict("transition plan is assigned to another officer");
        }
        if (!taskDoc.assigneeId) {
          const changed = await tasks.updateOne({ _id: taskDoc._id, assigneeId: { $exists: false } },
            { $set: { assigneeId: officer } }, { session });
          if (changed.matchedCount !== 1) return conflict("transition plan was claimed");
        }
        if (taskDoc.state === "Escalated") {
          await tasks.updateOne({ _id: taskDoc._id, state: "Escalated" },
            { $set: { state: "Open", assigneeId: officer } }, { session });
        }
        await audits.create([{ entityType: "TransitionPlan", entityId: id,
          action: "TRANSITION_PLAN_CLAIMED", actorId: officer, actorRole: "ICPDP_OFFICER",
          correlationId: randomUUID(), at: now }], { session });
      });
      const result = await detail(id);
      if (!result) return notFound("transition plan not found");
      return result;
    },

    async decide(planId, officerId, input: TransitionDecisionInput, now) {
      const id = new Types.ObjectId(planId);
      const officer = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const [plan, taskDoc] = await Promise.all([
          plans.findOne({ _id: id, state: "Pending Confirmation" }).session(session).lean(),
          tasks.findOne({ entityType: "TRANSITION_PLAN", entityId: id, state: "Open",
            assigneeId: officer }).session(session).lean(),
        ]);
        if (!plan || !taskDoc) return conflict("transition plan cannot be decided");
        const club = await clubs.findById(plan.clubId).session(session).lean();
        if (!club) return notFound("club not found");
        if (input.outcome === "Approve" && club.state === "Suspended") {
          return conflict("transition is held while the club is Suspended");
        }
        const notifyUsers = await recipients(plan, session);
        const correlationId = randomUUID();
        if (input.outcome === "Request revision") {
          await decisions.create([{ approvalTaskId: taskDoc._id, outcome: "Request revision",
            reason: input.reason, comments: { followUpObligationIds: [] }, actorId: officer, at: now }], { session });
          await plans.updateOne({ _id: id, state: "Pending Confirmation" },
            { $set: { state: "Returned", decidedBy: officer, decidedAt: now } }, { session });
          await tasks.updateOne({ _id: taskDoc._id, state: "Open" },
            { $set: { state: "Decided", closedAt: now } }, { session });
          await audits.create([{ entityType: "TransitionPlan", entityId: id,
            action: "TRANSITION_PLAN_RETURNED", actorId: officer, actorRole: "ICPDP_OFFICER",
            before: { state: "Pending Confirmation" }, after: { state: "Returned" },
            reason: input.reason, correlationId, at: now }], { session });
          if (notifyUsers.length) await notifications.insertMany(notifyUsers.map((recipientUserId) => ({
            recipientUserId, eventCode: "TRANSITION_PLAN_RETURNED", entityType: "TransitionPlan",
            entityId: id, channels: ["IN_APP"], payload: { reason: input.reason }, state: "Queued",
            dueAt: now, attempts: 0, createdAt: now,
          })), { session });
          return;
        }

        const [fromTerm, toTerm, currentPositions] = await Promise.all([
          terms.findOne({ _id: plan.fromTermId, clubId: plan.clubId, state: "Active" }).session(session).lean(),
          terms.findOne({ _id: plan.toTermId, clubId: plan.clubId, state: "Planned" }).session(session).lean(),
          positions.find({ clubId: plan.clubId, isActive: true }).session(session).lean(),
        ]);
        if (!fromTerm || !toTerm || (toTerm.endAt as Date) <= now) {
          return conflict("transition terms changed before confirmation");
        }
        const parsedHandover = handover(plan.handoverItems);
        const proposed = parsedHandover.proposedBoardRoles;
        if (proposed) validateProposal(proposed, currentPositions);
        const boardRoleCodes = proposed?.map((item) => item.code)
          ?? currentPositions.filter((item) => item.isBoardSeat === true).map((item) => String(item.code));
        const candidateDocs = rawObjects(plan.candidates);
        const candidateCodes = candidateDocs.flatMap((item) => typeof item.positionCode === "string"
          ? [item.positionCode] : []);
        if (candidateDocs.length !== boardRoleCodes.length
          || new Set(candidateCodes).size !== candidateDocs.length
          || boardRoleCodes.some((code) => !candidateCodes.includes(code))) {
          return conflict("every board role must have exactly one candidate");
        }
        const candidateMembershipIds = candidateDocs.flatMap((item) =>
          typeof item.membershipId === "string" && Types.ObjectId.isValid(item.membershipId)
            ? [new Types.ObjectId(item.membershipId)] : []);
        if (candidateMembershipIds.length !== candidateDocs.length) {
          return conflict("transition candidate is invalid");
        }
        const activeMembers = await memberships.find({ _id: { $in: candidateMembershipIds },
          clubId: plan.clubId, state: "Active" }).session(session).lean();
        if (activeMembers.length !== candidateDocs.length) {
          return conflict("every transition candidate must have an Active membership");
        }

        let effectivePositions = currentPositions;
        if (proposed) {
          const proposedCodes = new Set(proposed.map((item) => item.code));
          await positions.updateMany({ clubId: plan.clubId, isBoardSeat: true,
            isLeaderRole: false, code: { $nin: [...proposedCodes] } },
          { $set: { isBoardSeat: false } }, { session });
          for (const role of proposed) {
            const existing = currentPositions.find((item) => item.code === role.code);
            if (existing) {
              await positions.updateOne({ _id: existing._id }, { $set: {
                name: role.name, ...(role.unit ? { unit: role.unit } : { unit: null }),
                isBoardSeat: true, isLeaderRole: role.isLeaderRole,
                isSingleHolder: role.isSingleHolder,
                permissionCodes: role.isLeaderRole ? [] : role.permissionCodes, isActive: true,
              } }, { session });
            } else {
              await positions.create([{ clubId: plan.clubId, code: role.code, name: role.name,
                ...(role.unit ? { unit: role.unit } : {}), isBoardSeat: true,
                isLeaderRole: role.isLeaderRole, isDefaultMemberRole: false,
                isSingleHolder: role.isSingleHolder,
                permissionCodes: role.isLeaderRole ? [] : role.permissionCodes, isActive: true }], { session });
            }
          }
          effectivePositions = await positions.find({ clubId: plan.clubId, isActive: true })
            .session(session).lean();
          const previousVersion = await versions.findOne({ clubId: plan.clubId })
            .sort({ versionNo: -1 }).session(session).lean();
          await versions.create([{ clubId: plan.clubId,
            versionNo: Number(previousVersion?.versionNo ?? 0) + 1, effectiveFrom: now,
            source: "TRANSITION", sourceRefId: id, roles: effectivePositions.map(roleSnapshot),
            createdBy: officer, reason: input.reason, createdAt: now }], { session });
        }
        const positionByCode = new Map(effectivePositions.map((item) => [String(item.code), item]));
        await assignments.updateMany({ clubId: plan.clubId, termId: plan.fromTermId,
          effectiveTo: { $in: [null] } }, { $set: { effectiveTo: now } }, { session });
        await terms.updateOne({ _id: fromTerm._id, state: "Active" },
          { $set: { state: "Closed", endAt: now } }, { session });
        await terms.updateOne({ _id: toTerm._id, state: "Planned" }, { $set: {
          state: "Active", startAt: now, confirmedBy: officer, confirmedAt: now,
        } }, { session });
        for (const candidate of candidateDocs) {
          const position = positionByCode.get(String(candidate.positionCode));
          if (!position) return conflict("candidate position changed before confirmation");
          await assignments.create([{ clubId: plan.clubId, termId: plan.toTermId,
            positionId: position._id, membershipId: new Types.ObjectId(String(candidate.membershipId)),
            effectiveFrom: now, assignedBy: officer, confirmedBy: officer }], { session });
        }
        const allObligations = obligations(plan.outstandingObligations);
        const followUps = allObligations.filter((item) => input.followUpObligationIds.includes(item.id));
        await decisions.create([{ approvalTaskId: taskDoc._id, outcome: "Approve",
          ...(input.reason ? { reason: input.reason } : {}),
          comments: { followUpObligationIds: input.followUpObligationIds }, actorId: officer, at: now }], { session });
        await plans.updateOne({ _id: id, state: "Pending Confirmation" }, { $set: {
          state: "Confirmed", decidedBy: officer, decidedAt: now, followUpConditions: followUps,
        } }, { session });
        await tasks.updateOne({ _id: taskDoc._id, state: "Open" },
          { $set: { state: "Decided", closedAt: now } }, { session });
        await audits.create([{ entityType: "TransitionPlan", entityId: id,
          action: "TRANSITION_PLAN_CONFIRMED", actorId: officer, actorRole: "ICPDP_OFFICER",
          before: { state: "Pending Confirmation", fromTermState: "Active", toTermState: "Planned" },
          after: { state: "Confirmed", fromTermState: "Closed", toTermState: "Active",
            followUpObligationIds: input.followUpObligationIds }, reason: input.reason,
          correlationId, at: now }], { session });
        if (notifyUsers.length) await notifications.insertMany(notifyUsers.map((recipientUserId) => ({
          recipientUserId, eventCode: "LEADERSHIP_TRANSITION_CONFIRMED", entityType: "TransitionPlan",
          entityId: id, channels: ["IN_APP"], payload: { followUpCount: followUps.length },
          state: "Queued", dueAt: now, attempts: 0, createdAt: now,
        })), { session });
      });
      const result = await detail(id);
      if (!result) return notFound("transition plan not found after decision");
      return result;
    },
  };
}
