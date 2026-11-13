import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  ACTIVE_DEFENSE_STATES,
  assertCanConfirmDefense,
  assertCanRequestReschedule,
  assertCanStartDefense,
  DEFENSE_CONFIRM_NOTICE_HOURS,
  type AvailableDefenseRoom,
  type ClubEventDefenseView,
  type EventDefenseRepository,
  type EventDefenseSession,
} from "../../domain/event-defense.js";
import type { EventProposalReviewRepository } from "../../domain/event-proposal-review.js";
import { notificationChannels } from "../../domain/notification.js";
import { cancelEventInSession } from "./event-cancellation.js";
import {
  applyProposalDecisionInSession,
  clubEventManagerRecipients,
  conflict,
  mapDefenseSession,
  oid,
} from "./event-defense-helpers.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const ACTIVE_STATES_ARRAY = [...ACTIVE_DEFENSE_STATES];
const HOUR_MS = 60 * 60 * 1000;

async function findRoomConflictInSession(
  propertyId: Types.ObjectId,
  startAt: Date,
  endAt: Date,
  excludeDefenseId?: Types.ObjectId,
  session?: ClientSession,
): Promise<string | undefined> {
  const propQuery = m.properties!.findById(propertyId).select({ blackouts: 1 });
  if (session) propQuery.session(session);
  const prop = await propQuery.lean();
  const blackouts = (prop?.blackouts ?? []) as Array<{ startAt: Date; endAt: Date }>;
  if (blackouts.some((b) => new Date(b.startAt) < endAt && new Date(b.endAt) > startAt)) {
    return "Room is under maintenance / blackout";
  }

  const overlap = { startAt: { $lt: endAt }, endAt: { $gt: startAt } };
  const bookingQuery = m.propertyBookings!.findOne({
    propertyId,
    state: { $in: ["Approved", "In Use"] },
    ...overlap,
  }).select({ _id: 1 });
  if (session) bookingQuery.session(session);
  if (await bookingQuery.lean()) {
    return "Room has an approved booking or semester allocation";
  }

  const eventQuery = m.events!.findOne({
    propertyId,
    state: { $in: ["Approved", "Upcoming", "Ongoing"] },
    ...overlap,
  }).select({ _id: 1 });
  if (session) eventQuery.session(session);
  if (await eventQuery.lean()) {
    return "Room is reserved for an approved event";
  }

  const defenseQuery = m.eventDefenseSessions!.findOne({
    propertyId,
    ...(excludeDefenseId ? { _id: { $ne: excludeDefenseId } } : {}),
    state: { $in: ACTIVE_STATES_ARRAY },
    ...overlap,
  }).select({ _id: 1 });
  if (session) defenseQuery.session(session);
  if (await defenseQuery.lean()) {
    return "Room is booked for another event defense session";
  }

  return undefined;
}

async function assertOfficerAssignee(
  eventId: Types.ObjectId,
  officerId: string,
  session: ClientSession,
): Promise<{ event: Doc; task: Doc }> {
  const actorId = oid(officerId);
  const [event, task] = await Promise.all([
    m.events!.findById(eventId).session(session).lean(),
    m.approvalTasks!.findOne({
      entityType: "EVENT_PROPOSAL",
      entityId: eventId,
      state: "Open",
    }).sort({ openedAt: -1 }).session(session).lean(),
  ]);
  if (!event) throw new DomainError("event proposal not found", "not_found");
  if (!task || !task.assigneeId || String(task.assigneeId) !== String(actorId)) {
    throw new DomainError("only the assigned ICPDP officer can manage this defense session", "forbidden");
  }
  return { event, task };
}

async function notifyRecipients(
  recipientIds: Types.ObjectId[],
  eventCode: string,
  eventId: Types.ObjectId,
  payload: Doc,
  now: Date,
  session: ClientSession,
): Promise<void> {
  if (!recipientIds.length) return;
  const unique = [...new Map(recipientIds.map((id) => [String(id), id])).values()];
  await m.notifications!.create(
    unique.map((recipientUserId) => ({
      recipientUserId,
      eventCode,
      entityType: "Event",
      entityId: eventId,
      channels: notificationChannels(eventCode),
      payload,
      state: "Queued",
      dueAt: now,
      attempts: 0,
      createdAt: now,
    })),
    { session, ordered: true },
  );
}

export function mongoEventDefenseRepository(reviewRepo: EventProposalReviewRepository): EventDefenseRepository {
  const sessions = m.eventDefenseSessions!;
  const events = m.events!;
  const properties = m.properties!;
  const audits = m.auditLogs!;
  const versions = m.eventProposalVersions!;

  async function requireSessionById(id: Types.ObjectId): Promise<EventDefenseSession> {
    const doc = await sessions.findById(id).lean();
    if (!doc) throw new DomainError("defense session not found", "not_found");
    return mapDefenseSession(doc);
  }

  return {
    async listAvailableRooms(startAt, endAt, excludeDefenseId): Promise<AvailableDefenseRoom[]> {
      const overlap = { startAt: { $lt: endAt }, endAt: { $gt: startAt } };
      const [roomDocs, bookingDocs, eventDocs, defenseDocs] = await Promise.all([
        properties.find({ type: "ROOM", isActive: true }).sort({ code: 1, name: 1 }).lean(),
        m.propertyBookings!.find({ state: { $in: ["Approved", "In Use"] }, ...overlap })
          .select({ propertyId: 1 }).lean(),
        events.find({ state: { $in: ["Approved", "Upcoming", "Ongoing"] }, propertyId: { $ne: null }, ...overlap })
          .select({ propertyId: 1 }).lean(),
        sessions.find({
          state: { $in: ACTIVE_STATES_ARRAY },
          ...(excludeDefenseId ? { _id: { $ne: oid(excludeDefenseId) } } : {}),
          ...overlap,
        }).select({ propertyId: 1 }).lean(),
      ]);

      const bookingRooms = new Set(bookingDocs.map((d) => String(d.propertyId)));
      const eventRooms = new Set(eventDocs.map((d) => String(d.propertyId)));
      const defenseRooms = new Set(defenseDocs.map((d) => String(d.propertyId)));

      return roomDocs.map((room) => {
        const roomId = String(room._id);
        const blackouts = (room.blackouts ?? []) as Array<{ startAt: Date; endAt: Date }>;
        let conflictReason: string | undefined;
        if (blackouts.some((b) => new Date(b.startAt) < endAt && new Date(b.endAt) > startAt)) {
          conflictReason = "Maintenance / Blackout";
        } else if (bookingRooms.has(roomId)) {
          conflictReason = "Busy (Allocation / Booking)";
        } else if (eventRooms.has(roomId)) {
          conflictReason = "Busy (Event)";
        } else if (defenseRooms.has(roomId)) {
          conflictReason = "Busy (Defense Session)";
        }

        return {
          id: roomId,
          code: String(room.code ?? ""),
          name: String(room.name ?? ""),
          location: String(room.location ?? ""),
          ...(typeof room.capacity === "number" ? { capacity: room.capacity } : {}),
          available: !conflictReason,
          ...(conflictReason ? { conflictReason } : {}),
        };
      });
    },

    async getLiveSession(eventId): Promise<EventDefenseSession | null> {
      const id = oid(eventId);
      const doc = await sessions.findOne({ eventId: id }).sort({ createdAt: -1, _id: -1 }).lean();
      return doc ? mapDefenseSession(doc) : null;
    },

    async getClubDefense(clubId, eventId): Promise<ClubEventDefenseView | null> {
      const id = oid(eventId);
      const event = await events.findOne({ _id: id, clubId: oid(clubId) })
        .select({ title: 1, state: 1 }).lean();
      if (!event) return null;
      const docs = await sessions.find({ eventId: id }).sort({ createdAt: -1, _id: -1 }).lean();
      const history = docs.map(mapDefenseSession);
      const activeSession = history.find((item) =>
        ACTIVE_DEFENSE_STATES.has(item.state) || (item.state === "DEFENDED" && !item.outcome));
      return {
        eventId: String(event._id),
        eventTitle: String(event.title ?? ""),
        eventState: String(event.state ?? ""),
        ...(activeSession ? { activeSession } : {}),
        history,
      };
    },

    async schedule(eventId, officerId, input, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const actorId = oid(officerId);
      const propId = oid(input.propertyId);
      const endAt = new Date(input.startAt.getTime() + input.durationMinutes * 60_000);
      const defenseId = new Types.ObjectId();

      await mongoose.connection.transaction(async (session) => {
        const { event } = await assertOfficerAssignee(id, officerId, session);
        if (!["Under Review", "Re-defense Pending"].includes(String(event.state))) {
          conflict("defense session can only be scheduled for an event under review or pending re-defense");
        }
        const existingActive = await sessions.findOne({
          eventId: id,
          $or: [
            { state: { $in: ACTIVE_STATES_ARRAY } },
            { state: "DEFENDED", $or: [{ outcome: { $exists: false } }, { outcome: null }] },
          ],
        }).session(session).lean();
        if (existingActive) {
          conflict("an active or undecided defense session already exists for this proposal");
        }

        const room = await properties.findOneAndUpdate(
          { _id: propId, type: "ROOM", isActive: true },
          { $inc: { __v: 1 } },
          { session },
        ).lean();
        if (!room) throw new DomainError("active room not found", "validation", { field: "propertyId" });

        const roomConflict = await findRoomConflictInSession(propId, input.startAt, endAt, undefined, session);
        if (roomConflict) conflict(roomConflict);

        if (event.state === "Re-defense Pending") {
          await events.updateOne({ _id: id, state: "Re-defense Pending" }, { $set: { state: "Under Review" } }, { session });
        }

        const propertyName = `${String(room.code ?? "")} - ${String(room.name ?? "")}`.replace(/^ - | - $/g, "");
        await sessions.create([{
          _id: defenseId,
          eventId: id,
          revisionNo: Number(event.currentRevisionNo ?? 1),
          title: input.title,
          startAt: input.startAt,
          endAt,
          durationMinutes: input.durationMinutes,
          propertyId: propId,
          propertyName,
          ...(input.note ? { note: input.note } : {}),
          state: "SCHEDULED",
          leadOfficerId: actorId,
          notes: [],
          createdAt: now,
          updatedAt: now,
        }], { session });

        await audits.create([{
          entityType: "Event",
          entityId: id,
          action: "EVENT_DEFENSE_SCHEDULED",
          actorId,
          actorRole: "ICPDP_OFFICER",
          after: {
            defenseId,
            title: input.title,
            startAt: input.startAt,
            endAt,
            propertyId: propId,
            propertyName,
          },
          correlationId: randomUUID(),
          at: now,
        }], { session });

        const version = await versions.findOne({ eventId: id, revisionNo: event.currentRevisionNo ?? 1 })
          .select({ submittedBy: 1 }).session(session).lean();
        const recipients = await clubEventManagerRecipients(event.clubId as Types.ObjectId, version?.submittedBy, session);
        await notifyRecipients(
          recipients,
          "EVENT_DEFENSE_SCHEDULED",
          id,
          {
            eventTitle: event.title,
            defenseTitle: input.title,
            startAt: input.startAt,
            endAt,
            durationMinutes: input.durationMinutes,
            propertyName,
            note: input.note,
          },
          now,
          session,
        );
      });

      return requireSessionById(defenseId);
    },

    async cancel(eventId, officerId, reason, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const actorId = oid(officerId);
      let updatedId: Types.ObjectId | undefined;

      await mongoose.connection.transaction(async (session) => {
        const { event } = await assertOfficerAssignee(id, officerId, session);
        const doc = await sessions.findOne({
          eventId: id,
          state: { $in: ["SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED"] },
        }).sort({ createdAt: -1 }).session(session).lean();
        if (!doc) conflict("no cancellable defense session found");
        if (String(doc.leadOfficerId) !== String(actorId)) {
          throw new DomainError("only the assigned ICPDP officer can cancel this defense session", "forbidden");
        }
        updatedId = doc._id as Types.ObjectId;
        await sessions.updateOne(
          { _id: updatedId, state: doc.state },
          { $set: { state: "CANCELLED", cancelReason: reason, updatedAt: now } },
          { session },
        );
        await audits.create([{
          entityType: "Event",
          entityId: id,
          action: "EVENT_DEFENSE_CANCELLED",
          actorId,
          actorRole: "ICPDP_OFFICER",
          before: { defenseId: updatedId, state: doc.state },
          after: { defenseId: updatedId, state: "CANCELLED" },
          reason,
          correlationId: randomUUID(),
          at: now,
        }], { session });

        const version = await versions.findOne({ eventId: id, revisionNo: event.currentRevisionNo ?? 1 })
          .select({ submittedBy: 1 }).session(session).lean();
        const recipients = await clubEventManagerRecipients(event.clubId as Types.ObjectId, version?.submittedBy, session);
        await notifyRecipients(
          recipients,
          "EVENT_DEFENSE_CANCELLED",
          id,
          { eventTitle: event.title, defenseTitle: doc.title, reason },
          now,
          session,
        );
      });

      return requireSessionById(updatedId!);
    },

    async respondReschedule(eventId, officerId, input, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const actorId = oid(officerId);
      let updatedId: Types.ObjectId | undefined;

      await mongoose.connection.transaction(async (session) => {
        const { event } = await assertOfficerAssignee(id, officerId, session);
        const doc = await sessions.findOne({ eventId: id, state: "RESCHEDULE_REQUESTED" })
          .sort({ createdAt: -1 }).session(session).lean();
        if (!doc) conflict("no reschedule request is pending for this event");
        if (String(doc.leadOfficerId) !== String(actorId)) {
          throw new DomainError("only the assigned ICPDP officer can respond to this reschedule request", "forbidden");
        }
        updatedId = doc._id as Types.ObjectId;

        const version = await versions.findOne({ eventId: id, revisionNo: event.currentRevisionNo ?? 1 })
          .select({ submittedBy: 1 }).session(session).lean();
        const recipients = await clubEventManagerRecipients(event.clubId as Types.ObjectId, version?.submittedBy, session);

        if (input.accept) {
          const propId = oid(input.propertyId!);
          const durationMinutes = input.durationMinutes ?? Number(doc.durationMinutes ?? 60);
          const endAt = new Date(input.startAt!.getTime() + durationMinutes * 60_000);
          const room = await properties.findOneAndUpdate(
            { _id: propId, type: "ROOM", isActive: true },
            { $inc: { __v: 1 } },
            { session },
          ).lean();
          if (!room) throw new DomainError("active room not found", "validation", { field: "propertyId" });

          const roomConflict = await findRoomConflictInSession(propId, input.startAt!, endAt, updatedId, session);
          if (roomConflict) conflict(roomConflict);

          const propertyName = `${String(room.code ?? "")} - ${String(room.name ?? "")}`.replace(/^ - | - $/g, "");
          await sessions.updateOne(
            { _id: updatedId, state: "RESCHEDULE_REQUESTED" },
            {
              $set: {
                startAt: input.startAt!,
                endAt,
                durationMinutes,
                propertyId: propId,
                propertyName,
                state: "SCHEDULED",
                ...(input.note ? { note: input.note } : {}),
                updatedAt: now,
              },
              $unset: { rescheduleReason: "", confirmedAt: "", confirmedBy: "" },
            },
            { session },
          );
          await audits.create([{
            entityType: "Event",
            entityId: id,
            action: "EVENT_DEFENSE_RESCHEDULE_ACCEPTED",
            actorId,
            actorRole: "ICPDP_OFFICER",
            after: { defenseId: updatedId, startAt: input.startAt, endAt, propertyName },
            correlationId: randomUUID(),
            at: now,
          }], { session });
          await notifyRecipients(
            recipients,
            "EVENT_DEFENSE_RESCHEDULE_DECIDED",
            id,
            {
              eventTitle: event.title,
              accepted: true,
              startAt: input.startAt,
              endAt,
              durationMinutes,
              propertyName,
            },
            now,
            session,
          );
        } else {
          const fallbackState = doc.confirmedAt ? "CONFIRMED" : "SCHEDULED";
          await sessions.updateOne(
            { _id: updatedId, state: "RESCHEDULE_REQUESTED" },
            {
              $set: { state: fallbackState, updatedAt: now },
              $unset: { rescheduleReason: "" },
            },
            { session },
          );
          await audits.create([{
            entityType: "Event",
            entityId: id,
            action: "EVENT_DEFENSE_RESCHEDULE_REJECTED",
            actorId,
            actorRole: "ICPDP_OFFICER",
            reason: input.reason,
            after: { defenseId: updatedId, state: fallbackState },
            correlationId: randomUUID(),
            at: now,
          }], { session });
          await notifyRecipients(
            recipients,
            "EVENT_DEFENSE_RESCHEDULE_DECIDED",
            id,
            { eventTitle: event.title, accepted: false, reason: input.reason },
            now,
            session,
          );
        }
      });

      return requireSessionById(updatedId!);
    },

    async start(eventId, officerId, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const actorId = oid(officerId);
      let updatedId: Types.ObjectId | undefined;

      await mongoose.connection.transaction(async (session) => {
        await assertOfficerAssignee(id, officerId, session);
        const doc = await sessions.findOne({
          eventId: id,
          state: { $in: ["SCHEDULED", "CONFIRMED"] },
        }).sort({ createdAt: -1 }).session(session).lean();
        if (!doc) conflict("no startable defense session found");
        if (String(doc.leadOfficerId) !== String(actorId)) {
          throw new DomainError("only the assigned ICPDP officer can start the defense session", "forbidden");
        }
        assertCanStartDefense(mapDefenseSession(doc), now);
        updatedId = doc._id as Types.ObjectId;
        await sessions.updateOne(
          { _id: updatedId, state: doc.state },
          { $set: { state: "IN_PROGRESS", startedAt: now, updatedAt: now } },
          { session },
        );
        await audits.create([{
          entityType: "Event",
          entityId: id,
          action: "EVENT_DEFENSE_STARTED",
          actorId,
          actorRole: "ICPDP_OFFICER",
          after: { defenseId: updatedId },
          correlationId: randomUUID(),
          at: now,
        }], { session });
      });

      return requireSessionById(updatedId!);
    },

    async saveNote(eventId, officerId, content, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const actorId = oid(officerId);
      const user = await m.users!.findById(actorId).select({ displayName: 1, email: 1 }).lean();
      const officerName = String(user?.displayName || user?.email || officerId);

      const doc = await sessions.findOne({ eventId: id, state: "IN_PROGRESS" })
        .sort({ createdAt: -1 }).lean();
      if (!doc) conflict("defense session is not currently in progress");

      const updatedExisting = await sessions.updateOne(
        { _id: doc._id, state: "IN_PROGRESS", "notes.officerId": actorId },
        {
          $set: {
            "notes.$.content": content,
            "notes.$.officerName": officerName,
            "notes.$.updatedAt": now,
            updatedAt: now,
          },
        },
      );

      if (updatedExisting.matchedCount === 0) {
        await sessions.updateOne(
          { _id: doc._id, state: "IN_PROGRESS", "notes.officerId": { $ne: actorId } },
          {
            $push: {
              notes: { officerId: actorId, officerName, content, updatedAt: now },
            },
            $set: { updatedAt: now },
          },
        );
      }

      return requireSessionById(doc._id as Types.ObjectId);
    },

    async end(eventId, officerId, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const actorId = oid(officerId);
      let updatedId: Types.ObjectId | undefined;

      await mongoose.connection.transaction(async (session) => {
        await assertOfficerAssignee(id, officerId, session);
        const doc = await sessions.findOne({ eventId: id, state: "IN_PROGRESS" })
          .sort({ createdAt: -1 }).session(session).lean();
        if (!doc) conflict("no defense session in progress found");
        if (String(doc.leadOfficerId) !== String(actorId)) {
          throw new DomainError("only the assigned ICPDP officer can end the defense session", "forbidden");
        }
        updatedId = doc._id as Types.ObjectId;
        await sessions.updateOne(
          { _id: updatedId, state: "IN_PROGRESS" },
          { $set: { state: "DEFENDED", endedAt: now, updatedAt: now } },
          { session },
        );
        await audits.create([{
          entityType: "Event",
          entityId: id,
          action: "EVENT_DEFENSE_ENDED",
          actorId,
          actorRole: "ICPDP_OFFICER",
          after: { defenseId: updatedId },
          correlationId: randomUUID(),
          at: now,
        }], { session });
      });

      return requireSessionById(updatedId!);
    },

    async markNoShow(eventId, officerId, reason, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const actorId = oid(officerId);
      let updatedId: Types.ObjectId | undefined;

      await mongoose.connection.transaction(async (session) => {
        const { event, task } = await assertOfficerAssignee(id, officerId, session);
        const doc = await sessions.findOne({
          eventId: id,
          state: { $in: ["SCHEDULED", "CONFIRMED", "RESCHEDULE_REQUESTED", "IN_PROGRESS"] },
        }).sort({ createdAt: -1 }).session(session).lean();
        if (!doc) conflict("no active defense session found to mark as no-show");
        if (String(doc.leadOfficerId) !== String(actorId)) {
          throw new DomainError("only the assigned ICPDP officer can mark defense no-show", "forbidden");
        }
        updatedId = doc._id as Types.ObjectId;

        await sessions.updateOne(
          { _id: updatedId, state: doc.state },
          {
            $set: {
              state: "NO_SHOW",
              outcome: "FAILED",
              outcomeReason: reason,
              endedAt: now,
              updatedAt: now,
            },
          },
          { session },
        );

        const decisionId = new Types.ObjectId();
        await m.approvalDecisions!.create([{
          _id: decisionId,
          approvalTaskId: task._id,
          level: 1,
          outcome: "Reject",
          reason,
          comments: { sections: [], conditions: [] },
          actorId,
          at: now,
        }], { session });

        await events.updateOne(
          { _id: id },
          { $set: { state: "Rejected" }, $unset: { revisionDeadlineAt: "" } },
          { session },
        );
        await m.approvalTasks!.updateOne(
          { _id: task._id, state: "Open" },
          { $set: { state: "Decided", closedAt: now } },
          { session },
        );

        if (await audits.exists({ entityType: "Event", entityId: id, action: "EVENT_RESCHEDULED" }).session(session)) {
          await cancelEventInSession(session, { ...event, state: "Rejected" }, reason, now, "PROPOSAL_REJECTION", 24, actorId, decisionId);
          await events.updateOne({ _id: id, state: "Cancelled" }, { $set: { state: "Rejected" } }, { session });
        }

        await audits.create([{
          entityType: "Event",
          entityId: id,
          action: "EVENT_DEFENSE_NO_SHOW",
          actorId,
          actorRole: "ICPDP_OFFICER",
          before: { state: event.state, defenseState: doc.state },
          after: { state: "Rejected", defenseState: "NO_SHOW" },
          reason,
          correlationId: randomUUID(),
          at: now,
        }], { session });

        const version = await versions.findOne({ eventId: id, revisionNo: event.currentRevisionNo ?? 1 })
          .select({ submittedBy: 1 }).session(session).lean();
        const recipients = await clubEventManagerRecipients(event.clubId as Types.ObjectId, version?.submittedBy, session);
        await notifyRecipients(
          recipients,
          "EVENT_DEFENSE_NO_SHOW",
          id,
          { eventTitle: event.title, defenseTitle: doc.title, reason },
          now,
          session,
        );
      });

      return requireSessionById(updatedId!);
    },

    async decideAfterDefense(eventId, officerId, input, now) {
      const id = oid(eventId);
      await mongoose.connection.transaction(async (session) => {
        await applyProposalDecisionInSession(session, id, officerId, input, now, { requireDefendedSession: true });
      });
      const updated = await reviewRepo.find(eventId, now);
      if (!updated) throw new DomainError("event proposal not found", "not_found");
      return updated;
    },

    async confirmByClub(clubId, eventId, actorId, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const userObjId = oid(actorId);
      let updatedId: Types.ObjectId | undefined;

      await mongoose.connection.transaction(async (session) => {
        const event = await events.findOne({ _id: id, clubId: oid(clubId) }).session(session).lean();
        if (!event) throw new DomainError("event proposal not found", "not_found");
        const doc = await sessions.findOne({ eventId: id, state: "SCHEDULED" })
          .sort({ createdAt: -1 }).session(session).lean();
        if (!doc) conflict("no pending defense schedule found to confirm");
        assertCanConfirmDefense(mapDefenseSession(doc), now);
        updatedId = doc._id as Types.ObjectId;

        await sessions.updateOne(
          { _id: updatedId, state: "SCHEDULED" },
          { $set: { state: "CONFIRMED", confirmedAt: now, confirmedBy: userObjId, updatedAt: now } },
          { session },
        );

        await audits.create([{
          entityType: "Event",
          entityId: id,
          action: "EVENT_DEFENSE_CONFIRMED",
          actorId: userObjId,
          actorRole: "Club Member",
          after: { defenseId: updatedId, confirmedAt: now },
          correlationId: randomUUID(),
          at: now,
        }], { session });

        await notifyRecipients(
          [oid(String(doc.leadOfficerId))],
          "EVENT_DEFENSE_CONFIRMED",
          id,
          { eventTitle: event.title, defenseTitle: doc.title, clubName: event.clubName },
          now,
          session,
        );
      });

      return requireSessionById(updatedId!);
    },

    async requestRescheduleByClub(clubId, eventId, actorId, reason, now): Promise<EventDefenseSession> {
      const id = oid(eventId);
      const userObjId = oid(actorId);
      let updatedId: Types.ObjectId | undefined;

      await mongoose.connection.transaction(async (session) => {
        const event = await events.findOne({ _id: id, clubId: oid(clubId) }).session(session).lean();
        if (!event) throw new DomainError("event proposal not found", "not_found");
        const doc = await sessions.findOne({
          eventId: id,
          state: { $in: ["SCHEDULED", "CONFIRMED"] },
        }).sort({ createdAt: -1 }).session(session).lean();
        if (!doc) conflict("no active defense schedule found to reschedule");
        const cleanReason = assertCanRequestReschedule(mapDefenseSession(doc), reason, now);
        updatedId = doc._id as Types.ObjectId;

        await sessions.updateOne(
          { _id: updatedId, state: doc.state },
          { $set: { state: "RESCHEDULE_REQUESTED", rescheduleReason: cleanReason, updatedAt: now } },
          { session },
        );

        await audits.create([{
          entityType: "Event",
          entityId: id,
          action: "EVENT_DEFENSE_RESCHEDULE_REQUESTED",
          actorId: userObjId,
          actorRole: "Club Member",
          reason: cleanReason,
          after: { defenseId: updatedId, state: "RESCHEDULE_REQUESTED" },
          correlationId: randomUUID(),
          at: now,
        }], { session });

        await notifyRecipients(
          [oid(String(doc.leadOfficerId))],
          "EVENT_DEFENSE_RESCHEDULE_REQUESTED",
          id,
          {
            eventTitle: event.title,
            defenseTitle: doc.title,
            clubName: event.clubName,
            reason: cleanReason,
          },
          now,
          session,
        );
      });

      return requireSessionById(updatedId!);
    },

    async alertOverdueConfirmations(now): Promise<number> {
      const cutoff = new Date(now.getTime() + DEFENSE_CONFIRM_NOTICE_HOURS * HOUR_MS);
      const unconfirmed = await sessions.find({
        state: "SCHEDULED",
        startAt: { $gt: now, $lte: cutoff },
      }).lean();

      let alerted = 0;
      for (const doc of unconfirmed) {
        const alreadySent = await m.notifications!.exists({
          entityType: "Event",
          entityId: doc.eventId,
          eventCode: "EVENT_DEFENSE_CONFIRM_OVERDUE",
          "payload.defenseId": String(doc._id),
        });
        if (alreadySent) continue;
        const event = await events.findById(doc.eventId).select({ title: 1, clubName: 1 }).lean();
        await m.notifications!.create([{
          recipientUserId: doc.leadOfficerId,
          eventCode: "EVENT_DEFENSE_CONFIRM_OVERDUE",
          entityType: "Event",
          entityId: doc.eventId,
          channels: notificationChannels("EVENT_DEFENSE_CONFIRM_OVERDUE"),
          payload: {
            defenseId: String(doc._id),
            defenseTitle: doc.title,
            eventTitle: event?.title,
            clubName: event?.clubName,
            startAt: doc.startAt,
          },
          state: "Queued",
          dueAt: now,
          attempts: 0,
          createdAt: now,
        }]);
        alerted += 1;
      }
      return alerted;
    },
  };
}
