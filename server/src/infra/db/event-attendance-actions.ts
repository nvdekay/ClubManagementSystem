import { Types, type ClientSession } from "mongoose";
import type { ClubEventAction } from "../../domain/club-event.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
function conflict(message: string): never { throw new DomainError(message, "conflict"); }
/** All callers hold the event write lock before reading or changing attendance. */
export async function applyEventAttendanceAction(session: ClientSession, event: Doc, action: ClubEventAction,
  actorId: Types.ObjectId, now: Date, internalWithoutBudget: boolean): Promise<void> {
  const eventId = event._id as Types.ObjectId;
  if (action.kind === "unlock") {
    if (event.attendanceFinalized !== true || !["Completed", "Closed"].includes(String(event.state))) conflict("attendance is not finalized");
    await m.events!.updateOne({ _id: eventId }, { $set: { attendanceFinalized: false, state: "Completed" } }, { session });
    await m.attendances!.updateMany({ eventId }, { $set: { finalized: false, unlockedBy: actorId, unlockReason: action.reason },
      $unset: { finalizedAt: "", finalizedBy: "" } }, { session });
    return;
  }
  if (event.attendanceFinalized === true) conflict("attendance is finalized");
  if (action.kind === "finalize") {
    if (event.state !== "Completed" || (event.endAt as Date) > now) conflict("only completed events can finalize attendance");
    const registrations = await m.eventRegistrations!.find({ eventId, state: "Confirmed" }).session(session).lean();
    const attendances = await m.attendances!.find({ eventId }).session(session).lean();
    const missing = registrations.filter((r) => !attendances.some((a) => String(a.studentId) === String(r.studentId)));
    const unresolved = attendances.filter((a) => Array.isArray(a.abnormalFlags) && a.abnormalFlags.length && !a.correctionReason);
    if (missing.length || unresolved.length) throw new DomainError("resolve every abnormal attendance and no-show before finalizing", "conflict",
      { studentIds: [...missing, ...unresolved].map((a) => String(a.studentId)) });
    await m.attendances!.updateMany({ eventId }, { $set: { finalized: true, finalizedBy: actorId, finalizedAt: now } }, { session });
    await m.events!.updateOne({ _id: eventId }, { $set: { attendanceFinalized: true, ...(internalWithoutBudget ? { state: "Closed" } : {}) } }, { session });
    return;
  }
  if (action.kind !== "check-in" && action.kind !== "correct") return;
  const studentId = new Types.ObjectId(action.studentId);
  const existing = await m.attendances!.findOne({ eventId, studentId }).session(session).lean();
  const registration = await m.eventRegistrations!.findOne({ eventId, studentId }).session(session).lean();
  if (action.kind === "check-in") {
    if (!event.publishedAt || !["Upcoming", "Ongoing", "Completed"].includes(String(event.state))) conflict("event is not open for check-in");
    if (existing) return;
    const outside = now < (event.checkInOpenAt as Date ?? event.startAt as Date) || now >= (event.checkInCloseAt as Date ?? event.endAt as Date);
    if (outside && !action.reason?.trim()) throw new DomainError("manual check-in outside the window requires a reason", "validation");
    if (!(await m.users!.exists({ _id: studentId, accountState: "Active" }).session(session))) throw new DomainError("student not found", "not_found");
    if (event.audienceScope === "MEMBERS_ONLY" && !(await m.clubMemberships!.exists({ clubId: event.clubId, userId: studentId, state: "Active" }).session(session))) {
      throw new DomainError("event is limited to active club members", "forbidden");
    }
    let registrationId = registration?._id;
    if (registration?.state !== "Confirmed") {
      if (!event.allowWalkIn) conflict("confirmed registration is required");
      const policy = await m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1 }).session(session).lean();
      if (!policy) throw new DomainError("policy is not configured", "unavailable");
      if (Number(event.confirmedRegistrationCount) >= Number(event.capacity) && !policy.allowOverbooking) conflict("event capacity is full");
      if (registration) await m.eventRegistrations!.updateOne({ _id: registration._id }, { $set: { state: "Confirmed", promotedAt: now }, $unset: { cancelledAt: "", waitlistPosition: "" } }, { session });
      else { const [r] = await m.eventRegistrations!.create([{ eventId, studentId, clubId: event.clubId, state: "Confirmed", answers: {}, createdAt: now }], { session }); registrationId = r!._id; }
      await m.events!.updateOne({ _id: eventId }, { $inc: { confirmedRegistrationCount: 1 } }, { session });
    }
    await m.attendances!.create([{ eventId, studentId, registrationId, clubId: event.clubId, checkedInAt: now, method: "manual",
      performedBy: actorId, abnormalFlags: ["manual", ...(outside ? ["out-of-window"] : []), ...(registration?.state !== "Confirmed" ? ["walk-in"] : [])],
      correctionReason: action.reason, finalized: false }], { session });
    return;
  }
  if (event.state !== "Completed") conflict("attendance can only be corrected after completion");
  if (!existing && registration?.state !== "Confirmed") throw new DomainError("participant not found", "not_found");
  if (action.absent && existing && !(existing.abnormalFlags as string[] | undefined)?.includes("no-show")) {
    conflict("an existing check-in cannot be converted to a no-show");
  }
  if (action.checkedInAt && (action.checkedInAt > now || action.checkedInAt < (event.checkInOpenAt as Date ?? event.startAt as Date) || action.checkedInAt > (event.endAt as Date))) {
    throw new DomainError("invalid corrected check-in time", "validation");
  }
  if (existing) {
    if (!action.absent && (existing.abnormalFlags as string[] | undefined)?.includes("no-show") && !action.checkedInAt) throw new DomainError("corrected check-in time is required", "validation");
    if (action.checkedInAt && await m.eventFeedbacks!.exists({ attendanceId: existing._id }).session(session)) conflict("a check-in time with submitted feedback is immutable");
    await m.attendances!.updateOne({ _id: existing._id, finalized: false }, { $set: { correctionReason: action.reason,
      ...(action.checkedInAt ? { checkedInAt: action.checkedInAt } : {}),
      ...(!action.absent && (existing.abnormalFlags as string[] | undefined)?.includes("no-show") ? {
        abnormalFlags: ["manual"], performedBy: actorId } : {}) } }, { session });
  } else {
    if (!action.absent && !action.checkedInAt) throw new DomainError("a corrected check-in time is required", "validation");
    await m.attendances!.create([{ eventId, studentId, registrationId: registration?._id, clubId: event.clubId,
      checkedInAt: action.checkedInAt ?? event.endAt, method: "manual", performedBy: actorId,
      abnormalFlags: action.absent ? ["no-show"] : ["manual"], correctionReason: action.reason, finalized: false }], { session });
  }
}
