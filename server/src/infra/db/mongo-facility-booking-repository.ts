import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import { assertBookingNotice, assessBooking, bookingIntervalsConflict, isLateBookingCancellation, slotsConflict,
  type Booking, type BookingClub, type BookingConflict, type BookingDecision, type BookingDetail,
  type BookingInput, type BookingVersion, type FacilityBookingRepository } from "../../domain/facility-booking.js";
import type { PolicyVersion } from "../../domain/policy.js";
import type { Property } from "../../domain/property.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const taskType = "PROPERTY_BOOKING";
const editableStates = ["Draft", "Revision Requested"];
const pendingStates = ["Requested", "Under Review", "Revision Requested"];
function oid(id: string) { return new Types.ObjectId(id); }
function conflict(message: string): never { throw new DomainError(message, "conflict"); }
function propertyFrom(doc: Doc): Property {
  return { id: String(doc._id), code: String(doc.code), name: String(doc.name),
    type: doc.type as Property["type"], location: String(doc.location ?? ""), isActive: doc.isActive !== false,
    ...(typeof doc.capacity === "number" ? { capacity: doc.capacity } : {}),
    equipment: (doc.equipment ?? []) as string[], bookableHours: (doc.bookableHours ?? []) as Property["bookableHours"],
    blackouts: ((doc.blackouts ?? []) as Property["blackouts"]).map((item) => ({ ...item,
      startAt: new Date(item.startAt), endAt: new Date(item.endAt) })) };
}
function clubFrom(doc: Doc): BookingClub {
  const dissolution = doc.dissolution as { effectiveSemester?: string } | undefined;
  return { id: String(doc._id), name: String(doc.name), state: String(doc.state),
    dissolutionSemester: dissolution?.effectiveSemester };
}
function inputFrom(doc: Doc, equipment: string[] = []): BookingInput {
  return { propertyId: String(doc.propertyId), purpose: String(doc.purpose), startAt: new Date(doc.startAt as Date),
    endAt: new Date(doc.endAt as Date), headcount: Number(doc.headcount ?? 1), equipment,
    ...(doc.eventId ? { eventId: String(doc.eventId) } : {}) };
}
function bookingFrom(doc: Doc, equipment: string[] = []): Booking {
  return { ...inputFrom(doc, equipment), id: String(doc._id), clubId: String(doc.clubId), clubName: String(doc.clubName),
    semesterCode: String(doc.semesterCode), state: doc.state as Booking["state"],
    currentVersionNo: Number(doc.currentVersionNo ?? 0), isLateCancellation: doc.isLateCancellation === true,
    conflictResult: doc.conflictResult as string | undefined, decisionReason: doc.decisionReason as string | undefined,
    cancelReason: doc.cancelReason as string | undefined };
}
function storedInput(input: BookingInput) {
  return { propertyId: oid(input.propertyId), purpose: input.purpose, startAt: input.startAt, endAt: input.endAt,
    headcount: input.headcount, ...(input.eventId ? { eventId: oid(input.eventId) } : {}) };
}

/** Runs inside the caller's transaction, including UC15's club/event cascade. */
export async function releaseFacilityBookingsInSession(session: ClientSession, filter: Doc,
  source: string, reason: string, now: Date, state: "Released" | "Cancelled" = "Released"): Promise<number> {
  const docs = await m.propertyBookings!.find(filter).session(session).lean();
  const roles = await m.roles!.find({ code: "ICPDP_OFFICER", scope: "system" }).session(session).lean();
  const officers = await m.userRoleAssignments!.distinct("userId", { roleId: { $in: roles.map((role) => role._id) }, revokedAt: null }).session(session);
  for (const doc of docs) {
    await m.propertyBookings!.updateOne({ _id: doc._id }, { $set: { state, cancelReason: reason,
      cancelledAt: now, releasedBy: source, isLateCancellation: false } }, { session });
    await m.approvalTasks!.updateMany({ entityType: taskType, entityId: doc._id, state: "Open" },
      { $set: { state: "Closed", closedAt: now } }, { session });
    await m.auditLogs!.create([{ entityType: "PropertyBooking", entityId: doc._id, action: "BOOKING_RELEASED",
      actorRole: "SYSTEM", before: { state: doc.state }, after: { state, source }, reason,
      correlationId: randomUUID(), at: now }], { session });
    if (officers.length) await m.notifications!.create(officers.map((userId) => ({ recipientUserId: userId,
      eventCode: "BOOKING_RELEASED", entityType: "PropertyBooking", entityId: doc._id, channels: ["IN_APP"],
      payload: { reason, source }, state: "Queued", dueAt: now, attempts: 0, createdAt: now })), { session, ordered: true });
  }
  return docs.length;
}

export function mongoFacilityBookingRepository(): FacilityBookingRepository {
  const bookings = m.propertyBookings!;
  const audits = m.auditLogs!;
  const tasks = m.approvalTasks!;
  const decisions = m.approvalDecisions!;
  async function audit(id: Types.ObjectId, action: string, actorId: string | null,
    before: unknown, after: unknown, now: Date, session: ClientSession, reason?: string) {
    await audits.create([{ entityType: "PropertyBooking", entityId: id, action,
      ...(actorId ? { actorId: oid(actorId) } : { actorRole: "SYSTEM" }), before, after, reason,
      correlationId: randomUUID(), at: now }], { session });
  }
  async function current(id: string, session: ClientSession) {
    const doc = await bookings.findById(oid(id)).session(session).lean();
    if (!doc) throw new DomainError("booking not found", "not_found");
    return doc;
  }
  async function equipmentFor(id: Types.ObjectId, session?: ClientSession): Promise<string[]> {
    const query = audits.findOne({ entityType: "PropertyBooking", entityId: id,
      action: { $in: ["BOOKING_DRAFT_CREATED", "BOOKING_DRAFT_SAVED", "BOOKING_SUBMITTED"] } })
      .sort({ at: -1, _id: -1 });
    if (session) query.session(session);
    const doc = await query.lean();
    return (doc?.after as { payload?: { equipment?: string[] } } | undefined)?.payload?.equipment ?? [];
  }
  async function policyAt(now: Date, session?: ClientSession): Promise<PolicyVersion | null> {
    const query = m.policyVersions!.findOne({ effectiveFrom: { $lte: now } })
      .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 });
    if (session) query.session(session);
    const doc = await query.lean();
    return doc ? { ...doc, id: String(doc._id),
      academicCalendar: ((doc.academicCalendar ?? []) as PolicyVersion["academicCalendar"])
        .map((item) => ({ ...item, startAt: new Date(item.startAt), endAt: new Date(item.endAt) })) } as unknown as PolicyVersion : null;
  }
  async function conflicts(input: BookingInput, thresholdMinutes: number, excludeId?: string,
    session?: ClientSession): Promise<BookingConflict[]> {
    const buffer = thresholdMinutes * 60000;
    const interval = { startAt: { $lt: new Date(input.endAt.getTime() + buffer) },
      endAt: { $gt: new Date(input.startAt.getTime() - buffer) } };
    const bookingQuery = bookings.find({ propertyId: oid(input.propertyId), state: { $in: ["Approved", "In Use"] },
      ...(excludeId ? { _id: { $ne: oid(excludeId) } } : {}), ...interval });
    const eventQuery = m.events!.find({ propertyId: oid(input.propertyId), state: { $in: ["Approved", "Upcoming", "Ongoing"] },
      ...(input.eventId ? { _id: { $ne: oid(input.eventId) } } : {}), ...interval });
    if (session) { bookingQuery.session(session); eventQuery.session(session); }
    // Operations in a Mongo transaction run sequentially.
    const bookingDocs = await bookingQuery.lean();
    const eventDocs = await eventQuery.lean();
    return [...bookingDocs.map((doc) => ({ id: String(doc._id), startAt: doc.startAt as Date,
      endAt: doc.endAt as Date, source: "booking" as const })), ...eventDocs.map((doc) => ({ id: String(doc._id),
      startAt: doc.startAt as Date, endAt: doc.endAt as Date, source: "event" as const }))]
      .filter((item) => bookingIntervalsConflict(input.startAt, input.endAt, item.startAt, item.endAt, thresholdMinutes));
  }
  async function assess(input: BookingInput, clubId: string, now: Date, excludeId?: string, session?: ClientSession) {
    const propertyQuery = m.properties!.findById(oid(input.propertyId));
    const clubQuery = m.clubs!.findById(oid(clubId));
    if (session) { propertyQuery.session(session); clubQuery.session(session); }
    const property = await propertyQuery.lean();
    const club = await clubQuery.lean();
    const policy = await policyAt(now, session);
    if (!property || !club) throw new DomainError("club or property not found", "not_found");
    if (!policy) throw new DomainError("policy is not configured", "unavailable");
    if (input.eventId) {
      const eventQuery = m.events!.findOne({ _id: oid(input.eventId), clubId: oid(clubId),
        state: { $nin: ["Cancelled", "Completed", "Rejected", "Expired"] } });
      if (session) eventQuery.session(session);
      if (!(await eventQuery.lean())) throw new DomainError("event is not available in this club", "validation");
    }
    return { ...assessBooking(input, propertyFrom(property), clubFrom(club), policy,
      await conflicts(input, policy.conflictThresholdMinutes, excludeId, session), now), club: clubFrom(club) };
  }
  async function lockScope(propertyId: string, clubId: string, session: ClientSession) {
    // Serialize writers sharing a slot or a club with lifecycle/catalog transactions.
    await m.clubs!.updateOne({ _id: oid(clubId) }, { $inc: { __v: 1 } }, { session });
    await m.properties!.updateOne({ _id: oid(propertyId) }, { $inc: { __v: 1 } }, { session });
  }
  async function notify(id: Types.ObjectId, eventCode: string, recipientIds: string[],
    payload: unknown, now: Date, session: ClientSession) {
    if (!recipientIds.length) return;
    await m.notifications!.create([...new Set(recipientIds)].map((recipient) => ({ recipientUserId: oid(recipient),
      eventCode, entityType: "PropertyBooking", entityId: id, channels: ["IN_APP"], payload,
      state: "Queued", dueAt: now, attempts: 0, createdAt: now })), { session, ordered: true });
  }
  async function officers(session: ClientSession): Promise<string[]> {
    const roles = await m.roles!.find({ code: "ICPDP_OFFICER", scope: "system" }).session(session).lean();
    const ids = await m.userRoleAssignments!.distinct("userId", { roleId: { $in: roles.map((role) => role._id) }, revokedAt: null }).session(session);
    return ids.map(String);
  }
  async function closeTasks(id: Types.ObjectId, now: Date, session: ClientSession) {
    await tasks.updateMany({ entityType: taskType, entityId: id, state: "Open" },
      { $set: { state: "Closed", closedAt: now } }, { session });
  }
  async function detail(id: string, now: Date): Promise<BookingDetail | null> {
    const doc = await bookings.findById(oid(id)).lean();
    if (!doc) return null;
    const equipment = await equipmentFor(doc._id as Types.ObjectId);
    const booking = bookingFrom(doc, equipment);
    const property = await m.properties!.findById(doc.propertyId).lean();
    const club = await m.clubs!.findById(doc.clubId).lean();
    const taskDocs = await tasks.find({ entityType: taskType, entityId: doc._id }).sort({ openedAt: -1, _id: -1 }).lean();
    const versionDocs = await audits.find({ entityType: "PropertyBooking", entityId: doc._id, action: "BOOKING_SUBMITTED" })
      .sort({ "after.versionNo": 1 }).lean();
    const decisionDocs = await decisions.find({ approvalTaskId: { $in: taskDocs.map((task) => task._id) } }).sort({ at: 1 }).lean();
    const obligations: string[] = [];
    if (await m.periodicReports!.exists({ clubId: doc.clubId, dueAt: { $lt: now },
      state: { $in: ["Draft", "Returned for correction"] } })) obligations.push("overdueReport");
    if (await m.eventBudgets!.exists({ clubId: doc.clubId, settlementDueAt: { $lt: now },
      settlementSubmittedAt: { $exists: false }, state: { $nin: ["Closed", "Cancelled"] } })) obligations.push("overdueSettlement");
    if (await m.eventBudgets!.exists({ clubId: doc.clubId, recoveryDueAt: { $lt: now }, state: "Recovery Pending" })) {
      obligations.push("overdueRefund");
    }
    let check: BookingDetail["check"];
    try { check = await assess(booking, booking.clubId, now, id); }
    catch (error) {
      if (!(error instanceof DomainError)) throw error;
      check = { conflicts: [], capacityWarning: property?.capacity !== undefined && booking.headcount > Number(property.capacity),
        conflictResult: error.message };
    }
    const task = taskDocs[0];
    return { booking, property: property ? propertyFrom(property) : null, club: club ? clubFrom(club) : null,
      task: task ? { id: String(task._id), state: String(task.state), openedAt: task.openedAt as Date,
        ...(task.assigneeId ? { assigneeId: String(task.assigneeId) } : {}) } : null,
      versions: versionDocs.map((item): BookingVersion => {
        const after = item.after as { versionNo: number; payload: BookingInput };
        return { versionNo: after.versionNo, payload: { ...after.payload,
          startAt: new Date(after.payload.startAt), endAt: new Date(after.payload.endAt) },
        submittedBy: String(item.actorId), submittedAt: item.at as Date };
      }), decisions: decisionDocs.map((item): BookingDecision => {
        const comments = item.comments as { alternative?: BookingDecision["alternative"] } | undefined;
        return { id: String(item._id), taskId: String(item.approvalTaskId), actorId: String(item.actorId), at: item.at as Date,
          outcome: item.outcome as BookingDecision["outcome"], reason: String(item.reason ?? ""),
          reviewNote: item.reviewNote as string | undefined, alternative: comments?.alternative };
      }), check, obligations };
  }
  async function required(id: string, now: Date): Promise<BookingDetail> {
    const found = await detail(id, now);
    if (!found) throw new DomainError("booking not found", "not_found");
    return found;
  }
  return {
    async list(clubId) {
      const docs = await bookings.find(clubId ? { clubId: oid(clubId) } : {}).sort({ createdAt: -1, _id: -1 }).lean();
      const snapshots = await audits.aggregate<{ _id: Types.ObjectId; equipment?: string[] }>([
        { $match: { entityType: "PropertyBooking", entityId: { $in: docs.map((doc) => doc._id) },
          action: { $in: ["BOOKING_DRAFT_CREATED", "BOOKING_DRAFT_SAVED", "BOOKING_SUBMITTED"] } } },
        { $sort: { at: -1, _id: -1 } },
        { $group: { _id: "$entityId", equipment: { $first: "$after.payload.equipment" } } },
      ]);
      const equipmentById = new Map(snapshots.map((item) => [String(item._id), item.equipment ?? []]));
      return docs.map((doc) => bookingFrom(doc, equipmentById.get(String(doc._id)) ?? []));
    }, find: detail,
    async club(id) { const doc = await m.clubs!.findById(oid(id)).lean(); return doc ? clubFrom(doc) : null; },
    async events(clubId) {
      const docs = await m.events!.find({ clubId: oid(clubId), state: { $nin: ["Cancelled", "Completed", "Rejected", "Expired"] } })
        .select({ title: 1, startAt: 1 }).sort({ startAt: 1 }).lean();
      return docs.map((doc) => ({ id: String(doc._id), title: String(doc.title), startAt: doc.startAt as Date }));
    },
    async eventBelongsToClub(eventId, clubId) {
      return Boolean(await m.events!.exists({ _id: oid(eventId), clubId: oid(clubId),
        state: { $nin: ["Cancelled", "Completed", "Rejected", "Expired"] } }));
    }, conflicts,
    async create(clubId, input, actorId, now) {
      const id = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        await lockScope(input.propertyId, clubId, session);
        assertBookingNotice(input, now);
        const check = await assess(input, clubId, now, undefined, session);
        await bookings.create([{ _id: id, ...storedInput(input), clubId: oid(clubId), clubName: check.club.name,
          semesterCode: check.semesterCode, state: "Draft", currentVersionNo: 0,
          conflictResult: check.conflictResult, createdAt: now }], { session });
        await audit(id, "BOOKING_DRAFT_CREATED", actorId, null, { payload: input }, now, session);
      });
      return required(String(id), now);
    },
    async save(id, clubId, input, expectedVersion, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        await lockScope(input.propertyId, clubId, session);
        const before = await current(id, session);
        if (String(before.clubId) !== clubId || !editableStates.includes(String(before.state))
          || Number(before.currentVersionNo) !== expectedVersion) conflict("booking cannot be edited or version changed");
        assertBookingNotice(input, now);
        const check = await assess(input, clubId, now, id, session);
        await bookings.updateOne({ _id: before._id }, { $set: { ...storedInput(input), semesterCode: check.semesterCode,
          conflictResult: check.conflictResult }, ...(!input.eventId ? { $unset: { eventId: "" } } : {}) }, { session });
        await audit(before._id as Types.ObjectId, "BOOKING_DRAFT_SAVED", actorId, inputFrom(before), { payload: input }, now, session);
      });
      return required(id, now);
    },
    async submit(id, clubId, expectedVersion, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const before = await current(id, session);
        if (String(before.clubId) !== clubId || !editableStates.includes(String(before.state))
          || Number(before.currentVersionNo) !== expectedVersion) conflict("booking cannot be submitted or version changed");
        await lockScope(String(before.propertyId), clubId, session);
        const input = inputFrom(before, await equipmentFor(before._id as Types.ObjectId, session));
        assertBookingNotice(input, now);
        const check = await assess(input, clubId, now, id, session);
        if (check.conflictResult === "Blocking Conflict") conflict("booking slot is unavailable");
        const versionNo = expectedVersion + 1;
        await bookings.updateOne({ _id: before._id }, { $set: { state: "Requested", currentVersionNo: versionNo,
          semesterCode: check.semesterCode, conflictResult: check.conflictResult },
        $unset: { decisionReason: "", decidedAt: "", decidedBy: "" } }, { session });
        await tasks.create([{ entityType: taskType, entityId: before._id, clubId: oid(clubId),
          title: `${before.clubName}: ${input.purpose}`, state: "Open", openedAt: now }], { session });
        await audit(before._id as Types.ObjectId, "BOOKING_SUBMITTED", actorId, { state: before.state },
          { versionNo, payload: input, state: "Requested" }, now, session);
        await notify(before._id as Types.ObjectId, "BOOKING_SUBMITTED", await officers(session),
          { clubName: before.clubName, versionNo }, now, session);
      });
      return required(id, now);
    },
    async claim(id, officerId, now) {
      await mongoose.connection.transaction(async (session) => {
        const before = await current(id, session);
        const task = await tasks.findOne({ entityType: taskType, entityId: before._id, state: "Open" }).session(session).lean();
        if (!task || !["Requested", "Under Review"].includes(String(before.state))) conflict("booking review is not open");
        if (task.assigneeId && String(task.assigneeId) !== officerId) conflict("booking is assigned to another officer");
        await tasks.updateOne({ _id: task._id }, { $set: { assigneeId: oid(officerId) } }, { session });
        await bookings.updateOne({ _id: before._id }, { $set: { state: "Under Review" } }, { session });
        if (before.state === "Requested") await audit(before._id as Types.ObjectId, "BOOKING_REVIEW_CLAIMED", officerId,
          { state: before.state }, { state: "Under Review" }, now, session);
      });
      return required(id, now);
    },
    async decide(id, officerId, input, now) {
      await mongoose.connection.transaction(async (session) => {
        const before = await current(id, session);
        const task = await tasks.findOne({ entityType: taskType, entityId: before._id, state: "Open", assigneeId: oid(officerId) })
          .session(session).lean();
        if (before.state !== "Under Review" || !task) conflict("booking cannot be decided by this officer");
        let outcome = input.outcome;
        let reason = input.reason;
        let checkResult = String(before.conflictResult ?? "No Conflict");
        if (outcome === "Approve") {
          await lockScope(String(before.propertyId), String(before.clubId), session);
          const check = await assess(inputFrom(before, await equipmentFor(before._id as Types.ObjectId, session)),
            String(before.clubId), now, id, session);
          checkResult = check.conflictResult;
          if (checkResult === "Blocking Conflict") { outcome = "Request revision"; reason = "Slot conflict detected during approval; choose another slot"; }
        }
        const state = outcome === "Approve" ? "Approved" : outcome === "Reject" ? "Rejected" : "Revision Requested";
        await decisions.create([{ approvalTaskId: task._id, outcome, reason, reviewNote: input.reviewNote,
          comments: { alternative: input.alternative }, actorId: oid(officerId), at: now }], { session });
        await tasks.updateOne({ _id: task._id }, { $set: { state: "Decided", closedAt: now } }, { session });
        await bookings.updateOne({ _id: before._id }, { $set: { state, decisionReason: reason,
          conflictResult: checkResult, decidedBy: oid(officerId), decidedAt: now } }, { session });
        await audit(before._id as Types.ObjectId, "BOOKING_DECIDED", officerId, { state: before.state },
          { state, outcome, versionNo: before.currentVersionNo, alternative: input.alternative }, now, session, reason);
        const submitted = await audits.findOne({ entityType: "PropertyBooking", entityId: before._id, action: "BOOKING_SUBMITTED" })
          .sort({ at: -1, _id: -1 }).session(session).lean();
        if (submitted?.actorId) await notify(before._id as Types.ObjectId, "PROPERTY_BOOKING_STATUS", [String(submitted.actorId)],
          { state, reason, alternative: input.alternative }, now, session);
      });
      return required(id, now);
    },
    async cancel(id, clubId, reason, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        const before = await current(id, session);
        if (String(before.clubId) !== clubId || !["Requested", "Approved"].includes(String(before.state))
          || (before.state === "Approved" && (before.startAt as Date) <= now)) conflict("booking cannot be cancelled");
        const late = isLateBookingCancellation(before.startAt as Date, now);
        await bookings.updateOne({ _id: before._id }, { $set: { state: "Cancelled", cancelReason: reason,
          cancelledAt: now, isLateCancellation: late } }, { session });
        await closeTasks(before._id as Types.ObjectId, now, session);
        await audit(before._id as Types.ObjectId, "BOOKING_CANCELLED", actorId, { state: before.state },
          { state: "Cancelled", isLateCancellation: late }, now, session, reason);
        await notify(before._id as Types.ObjectId, "BOOKING_CANCELLED", await officers(session), { reason, isLateCancellation: late }, now, session);
      });
      return required(id, now);
    },
    async release(input) {
      const states = ["Requested", "Under Review", "Revision Requested", "Approved", ...(input.source === "club" ? ["In Use"] : [])];
      return mongoose.connection.transaction(async (session) => releaseFacilityBookingsInSession(session,
        { ...(input.clubId ? { clubId: oid(input.clubId) } : {}),
          ...(input.eventId ? { eventId: oid(input.eventId) } : {}), state: { $in: states } },
        input.source.toUpperCase(), input.reason, input.now));
    },
    async advanceLifecycle(now) {
      let started = 0; let completed = 0;
      await mongoose.connection.transaction(async (session) => {
        const docs = await bookings.find({ state: { $in: ["Approved", "In Use"] }, startAt: { $lte: now } })
          .session(session).lean();
        started = 0; completed = 0;
        for (const doc of docs) {
          const state = (doc.endAt as Date) <= now ? "Completed" : "In Use";
          if (state === doc.state) continue;
          await bookings.updateOne({ _id: doc._id }, { $set: { state } }, { session });
          await audit(doc._id as Types.ObjectId, "BOOKING_LIFECYCLE_ADVANCED", null, { state: doc.state }, { state }, now, session);
          if (state === "Completed") completed += 1; else started += 1;
        }
      });
      return { started, completed };
    },
    async blackoutConflicts(propertyId) {
      const property = await m.properties!.findById(oid(propertyId)).lean();
      if (!property) throw new DomainError("property not found", "not_found");
      const blackouts = propertyFrom(property).blackouts;
      const docs = await bookings.find({ propertyId: oid(propertyId), state: { $in: pendingStates } }).sort({ startAt: 1 }).lean();
      return docs.filter((doc) => blackouts.some((item) => slotsConflict(doc.startAt as Date, doc.endAt as Date,
        item.startAt, item.endAt, 0))).map((doc) => bookingFrom(doc));
    },
  };
}
