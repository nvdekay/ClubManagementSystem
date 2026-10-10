import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import {
  blockingConflicts, outsideBookableHours,
  type BookingConflict, type BookingDecision, type BookingDetail, type BookingReviewRepository, type BookingSummary,
  type BookingTask,
} from "../../domain/booking-review.js";
import { DomainError } from "../../domain/errors.js";
import { clubBoardUserIds, clubObligations, queueNotifications } from "./club-board.js";
import { ucmsModels } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const TASK_TYPE = "PROPERTY_BOOKING";
const reviewableStates = ["Requested", "Under Review"];
const heldStates = ["Approved", "In Use"];
const pendingStates = ["Requested", "Under Review"];
const busyEventStates = ["Approved", "Upcoming", "Ongoing"];

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function conflict(message: string, details?: unknown): never {
  throw new DomainError(message, "conflict", details);
}

function taskFrom(doc: Doc): BookingTask {
  return { id: String(doc._id), bookingId: String(doc.entityId), state: doc.state as BookingTask["state"],
    ...(doc.assigneeId ? { assigneeId: String(doc.assigneeId) } : {}), openedAt: doc.openedAt as Date };
}

function decisionFrom(doc: Doc): BookingDecision {
  const comments = (doc.comments ?? {}) as { alternative?: Doc; versionNo?: number };
  const alternative = comments.alternative;
  return { id: String(doc._id), outcome: doc.outcome as BookingDecision["outcome"], reason: optionalText(doc.reason),
    reviewNote: optionalText(doc.reviewNote),
    ...(alternative ? { alternative: { propertyId: optionalText(alternative.propertyId),
      propertyLabel: optionalText(alternative.propertyLabel), startAt: alternative.startAt as Date | undefined,
      endAt: alternative.endAt as Date | undefined } } : {}),
    ...(comments.versionNo ? { versionNo: Number(comments.versionNo) } : {}),
    actorId: String(doc.actorId), at: doc.at as Date };
}

export function mongoBookingReviewRepository(): BookingReviewRepository {
  const m = ucmsModels;
  const bookings = m.propertyBookings!;
  const tasks = m.approvalTasks!;
  const decisions = m.approvalDecisions!;

  async function summaries(docs: Doc[]): Promise<Map<string, BookingSummary>> {
    const [properties, events] = await Promise.all([
      m.properties!.find({ _id: { $in: docs.map((doc) => doc.propertyId) } }).lean(),
      m.events!.find({ _id: { $in: docs.flatMap((doc) => doc.eventId ? [doc.eventId] : []) } })
        .select({ title: 1, state: 1 }).lean(),
    ]);
    const propertyById = new Map(properties.map((item) => [String(item._id), item]));
    const eventById = new Map(events.map((item) => [String(item._id), item]));
    return new Map(docs.map((doc) => {
      const property = propertyById.get(String(doc.propertyId));
      const event = doc.eventId ? eventById.get(String(doc.eventId)) : undefined;
      return [String(doc._id), {
        id: String(doc._id), clubId: String(doc.clubId), clubName: String(doc.clubName ?? ""),
        property: { id: String(doc.propertyId), code: String(property?.code ?? ""), name: String(property?.name ?? ""),
          type: String(property?.type ?? ""), location: String(property?.location ?? ""),
          ...(typeof property?.capacity === "number" ? { capacity: property.capacity } : {}) },
        purpose: String(doc.purpose ?? ""), startAt: doc.startAt as Date, endAt: doc.endAt as Date,
        semesterCode: String(doc.semesterCode ?? ""),
        ...(typeof doc.headcount === "number" ? { headcount: doc.headcount } : {}),
        state: String(doc.state), currentVersionNo: Number(doc.currentVersionNo ?? 1),
        ...(optionalText(doc.conflictResult) ? { conflictResult: String(doc.conflictResult) } : {}),
        ...(event ? { event: { id: String(event._id), title: String(event.title), state: String(event.state) } } : {}),
      } satisfies BookingSummary];
    }));
  }

  /** BR15 read side: everything else on the same property in the same slot. */
  async function conflictsOf(booking: Doc, session?: ClientSession): Promise<BookingConflict[]> {
    const overlap = { startAt: { $lt: booking.endAt }, endAt: { $gt: booking.startAt } };
    const [others, events] = await Promise.all([
      bookings.find({ _id: { $ne: booking._id }, propertyId: booking.propertyId, state: { $in: [...heldStates, ...pendingStates] },
        ...overlap }).select({ clubName: 1, purpose: 1, startAt: 1, endAt: 1, state: 1 }).session(session ?? null).lean(),
      m.events!.find({ propertyId: booking.propertyId, state: { $in: busyEventStates }, ...overlap,
        ...(booking.eventId ? { _id: { $ne: booking.eventId } } : {}) })
        .select({ title: 1, startAt: 1, endAt: 1, state: 1, organizerType: 1 }).session(session ?? null).lean(),
    ]);
    return [
      ...others.map((item) => ({ kind: "booking" as const, id: String(item._id),
        title: `${String(item.clubName ?? "")} · ${String(item.purpose ?? "")}`, startAt: item.startAt as Date,
        endAt: item.endAt as Date, state: String(item.state), blocking: heldStates.includes(String(item.state)) })),
      // A school event holds the property without a booking; a club event needs its own booking to hold it.
      ...events.map((item) => ({ kind: "event" as const, id: String(item._id), title: String(item.title),
        startAt: item.startAt as Date, endAt: item.endAt as Date, state: String(item.state),
        blocking: item.organizerType === "ICPDP" })),
    ].sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  }

  async function allowOverbooking(now: Date): Promise<boolean> {
    const policy = await m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
      .select({ allowOverbooking: 1 }).lean();
    return policy?.allowOverbooking === true;
  }

  async function detail(id: Types.ObjectId, now: Date): Promise<BookingDetail | null> {
    const [booking, taskDocs] = await Promise.all([
      bookings.findById(id).lean(),
      tasks.find({ entityType: TASK_TYPE, entityId: id }).sort({ openedAt: -1, _id: -1 }).lean(),
    ]);
    const task = taskDocs[0];
    if (!booking || !task) return null;
    const clubId = booking.clubId as Types.ObjectId;
    const [summary, club, property, conflicts, overbooking, decisionDocs, owed] = await Promise.all([
      summaries([booking]),
      m.clubs!.findById(clubId).select({ name: 1, state: 1 }).lean(),
      m.properties!.findById(booking.propertyId).select({ bookableHours: 1, blackouts: 1 }).lean(),
      conflictsOf(booking),
      allowOverbooking(now),
      decisions.find({ approvalTaskId: { $in: taskDocs.map((item) => item._id) } }).sort({ at: -1 }).lean(),
      clubObligations(clubId, now),
    ]);
    return {
      task: taskFrom(task), booking: summary.get(String(id))!,
      club: { id: String(clubId), name: String(club?.name ?? booking.clubName ?? ""), state: String(club?.state ?? ""),
        obligations: owed },
      conflicts, allowOverbooking: overbooking,
      outsideHours: property ? outsideBookableHours({
        bookableHours: Array.isArray(property.bookableHours) ? property.bookableHours as { day: number; open: string; close: string }[] : [],
        blackouts: Array.isArray(property.blackouts) ? property.blackouts as { startAt: Date; endAt: Date }[] : [],
      }, booking.startAt as Date, booking.endAt as Date) : false,
      decisions: decisionDocs.map(decisionFrom),
    };
  }

  async function required(id: Types.ObjectId, now: Date): Promise<BookingDetail> {
    const found = await detail(id, now);
    if (!found) throw new DomainError("booking not found", "not_found");
    return found;
  }

  return {
    async listOpen() {
      const taskDocs = await tasks.find({ entityType: TASK_TYPE, state: "Open" }).sort({ openedAt: 1, _id: 1 }).lean();
      if (!taskDocs.length) return [];
      const docs = await bookings.find({ _id: { $in: taskDocs.map((task) => task.entityId) },
        state: { $in: reviewableStates } }).lean();
      const byId = await summaries(docs);
      return taskDocs.flatMap((task) => {
        const booking = byId.get(String(task.entityId));
        return booking ? [{ task: taskFrom(task), booking }] : [];
      });
    },

    async find(id, now) {
      return detail(new Types.ObjectId(id), now);
    },

    async claim(bookingId, officerId, now) {
      const id = new Types.ObjectId(bookingId);
      const actorId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const task = await tasks.findOne({ entityType: TASK_TYPE, entityId: id, state: "Open" })
          .sort({ openedAt: -1 }).session(session).lean();
        if (!task) return conflict("booking review is no longer open");
        if (task.assigneeId && String(task.assigneeId) !== officerId) {
          return conflict("booking review is assigned to another officer");
        }
        const claimed = await tasks.updateOne({ _id: task._id, state: "Open",
          $or: [{ assigneeId: { $exists: false } }, { assigneeId: null }, { assigneeId: actorId }] },
        { $set: { assigneeId: actorId } }, { session });
        if (claimed.matchedCount !== 1) return conflict("booking review was claimed");
        const changed = await bookings.updateOne({ _id: id, state: "Requested" }, { $set: { state: "Under Review" } }, { session });
        if (changed.matchedCount === 0 && !(await bookings.exists({ _id: id, state: "Under Review" }).session(session))) {
          return conflict("booking cannot be reviewed in its current state");
        }
        if (changed.modifiedCount === 1) {
          await m.auditLogs!.create([{ entityType: "PropertyBooking", entityId: id, action: "PROPERTY_BOOKING_REVIEW_CLAIMED",
            actorId, actorRole: "ICPDP_OFFICER", before: { state: "Requested" }, after: { state: "Under Review" },
            correlationId: randomUUID(), at: now }], { session });
        }
      });
      return required(id, now);
    },

    async decide(bookingId, officerId, input, now) {
      const id = new Types.ObjectId(bookingId);
      const actorId = new Types.ObjectId(officerId);
      const overbooking = await allowOverbooking(now);
      await mongoose.connection.transaction(async (session) => {
        const booking = await bookings.findOne({ _id: id, state: "Under Review" }).session(session).lean();
        const task = await tasks.findOne({ entityType: TASK_TYPE, entityId: id, state: "Open", assigneeId: actorId })
          .sort({ openedAt: -1 }).session(session).lean();
        if (!booking || !task) return conflict("booking cannot be decided");
        if (input.outcome === "Approve") {
          const club = await m.clubs!.findById(booking.clubId).select({ state: 1 }).session(session).lean();
          // BR34: a suspended club gets no new booking.
          if (club?.state !== "Active") return conflict("the club is not active, so the booking cannot be approved");
          // BR33 / E1: re-checked here so two officers cannot approve overlapping slots at once.
          const blocking = blockingConflicts(await conflictsOf(booking, session), overbooking);
          if (blocking.length) {
            return conflict("another approved booking already holds this slot; request a revision instead",
              { conflicts: blocking.map((item) => item.id) });
          }
        }
        let alternative: Record<string, unknown> | undefined;
        if (input.alternative) {
          const property = input.alternative.propertyId
            ? await m.properties!.findOne({ _id: new Types.ObjectId(input.alternative.propertyId), isActive: true })
              .select({ code: 1, name: 1 }).session(session).lean() : null;
          if (input.alternative.propertyId && !property) {
            throw new DomainError("the suggested property is not available", "validation", { field: "alternative" });
          }
          alternative = { ...input.alternative,
            ...(property ? { propertyLabel: `${String(property.code)} · ${String(property.name)}` } : {}) };
        }
        await decisions.create([{ approvalTaskId: task._id, outcome: input.outcome, reason: input.reason,
          reviewNote: input.reviewNote, comments: { versionNo: booking.currentVersionNo ?? 1,
            ...(alternative ? { alternative } : {}) }, actorId, at: now }], { session });
        const nextState = input.outcome === "Approve" ? "Approved" : input.outcome === "Reject" ? "Rejected"
          : "Revision Requested";
        const changed = await bookings.updateOne({ _id: id, state: "Under Review" }, { $set: { state: nextState,
          decidedBy: actorId, decidedAt: now, ...(input.reason ? { decisionReason: input.reason } : {}) },
        ...(!input.reason ? { $unset: { decisionReason: "" } } : {}) }, { session });
        if (changed.modifiedCount !== 1) return conflict("booking changed while deciding");
        await tasks.updateOne({ _id: task._id, state: "Open" }, { $set: { state: "Decided", closedAt: now } }, { session });
        const action = `PROPERTY_BOOKING_${nextState.toUpperCase().replace(" ", "_")}`;
        await m.auditLogs!.create([{ entityType: "PropertyBooking", entityId: id, action, actorId,
          actorRole: "ICPDP_OFFICER", before: { state: "Under Review" },
          after: { state: nextState, versionNo: booking.currentVersionNo ?? 1, ...(alternative ? { alternative } : {}) },
          reason: input.reason, correlationId: randomUUID(), at: now }], { session });
        await queueNotifications(session, await clubBoardUserIds(booking.clubId as Types.ObjectId, session),
          "PROPERTY_BOOKING_STATUS", "PropertyBooking", id, { purpose: booking.purpose, state: nextState,
            reason: input.reason, startAt: booking.startAt, endAt: booking.endAt, ...(alternative ? { alternative } : {}) }, now);
      });
      return required(id, now);
    },
  };
}
