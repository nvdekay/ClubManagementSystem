import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type { ClubViolationRepository } from "../../domain/club-violation.js";
import { DomainError } from "../../domain/errors.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import { queueNotifications } from "./club-board.js";
import { mongoViolationRepository } from "./mongo-violation-repository.js";
import { ucmsModels as m } from "./ucms-models.js";
const visible = ["Awaiting Club Response", "Decision Issued", "Corrective Action", "Resolved", "Closed"];
export function mongoClubViolationRepository(): ClubViolationRepository {
  async function audit(session: ClientSession, id: Types.ObjectId, userId: string, action: string, after: unknown, now: Date) {
    await m.auditLogs!.create([{ entityType: "Violation", entityId: id, action, actorId: new Types.ObjectId(userId), actorRole: "Club Leader", after, correlationId: randomUUID(), at: now }], { session });
  }
  return {
    async list(clubId, now) {
      // The club sees every case it was notified about: a response request or a decision, including
      // a "no violation" closure issued before any response was requested.
      const ids = await m.violations!.find({ clubId: new Types.ObjectId(clubId), state: { $in: visible },
        $or: [{ "clubResponse.requestedAt": { $exists: true } }, { decidedAt: { $exists: true } }] }).sort({ openedAt: -1 }).distinct("_id");
      const reader = mongoViolationRepository();
      return (await Promise.all(ids.map((id) => reader.find(String(id), now)))).filter((d): d is NonNullable<typeof d> => Boolean(d));
    },
    async respond(clubId, id, text, userId, now) {
      const caseId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        await assertEventWriteAccess(session, new Types.ObjectId(clubId), new Types.ObjectId(userId), "club.complaint.respond", now);
        const doc = await m.violations!.findOneAndUpdate({ _id: caseId, clubId: new Types.ObjectId(clubId), state: "Awaiting Club Response", "clubResponse.source": null },
          { $set: { "clubResponse.source": "CLUB", "clubResponse.text": text, "clubResponse.respondedBy": new Types.ObjectId(userId), "clubResponse.respondedAt": now }, $inc: { __v: 1 } }, { session }).lean();
        if (!doc) throw new DomainError("case is not awaiting a response from this club", "conflict");
        await audit(session, caseId, userId, "VIOLATION_RESPONSE_SUBMITTED", { text }, now);
        await queueNotifications(session, [(doc.clubResponse as { requestedBy: unknown }).requestedBy], "VIOLATION_RESPONSE_SUBMITTED", "Violation", caseId, { clubId }, now);
      });
    },
    async submitAction(clubId, id, actionId, input, userId, now) {
      const caseId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        await assertEventWriteAccess(session, new Types.ObjectId(clubId), new Types.ObjectId(userId), "club.complaint.respond", now);
        const doc = await m.violations!.findOneAndUpdate({ _id: caseId, clubId: new Types.ObjectId(clubId), state: "Corrective Action" }, { $inc: { __v: 1 } }, { session }).lean();
        if (!doc) throw new DomainError("case is not awaiting corrective action", "conflict");
        const changed = await m.correctiveActions!.updateOne({ _id: new Types.ObjectId(actionId), violationId: caseId, state: "Pending", submission: null },
          { $set: { submission: { ...input, submittedBy: userId, submittedAt: now } }, $inc: { __v: 1 } }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("corrective action is unavailable or already submitted", "conflict");
        await audit(session, caseId, userId, "CORRECTIVE_ACTION_SUBMITTED", { actionId, ...input }, now);
        await queueNotifications(session, [doc.decidedBy, doc.openedBy], "CORRECTIVE_ACTION_SUBMITTED", "Violation", caseId, { actionId }, now);
      });
    },
  };
}
