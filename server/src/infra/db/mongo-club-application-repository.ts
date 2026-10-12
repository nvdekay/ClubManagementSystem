import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  FOUNDER_ROLES, FOUNDING_POSITIONS,
  type ApplicantDecisionFeedback, type ApplicationDocument, type FounderProfile,
  type ClubApplicationDraft, type ClubApplicationRecord, type ClubApplicationRepository,
  type ClubApplicationState, type ClubApplicationVersion, type FoundingMember,
} from "../../domain/club-application.js";
import { ucmsModels } from "./ucms-models.js";

function documentFrom(raw: ApplicationDocument): ApplicationDocument {
  return { ...raw, uploadedAt: new Date(raw.uploadedAt) };
}

function foundersFrom(raw: Record<string, unknown> | undefined, applicantId: string): FoundingMember[] {
  if (Array.isArray(raw?.founders)) {
    return (raw.founders as Record<string, unknown>[]).map((founder) => ({
      userId: String(founder.userId),
      role: FOUNDER_ROLES.find((role) => role === founder.role) ?? "MEMBER",
    }));
  }
  // Drafts and versions written before fixed founding roles: the applicant led, others were members.
  const legacyIds = Array.isArray(raw?.foundingUserIds) ? raw.foundingUserIds.map(String) : [];
  return legacyIds.map((userId) => ({ userId,
    role: userId.toLowerCase() === applicantId.toLowerCase() ? "LEADER" : "MEMBER" }));
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function applicationDraftFrom(raw: Record<string, unknown> | undefined,
  applicantId: string): ClubApplicationDraft {
  return {
    clubName: text(raw?.clubName), fieldId: text(raw?.fieldId), field: text(raw?.field),
    summary: text(raw?.summary), objectives: text(raw?.objectives),
    fanpageUrl: text(raw?.fanpageUrl), contactEmail: text(raw?.contactEmail),
    founders: foundersFrom(raw, applicantId),
    documents: ((raw?.documents ?? []) as ApplicationDocument[]).map(documentFrom),
  };
}

export function mapApplicationRecord(doc: Record<string, unknown>): ClubApplicationRecord {
  const raw = doc.draftPayload as Record<string, unknown> | undefined;
  return {
    id: String(doc._id), founderUserId: String(doc.founderUserId),
    state: doc.state as ClubApplicationState,
    currentVersionNo: Number(doc.currentVersionNo), draftRevision: Number(raw?._revision ?? 0),
    draft: applicationDraftFrom(raw, String(doc.founderUserId)), submittedAt: doc.submittedAt as Date | undefined,
    ...(doc.revisionDeadlineAt instanceof Date ? { revisionDeadlineAt: doc.revisionDeadlineAt } : {}),
    createdAt: doc.createdAt as Date,
  };
}

export function mapApplicationVersion(doc: Record<string, unknown>): ClubApplicationVersion {
  const payload = doc.payload as { policyVersionId: string; snapshot: Record<string, unknown> };
  return {
    id: String(doc._id), applicationId: String(doc.applicationId),
    versionNo: Number(doc.versionNo), policyVersionId: payload.policyVersionId,
    snapshot: applicationDraftFrom(payload.snapshot, String(doc.submittedBy)),
    submittedAt: doc.submittedAt as Date,
  };
}

function profileFrom(doc: Record<string, unknown>): FounderProfile {
  return { id: String(doc._id), email: String(doc.email),
    displayName: typeof doc.displayName === "string" && doc.displayName ? doc.displayName : String(doc.email) };
}

function conflict(): never {
  throw new DomainError("application changed or is no longer editable", "conflict");
}

export function mongoClubApplicationRepository(): ClubApplicationRepository {
  const applications = ucmsModels.clubApplications!;
  const versions = ucmsModels.clubApplicationVersions!;
  const users = ucmsModels.users!;
  const clubs = ucmsModels.clubs!;
  const tasks = ucmsModels.approvalTasks!;
  const audits = ucmsModels.auditLogs!;
  const notifications = ucmsModels.notifications!;
  const decisions = ucmsModels.approvalDecisions!;
  const positions = ucmsModels.clubPositions!;
  const terms = ucmsModels.clubTerms!;
  const assignments = ucmsModels.clubPositionAssignments!;
  const memberships = ucmsModels.clubMemberships!;
  const editableStates = ["Draft", "Revision Requested"];

  return {
    async createDraft(ownerId, draft, now) {
      const doc = await applications.create({
        clubName: draft.clubName, field: draft.field, objectives: draft.objectives,
        founderUserId: new Types.ObjectId(ownerId), draftPayload: { ...draft, _revision: 0 },
        state: "Draft", currentVersionNo: 1, createdAt: now,
      });
      return mapApplicationRecord(doc.toObject());
    },
    async listMine(ownerId) {
      const docs = await applications.find({ founderUserId: new Types.ObjectId(ownerId) })
        .sort({ createdAt: -1, _id: -1 }).lean();
      return docs.map(mapApplicationRecord);
    },
    async findOwned(id, ownerId) {
      const doc = await applications.findOne({ _id: new Types.ObjectId(id),
        founderUserId: new Types.ObjectId(ownerId) }).lean();
      return doc ? mapApplicationRecord(doc) : null;
    },
    async versions(id) {
      const docs = await versions.find({ applicationId: new Types.ObjectId(id) })
        .sort({ versionNo: 1 }).lean();
      return docs.map(mapApplicationVersion);
    },
    async findActiveUserByEmail(email) {
      const doc = await users.findOne({ email: email.trim().toLowerCase(), accountState: "Active" })
        .select("_id displayName email").lean();
      return doc ? profileFrom(doc) : null;
    },
    async founderProfiles(ids) {
      const valid = [...new Set(ids)].filter((value) => Types.ObjectId.isValid(value));
      const docs = await users.find({ _id: { $in: valid.map((value) => new Types.ObjectId(value)) } })
        .select("_id displayName email").lean();
      const byId = new Map(docs.map((doc) => [String(doc._id), profileFrom(doc)]));
      return valid.flatMap((value) => byId.get(value) ?? []);
    },
    async decisionFeedback(id) {
      const taskIds = await tasks.find({ entityType: "CLUB_APPLICATION", entityId: new Types.ObjectId(id) })
        .distinct("_id");
      const docs = await decisions.find({ approvalTaskId: { $in: taskIds } }).sort({ at: 1 }).lean();
      return docs.map((doc) => ({
        outcome: doc.outcome as ApplicantDecisionFeedback["outcome"],
        ...(typeof doc.reason === "string" ? { reason: doc.reason } : {}),
        sections: (doc.comments as { sections?: string[] } | undefined)?.sections ?? [],
        decidedAt: doc.at as Date,
      }));
    },
    async saveDraft(id, ownerId, draft, expectedDraftRevision) {
      const updated = await applications.findOneAndUpdate({ _id: new Types.ObjectId(id),
        founderUserId: new Types.ObjectId(ownerId), state: { $in: editableStates },
        "draftPayload._revision": expectedDraftRevision }, { $set: {
        clubName: draft.clubName, field: draft.field, objectives: draft.objectives,
        draftPayload: { ...draft, _revision: expectedDraftRevision + 1 },
      } }, { new: true }).lean();
      if (!updated) return conflict();
      return mapApplicationRecord(updated);
    },
    async addDocument(id, ownerId, document) {
      const updated = await applications.findOneAndUpdate({ _id: new Types.ObjectId(id),
        founderUserId: new Types.ObjectId(ownerId), state: { $in: editableStates } }, {
        $push: { "draftPayload.documents": document },
        $inc: { "draftPayload._revision": 1 },
      }, { new: true }).lean();
      if (!updated) return conflict();
      return mapApplicationRecord(updated);
    },
    async removeDocument(id, ownerId, documentId) {
      const updated = await applications.findOneAndUpdate({ _id: new Types.ObjectId(id),
        founderUserId: new Types.ObjectId(ownerId), state: { $in: editableStates },
        "draftPayload.documents.id": documentId }, {
        $pull: { "draftPayload.documents": { id: documentId } },
        $inc: { "draftPayload._revision": 1 },
      }, { new: true }).lean();
      if (!updated) return conflict();
      return mapApplicationRecord(updated);
    },
    async usersExist(ids) {
      const distinct = [...new Set(ids.map((id) => id.toLowerCase()))];
      if (distinct.some((id) => !Types.ObjectId.isValid(id))) return false;
      return await users.countDocuments({ _id: { $in: distinct.map((id) => new Types.ObjectId(id)) },
        accountState: "Active" })
        === distinct.length;
    },
    async activeClubNameExists(name) {
      return Boolean(await clubs.exists({ name, state: "Active" })
        .collation({ locale: "en", strength: 2 }));
    },
    async activeLeaderUserIds(userIds, at) {
      const ids = [...new Set(userIds)].filter((value) => Types.ObjectId.isValid(value))
        .map((value) => new Types.ObjectId(value));
      if (!ids.length) return [];
      const [leaderPositionIds, runningTermIds] = await Promise.all([
        positions.find({ isLeaderRole: true, isActive: true }).distinct("_id"),
        terms.find({ state: { $in: ["Active", "Planned"] }, endAt: { $gt: at } }).distinct("_id"),
      ]);
      const membershipIds = await assignments.find({ positionId: { $in: leaderPositionIds },
        termId: { $in: runningTermIds }, effectiveTo: { $in: [null] } }).distinct("membershipId");
      const holders = await memberships.find({ _id: { $in: membershipIds }, userId: { $in: ids } })
        .distinct("userId");
      return holders.map(String);
    },
    async submit(input) {
      return mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(input.id);
        const current = await applications.findOne({ _id: id,
          founderUserId: new Types.ObjectId(input.ownerId),
          state: { $in: editableStates },
          "draftPayload._revision": input.expectedDraftRevision }).session(session).lean();
        if (!current) return conflict();
        const versionNo = current.state === "Draft" ? 1 : Number(current.currentVersionNo) + 1;
        const changed = await applications.updateOne({ _id: id, state: current.state,
          currentVersionNo: current.currentVersionNo,
          "draftPayload._revision": input.expectedDraftRevision }, { $set: {
          state: "Submitted", currentVersionNo: versionNo, submittedAt: input.now,
        } }, { session });
        if (changed.modifiedCount !== 1) return conflict();
        const created = await versions.create([{
          applicationId: id, versionNo,
          payload: { policyVersionId: input.policyVersionId, snapshot: input.snapshot },
          foundingMembers: input.snapshot.founders,
          documents: input.snapshot.documents,
          proposedRoleStructure: FOUNDING_POSITIONS,
          submittedBy: new Types.ObjectId(input.ownerId), submittedAt: input.now,
        }], { session });
        await tasks.updateMany({ entityType: "CLUB_APPLICATION", entityId: id,
          state: "Open" }, { $set: { state: "Closed", closedAt: input.now } }, { session });
        await tasks.create([{
          entityType: "CLUB_APPLICATION", entityId: id,
          title: `Club application: ${input.snapshot.clubName}`,
          state: "Open", openedAt: input.now,
        }], { session });
        await audits.create([{
          entityType: "ClubApplication", entityId: id,
          action: "CLUB_APPLICATION_SUBMITTED", actorId: new Types.ObjectId(input.ownerId),
          actorRole: "Student", before: { state: current.state,
            versionNo: current.currentVersionNo },
          after: { state: "Submitted", versionNo, policyVersionId: input.policyVersionId },
          correlationId: randomUUID(), at: input.now,
        }], { session });
        await notifications.create([{
          recipientUserId: new Types.ObjectId(input.ownerId),
          eventCode: "CLUB_APPLICATION_SUBMITTED", entityType: "ClubApplication",
          entityId: id, channels: ["IN_APP"],
          payload: { versionNo, clubName: input.snapshot.clubName },
          state: "Queued", dueAt: input.now, attempts: 0, createdAt: input.now,
        }], { session });
        return mapApplicationVersion(created[0]!.toObject());
      });
    },
    async withdraw(id, ownerId, now) {
      return mongoose.connection.transaction(async (session) => {
        const objectId = new Types.ObjectId(id);
        const previous = await applications.findOne({ _id: objectId,
          founderUserId: new Types.ObjectId(ownerId),
          state: { $in: ["Submitted", "Under Review", "Revision Requested"] } })
          .session(session).lean();
        if (!previous) return conflict();
        const changed = await applications.updateOne({ _id: objectId, state: previous.state },
          { $set: { state: "Withdrawn" } }, { session });
        if (changed.modifiedCount !== 1) return conflict();
        await tasks.updateMany({ entityType: "CLUB_APPLICATION", entityId: objectId,
          state: "Open" }, { $set: { state: "Closed", closedAt: now } }, { session });
        await audits.create([{
          entityType: "ClubApplication", entityId: objectId,
          action: "CLUB_APPLICATION_WITHDRAWN", actorId: new Types.ObjectId(ownerId),
          actorRole: "Student", before: { state: previous.state },
          after: { state: "Withdrawn" }, correlationId: randomUUID(), at: now,
        }], { session });
        await notifications.create([{
          recipientUserId: new Types.ObjectId(ownerId),
          eventCode: "CLUB_APPLICATION_WITHDRAWN", entityType: "ClubApplication",
          entityId: objectId, channels: ["IN_APP"], payload: {},
          state: "Queued", dueAt: now, attempts: 0, createdAt: now,
        }], { session });
        return mapApplicationRecord({ ...previous, state: "Withdrawn" });
      });
    },
  };
}
