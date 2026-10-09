import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import {
  SUSPENSION_REMINDER_MS,
  type CascadeResult, type ClubDissolution, type ClubLifecycleRepository, type ClubLifecycleSummary,
  type ClubSuspension,
} from "../../domain/club-lifecycle.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const scheduledEventStates = ["Approved", "Upcoming"];
/** Proposals and events that may still run; BR45 cancels those ending after the dissolution semester. */
const liveEventStates = ["Draft", "Pending Approval", "Under Review", "Revision Requested", "Approved", "Upcoming"];
const undecidedBookingStates = ["Draft", "Requested", "Under Review", "Revision Requested"];
const openCampaignStates = ["Published", "Accepting Applications"];

function suspensionFrom(raw: unknown): ClubSuspension | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Doc;
  return { reason: String(value.reason ?? ""), suspendedAt: value.suspendedAt as Date,
    suspendedBy: String(value.suspendedBy ?? ""), until: value.until instanceof Date ? value.until : null,
    ...(value.reminderSentAt instanceof Date ? { reminderSentAt: value.reminderSentAt } : {}) };
}

function dissolutionFrom(raw: unknown): ClubDissolution | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const value = raw as Doc;
  if (!(value.effectiveFrom instanceof Date) || !(value.effectiveTo instanceof Date)) return undefined;
  return { decidedAt: value.decidedAt as Date, decidedBy: String(value.decidedBy ?? ""),
    reason: String(value.reason ?? ""), effectiveSemester: String(value.effectiveSemester ?? ""),
    effectiveFrom: value.effectiveFrom, effectiveTo: value.effectiveTo };
}

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

export function mongoClubLifecycleRepository(): ClubLifecycleRepository {
  const m = ucmsModels;

  function summaryFrom(doc: Doc, activeMembers: number): ClubLifecycleSummary {
    const suspension = suspensionFrom(doc.suspension);
    const dissolution = dissolutionFrom(doc.dissolution);
    return { id: String(doc._id), code: String(doc.code), name: String(doc.name), field: String(doc.field ?? ""),
      state: String(doc.state), activeMembers, ...(suspension ? { suspension } : {}),
      ...(dissolution ? { dissolution } : {}) };
  }

  async function summaries(filter: Doc): Promise<ClubLifecycleSummary[]> {
    const docs = await m.clubs!.find(filter).sort({ name: 1 }).collation({ locale: "vi" }).lean();
    const counts = await m.clubMemberships!.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { clubId: { $in: docs.map((doc) => doc._id) }, state: "Active" } },
      { $group: { _id: "$clubId", count: { $sum: 1 } } }]);
    const byClub = new Map(counts.map((item) => [String(item._id), item.count]));
    return docs.map((doc) => summaryFrom(doc, byClub.get(String(doc._id)) ?? 0));
  }

  async function audit(session: ClientSession, clubId: Types.ObjectId, action: string, actorId: string | null,
    before: unknown, after: unknown, reason: string | undefined, at: Date, correlationId: string): Promise<void> {
    await m.auditLogs!.create([{ entityType: "Club", entityId: clubId, action,
      ...(actorId ? { actorId: new Types.ObjectId(actorId), actorRole: "ICPDP_OFFICER" } : { actorRole: "SYSTEM" }),
      before, after, ...(reason ? { reason } : {}), correlationId, at }], { session });
  }

  async function notify(session: ClientSession, recipients: unknown[], eventCode: string, entityType: string,
    entityId: Types.ObjectId, payload: Doc, now: Date): Promise<void> {
    const unique = [...new Set(recipients.map(String))];
    if (!unique.length) return;
    await m.notifications!.insertMany(unique.map((userId) => ({ recipientUserId: new Types.ObjectId(userId),
      eventCode, entityType, entityId, channels: ["IN_APP"], payload, state: "Queued", dueAt: now, attempts: 0,
      createdAt: now })), { session });
  }

  async function memberIds(clubId: Types.ObjectId, session: ClientSession): Promise<unknown[]> {
    return m.clubMemberships!.find({ clubId, state: "Active" }).session(session).distinct("userId");
  }

  /** System cascade (UC28 A1 / UC47 A1): cancels events and bookings, frees registrations, notifies. */
  async function cascade(session: ClientSession, clubId: Types.ObjectId, eventFilter: Doc, bookingFilter: Doc,
    source: "SUSPENSION" | "DISSOLUTION", reason: string, now: Date): Promise<CascadeResult> {
    const events = await m.events!.find({ clubId, ...eventFilter }).session(session).lean();
    const eventIds = events.map((event) => event._id);
    let cancelledRegistrations = 0;
    if (eventIds.length) {
      await m.events!.updateMany({ _id: { $in: eventIds } }, { $set: { state: "Cancelled", cancelReason: reason,
        cancelSourceType: source, confirmedRegistrationCount: 0 } }, { session });
      const registrations = await m.eventRegistrations!.find({ eventId: { $in: eventIds },
        state: { $in: ["Confirmed", "Waitlisted"] } }).session(session).lean();
      cancelledRegistrations = registrations.length;
      await m.eventRegistrations!.updateMany({ _id: { $in: registrations.map((item) => item._id) } },
        { $set: { state: "Cancelled", cancelledAt: now } }, { session });
      for (const event of events) {
        await notify(session, registrations.filter((item) => String(item.eventId) === String(event._id))
          .map((item) => item.studentId), "EVENT_CANCELLED", "Event", event._id as Types.ObjectId,
        { title: event.title, reason, source }, now);
      }
    }
    const bookings = await m.propertyBookings!.updateMany({ clubId, ...bookingFilter },
      { $set: { state: "Cancelled", cancelReason: reason, cancelledAt: now, releasedBy: source } }, { session });
    return { cancelledEvents: eventIds.length, cancelledRegistrations, cancelledBookings: bookings.modifiedCount };
  }

  return {
    list() {
      return summaries({});
    },
    async detail(clubId, now) {
      const id = new Types.ObjectId(clubId);
      const [summary] = await summaries({ _id: id });
      if (!summary) return null;
      const [campaigns, events, term, history] = await Promise.all([
        m.recruitmentCampaigns!.find({ clubId: id, state: { $in: openCampaignStates }, windowEnd: { $gt: now } })
          .select("title windowEnd").lean(),
        m.events!.find({ clubId: id, state: { $in: scheduledEventStates }, startAt: { $gt: now } })
          .sort({ startAt: 1 }).select("title startAt endAt confirmedRegistrationCount").lean(),
        m.clubTerms!.findOne({ clubId: id, state: "Active" }).sort({ startAt: -1 }).lean(),
        m.auditLogs!.find({ entityType: "Club", entityId: id }).sort({ at: -1 }).limit(50).lean(),
      ]);
      const actors = await m.users!.find({ _id: { $in: history.flatMap((item) => item.actorId ? [item.actorId] : []) } })
        .select("displayName").lean();
      const actorName = new Map(actors.map((user) => [String(user._id), String(user.displayName)]));
      return { ...summary,
        openCampaigns: campaigns.map((item) => ({ id: String(item._id), title: String(item.title),
          windowEnd: item.windowEnd as Date })),
        upcomingEvents: events.map((item) => ({ id: String(item._id), title: String(item.title),
          startAt: item.startAt as Date, endAt: item.endAt as Date, registrations: Number(item.confirmedRegistrationCount ?? 0) })),
        ...(term ? { activeTerm: { name: String(term.name), startAt: term.startAt as Date, endAt: term.endAt as Date } } : {}),
        history: history.map((item) => ({ action: String(item.action),
          ...(typeof item.reason === "string" ? { reason: item.reason } : {}),
          ...(item.actorId ? { actorName: actorName.get(String(item.actorId)) ?? String(item.actorId) } : {}),
          at: item.at as Date })) };
    },
    async suspend(clubId, input, actorId, now) {
      return mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(clubId);
        const suspension = { reason: input.reason, suspendedAt: now, suspendedBy: new Types.ObjectId(actorId),
          until: input.until };
        const changed = await m.clubs!.updateOne({ _id: id, state: "Active" },
          { $set: { state: "Suspended", suspension, updatedAt: now } }, { session });
        if (changed.modifiedCount !== 1) return conflict("only an active club can be suspended");
        // Open recruitment stays open (decision 2026-10-10): applying is blocked while suspended instead.
        const result = await cascade(session, id, { state: { $in: scheduledEventStates }, startAt: { $gt: now } },
          { state: "Approved", startAt: { $gt: now } }, "SUSPENSION", input.reason, now);
        const correlationId = randomUUID();
        await audit(session, id, "CLUB_SUSPENDED", actorId, { state: "Active" },
          { state: "Suspended", until: input.until, ...result }, input.reason, now, correlationId);
        await notify(session, await memberIds(id, session), "CLUB_SUSPENDED", "Club", id,
          { reason: input.reason, until: input.until }, now);
        return result;
      });
    },
    async reactivate(clubId, reason, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(clubId);
        const changed = await m.clubs!.updateOne({ _id: id, state: "Suspended" },
          { $set: { state: "Active", updatedAt: now }, $unset: { suspension: "" } }, { session });
        if (changed.modifiedCount !== 1) return conflict("only a suspended club can be reactivated");
        await audit(session, id, "CLUB_REACTIVATED", actorId, { state: "Suspended" }, { state: "Active" },
          reason, now, randomUUID());
        await notify(session, await memberIds(id, session), "CLUB_REACTIVATED", "Club", id,
          { reason, automatic: actorId === null }, now);
      });
    },
    async decideDissolution(clubId, decision, now) {
      return mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(clubId);
        const changed = await m.clubs!.updateOne({ _id: id, state: { $in: ["Active", "Suspended"] },
          dissolution: { $exists: false } }, { $set: { updatedAt: now, dissolution: { ...decision,
          decidedBy: new Types.ObjectId(decision.decidedBy) } } }, { session });
        if (changed.modifiedCount !== 1) return conflict("this club cannot be scheduled for dissolution");
        // BR45: nothing of this club may end after its Dissolving semester.
        const result = await cascade(session, id, { state: { $in: liveEventStates }, endAt: { $gt: decision.effectiveTo } },
          { state: { $in: [...undecidedBookingStates, "Approved"] }, endAt: { $gt: decision.effectiveTo } },
          "DISSOLUTION", decision.reason, now);
        await audit(session, id, "CLUB_DISSOLUTION_DECIDED", decision.decidedBy, null,
          { effectiveSemester: decision.effectiveSemester, effectiveFrom: decision.effectiveFrom,
            effectiveTo: decision.effectiveTo, ...result }, decision.reason, now, randomUUID());
        await notify(session, await memberIds(id, session), "CLUB_DISSOLUTION_DECIDED", "Club", id,
          { reason: decision.reason, effectiveSemester: decision.effectiveSemester }, now);
        return result;
      });
    },
    suspensionsDueForReminder(now) {
      return summaries({ state: "Suspended", "suspension.until": { $ne: null, $lte: new Date(now.getTime() + SUSPENSION_REMINDER_MS), $gt: now },
        "suspension.reminderSentAt": { $exists: false } });
    },
    async markReminded(clubId, officerIds, now) {
      await mongoose.connection.transaction(async (session) => {
        const id = new Types.ObjectId(clubId);
        const club = await m.clubs!.findOneAndUpdate({ _id: id, state: "Suspended",
          "suspension.reminderSentAt": { $exists: false } }, { $set: { "suspension.reminderSentAt": now } },
        { session }).lean();
        if (!club) return; // another run already reminded
        await notify(session, officerIds, "CLUB_SUSPENSION_ENDING", "Club", id,
          { clubName: club.name, until: (club.suspension as Doc | undefined)?.until }, now);
      });
    },
    expiredSuspensions(now) {
      return summaries({ state: "Suspended", "suspension.until": { $ne: null, $lte: now } });
    },
    async startDissolving(now) {
      const due = await m.clubs!.find({ state: { $in: ["Active", "Suspended"] },
        "dissolution.effectiveFrom": { $lte: now } }).select("_id state").lean();
      const started: string[] = [];
      for (const club of due) {
        await mongoose.connection.transaction(async (session) => {
          const changed = await m.clubs!.updateOne({ _id: club._id, state: club.state },
            { $set: { state: "Dissolving", updatedAt: now }, $unset: { suspension: "" } }, { session });
          if (changed.modifiedCount !== 1) return;
          await audit(session, club._id as Types.ObjectId, "CLUB_DISSOLVING", null, { state: club.state },
            { state: "Dissolving" }, undefined, now, randomUUID());
          await notify(session, await memberIds(club._id as Types.ObjectId, session), "CLUB_DISSOLVING", "Club",
            club._id as Types.ObjectId, {}, now);
          started.push(String(club._id));
        });
      }
      return started;
    },
    async completeDissolutions(now) {
      const due = await m.clubs!.find({ state: "Dissolving", "dissolution.effectiveTo": { $lte: now } })
        .select("_id").lean();
      const finished: string[] = [];
      for (const club of due) {
        await mongoose.connection.transaction(async (session) => {
          const id = club._id as Types.ObjectId;
          const changed = await m.clubs!.updateOne({ _id: id, state: "Dissolving" },
            { $set: { state: "Dissolved", updatedAt: now } }, { session });
          if (changed.modifiedCount !== 1) return;
          // FR-10: close what is still open and revoke management rights.
          const members = await memberIds(id, session);
          const [terms, assignments, bookings, campaigns] = await Promise.all([
            m.clubTerms!.updateMany({ clubId: id, state: { $in: ["Active", "Planned"] } },
              { $set: { state: "Closed" } }, { session }),
            m.clubPositionAssignments!.updateMany({ clubId: id, effectiveTo: null },
              { $set: { effectiveTo: now } }, { session }),
            m.propertyBookings!.updateMany({ clubId: id, state: { $in: undecidedBookingStates } },
              { $set: { state: "Cancelled", cancelReason: "Club dissolved", cancelledAt: now, releasedBy: "DISSOLUTION" } },
              { session }),
            m.recruitmentCampaigns!.updateMany({ clubId: id, state: { $in: [...openCampaignStates, "Draft"] } },
              { $set: { state: "Cancelled" } }, { session }),
          ]);
          await audit(session, id, "CLUB_DISSOLVED", null, { state: "Dissolving" }, { state: "Dissolved",
            closedTerms: terms.modifiedCount, endedAssignments: assignments.modifiedCount,
            cancelledBookings: bookings.modifiedCount, cancelledCampaigns: campaigns.modifiedCount }, undefined, now, randomUUID());
          await notify(session, members, "CLUB_DISSOLVED", "Club", id, {}, now);
          finished.push(String(id));
        });
      }
      return finished;
    },
    async officerIds() {
      const role = await m.roles!.findOne({ code: "ICPDP_OFFICER", scope: "system" }).select("_id").lean();
      if (!role) return [];
      const ids = await m.userRoleAssignments!.find({ roleId: role._id, revokedAt: null }).distinct("userId");
      return ids.map(String);
    },
  };
}
