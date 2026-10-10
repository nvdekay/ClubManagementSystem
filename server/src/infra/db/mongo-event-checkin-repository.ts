import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import type { Attendance, AttendanceMethod, EventCheckInRepository } from "../../domain/event-checkin.js";
import { checkInStates } from "../../domain/event-checkin.js";
import type { EventRegistrationState } from "../../domain/event-registration.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;

function date(value: unknown): Date {
  if (!(value instanceof Date)) throw new Error("invalid attendance date in database");
  return value;
}

function optionalDate(value: unknown): Date | undefined {
  return value instanceof Date ? value : undefined;
}

export function mongoEventCheckInRepository(): EventCheckInRepository {
  const events = ucmsModels.events!;
  const registrations = ucmsModels.eventRegistrations!;
  const attendances = ucmsModels.attendances!;
  const memberships = ucmsModels.clubMemberships!;
  const notifications = ucmsModels.notifications!;
  const audits = ucmsModels.auditLogs!;

  function map(attendance: Doc, event: Doc): Attendance {
    return { id: String(attendance._id), eventId: String(attendance.eventId),
      eventTitle: String(event.title), ...(attendance.clubId ? { clubId: String(attendance.clubId) } : {}),
      clubName: String(event.clubName ?? ""), eventStartAt: date(event.startAt),
      eventEndAt: date(event.endAt), checkedInAt: date(attendance.checkedInAt),
      method: attendance.method as AttendanceMethod,
      abnormalFlags: Array.isArray(attendance.abnormalFlags)
        ? attendance.abnormalFlags.filter((flag): flag is string => typeof flag === "string") : [] };
  }

  async function existing(eventId: Types.ObjectId, studentId: Types.ObjectId,
    session?: ClientSession): Promise<Attendance | null> {
    const attendance = await attendances.findOne({ eventId, studentId }).session(session ?? null).lean();
    if (!attendance) return null;
    const event = await events.findById(eventId).session(session ?? null).lean();
    return event ? map(attendance, event) : null;
  }

  return {
    async target(eventId, studentId) {
      const eventObjectId = new Types.ObjectId(eventId);
      const studentObjectId = new Types.ObjectId(studentId);
      const event = await events.findById(eventObjectId).lean();
      if (!event) return null;
      const [registration, membership, attendance] = await Promise.all([
        registrations.findOne({ eventId: eventObjectId, studentId: studentObjectId }).select({ state: 1 }).lean(),
        event.clubId ? memberships.findOne({ clubId: event.clubId, userId: studentObjectId, state: "Active" })
          .select({ _id: 1 }).lean() : null,
        existing(eventObjectId, studentObjectId),
      ]);
      return { event: { id: String(event._id), ...(event.clubId ? { clubId: String(event.clubId) } : {}), title: String(event.title),
        state: String(event.state), audienceScope: String(event.audienceScope),
        published: event.publishedAt instanceof Date, startAt: date(event.startAt), endAt: date(event.endAt),
        ...(typeof event.checkInCode === "string" && event.checkInCode ? { checkInCode: event.checkInCode } : {}),
        ...(optionalDate(event.checkInOpenAt) ? { checkInOpenAt: optionalDate(event.checkInOpenAt) } : {}),
        ...(optionalDate(event.checkInCloseAt) ? { checkInCloseAt: optionalDate(event.checkInCloseAt) } : {}),
        allowWalkIn: event.allowWalkIn === true },
      registrationState: (registration?.state as EventRegistrationState | undefined) ?? null,
      isActiveClubMember: Boolean(membership), attendance };
    },

    async checkIn(input) {
      const eventId = new Types.ObjectId(input.eventId);
      const studentId = new Types.ObjectId(input.studentId);
      let created = false;
      try {
        await mongoose.connection.transaction(async (session) => {
          created = false;
          if (await attendances.exists({ eventId, studentId }).session(session)) return;
          // Re-check the event inside the transaction so a concurrent cancellation is not missed.
          const event = await events.findOne({ _id: eventId,
            state: { $in: [...checkInStates] }, publishedAt: { $exists: true, $ne: null } })
            .session(session).lean();
          if (!event) throw new DomainError("event is not open for check-in", "conflict");
          const registration = await registrations.findOne({ eventId, studentId }).session(session).lean();
          let registrationId = registration?._id as Types.ObjectId | undefined;
          if (input.method === "self") {
            if (registration?.state !== "Confirmed") {
              throw new DomainError("a confirmed registration is required to check in", "forbidden");
            }
          } else if (registration?.state !== "Confirmed") {
            // UC31 A2: a walk-in gets a confirmed registration alongside the attendance.
            if (registration) {
              const changed = await registrations.updateOne({ _id: registration._id, state: registration.state },
                { $set: { state: "Confirmed", promotedAt: input.now }, $unset: { waitlistPosition: "", cancelledAt: "" } },
                { session });
              if (changed.modifiedCount !== 1) throw new DomainError("registration changed during check-in", "conflict");
            } else {
              const [doc] = await registrations.create([{ eventId, studentId, ...(event.clubId ? { clubId: event.clubId } : {}),
                state: "Confirmed", answers: {}, createdAt: input.now }], { session });
              registrationId = doc!._id as Types.ObjectId;
            }
            await events.updateOne({ _id: eventId }, { $inc: { confirmedRegistrationCount: 1 } }, { session });
          }
          const [attendance] = await attendances.create([{ eventId, studentId, registrationId,
            ...(event.clubId ? { clubId: event.clubId } : {}), checkedInAt: input.now, method: input.method,
            abnormalFlags: input.method === "walk-in" ? ["walk-in"] : [], finalized: false }], { session });
          const correlationId = randomUUID();
          await audits.create([{ entityType: "Attendance", entityId: attendance!._id,
            action: input.method === "walk-in" ? "EVENT_CHECK_IN_WALK_IN" : "EVENT_CHECK_IN",
            actorId: studentId, actorRole: "STUDENT",
            after: { eventId: input.eventId, method: input.method, checkedInAt: input.now },
            correlationId, at: input.now }], { session });
          await notifications.create([{ recipientUserId: studentId, eventCode: "EVENT_CHECKED_IN",
            entityType: "Attendance", entityId: attendance!._id, channels: ["IN_APP"],
            payload: { eventId: input.eventId, method: input.method }, state: "Queued",
            dueAt: input.now, attempts: 0, createdAt: input.now }], { session });
          created = true;
        });
      } catch (error) {
        // A concurrent check-in won the unique index (BR18): fall through and return its record.
        if (!(error instanceof mongoose.mongo.MongoServerError && error.code === 11000)) throw error;
        created = false;
      }
      const attendance = await existing(eventId, studentId);
      if (!attendance) throw new DomainError("attendance not found after check-in", "not_found");
      return { attendance, created };
    },

    async listMine(studentId) {
      const docs = await attendances.find({ studentId: new Types.ObjectId(studentId) })
        .sort({ checkedInAt: -1, _id: -1 }).lean();
      const eventDocs = await events.find({ _id: { $in: docs.map((doc) => doc.eventId) } }).lean();
      const byId = new Map(eventDocs.map((event) => [String(event._id), event]));
      return docs.flatMap((doc) => {
        const event = byId.get(String(doc.eventId));
        return event ? [map(doc, event)] : [];
      });
    },
  };
}
