import { randomInt, randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  checkInCode, SCHOOL_ORGANIZER_NAME,
  type EventInvitation, type InvitationCounts, type InvitationOutcome, type InvitationStatus, type NormalizedInvitation,
  type ScheduleConflict, type SchoolEventDetail, type SchoolEventRepository, type SchoolEventSummary,
} from "../../domain/school-event.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const busyEventStates = ["Approved", "Upcoming", "Ongoing"];
const busyBookingStates = ["Approved", "In Use"];

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function counts(invitations: { status: InvitationStatus }[]): InvitationCounts {
  function of(status: InvitationStatus): number {
    return invitations.filter((item) => item.status === status).length;
  }
  return { invited: invitations.length, pending: of("Pending"), accepted: of("Accepted"), declined: of("Declined"),
    expired: of("Expired"), withdrawn: of("Withdrawn") };
}

function invitationFrom(doc: Doc): EventInvitation {
  return { id: String(doc._id), clubId: String(doc.clubId), clubName: String(doc.clubName),
    status: doc.status as InvitationStatus, deadline: doc.deadline as Date, invitedAt: doc.invitedAt as Date,
    ...(doc.respondedAt instanceof Date ? { respondedAt: doc.respondedAt } : {}),
    ...(optionalText(doc.responseNote) ? { responseNote: String(doc.responseNote) } : {}),
    ...(doc.responseDetails !== undefined && doc.responseDetails !== null ? { responseDetails: doc.responseDetails } : {}) };
}

export function mongoSchoolEventRepository(): SchoolEventRepository {
  const m = ucmsModels;
  const events = m.events!;
  const invitations = m.eventInvitations!;

  async function summaries(docs: Doc[]): Promise<SchoolEventSummary[]> {
    const ids = docs.map((doc) => doc._id);
    const [invitationDocs, properties] = await Promise.all([
      invitations.find({ eventId: { $in: ids } }).select({ eventId: 1, status: 1 }).lean(),
      m.properties!.find({ _id: { $in: docs.map((doc) => doc.propertyId).filter(Boolean) } }).select({ code: 1, name: 1 }).lean(),
    ]);
    const propertyById = new Map(properties.map((item) => [String(item._id), item]));
    return docs.map((doc) => {
      const property = doc.propertyId ? propertyById.get(String(doc.propertyId)) : undefined;
      return {
        id: String(doc._id), title: String(doc.title), startAt: doc.startAt as Date, endAt: doc.endAt as Date,
        ...(optionalText(doc.venueText) ? { venueText: String(doc.venueText) } : {}),
        ...(property ? { property: { id: String(property._id), code: String(property.code), name: String(property.name) } } : {}),
        capacity: Number(doc.capacity ?? 0), state: String(doc.state), semesterCode: String(doc.semesterCode ?? ""),
        ...(doc.publishedAt instanceof Date ? { publishedAt: doc.publishedAt } : {}),
        confirmedRegistrationCount: Number(doc.confirmedRegistrationCount ?? 0),
        counts: counts(invitationDocs.filter((item) => String(item.eventId) === String(doc._id))
          .map((item) => ({ status: item.status as InvitationStatus }))),
      };
    });
  }

  async function detail(id: Types.ObjectId): Promise<SchoolEventDetail | null> {
    const doc = await events.findOne({ _id: id, organizerType: "ICPDP" }).lean();
    if (!doc) return null;
    const [[summary], invitationDocs, version] = await Promise.all([
      summaries([doc]),
      invitations.find({ eventId: id }).sort({ clubName: 1 }).collation({ locale: "vi" }).lean(),
      m.eventProposalVersions!.findOne({ eventId: id }).sort({ revisionNo: -1 }).select({ payload: 1 }).lean(),
    ]);
    const payload = (version?.payload ?? {}) as Doc;
    const conflictDetail = Array.isArray(doc.conflictDetail) ? doc.conflictDetail as Doc[] : [];
    return {
      ...summary!, ...(optionalText(doc.objective) ? { objective: String(doc.objective) } : {}),
      ...(optionalText(payload.plan) ? { coordination: String(payload.plan) } : {}),
      conflictResult: doc.conflictResult === "Warning" ? "Warning" : "No Conflict",
      conflicts: conflictDetail.map((item) => ({ kind: item.kind === "booking" ? "booking" as const : "event" as const,
        title: String(item.title ?? ""), startAt: new Date(String(item.startAt)), endAt: new Date(String(item.endAt)) })),
      ...(optionalText(doc.checkInCode) ? { checkInCode: String(doc.checkInCode) } : {}),
      ...(doc.registrationCloseAt instanceof Date ? { registrationCloseAt: doc.registrationCloseAt } : {}),
      invitations: invitationDocs.map(invitationFrom),
    };
  }

  async function audit(session: ClientSession, id: Types.ObjectId, action: string, officerId: string, after: unknown,
    now: Date): Promise<void> {
    await m.auditLogs!.create([{ entityType: "Event", entityId: id, action, actorId: new Types.ObjectId(officerId),
      actorRole: "ICPDP_OFFICER", after, correlationId: randomUUID(), at: now }], { session });
  }

  async function conflicts(propertyId: string | undefined, startAt: Date, endAt: Date, excludeEventId?: string,
    session?: ClientSession): Promise<ScheduleConflict[]> {
    if (!propertyId) return [];
    const property = new Types.ObjectId(propertyId);
    const overlap = { startAt: { $lt: endAt }, endAt: { $gt: startAt } };
    const [eventDocs, bookingDocs] = await Promise.all([
      events.find({ propertyId: property, state: { $in: busyEventStates }, ...overlap,
        ...(excludeEventId ? { _id: { $ne: new Types.ObjectId(excludeEventId) } } : {}) })
        .select({ title: 1, startAt: 1, endAt: 1 }).session(session ?? null).lean(),
      m.propertyBookings!.find({ propertyId: property, state: { $in: busyBookingStates }, ...overlap })
        .select({ purpose: 1, clubName: 1, startAt: 1, endAt: 1 }).session(session ?? null).lean(),
    ]);
    return [
      ...eventDocs.map((item) => ({ kind: "event" as const, title: String(item.title), startAt: item.startAt as Date, endAt: item.endAt as Date })),
      ...bookingDocs.map((item) => ({ kind: "booking" as const, title: `${String(item.clubName)} · ${String(item.purpose)}`,
        startAt: item.startAt as Date, endAt: item.endAt as Date })),
    ].sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  }

  /** Creates or re-opens invitations for Active clubs and tells each club board, inside the caller's transaction. */
  async function sendInvitations(session: ClientSession, event: Doc, invitation: NormalizedInvitation, officerId: string,
    now: Date): Promise<InvitationOutcome> {
    const requested = invitation.clubIds.map((id) => new Types.ObjectId(id));
    const clubDocs = await m.clubs!.find(invitation.allActiveClubs
      ? { $or: [{ state: "Active" }, { _id: { $in: requested } }] } : { _id: { $in: requested } })
      .select({ name: 1, state: 1 }).session(session).lean();
    const existing = new Map((await invitations.find({ eventId: event._id }).session(session).lean())
      .map((item) => [String(item.clubId), item]));
    const outcome: InvitationOutcome = { invited: [], skipped: [] };
    const missing = invitation.clubIds.filter((id) => !clubDocs.some((club) => String(club._id) === id));
    outcome.skipped.push(...missing.map((clubId) => ({ clubId, reason: "notActive" as const })));
    for (const club of clubDocs) {
      const clubId = String(club._id);
      if (club.state !== "Active") { outcome.skipped.push({ clubId, reason: "notActive" }); continue; }
      const current = existing.get(clubId);
      if (current && !["Withdrawn", "Expired"].includes(String(current.status))) {
        outcome.skipped.push({ clubId, reason: "alreadyInvited" });
        continue;
      }
      if (current) {
        await invitations.updateOne({ _id: current._id }, { $set: { status: "Pending", deadline: invitation.deadline,
          invitedAt: now, invitedBy: new Types.ObjectId(officerId), clubName: club.name, updatedAt: now },
        $unset: { respondedAt: "", respondedBy: "", responseNote: "", responseDetails: "" } }, { session });
      } else {
        await invitations.create([{ eventId: event._id, clubId: club._id, clubName: club.name, status: "Pending",
          deadline: invitation.deadline, invitedAt: now, invitedBy: new Types.ObjectId(officerId), createdAt: now,
          updatedAt: now }], { session });
      }
      outcome.invited.push(clubId);
      await queueNotifications(session, await clubBoardUserIds(club._id as Types.ObjectId, session),
        "SCHOOL_EVENT_INVITATION", "Event", event._id as Types.ObjectId,
        { title: event.title, startAt: event.startAt, deadline: invitation.deadline }, now);
    }
    if (outcome.invited.length) {
      await audit(session, event._id as Types.ObjectId, "SCHOOL_EVENT_CLUBS_INVITED", officerId,
        { clubIds: outcome.invited, deadline: invitation.deadline }, now);
    }
    return outcome;
  }

  return {
    async list() {
      return summaries(await events.find({ organizerType: "ICPDP" }).sort({ startAt: -1, _id: -1 }).lean());
    },

    async find(id) {
      return detail(new Types.ObjectId(id));
    },

    async conflicts(propertyId, startAt, endAt, excludeEventId) {
      return conflicts(propertyId, startAt, endAt, excludeEventId);
    },

    async create(input, officerId, now) {
      const id = new Types.ObjectId();
      let outcome: InvitationOutcome = { invited: [], skipped: [] };
      await mongoose.connection.transaction(async (session) => {
        if (input.propertyId && !(await m.properties!.exists({ _id: new Types.ObjectId(input.propertyId), isActive: true })
          .session(session))) {
          throw new DomainError("the room is not in the active catalogue", "validation", { field: "propertyId" });
        }
        const found = await conflicts(input.propertyId, input.startAt, input.endAt, undefined, session);
        const event = { _id: id, organizerType: "ICPDP", clubName: SCHOOL_ORGANIZER_NAME, title: input.title,
          objective: input.objective, startAt: input.startAt, endAt: input.endAt, semesterCode: input.semesterCode,
          ...(input.venueText ? { venueText: input.venueText } : {}),
          ...(input.propertyId ? { propertyId: new Types.ObjectId(input.propertyId) } : {}),
          audienceScope: "PUBLIC", capacity: input.capacity, confirmedRegistrationCount: 0, nextWaitlistPosition: 1,
          waitlistEnabled: true, state: "Approved", conflictResult: found.length ? "Warning" : "No Conflict",
          conflictDetail: found.map((item) => ({ ...item, startAt: item.startAt.toISOString(), endAt: item.endAt.toISOString() })),
          allowWalkIn: true, currentRevisionNo: 1, attendanceFinalized: false, createdAt: now };
        await events.create([event], { session });
        await m.eventProposalVersions!.create([{ eventId: id, revisionNo: 1, submittedBy: new Types.ObjectId(officerId),
          submittedAt: now, conflictResult: event.conflictResult, payload: { title: input.title, objective: input.objective,
            plan: input.coordination, startAt: input.startAt, endAt: input.endAt, venueText: input.venueText,
            propertyId: input.propertyId, capacity: input.capacity, audienceScope: "PUBLIC" } }], { session });
        await audit(session, id, "SCHOOL_EVENT_CREATED", officerId, { state: "Approved", conflictResult: event.conflictResult }, now);
        if (input.invitation.clubIds.length || input.invitation.allActiveClubs) {
          outcome = await sendInvitations(session, event, input.invitation, officerId, now);
        }
      });
      return { detail: (await detail(id))!, outcome };
    },

    async invite(id, invitation, officerId, now) {
      const eventId = new Types.ObjectId(id);
      let outcome: InvitationOutcome = { invited: [], skipped: [] };
      await mongoose.connection.transaction(async (session) => {
        const event = await events.findOne({ _id: eventId, organizerType: "ICPDP", state: { $in: ["Approved", "Upcoming"] } })
          .session(session).lean();
        if (!event) throw new DomainError("clubs can only be invited before the event takes place", "conflict");
        outcome = await sendInvitations(session, event, invitation, officerId, now);
      });
      return { detail: (await detail(eventId))!, outcome };
    },

    async withdraw(id, invitationId, officerId, now) {
      const eventId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        const invitation = await invitations.findOneAndUpdate({ _id: new Types.ObjectId(invitationId), eventId,
          status: "Pending", deadline: { $gt: now } }, { $set: { status: "Withdrawn", updatedAt: now } },
        { session, new: true }).lean();
        if (!invitation) throw new DomainError("only a pending invitation before its deadline can be withdrawn", "conflict");
        const event = await events.findById(eventId).select({ title: 1 }).session(session).lean();
        await audit(session, eventId, "SCHOOL_EVENT_INVITATION_WITHDRAWN", officerId, { clubId: invitation.clubId }, now);
        await queueNotifications(session, await clubBoardUserIds(invitation.clubId as Types.ObjectId, session),
          "SCHOOL_EVENT_INVITATION_WITHDRAWN", "Event", eventId, { title: event?.title }, now);
      });
      return (await detail(eventId))!;
    },

    async publish(id, officerId, now) {
      const eventId = new Types.ObjectId(id);
      await mongoose.connection.transaction(async (session) => {
        const event = await events.findOne({ _id: eventId, organizerType: "ICPDP", state: "Approved", startAt: { $gt: now } })
          .session(session).lean();
        if (!event) throw new DomainError("only an unpublished school event that has not started can be published", "conflict");
        const code = checkInCode(() => randomInt(0, 1_000_000) / 1_000_000);
        await events.updateOne({ _id: eventId, state: "Approved" }, { $set: { state: "Upcoming", publishedAt: now,
          registrationOpenAt: now, registrationCloseAt: event.startAt, checkInCode: code } }, { session });
        await audit(session, eventId, "SCHOOL_EVENT_PUBLISHED", officerId, { state: "Upcoming" }, now);
      });
      return (await detail(eventId))!;
    },

    async expireInvitations(now) {
      const result = await invitations.updateMany({ status: "Pending", deadline: { $lte: now } },
        { $set: { status: "Expired", updatedAt: now } });
      return result.modifiedCount;
    },
  };
}
