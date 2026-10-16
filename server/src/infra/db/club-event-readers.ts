import { Types } from "mongoose";
import { summarizeFeedback, FEEDBACK_CRITERION } from "../../domain/event-feedback.js";
import type { ClubEvent, ClubEventDetail, ClubFeedbackSummary, EventParticipant } from "../../domain/club-event.js";
import { DomainError } from "../../domain/errors.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
function oid(id: string) { return new Types.ObjectId(id); }
export function eventMoney(value: unknown): number { return Number(String(value ?? 0)); }
export function clubEventFrom(doc: Doc, payload: Doc = {}): ClubEvent {
  return { ...payload, id: String(doc._id), clubId: String(doc.clubId), clubName: String(doc.clubName),
    title: String(doc.title), objective: String(doc.objective ?? ""), plan: String(payload.plan ?? ""),
    startAt: doc.startAt as Date, endAt: doc.endAt as Date, semesterCode: String(doc.semesterCode),
    venueText: doc.venueText as string | undefined, propertyId: doc.propertyId ? String(doc.propertyId) : undefined,
    audienceScope: doc.audienceScope as ClubEvent["audienceScope"], capacity: Number(doc.capacity),
    riskCategory: (doc.riskCategory ?? "LOW") as ClubEvent["riskCategory"],
    budgetLines: (payload.budgetLines ?? []) as ClubEvent["budgetLines"], bookingIds: (payload.bookingIds ?? []) as string[],
    state: doc.state as ClubEvent["state"], version: Number(doc.__v ?? 0), currentRevisionNo: Number(doc.currentRevisionNo ?? 0),
    confirmedRegistrationCount: Number(doc.confirmedRegistrationCount ?? 0), approvalConditions: (doc.approvalConditions ?? []) as string[], attendanceFinalized: doc.attendanceFinalized === true,
    conflictResult: doc.conflictResult as string | undefined, conflictDetail: doc.conflictDetail,
    publishedAt: doc.publishedAt as Date | undefined, registrationOpenAt: doc.registrationOpenAt as Date | undefined,
    registrationCloseAt: doc.registrationCloseAt as Date | undefined, checkInCode: doc.checkInCode as string | undefined,
    checkInOpenAt: doc.checkInOpenAt as Date | undefined, checkInCloseAt: doc.checkInCloseAt as Date | undefined,
    allowWalkIn: doc.allowWalkIn === true, waitlistEnabled: doc.waitlistEnabled === true,
    revisionDeadlineAt: doc.revisionDeadlineAt as Date | undefined };
}
export async function eventDraftPayload(eventId: Types.ObjectId): Promise<Doc> {
  const audit = await m.auditLogs!.findOne({ entityType: "Event", entityId: eventId,
    action: { $in: ["EVENT_DRAFT_CREATED", "EVENT_DRAFT_SAVED", "EVENT_PROPOSAL_SUBMITTED", "RECORD_INTERNAL", "EVENT_RESCHEDULED"] } })
    .sort({ "after.eventVersion": -1, at: -1, _id: -1 }).lean();
  return ((audit?.after as Doc | undefined)?.payload ?? {}) as Doc;
}
export async function readClubEvent(clubId: string, eventId: string): Promise<ClubEventDetail | null> {
  const doc = await m.events!.findOne({ _id: oid(eventId), clubId: oid(clubId), organizerType: "CLUB" }).lean();
  if (!doc) return null;
  const [payload, versions, tasks, bookings, budget] = await Promise.all([
    eventDraftPayload(doc._id as Types.ObjectId),
    m.eventProposalVersions!.find({ eventId: doc._id }).sort({ revisionNo: 1 }).lean(),
    m.approvalTasks!.find({ entityType: "EVENT_PROPOSAL", entityId: doc._id }).lean(),
    m.propertyBookings!.find({ eventId: doc._id }).lean(), m.eventBudgets!.findOne({ eventId: doc._id }).lean(),
  ]);
  const decisions = await m.approvalDecisions!.find({ approvalTaskId: { $in: tasks.map((task) => task._id) } }).sort({ at: 1 }).lean();
  const properties = await m.properties!.find({ _id: { $in: bookings.map((item) => item.propertyId) } }).lean();
  const current = Object.keys(payload).length ? payload : ((versions.at(-1)?.payload ?? {}) as Doc);
  return { event: clubEventFrom(doc, { ...current, budgetLines: current.budgetLines ?? versions.at(-1)?.budgetLines ?? [] }),
    versions: versions.map((v) => ({ revisionNo: Number(v.revisionNo), payload: v.payload,
      budgetLines: (v.budgetLines ?? []) as ClubEvent["budgetLines"], submittedAt: v.submittedAt as Date })),
    decisions: decisions.map((d) => ({ outcome: String(d.outcome), reason: d.reason as string | undefined, comments: d.comments, at: d.at as Date })),
    bookings: bookings.map((b) => ({ id: String(b._id), state: String(b.state), propertyId: String(b.propertyId),
      propertyName: String(properties.find((p) => String(p._id) === String(b.propertyId))?.name ?? ""), startAt: b.startAt as Date, endAt: b.endAt as Date })),
    ...(budget ? { budget: { state: String(budget.state), approvedTotal: eventMoney(budget.approvedTotal), disbursedTotal: eventMoney(budget.disbursedTotal) } } : {}) };
}
export async function readEventParticipants(clubId: string, eventId: string): Promise<EventParticipant[]> {
  const event = await m.events!.findOne({ _id: oid(eventId), clubId: oid(clubId), organizerType: "CLUB" }).select({ endAt: 1 }).lean();
  if (!event) throw new DomainError("event not found", "not_found");
  // A confirmed registration without a check-in is a no-show only once the event has ended.
  const ended = (event.endAt as Date) <= new Date();
  const [registrations, attendances] = await Promise.all([
    m.eventRegistrations!.find({ eventId: oid(eventId) }).sort({ waitlistPosition: 1, createdAt: 1 }).lean(),
    m.attendances!.find({ eventId: oid(eventId) }).lean(),
  ]);
  const ids = [...new Set([...registrations, ...attendances].map((item) => String(item.studentId)))];
  const users = await m.users!.find({ _id: { $in: ids.map(oid) } }).select({ displayName: 1, email: 1 }).lean();
  return ids.map((studentId) => {
    const r = registrations.find((item) => String(item.studentId) === studentId);
    const a = attendances.find((item) => String(item.studentId) === studentId);
    const u = users.find((item) => String(item._id) === studentId);
    return { studentId, name: String(u?.displayName ?? ""), email: String(u?.email ?? ""),
      registrationId: r ? String(r._id) : undefined, state: r?.state as string | undefined,
      waitlistPosition: r?.waitlistPosition as number | undefined, attendanceId: a ? String(a._id) : undefined,
      checkedInAt: a?.checkedInAt as Date | undefined, method: a?.method as string | undefined,
      abnormalFlags: (a?.abnormalFlags ?? (r?.state === "Confirmed" && ended ? ["no-show"] : [])) as string[],
      correctionReason: a?.correctionReason as string | undefined, finalized: a?.finalized === true };
  });
}
export async function readClubFeedback(clubId: string, eventIds: string[], now: Date): Promise<ClubFeedbackSummary[]> {
  const events = await m.events!.find({ _id: { $in: eventIds.map(oid) }, clubId: oid(clubId), organizerType: "CLUB" }).lean();
  if (events.length !== eventIds.length) throw new DomainError("event not found", "not_found");
  const policy = await m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).lean();
  if (!policy) throw new DomainError("policy is not configured", "unavailable");
  const docs = await m.eventFeedbacks!.find({ eventId: { $in: events.map((event) => event._id) } })
    .select({ eventId: 1, scores: 1, comment: 1, _id: 0 }).sort({ submittedAt: 1 }).lean();
  return events.map((event) => {
    const items = docs.filter((doc) => String(doc.eventId) === String(event._id));
    const ratings = items.map((doc) => Number(((doc.scores as Doc[]).find((s) => s.criterionCode === FEEDBACK_CRITERION))?.score ?? 0));
    const summary = summarizeFeedback(ratings, Number(policy.feedbackMinRespondents));
    return { ...summary, eventId: String(event._id), title: String(event.title),
      ...(summary.visible ? { comments: items.map((doc) => String(doc.comment ?? "")).filter(Boolean) } : {}) };
  });
}
