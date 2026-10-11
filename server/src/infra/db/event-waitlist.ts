import { randomUUID } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels as m } from "./ucms-models.js";

/** UC30 A1: only the head may take a released seat; all writers hold the event document. */
export async function promoteEventWaitlist(session: ClientSession, eventId: Types.ObjectId, now: Date,
  actorId?: Types.ObjectId, requestedRegistrationId?: Types.ObjectId): Promise<number> {
  let promoted = 0;
  while (true) {
    const event = await m.events!.findOne({ _id: eventId, state: "Upcoming", startAt: { $gt: now },
      registrationOpenAt: { $lte: now }, registrationCloseAt: { $gt: now }, waitlistEnabled: true }).session(session).lean();
    if (!event || Number(event.confirmedRegistrationCount) >= Number(event.capacity)) {
      if (requestedRegistrationId) throw new DomainError("there is no available seat in the registration window", "conflict");
      return promoted;
    }
    const head = await m.eventRegistrations!.findOne({ eventId, state: "Waitlisted" }).sort({ waitlistPosition: 1, _id: 1 }).session(session).lean();
    if (!head) return promoted;
    if (requestedRegistrationId && String(head._id) !== String(requestedRegistrationId)) {
      throw new DomainError("only the first waitlisted registration can be promoted", "conflict");
    }
    if (event.audienceScope === "MEMBERS_ONLY" && !(await m.clubMemberships!.exists({ clubId: event.clubId, userId: head.studentId, state: "Active" }).session(session))) {
      await m.eventRegistrations!.updateOne({ _id: head._id, state: "Waitlisted" },
        { $set: { state: "Cancelled", cancelledAt: now }, $unset: { waitlistPosition: "" } }, { session });
      await m.auditLogs!.create([{ entityType: "EventRegistration", entityId: head._id, action: "EVENT_WAITLIST_INELIGIBLE",
        actorRole: "SYSTEM", after: { state: "Cancelled" }, correlationId: randomUUID(), at: now }], { session });
      continue;
    }
    const changed = await m.events!.updateOne({ _id: eventId, state: "Upcoming", $expr: { $lt: ["$confirmedRegistrationCount", "$capacity"] } },
      { $inc: { confirmedRegistrationCount: 1 } }, { session });
    if (changed.modifiedCount !== 1) throw new DomainError("event capacity changed", "conflict");
    await m.eventRegistrations!.updateOne({ _id: head._id, state: "Waitlisted" },
      { $set: { state: "Confirmed", promotedAt: now }, $unset: { waitlistPosition: "" } }, { session });
    await m.auditLogs!.create([{ entityType: "EventRegistration", entityId: head._id, action: "EVENT_REGISTRATION_PROMOTED",
      ...(actorId ? { actorId, actorRole: "Club Member" } : { actorRole: "SYSTEM" }),
      before: { state: "Waitlisted", waitlistPosition: head.waitlistPosition }, after: { state: "Confirmed" }, correlationId: randomUUID(), at: now }], { session });
    await m.notifications!.create([{ recipientUserId: head.studentId, eventCode: "EVENT_REGISTRATION_PROMOTED", entityType: "EventRegistration",
      entityId: head._id, channels: ["IN_APP"], payload: { eventId: String(eventId), title: event.title }, state: "Queued", dueAt: now, attempts: 0, createdAt: now }], { session });
    promoted += 1;
    if (requestedRegistrationId) return promoted;
  }
}
