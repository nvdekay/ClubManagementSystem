import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import type {
  EventRegistration,
  EventRegistrationFormField,
  EventRegistrationRepository,
  EventRegistrationState,
} from "../../domain/event-registration.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

function date(value: unknown): Date {
  if (!(value instanceof Date)) throw new Error("invalid event registration date in database");
  return value;
}

function answers(value: unknown): Record<string, string | string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string | string[]] =>
    typeof entry[1] === "string" || (Array.isArray(entry[1])
      && entry[1].every((item) => typeof item === "string"))));
}

function formFields(value: unknown): EventRegistrationFormField[] {
  if (!Array.isArray(value)) return [];
  const types = new Set(["text", "textarea", "select", "radio", "checkbox"]);
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const field = item as Doc;
    if (typeof field.key !== "string" || typeof field.label !== "string"
      || typeof field.type !== "string" || !types.has(field.type)) return [];
    return [{ key: field.key, label: field.label,
      type: field.type as EventRegistrationFormField["type"], required: field.required === true,
      ...(Array.isArray(field.options) ? { options: field.options.filter((option): option is string =>
        typeof option === "string") } : {}) }];
  });
}

export function mongoEventRegistrationRepository(): EventRegistrationRepository {
  const events = ucmsModels.events!;
  const proposals = ucmsModels.eventProposalVersions!;
  const registrations = ucmsModels.eventRegistrations!;
  const memberships = ucmsModels.clubMemberships!;
  const notifications = ucmsModels.notifications!;
  const audits = ucmsModels.auditLogs!;

  async function mapRegistration(registration: Doc,
    session?: ClientSession): Promise<EventRegistration | null> {
    const event = await events.findById(registration.eventId).session(session ?? null).lean();
    if (!event) return null;
    return { id: String(registration._id), eventId: String(registration.eventId),
      studentId: String(registration.studentId), clubId: String(registration.clubId),
      clubName: String(event.clubName ?? ""), eventTitle: String(event.title),
      eventStartAt: date(event.startAt), eventEndAt: date(event.endAt),
      state: registration.state as EventRegistrationState,
      ...(typeof registration.waitlistPosition === "number"
        ? { waitlistPosition: registration.waitlistPosition } : {}),
      answers: answers(registration.answers), createdAt: date(registration.createdAt),
      ...(registration.cancelledAt instanceof Date ? { cancelledAt: registration.cancelledAt } : {}) };
  }

  async function owned(registrationId: Types.ObjectId, studentId: Types.ObjectId,
    session?: ClientSession): Promise<EventRegistration | null> {
    const registration = await registrations.findOne({ _id: registrationId, studentId })
      .session(session ?? null).lean();
    return registration ? mapRegistration(registration, session) : null;
  }

  return {
    async context(eventId, studentId) {
      const eventObjectId = new Types.ObjectId(eventId);
      const studentObjectId = new Types.ObjectId(studentId);
      const event = await events.findById(eventObjectId).lean();
      if (!event || !event.clubId) return null;
      const [proposal, membership, registration] = await Promise.all([
        proposals.findOne({ eventId: eventObjectId, revisionNo: event.currentRevisionNo })
          .select({ payload: 1 }).lean(),
        memberships.findOne({ clubId: event.clubId, userId: studentObjectId, state: "Active" })
          .select({ _id: 1 }).lean(),
        registrations.findOne({ eventId: eventObjectId, studentId: studentObjectId }).lean(),
      ]);
      const payload = proposal?.payload && typeof proposal.payload === "object"
        ? proposal.payload as Doc : {};
      return { event: { id: String(event._id), clubId: String(event.clubId),
        clubName: String(event.clubName ?? ""), title: String(event.title), state: String(event.state),
        audienceScope: String(event.audienceScope), startAt: date(event.startAt), endAt: date(event.endAt),
        ...(event.registrationOpenAt instanceof Date ? { registrationOpenAt: event.registrationOpenAt } : {}),
        ...(event.registrationCloseAt instanceof Date ? { registrationCloseAt: event.registrationCloseAt } : {}),
        capacity: Number(event.capacity),
        confirmedRegistrationCount: Number(event.confirmedRegistrationCount ?? 0),
        waitlistEnabled: event.waitlistEnabled === true },
      formSchema: formFields(payload.registrationForm), isActiveClubMember: Boolean(membership),
      registration: registration ? await mapRegistration(registration) : null };
    },

    async listMine(studentId) {
      const docs = await registrations.find({ studentId: new Types.ObjectId(studentId) })
        .sort({ createdAt: -1, _id: -1 }).lean();
      return (await Promise.all(docs.map((doc) => mapRegistration(doc))))
        .filter((item): item is EventRegistration => Boolean(item));
    },

    async findOwned(registrationId, studentId) {
      return owned(new Types.ObjectId(registrationId), new Types.ObjectId(studentId));
    },

    async register(input) {
      const eventId = new Types.ObjectId(input.eventId);
      const studentId = new Types.ObjectId(input.studentId);
      let registrationId: Types.ObjectId | undefined;
      try {
        await mongoose.connection.transaction(async (session) => {
          const current = await registrations.findOne({ eventId, studentId }).session(session).lean();
          if (current && current.state !== "Cancelled") return conflict("student is already registered for this event");
          const openFilter = { _id: eventId, clubId: { $exists: true, $ne: null }, state: "Upcoming",
            publishedAt: { $exists: true, $ne: null }, registrationOpenAt: { $lte: input.now },
            registrationCloseAt: { $gt: input.now }, startAt: { $gt: input.now } };
          const confirmedEvent = await events.findOneAndUpdate({ ...openFilter,
            ...(input.allowOverbooking ? {} : { $expr: { $lt: [
              { $ifNull: ["$confirmedRegistrationCount", 0] }, "$capacity",
            ] } }) }, { $inc: { confirmedRegistrationCount: 1 } }, { session, new: true }).lean();
          let state: EventRegistrationState = "Confirmed";
          let waitlistPosition: number | undefined;
          let event = confirmedEvent;
          if (!confirmedEvent) {
            const waitlistEvent = await events.findOneAndUpdate(openFilter,
              { $inc: { nextWaitlistPosition: 1 } }, { session, new: false }).lean();
            if (!waitlistEvent) return conflict("event registration is no longer open");
            if (waitlistEvent.waitlistEnabled !== true) return conflict("event capacity has been reached");
            state = "Waitlisted";
            waitlistPosition = Number(waitlistEvent.nextWaitlistPosition ?? 1);
            event = waitlistEvent;
          }
          const update = { eventId, studentId, clubId: event!.clubId, state,
            ...(waitlistPosition !== undefined ? { waitlistPosition } : {}),
            answers: input.answers, createdAt: input.now };
          if (current) {
            const changed = await registrations.updateOne({ _id: current._id, state: "Cancelled" }, {
              $set: update, $unset: { cancelledAt: "", promotedAt: "",
                ...(waitlistPosition === undefined ? { waitlistPosition: "" } : {}) },
            }, { session });
            if (changed.modifiedCount !== 1) return conflict("event registration changed before submission");
            registrationId = current._id as Types.ObjectId;
          } else {
            const created = await registrations.create([update], { session });
            registrationId = created[0]!._id as Types.ObjectId;
          }
          const correlationId = randomUUID();
          await audits.create([{ entityType: "EventRegistration", entityId: registrationId,
            action: `EVENT_REGISTRATION_${state.toUpperCase()}`, actorId: studentId,
            actorRole: "STUDENT", after: { eventId: input.eventId, state, waitlistPosition },
            correlationId, at: input.now }], { session });
          await notifications.create([{ recipientUserId: studentId,
            eventCode: state === "Confirmed" ? "EVENT_REGISTRATION_CONFIRMED" : "EVENT_REGISTRATION_WAITLISTED",
            entityType: "EventRegistration", entityId: registrationId, channels: ["IN_APP"],
            payload: { eventId: input.eventId, state, waitlistPosition }, state: "Queued",
            dueAt: input.now, attempts: 0, createdAt: input.now }], { session });
        });
      } catch (error) {
        if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
          throw new DomainError("student is already registered for this event", "conflict");
        }
        throw error;
      }
      if (!registrationId) return conflict("event registration was not created");
      const result = await owned(registrationId, studentId);
      if (!result) throw new DomainError("event registration not found after submission", "not_found");
      return result;
    },

    async cancel(registrationId, studentId, now) {
      const id = new Types.ObjectId(registrationId);
      const userId = new Types.ObjectId(studentId);
      await mongoose.connection.transaction(async (session) => {
        const registration = await registrations.findOne({ _id: id, studentId: userId,
          state: { $in: ["Confirmed", "Waitlisted"] } }).session(session).lean();
        if (!registration) return conflict("event registration cannot be cancelled");
        const event = await events.findOne({ _id: registration.eventId, startAt: { $gt: now } })
          .session(session).lean();
        if (!event) return conflict("event has already started");
        const changed = await registrations.updateOne({ _id: id, state: registration.state },
          { $set: { state: "Cancelled", cancelledAt: now }, $unset: { waitlistPosition: "" } }, { session });
        if (changed.modifiedCount !== 1) return conflict("event registration changed before cancellation");
        if (registration.state === "Confirmed") {
          const released = await events.updateOne({ _id: event._id,
            confirmedRegistrationCount: { $gt: 0 } }, { $inc: { confirmedRegistrationCount: -1 } }, { session });
          if (released.modifiedCount !== 1) return conflict("event capacity counter is inconsistent");
        }
        const correlationId = randomUUID();
        await audits.create([{ entityType: "EventRegistration", entityId: id,
          action: "EVENT_REGISTRATION_CANCELLED", actorId: userId, actorRole: "STUDENT",
          before: { state: registration.state }, after: { state: "Cancelled" },
          correlationId, at: now }], { session });
        await notifications.create([{ recipientUserId: userId,
          eventCode: "EVENT_REGISTRATION_CANCELLED", entityType: "EventRegistration", entityId: id,
          channels: ["IN_APP"], payload: { eventId: String(registration.eventId) }, state: "Queued",
          dueAt: now, attempts: 0, createdAt: now }], { session });
      });
      const result = await owned(id, userId);
      if (!result) throw new DomainError("event registration not found after cancellation", "not_found");
      return result;
    },
  };
}
