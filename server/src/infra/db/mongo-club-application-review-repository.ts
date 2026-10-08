import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type {
  ApplicationReviewDecision,
  ApplicationReviewDetail,
  ApplicationReviewTask,
  ClubApplicationReviewRepository,
} from "../../domain/club-application-review.js";
import type {
  ApplicationDocument,
  ClubApplicationDraft,
  ClubApplicationRecord,
  ClubApplicationState,
  ClubApplicationVersion,
} from "../../domain/club-application.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels } from "./ucms-models.js";

function draftFrom(raw: Record<string, unknown> | undefined): ClubApplicationDraft {
  return {
    clubName: String(raw?.clubName ?? ""), field: String(raw?.field ?? ""),
    objectives: String(raw?.objectives ?? ""),
    foundingUserIds: (raw?.foundingUserIds ?? []) as string[],
    proposedRoles: (raw?.proposedRoles ?? []) as ClubApplicationDraft["proposedRoles"],
    documents: ((raw?.documents ?? []) as ApplicationDocument[]).map((document) => ({
      ...document, uploadedAt: new Date(document.uploadedAt),
    })),
  };
}

function recordFrom(doc: Record<string, unknown>): ClubApplicationRecord {
  const draft = doc.draftPayload as Record<string, unknown> | undefined;
  return {
    id: String(doc._id), founderUserId: String(doc.founderUserId),
    state: doc.state as ClubApplicationState,
    currentVersionNo: Number(doc.currentVersionNo),
    draftRevision: Number(draft?._revision ?? 0), draft: draftFrom(draft),
    submittedAt: doc.submittedAt as Date | undefined, createdAt: doc.createdAt as Date,
  };
}

function versionFrom(doc: Record<string, unknown>): ClubApplicationVersion {
  const payload = doc.payload as { policyVersionId: string; snapshot: ClubApplicationDraft };
  return {
    id: String(doc._id), applicationId: String(doc.applicationId),
    versionNo: Number(doc.versionNo), policyVersionId: payload.policyVersionId,
    snapshot: draftFrom(payload.snapshot as unknown as Record<string, unknown>),
    submittedAt: doc.submittedAt as Date,
  };
}

function taskFrom(doc: Record<string, unknown>): ApplicationReviewTask {
  return {
    id: String(doc._id), applicationId: String(doc.entityId), title: String(doc.title),
    state: doc.state as ApplicationReviewTask["state"],
    assigneeId: doc.assigneeId ? String(doc.assigneeId) : undefined,
    openedAt: doc.openedAt as Date,
    slaDueAt: doc.slaDueAt as Date | undefined,
  };
}

function decisionFrom(doc: Record<string, unknown>): ApplicationReviewDecision {
  const comments = doc.comments as { sections?: string[] } | undefined;
  return {
    id: String(doc._id), taskId: String(doc.approvalTaskId),
    outcome: doc.outcome as ApplicationReviewDecision["outcome"],
    reason: typeof doc.reason === "string" ? doc.reason : undefined,
    sections: comments?.sections ?? [],
    reviewNote: typeof doc.reviewNote === "string" ? doc.reviewNote : undefined,
    actorId: String(doc.actorId), at: doc.at as Date,
  };
}

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

export function mongoClubApplicationReviewRepository(): ClubApplicationReviewRepository {
  const applications = ucmsModels.clubApplications!;
  const versions = ucmsModels.clubApplicationVersions!;
  const tasks = ucmsModels.approvalTasks!;
  const decisions = ucmsModels.approvalDecisions!;
  const clubs = ucmsModels.clubs!;
  const terms = ucmsModels.clubTerms!;
  const memberships = ucmsModels.clubMemberships!;
  const positions = ucmsModels.clubPositions!;
  const structures = ucmsModels.clubRoleStructureVersions!;
  const audits = ucmsModels.auditLogs!;
  const notifications = ucmsModels.notifications!;

  async function detail(applicationId: Types.ObjectId,
    session?: ClientSession): Promise<ApplicationReviewDetail | null> {
    const [application, taskDocs, versionDocs] = await Promise.all([
      applications.findById(applicationId).session(session ?? null).lean(),
      tasks.find({ entityType: "CLUB_APPLICATION", entityId: applicationId })
        .sort({ openedAt: -1, _id: -1 }).session(session ?? null).lean(),
      versions.find({ applicationId }).sort({ versionNo: 1 }).session(session ?? null).lean(),
    ]);
    const task = taskDocs[0];
    if (!application || !task) return null;
    const decisionDocs = await decisions.find({
      approvalTaskId: { $in: taskDocs.map((item) => item._id) },
    })
      .sort({ at: 1 }).session(session ?? null).lean();
    return {
      application: recordFrom(application), task: taskFrom(task),
      versions: versionDocs.map(versionFrom), decisions: decisionDocs.map(decisionFrom),
    };
  }

  return {
    async listOpen() {
      const taskDocs = await tasks.find({ entityType: "CLUB_APPLICATION", state: "Open" })
        .sort({ openedAt: 1, _id: 1 }).lean();
      if (!taskDocs.length) return [];
      const appDocs = await applications.find({
        _id: { $in: taskDocs.map((task) => task.entityId) },
        state: { $in: ["Submitted", "Under Review"] },
      }).lean();
      const byId = new Map(appDocs.map((application) => [String(application._id), application]));
      return taskDocs.flatMap((task) => {
        const application = byId.get(String(task.entityId));
        return application ? [{ task: taskFrom(task), application: recordFrom(application) }] : [];
      });
    },

    async find(applicationId) {
      return detail(new Types.ObjectId(applicationId));
    },

    async findDocument(applicationId, documentId) {
      const found = await detail(new Types.ObjectId(applicationId));
      if (!found) return null;
      return [...found.application.draft.documents,
        ...found.versions.flatMap((version) => version.snapshot.documents)]
        .find((document) => document.id === documentId) ?? null;
    },

    async claim(applicationId, officerId, now) {
      const id = new Types.ObjectId(applicationId);
      const actorId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const task = await tasks.findOne({ entityType: "CLUB_APPLICATION", entityId: id,
          state: "Open" }).sort({ openedAt: -1 }).session(session).lean();
        if (!task) return conflict("application review is no longer open");
        if (task.assigneeId && String(task.assigneeId) !== officerId) {
          return conflict("application review is assigned to another officer");
        }
        const claimed = await tasks.updateOne({ _id: task._id, state: "Open",
          $or: [{ assigneeId: { $exists: false } }, { assigneeId: null }, { assigneeId: actorId }] },
        { $set: { assigneeId: actorId } }, { session });
        if (claimed.matchedCount !== 1) return conflict("application review was claimed");
        const changed = await applications.updateOne({ _id: id, state: "Submitted" },
          { $set: { state: "Under Review" } }, { session });
        if (changed.matchedCount === 0) {
          const current = await applications.findOne({ _id: id, state: "Under Review" })
            .session(session).lean();
          if (!current) return conflict("application cannot be reviewed in its current state");
        }
        if (changed.modifiedCount === 1) {
          await audits.create([{
            entityType: "ClubApplication", entityId: id,
            action: "CLUB_APPLICATION_REVIEW_CLAIMED", actorId, actorRole: "ICPDP_OFFICER",
            before: { state: "Submitted" }, after: { state: "Under Review" },
            correlationId: randomUUID(), at: now,
          }], { session });
        }
      });
      const claimed = await detail(id);
      if (!claimed) throw new DomainError("application review not found", "not_found");
      return claimed;
    },

    async decide(applicationId, officerId, input, now) {
      const id = new Types.ObjectId(applicationId);
      const actorId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const application = await applications.findOne({ _id: id, state: "Under Review" })
          .session(session).lean();
        const task = await tasks.findOne({ entityType: "CLUB_APPLICATION", entityId: id,
          state: "Open", assigneeId: actorId }).sort({ openedAt: -1 }).session(session).lean();
        if (!application || !task) return conflict("application review cannot be decided");
        const version = await versions.findOne({ applicationId: id,
          versionNo: application.currentVersionNo }).session(session).lean();
        if (!version) return conflict("submitted application version is missing");
        const payload = version.payload as { snapshot: ClubApplicationDraft };
        const snapshot = draftFrom(payload.snapshot as unknown as Record<string, unknown>);
        let createdClubId: Types.ObjectId | undefined;

        if (input.outcome === "Approve") {
          createdClubId = new Types.ObjectId();
          await clubs.create([{
            _id: createdClubId, code: `CLB-${applicationId.slice(-8).toUpperCase()}`,
            name: snapshot.clubName, field: snapshot.field, state: "Pending Setup",
            description: snapshot.objectives, sourceApplicationId: id,
            createdAt: now, updatedAt: now,
          }], { session });
          const termEnd = new Date(now);
          termEnd.setUTCFullYear(termEnd.getUTCFullYear() + 1);
          await terms.create([{
            clubId: createdClubId, name: "Founding setup term", startAt: now,
            endAt: termEnd, state: "Active",
          }], { session });
          const founderIds = [...new Set(snapshot.foundingUserIds)];
          if (!founderIds.includes(String(application.founderUserId))) {
            founderIds.push(String(application.founderUserId));
          }
          await memberships.insertMany(founderIds.map((userId) => ({
            clubId: createdClubId, userId: new Types.ObjectId(userId), state: "Active",
            joinedAt: now, sourceApplicationId: id, statusHistory: [{
              toState: "Active", reason: "Founding application approved", actorId, at: now,
            }],
          })), { session });
          const positionDocs = await positions.insertMany(snapshot.proposedRoles.map((role) => ({
            clubId: createdClubId, code: role.code, name: role.name, unit: role.unit,
            isBoardSeat: role.isBoardSeat, isLeaderRole: role.isLeaderRole,
            isDefaultMemberRole: role.isDefaultMemberRole, isSingleHolder: role.isSingleHolder,
            permissionCodes: role.permissionCodes, isActive: true,
          })), { session });
          await structures.create([{
            clubId: createdClubId, versionNo: 1, effectiveFrom: now,
            source: "APPLICATION", sourceRefId: version._id,
            roles: positionDocs.map((position, index) => ({
              positionId: position._id, ...snapshot.proposedRoles[index],
            })),
            createdBy: actorId, reason: "Initial structure approved with application",
            createdAt: now,
          }], { session });
        }

        await decisions.create([{
          approvalTaskId: task._id, outcome: input.outcome, reason: input.reason,
          comments: { sections: input.sections }, reviewNote: input.reviewNote,
          actorId, at: now,
        }], { session });
        const nextState = input.outcome === "Approve" ? "Approved"
          : input.outcome === "Reject" ? "Rejected" : "Revision Requested";
        const changed = await applications.updateOne({ _id: id, state: "Under Review" }, {
          $set: { state: nextState, decidedAt: now,
            ...(input.revisionDeadlineAt ? { revisionDeadlineAt: input.revisionDeadlineAt } : {}),
            ...(createdClubId ? { createdClubId } : {}) },
          ...(!input.revisionDeadlineAt ? { $unset: { revisionDeadlineAt: "" } } : {}),
        }, { session });
        if (changed.modifiedCount !== 1) return conflict("application changed while deciding");
        await tasks.updateOne({ _id: task._id, state: "Open" },
          { $set: { state: "Decided", closedAt: now } }, { session });
        const correlationId = randomUUID();
        await audits.create([{
          entityType: "ClubApplication", entityId: id,
          action: `CLUB_APPLICATION_${nextState.toUpperCase().replace(" ", "_")}`,
          actorId, actorRole: "ICPDP_OFFICER", before: { state: "Under Review" },
          after: { state: nextState, createdClubId }, reason: input.reason,
          correlationId, at: now,
        }], { session });
        await notifications.create([{
          recipientUserId: application.founderUserId,
          eventCode: `CLUB_APPLICATION_${nextState.toUpperCase().replace(" ", "_")}`,
          entityType: "ClubApplication", entityId: id, channels: ["IN_APP"],
          payload: { outcome: input.outcome, reason: input.reason,
            revisionDeadlineAt: input.revisionDeadlineAt, createdClubId },
          state: "Queued", dueAt: now, attempts: 0, createdAt: now,
        }], { session });
      });
      const decided = await detail(id);
      if (!decided) throw new DomainError("application review not found", "not_found");
      return decided;
    },
  };
}
