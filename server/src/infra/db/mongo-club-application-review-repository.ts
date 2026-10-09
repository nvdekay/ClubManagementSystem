import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type {
  ApplicationReviewDecision,
  ApplicationReviewDetail,
  ApplicationReviewTask,
  ClubApplicationReviewRepository,
} from "../../domain/club-application-review.js";
import { FOUNDING_POSITIONS } from "../../domain/club-application.js";
import { DomainError } from "../../domain/errors.js";
import {
  applicationDraftFrom, mapApplicationRecord, mapApplicationVersion,
} from "./mongo-club-application-repository.js";
import { ucmsModels } from "./ucms-models.js";

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
  const comments = doc.comments as { sections?: string[]; policyVersionId?: string } | undefined;
  return {
    id: String(doc._id), taskId: String(doc.approvalTaskId),
    outcome: doc.outcome as ApplicationReviewDecision["outcome"],
    reason: typeof doc.reason === "string" ? doc.reason : undefined,
    sections: comments?.sections ?? [],
    reviewNote: typeof doc.reviewNote === "string" ? doc.reviewNote : undefined,
    policyVersionId: comments?.policyVersionId,
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
  const assignments = ucmsModels.clubPositionAssignments!;
  const audits = ucmsModels.auditLogs!;
  const notifications = ucmsModels.notifications!;
  const users = ucmsModels.users!;

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
    const mappedVersions = versionDocs.map(mapApplicationVersion);
    const founderIds = (mappedVersions.at(-1)?.snapshot.founders ?? [])
      .map((founder) => founder.userId).filter((value) => Types.ObjectId.isValid(value));
    const founderDocs = await users.find({ _id: { $in: founderIds.map((value) => new Types.ObjectId(value)) } })
      .select("_id displayName email").session(session ?? null).lean();
    const byId = new Map(founderDocs.map((doc) => [String(doc._id), {
      id: String(doc._id), email: String(doc.email),
      displayName: typeof doc.displayName === "string" && doc.displayName ? doc.displayName : String(doc.email),
    }]));
    return {
      application: mapApplicationRecord(application), task: taskFrom(task),
      versions: mappedVersions, decisions: decisionDocs.map(decisionFrom),
      founders: founderIds.flatMap((value) => byId.get(value) ?? []),
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
        return application ? [{ task: taskFrom(task), application: mapApplicationRecord(application) }] : [];
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
        const payload = version.payload as { policyVersionId?: string; snapshot: Record<string, unknown> };
        const snapshot = applicationDraftFrom(payload.snapshot, String(application.founderUserId));
        let createdClubId: Types.ObjectId | undefined;
        const founderIds = new Set(snapshot.founders.map((founder) => founder.userId));
        founderIds.add(String(application.founderUserId));

        if (input.outcome === "Approve") {
          // Approving the application also confirms the founding board (no separate UC10 round).
          const leader = snapshot.founders.find((founder) => founder.role === "LEADER")
            ?? { userId: String(application.founderUserId), role: "LEADER" as const };
          // Touch the leader so a concurrent approval naming the same leader conflicts.
          await users.updateOne({ _id: new Types.ObjectId(leader.userId) },
            { $currentDate: { updatedAt: true } }, { session });
          const leaderPositionIds = await positions.find({ isLeaderRole: true, isActive: true })
            .session(session).distinct("_id");
          const runningTermIds = await terms.find({ state: { $in: ["Active", "Planned"] },
            endAt: { $gt: now } }).session(session).distinct("_id");
          const leaderMembershipIds = await assignments.find({ positionId: { $in: leaderPositionIds },
            termId: { $in: runningTermIds }, effectiveTo: { $in: [null] } })
            .session(session).distinct("membershipId");
          if (await memberships.exists({ _id: { $in: leaderMembershipIds },
            userId: new Types.ObjectId(leader.userId) }).session(session)) {
            throw new DomainError("proposed club leader already leads another club", "conflict",
              { issues: ["leaderHoldsAnotherClub"] });
          }

          createdClubId = new Types.ObjectId();
          const logo = snapshot.documents.find((document) => document.documentType === "LOGO");
          await clubs.create([{
            _id: createdClubId, code: `CLB-${applicationId.slice(-8).toUpperCase()}`,
            name: snapshot.clubName, field: snapshot.field, state: "Active",
            description: snapshot.summary || snapshot.objectives,
            ...(snapshot.contactEmail ? { contactEmail: snapshot.contactEmail } : {}),
            ...(logo?.publicUrl ? { logoUrl: logo.publicUrl } : {}),
            channels: snapshot.fanpageUrl ? [{ label: "Fanpage", url: snapshot.fanpageUrl }] : [],
            sourceApplicationId: id, createdAt: now, updatedAt: now,
          }], { session });
          const termEnd = new Date(now);
          termEnd.setUTCFullYear(termEnd.getUTCFullYear() + 1);
          const [term] = await terms.create([{
            clubId: createdClubId, name: "Founding term", startAt: now,
            endAt: termEnd, state: "Active", confirmedBy: actorId, confirmedAt: now,
          }], { session });
          const membershipDocs = await memberships.insertMany([...founderIds].map((userId) => ({
            clubId: createdClubId, userId: new Types.ObjectId(userId), state: "Active",
            joinedAt: now, defaultRole: "MEMBERS", sourceApplicationId: id, statusHistory: [{
              toState: "Active", reason: "Founding application approved", actorId, at: now,
            }],
          })), { session });
          const positionDocs = await positions.insertMany(FOUNDING_POSITIONS.map((position) => ({
            clubId: createdClubId, code: position.code, name: position.name,
            isBoardSeat: position.isBoardSeat, isLeaderRole: position.isLeaderRole,
            isDefaultMemberRole: position.isDefaultMemberRole, isSingleHolder: position.isSingleHolder,
            permissionCodes: [...position.permissionCodes], isActive: true,
          })), { session });
          await structures.create([{
            clubId: createdClubId, versionNo: 1, effectiveFrom: now,
            source: "APPLICATION", sourceRefId: version._id,
            roles: positionDocs.map((position, index) => {
              const { founderRole: _founderRole, ...role } = FOUNDING_POSITIONS[index]!;
              return { positionId: position._id, ...role, permissionCodes: [...role.permissionCodes] };
            }),
            createdBy: actorId, reason: "Default founding structure approved with application",
            createdAt: now,
          }], { session });
          const membershipByUser = new Map(membershipDocs.map((membership) =>
            [String(membership.userId), membership._id]));
          const positionByRole = new Map(FOUNDING_POSITIONS.map((position, index) =>
            [position.founderRole, positionDocs[index]!._id]));
          const boardSeats = snapshot.founders.filter((founder) => founder.role !== "MEMBER");
          if (!snapshot.founders.some((founder) => founder.role === "LEADER")) boardSeats.push(leader);
          await assignments.insertMany(boardSeats.map((founder) => ({
            clubId: createdClubId, termId: term!._id, positionId: positionByRole.get(founder.role),
            membershipId: membershipByUser.get(founder.userId), effectiveFrom: now,
            assignedBy: actorId, confirmedBy: actorId,
          })), { session });
        }

        await decisions.create([{
          approvalTaskId: task._id, outcome: input.outcome, reason: input.reason,
          comments: { sections: input.sections, policyVersionId: payload.policyVersionId },
          reviewNote: input.reviewNote,
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
          after: { state: nextState, createdClubId, policyVersionId: payload.policyVersionId },
          correlationId, at: now,
        }], { session });
        const recipients = input.outcome === "Approve"
          ? [...founderIds].map((userId) => new Types.ObjectId(userId)) : [application.founderUserId];
        await notifications.insertMany(recipients.map((recipientUserId) => ({
          recipientUserId,
          eventCode: `CLUB_APPLICATION_${nextState.toUpperCase().replace(" ", "_")}`,
          entityType: "ClubApplication", entityId: id, channels: ["IN_APP"],
          payload: { outcome: input.outcome, reason: input.reason,
            revisionDeadlineAt: input.revisionDeadlineAt, createdClubId },
          state: "Queued", dueAt: now, attempts: 0, createdAt: now,
        })), { session });
      });
      const decided = await detail(id);
      if (!decided) throw new DomainError("application review not found", "not_found");
      return decided;
    },
  };
}
