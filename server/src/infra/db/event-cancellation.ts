import { settlementDueAt } from "../../domain/budget-disbursement.js";
import { randomUUID } from "node:crypto";
import { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import { eventCancellationIsLate } from "../../domain/club-event-rules.js";
import { releaseFacilityBookingsInSession } from "./mongo-facility-booking-repository.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
/** Shared transaction for UC28 and UC15; source decision remains in the immutable event audit. */
export async function cancelEventInSession(session: ClientSession, event: Doc, reason: string, now: Date,
  source: string, noticeHours: number, actorId?: Types.ObjectId, sourceRefId?: Types.ObjectId): Promise<number> {
  if (event.attendanceFinalized === true) throw new DomainError("finalized attendance prevents cancellation", "conflict");
  const id = event._id as Types.ObjectId;
  const changed = await m.events!.updateOne({ _id: id, state: event.state, attendanceFinalized: { $ne: true } },
    { $set: { state: "Cancelled", cancelReason: reason, cancelSourceType: source, confirmedRegistrationCount: 0,
      isLateCancellation: source === "CMB" && eventCancellationIsLate(event.startAt as Date, now, noticeHours),
      ...(actorId ? { cancelledBy: actorId } : {}) }, $inc: { __v: 1 } }, { session });
  if (changed.modifiedCount !== 1) throw new DomainError("event changed while cancelling", "conflict");
  const registrations = await m.eventRegistrations!.find({ eventId: id, state: { $in: ["Confirmed", "Waitlisted"] } }).session(session).lean();
  await m.eventRegistrations!.updateMany({ _id: { $in: registrations.map((r) => r._id) } },
    { $set: { state: "Cancelled", cancelledAt: now }, $unset: { waitlistPosition: "" } }, { session });
  await m.approvalTasks!.updateMany({ entityType: "EVENT_PROPOSAL", entityId: id, state: "Open" }, { $set: { state: "Closed", closedAt: now } }, { session });
  await releaseFacilityBookingsInSession(session, { eventId: id, state: { $in: ["Draft", "Requested", "Under Review", "Revision Requested", "Approved"] } }, source, reason, now);
  const budget = await m.eventBudgets!.findOne({ eventId: id }).session(session).lean();
  if (budget && !["Closed", "Cancelled"].includes(String(budget.state))) {
    const disbursed = Number(String(budget.disbursedTotal ?? 0));
    if (disbursed === 0) await m.eventBudgets!.updateOne({ _id: budget._id }, { $set: { state: "Cancelled" } }, { session });
    // Amount to recover must be decided from real expenses in UC37; do not assume all advances are unspent.
    else await m.eventBudgets!.updateOne({ _id: budget._id }, { $set: { settlementDueAt: settlementDueAt(now) }, $inc: { __v: 1 } }, { session });
  }
  const correlationId = randomUUID();
  await m.auditLogs!.create([{ entityType: "Event", entityId: id, action: "EVENT_CANCELLED",
    ...(actorId ? { actorId, actorRole: source.startsWith("PROPOSAL_") ? "ICPDP_OFFICER" : "Club Member" } : { actorRole: "SYSTEM" }),
    before: { state: event.state }, after: { state: "Cancelled", source, sourceRefId,
      settlementRequired: budget ? Number(String(budget.disbursedTotal ?? 0)) > 0 : false, previousSettlementDueAt: budget?.settlementDueAt,
      ...(budget && Number(String(budget.disbursedTotal ?? 0)) > 0 ? { settlementDueAt: settlementDueAt(now) } : {}) },
    reason, correlationId, at: now }], { session });
  if (registrations.length) await m.notifications!.create(registrations.map((r) => ({ recipientUserId: r.studentId,
    eventCode: "EVENT_CANCELLED", entityType: "Event", entityId: id, channels: ["IN_APP"], payload: { title: event.title, reason, source },
    state: "Queued", dueAt: now, attempts: 0, createdAt: now })), { session, ordered: true });
  return registrations.length;
}
