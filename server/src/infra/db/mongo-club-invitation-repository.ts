import { randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { normalizeInvitationResponse, type ClubInvitation, type ClubInvitationRepository } from "../../domain/club-invitation.js";
import { DomainError } from "../../domain/errors.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import { queueNotifications } from "./club-board.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
export function mongoClubInvitationRepository(): ClubInvitationRepository {
  async function mapped(doc: Doc): Promise<ClubInvitation> {
    const event = await m.events!.findOne({ _id: doc.eventId, organizerType: "ICPDP" }).lean();
    if (!event) throw new DomainError("school event not found", "not_found");
    const proposal = await m.eventProposalVersions!.findOne({ eventId: doc.eventId }).sort({ revisionNo: -1 }).lean();
    const payload = (proposal?.payload ?? {}) as Doc;
    return { id: String(doc._id), clubId: String(doc.clubId), clubName: String(doc.clubName),
      status: doc.status as ClubInvitation["status"], deadline: doc.deadline as Date, invitedAt: doc.invitedAt as Date,
      ...(doc.respondedAt ? { respondedAt: doc.respondedAt as Date } : {}),
      ...(doc.responseNote ? { responseNote: String(doc.responseNote) } : {}),
      ...(doc.responseDetails ? { responseDetails: doc.responseDetails } : {}),
      event: { id: String(event._id), title: String(event.title), state: String(event.state),
        startAt: event.startAt as Date, endAt: event.endAt as Date, venue: String(event.venueText ?? ""),
        objective: String(event.objective ?? payload.objective ?? ""), coordination: String(payload.plan ?? "") } };
  }
  return {
    async list(clubId) {
      const docs = await m.eventInvitations!.find({ clubId: new Types.ObjectId(clubId) }).sort({ invitedAt: -1, _id: -1 }).lean();
      return Promise.all(docs.map(mapped));
    },
    async respond(clubId, invitationId, raw, userId, now) {
      const input = normalizeInvitationResponse(raw);
      const club = new Types.ObjectId(clubId);
      const id = new Types.ObjectId(invitationId);
      const actor = new Types.ObjectId(userId);
      await mongoose.connection.transaction(async (session) => {
        await assertEventWriteAccess(session, club, actor, "club.event.manage", now);
        if (!(await m.clubs!.exists({ _id: club, state: "Active" }).session(session))) {
          throw new DomainError("club must be active to respond", "conflict");
        }
        const invitation = await m.eventInvitations!.findOne({ _id: id, clubId: club }).session(session).lean();
        if (!invitation) throw new DomainError("invitation not found", "not_found");
        const event = await m.events!.findOneAndUpdate({ _id: invitation.eventId, organizerType: "ICPDP",
          state: { $in: ["Approved", "Upcoming"] }, startAt: { $gt: now } }, { $inc: { __v: 1 } }, { session }).lean();
        if (!event) throw new DomainError("school event is no longer answerable", "conflict");
        const changed = await m.eventInvitations!.updateOne({ _id: id, clubId: club, status: "Pending", deadline: { $gt: now } },
          { $set: { status: input.outcome, respondedAt: now, respondedBy: actor, updatedAt: now,
            responseNote: input.responseNote ?? "", responseDetails: input.responseDetails ?? {} } }, { session });
        if (changed.modifiedCount !== 1) throw new DomainError("invitation is no longer pending before its deadline", "conflict");
        const action = input.outcome === "Accepted" ? "EVENT_INVITATION_ACCEPTED" : "EVENT_INVITATION_DECLINED";
        await m.auditLogs!.create([{ entityType: "EventInvitation", entityId: id, action, actorId: actor,
          actorRole: "Club Leader", before: { status: "Pending" }, after: input, correlationId: randomUUID(), at: now }], { session });
        await queueNotifications(session, [invitation.invitedBy], action, "EventInvitation", id,
          { eventId: String(event._id), clubId, title: event.title, ...input }, now);
      });
      return mapped((await m.eventInvitations!.findOne({ _id: id, clubId: club }).lean())!);
    },
  };
}
