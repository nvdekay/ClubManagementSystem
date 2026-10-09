import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import type {
  ApplicantDecisionFeedback, ApplicationDocument, FounderProfile, ClubApplicationDraft, ClubApplicationRecord,
  ClubApplicationRepository, ClubApplicationState, ClubApplicationVersion,
} from "../../domain/club-application.js";
import { ucmsModels } from "./ucms-models.js";

function documentFrom(raw: ApplicationDocument): ApplicationDocument {
  return { ...raw, uploadedAt: new Date(raw.uploadedAt) };
}

function draftFrom(raw: Record<string, unknown> | undefined): ClubApplicationDraft {
  return {
    clubName: String(raw?.clubName ?? ""), field: String(raw?.field ?? ""),
    objectives: String(raw?.objectives ?? ""),
    foundingUserIds: (raw?.foundingUserIds ?? []) as string[],
    proposedRoles: (raw?.proposedRoles ?? []) as ClubApplicationDraft["proposedRoles"],
    documents: ((raw?.documents ?? []) as ApplicationDocument[]).map(documentFrom),
  };
}

function mapRecord(doc: Record<string, unknown>): ClubApplicationRecord {
  const raw = doc.draftPayload as Record<string, unknown> | undefined;
  return {
    id: String(doc._id), founderUserId: String(doc.founderUserId),
    state: doc.state as ClubApplicationState,
    currentVersionNo: Number(doc.currentVersionNo), draftRevision: Number(raw?._revision ?? 0),
    draft: draftFrom(raw), submittedAt: doc.submittedAt as Date | undefined,
    ...(doc.revisionDeadlineAt instanceof Date ? { revisionDeadlineAt: doc.revisionDeadlineAt } : {}),
    createdAt: doc.createdAt as Date,
  };
}

function mapVersion(doc: Record<string, unknown>): ClubApplicationVersion {
  const payload = doc.payload as { policyVersionId: string; snapshot: ClubApplicationDraft };
  return {
    id: String(doc._id), applicationId: String(doc.applicationId),
    versionNo: Number(doc.versionNo), policyVersionId: payload.policyVersionId,
    snapshot: draftFrom(payload.snapshot as unknown as Record<string, unknown>),
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
  const editableStates = ["Draft", "Revision Requested"];

  return {
    async createDraft(ownerId, draft, now) {
      const doc = await applications.create({
        clubName: draft.clubName, field: draft.field, objectives: draft.objectives,
        founderUserId: new Types.ObjectId(ownerId), draftPayload: { ...draft, _revision: 0 },
        state: "Draft", currentVersionNo: 1, createdAt: now,
      });
      return mapRecord(doc.toObject());
    },
    async listMine(ownerId) {
      const docs = await applications.find({ founderUserId: new Types.ObjectId(ownerId) })
        .sort({ createdAt: -1, _id: -1 }).lean();
      return docs.map(mapRecord);
    },
    async findOwned(id, ownerId) {
      const doc = await applications.findOne({ _id: new Types.ObjectId(id),
        founderUserId: new Types.ObjectId(ownerId) }).lean();
      return doc ? mapRecord(doc) : null;
    },
    async versions(id) {
      const docs = await versions.find({ applicationId: new Types.ObjectId(id) })
        .sort({ versionNo: 1 }).lean();
      return docs.map(mapVersion);
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
      return mapRecord(updated);
    },
    async addDocument(id, ownerId, document) {
      const updated = await applications.findOneAndUpdate({ _id: new Types.ObjectId(id),
        founderUserId: new Types.ObjectId(ownerId), state: { $in: editableStates } }, {
        $push: { "draftPayload.documents": document },
        $inc: { "draftPayload._revision": 1 },
      }, { new: true }).lean();
      if (!updated) return conflict();
      return mapRecord(updated);
    },
    async removeDocument(id, ownerId, documentId) {
      const updated = await applications.findOneAndUpdate({ _id: new Types.ObjectId(id),
        founderUserId: new Types.ObjectId(ownerId), state: { $in: editableStates },
        "draftPayload.documents.id": documentId }, {
        $pull: { "draftPayload.documents": { id: documentId } },
        $inc: { "draftPayload._revision": 1 },
      }, { new: true }).lean();
      if (!updated) return conflict();
      return mapRecord(updated);
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
          foundingMembers: input.snapshot.foundingUserIds,
          documents: input.snapshot.documents,
          proposedRoleStructure: input.snapshot.proposedRoles,
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
        return mapVersion(created[0]!.toObject());
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
        return mapRecord({ ...previous, state: "Withdrawn" });
      });
    },
  };
}
