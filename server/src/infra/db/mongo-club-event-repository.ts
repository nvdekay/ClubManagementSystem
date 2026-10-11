import { randomInt, randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import type { ClubEventInput, ClubEventRepository } from "../../domain/club-event.js";
import { eventActionPermission } from "../../domain/club-event.js";
import { assertEventNotice, eventConflictResult, validateClubEventInput, validateEventPublication } from "../../domain/club-event-rules.js";
import { DomainError } from "../../domain/errors.js";
import type { AcademicSemester, ReportDeadline } from "../../domain/policy.js";
import { checkInCode } from "../../domain/school-event.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import { clubEventFrom, eventDraftPayload, readClubEvent, readClubFeedback, readEventParticipants } from "./club-event-readers.js";
import { applyEventAttendanceAction } from "./event-attendance-actions.js";
import { cancelEventInSession } from "./event-cancellation.js";
import { promoteEventWaitlist } from "./event-waitlist.js";
import { releaseFacilityBookingsInSession } from "./mongo-facility-booking-repository.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
export interface ClubEventRules { proposalNoticeHours: number; cancellationNoticeHours: number }
function oid(id: string) { return new Types.ObjectId(id); }
function conflict(message: string): never { throw new DomainError(message, "conflict"); }
function fields(input: ClubEventInput, semesterCode: string) {
  return { title: input.title.trim(), objective: input.objective.trim(), startAt: input.startAt, endAt: input.endAt,
    venueText: input.venueText?.trim(), propertyId: input.propertyId ? oid(input.propertyId) : null,
    audienceScope: input.audienceScope, capacity: input.capacity, riskCategory: input.riskCategory, semesterCode };
}
async function audit(session: ClientSession, id: Types.ObjectId, action: string, actorId: Types.ObjectId, after: unknown, now: Date, reason?: string) {
  const event = await m.events!.findById(id).select({ __v: 1 }).session(session).lean();
  await m.auditLogs!.create([{ entityType: "Event", entityId: id, action, actorId, actorRole: "Club Member", after: { ...(after as Doc), eventVersion: Number(event?.__v ?? 0) }, reason,
    correlationId: randomUUID(), at: now }], { session });
}
async function payloadInSession(session: ClientSession, id: Types.ObjectId): Promise<Doc> {
  const log = await m.auditLogs!.findOne({ entityType: "Event", entityId: id,
    action: { $in: ["EVENT_DRAFT_CREATED", "EVENT_DRAFT_SAVED", "EVENT_PROPOSAL_SUBMITTED", "RECORD_INTERNAL", "EVENT_RESCHEDULED"] } })
    .sort({ "after.eventVersion": -1, at: -1, _id: -1 }).session(session).lean();
  if (log) return ((log.after as Doc)?.payload ?? {}) as Doc;
  const version = await m.eventProposalVersions!.findOne({ eventId: id }).sort({ revisionNo: -1 }).session(session).lean();
  return { ...((version?.payload ?? {}) as Doc), budgetLines: version?.budgetLines ?? [], bookingIds: [] };
}
async function currentPolicy(session: ClientSession, now: Date) {
  const policy = await m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).session(session).lean();
  if (!policy) throw new DomainError("policy is not configured", "unavailable");
  return policy;
}
async function assertObligations(session: ClientSession, clubId: Types.ObjectId, now: Date, policy: Doc) {
  if (!policy.enforceOverdueReportBlock) return;
  const obligations: string[] = [];
  if (await m.eventBudgets!.exists({ clubId, state: { $nin: ["Cancelled", "Closed"] }, settlementDueAt: { $lt: now }, settlementSubmittedAt: null }).session(session)) obligations.push("overdueSettlement");
  if (await m.eventBudgets!.exists({ clubId, state: "Recovery Pending", recoveryDueAt: { $lt: now } }).session(session)) obligations.push("overdueRefund");
  if (await m.periodicReports!.exists({ clubId, dueAt: { $lt: now }, state: { $in: ["Draft", "Returned for correction"] } }).session(session)) obligations.push("overduePeriodicReport");
  const deadlines = (policy.reportDeadlines ?? []) as ReportDeadline[];
  const postDeadline = deadlines.find((d) => d.reportType === "POST_EVENT");
  if (postDeadline) {
    const dueEvents = await m.events!.find({ clubId, state: { $in: ["Completed", "Report Submitted"] },
      endAt: { $lt: new Date(now.getTime() - postDeadline.dueDaysAfterPeriodEnd * 86400000) } }).session(session).lean();
    for (const event of dueEvents) {
      if (event.audienceScope === "MEMBERS_ONLY" && !(await m.eventBudgets!.exists({ eventId: event._id }).session(session))) continue;
      if (!(await m.postEventReports!.exists({ eventId: event._id, state: { $in: ["Submitted", "Accepted"] } }).session(session))) {
        obligations.push(`overduePostEventReport:${String(event._id)}`);
      }
    }
  }
  if (obligations.length) throw new DomainError("overdue club obligations prevent proposal submission", "conflict", { obligations });
}
async function assess(session: ClientSession, clubId: Types.ObjectId, input: ClubEventInput, eventId: Types.ObjectId | undefined,
  now: Date, submitting: boolean, rules: ClubEventRules) {
  const club = await m.clubs!.findById(clubId).session(session).lean();
  if (!club || club.state !== "Active") conflict("club is not active for event proposals");
  const policy = await currentPolicy(session, now);
  const semesterCode = validateClubEventInput(input, policy.academicCalendar as AcademicSemester[], now);
  const dissolution = club.dissolution as { effectiveTo?: Date } | undefined;
  if (dissolution?.effectiveTo && input.endAt > dissolution.effectiveTo) conflict("event ends after the dissolution semester");
  if (submitting) { assertEventNotice(input.startAt, now, rules.proposalNoticeHours); await assertObligations(session, clubId, now, policy); }
  const found: Doc[] = [];
  const overlaps: number[] = [];
  if (input.propertyId) {
    const property = await m.properties!.findOneAndUpdate({ _id: oid(input.propertyId), isActive: true }, { $inc: { __v: 1 } }, { session }).lean();
    if (!property) throw new DomainError("active property not found", "validation");
    const blackouts = (property.blackouts ?? []) as { startAt: Date; endAt: Date }[];
    if (blackouts.some((b) => new Date(b.startAt) < input.endAt && new Date(b.endAt) > input.startAt)) conflict("property is blacked out during the event");
    const intervals = input.occurrences?.length ? input.occurrences : [{ startAt: input.startAt, endAt: input.endAt }];
    for (const interval of intervals) {
      const overlap = { startAt: { $lt: interval.endAt }, endAt: { $gt: interval.startAt } };
      const intervalConflicts: Doc[] = [];
      intervalConflicts.push(...await m.events!.find({ propertyId: property._id, ...(eventId ? { _id: { $ne: eventId } } : {}),
        state: { $in: ["Approved", "Upcoming", "Ongoing"] }, ...overlap }).session(session).lean());
      intervalConflicts.push(...await m.propertyBookings!.find({ propertyId: property._id, state: { $in: ["Approved", "In Use"] },
        _id: { $nin: input.bookingIds.map(oid) }, ...(eventId ? { eventId: { $ne: eventId } } : {}), ...overlap }).session(session).lean());
      found.push(...intervalConflicts);
      overlaps.push(...intervalConflicts.map((item) => (Math.min((item.endAt as Date).getTime(), interval.endAt.getTime()) - Math.max((item.startAt as Date).getTime(), interval.startAt.getTime())) / 60000));
    }
  }
  for (const bookingId of input.bookingIds) {
    const booking = await m.propertyBookings!.findOne({ _id: oid(bookingId), clubId, state: { $in: ["Draft", "Requested", "Under Review", "Revision Requested", "Approved"] } }).session(session).lean();
    if (!booking || (booking.eventId && String(booking.eventId) !== String(eventId)) || !input.propertyId || String(booking.propertyId) !== input.propertyId ||
      !(input.occurrences?.length ? input.occurrences : [{ startAt: input.startAt, endAt: input.endAt }]).some((interval) =>
        (booking.startAt as Date) <= interval.startAt && (booking.endAt as Date) >= interval.endAt)) {
      throw new DomainError("booking must belong to the club, be available and cover the event schedule", "validation", { bookingId });
    }
  }
  const conflictResult = eventConflictResult(overlaps, Number(policy.conflictThresholdMinutes), policy.allowOverbooking === true);
  if (submitting && conflictResult === "Blocking Conflict") throw new DomainError("event schedule has blocking conflicts", "conflict", { conflicts: found.map((d) => String(d._id)) });
  return { club, semesterCode, conflictResult, conflictDetail: found.map((d) => ({ id: String(d._id), title: String(d.title ?? d.purpose ?? ""), startAt: d.startAt, endAt: d.endAt })) };
}
async function submitVersion(session: ClientSession, event: Doc, input: ClubEventInput, actorId: Types.ObjectId, now: Date,
  assessment: Awaited<ReturnType<typeof assess>>) {
  const revisionNo = Number(event.currentRevisionNo ?? 0) + 1;
  const existingBudget = await m.eventBudgets!.findOne({ eventId: event._id }).session(session).lean();
  if (existingBudget && !input.budgetLines.length) conflict("an event with an approved budget must keep its budget lines when resubmitting");
  const direct = input.audienceScope === "MEMBERS_ONLY" && input.budgetLines.length === 0 && !existingBudget;
  const state = direct ? "Approved" : "Pending Approval";
  await m.eventProposalVersions!.create([{ eventId: event._id, revisionNo, payload: input, budgetLines: input.budgetLines,
    requestedBudgetTotal: Types.Decimal128.fromString(String(input.budgetLines.reduce((sum, line) => sum + line.amount, 0))),
    conflictResult: assessment.conflictResult, submittedBy: actorId, submittedAt: now }], { session });
  await m.events!.updateOne({ _id: event._id }, { $set: { ...fields(input, assessment.semesterCode), state, currentRevisionNo: revisionNo,
    conflictResult: assessment.conflictResult, conflictDetail: assessment.conflictDetail }, $unset: { revisionDeadlineAt: "" } }, { session });
  if (!direct) await m.approvalTasks!.create([{ entityType: "EVENT_PROPOSAL", entityId: event._id, clubId: event.clubId,
    title: input.title, state: "Open", openedAt: now }], { session });
  await m.propertyBookings!.updateMany({ eventId: event._id, _id: { $nin: input.bookingIds.map(oid) } }, { $unset: { eventId: "" } }, { session });
  for (const bookingId of input.bookingIds) await m.propertyBookings!.updateOne({ _id: oid(bookingId), clubId: event.clubId }, { $set: { eventId: event._id } }, { session });
  await audit(session, event._id as Types.ObjectId, direct ? "RECORD_INTERNAL" : "EVENT_PROPOSAL_SUBMITTED", actorId, { payload: input, state, revisionNo }, now);
}
export function mongoClubEventRepository(rules: ClubEventRules): ClubEventRepository {
  async function required(clubId: string, eventId: string) {
    const detail = await readClubEvent(clubId, eventId);
    if (!detail) throw new DomainError("event not found", "not_found");
    return detail;
  }
  return {
    async options(clubId) {
      const [properties, bookings] = await Promise.all([m.properties!.find({ isActive: true }).sort({ name: 1 }).lean(),
        m.propertyBookings!.find({ clubId: oid(clubId), state: { $in: ["Draft", "Requested", "Under Review", "Revision Requested", "Approved"] } }).lean()]);
      return { properties: properties.map((p) => ({ id: String(p._id), name: String(p.name) })),
        bookings: bookings.map((b) => ({ id: String(b._id), propertyId: String(b.propertyId), title: String(b.purpose), startAt: b.startAt as Date, endAt: b.endAt as Date })) };
    },
    async list(clubId) {
      const docs = await m.events!.find({ clubId: oid(clubId), organizerType: "CLUB" }).sort({ startAt: -1, _id: -1 }).lean();
      return Promise.all(docs.map(async (doc) => clubEventFrom(doc, await eventDraftPayload(doc._id as Types.ObjectId))));
    },
    find: readClubEvent, participants: readEventParticipants, feedback: readClubFeedback,
    async create(clubId, input, actorId, now) {
      const id = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        await assertEventWriteAccess(session, oid(clubId), oid(actorId), "club.event.manage", now);
        const assessment = await assess(session, oid(clubId), input, undefined, now, false, rules);
        await m.events!.create([{ _id: id, organizerType: "CLUB", clubId: oid(clubId), clubName: assessment.club.name,
          ...fields(input, assessment.semesterCode), state: "Draft", currentRevisionNo: 0, createdAt: now,
          conflictResult: assessment.conflictResult, conflictDetail: assessment.conflictDetail }], { session });
        await audit(session, id, "EVENT_DRAFT_CREATED", oid(actorId), { payload: input }, now);
      });
      return required(clubId, String(id));
    },
    async act(clubId, eventId, action, actorId, now) {
      await mongoose.connection.transaction(async (session) => {
        await assertEventWriteAccess(session, oid(clubId), oid(actorId), action.kind === "unlock" ? "ATTENDANCE_UNLOCK" : eventActionPermission(action), now);
        const event = await m.events!.findOneAndUpdate({ _id: oid(eventId), clubId: oid(clubId), organizerType: "CLUB",
          ...("expectedVersion" in action ? { __v: action.expectedVersion } : {}) }, { $inc: { __v: 1 } }, { session }).lean();
        if (!event) conflict("event changed or is not available in this club; reload and retry");
        const payload = await payloadInSession(session, event._id as Types.ObjectId);
        const input = { ...clubEventFrom(event, payload), budgetLines: (payload.budgetLines ?? []) as ClubEventInput["budgetLines"] };
        if (action.kind === "save" || action.kind === "submit") {
          if (!["Draft", "Revision Requested"].includes(String(event.state))) conflict("event cannot be edited or submitted");
          if (event.revisionDeadlineAt && (event.revisionDeadlineAt as Date) <= now) conflict("revision deadline has passed");
          const next = action.kind === "save" ? action.input : input;
          const assessment = await assess(session, oid(clubId), next, oid(eventId), now, action.kind === "submit", rules);
          if (action.kind === "save") {
            await m.events!.updateOne({ _id: event._id }, { $set: { ...fields(next, assessment.semesterCode), conflictResult: assessment.conflictResult,
              conflictDetail: assessment.conflictDetail } }, { session });
            await audit(session, oid(eventId), "EVENT_DRAFT_SAVED", oid(actorId), { payload: next }, now);
          } else await submitVersion(session, event, next, oid(actorId), now, assessment);
        } else if (action.kind === "publish") {
          if (event.state !== "Approved") conflict("only approved events can be published");
          validateEventPublication(action.input, event.startAt as Date, event.endAt as Date, now);
          const code = checkInCode(() => randomInt(1000000) / 1000000);
          await m.events!.updateOne({ _id: event._id }, { $set: { ...action.input, state: "Upcoming", publishedAt: now, checkInCode: code } }, { session });
          await audit(session, oid(eventId), "EVENT_PUBLISHED", oid(actorId), { state: "Upcoming", ...action.input }, now);
        } else if (action.kind === "cancel") {
          if (!["Approved", "Upcoming", "Ongoing"].includes(String(event.state))) conflict("event cannot be cancelled in its current state");
          await cancelEventInSession(session, event, action.reason, now, "CMB", rules.cancellationNoticeHours, oid(actorId));
        } else if (action.kind === "reschedule") {
          if (!["Approved", "Upcoming"].includes(String(event.state)) || event.attendanceFinalized === true) conflict("only an unstarted approved event can be rescheduled");
          if (await m.attendances!.exists({ eventId: event._id }).session(session)) conflict("an event with check-ins cannot be rescheduled");
          const offset = action.startAt.getTime() - input.startAt.getTime();
          const next = { ...input, startAt: action.startAt, endAt: action.endAt, propertyId: action.propertyId, venueText: action.venueText, bookingIds: [],
            occurrences: input.occurrences?.map((occurrence) => ({ startAt: new Date(occurrence.startAt.getTime() + offset), endAt: new Date(occurrence.endAt.getTime() + offset) })) };
          const assessment = await assess(session, oid(clubId), next, oid(eventId), now, false, rules);
          if (assessment.conflictResult === "Blocking Conflict") conflict("event schedule has blocking conflicts");
          await releaseFacilityBookingsInSession(session, { eventId: event._id, state: { $in: ["Draft", "Requested", "Under Review", "Revision Requested", "Approved"] } }, "EVENT_RESCHEDULE", action.reason, now);
          await submitVersion(session, event, next, oid(actorId), now, assessment);
          await audit(session, oid(eventId), "EVENT_RESCHEDULED", oid(actorId), { payload: next, previousStartAt: event.startAt, previousEndAt: event.endAt }, now, action.reason);
          const registrations = await m.eventRegistrations!.find({ eventId: event._id, state: { $in: ["Confirmed", "Waitlisted"] } }).session(session).lean();
          if (registrations.length) await m.notifications!.create(registrations.map((r) => ({ recipientUserId: r.studentId, eventCode: "EVENT_RESCHEDULED", entityType: "Event", entityId: event._id,
            channels: ["IN_APP"], payload: { title: event.title, startAt: action.startAt, endAt: action.endAt, reason: action.reason }, state: "Queued", dueAt: now, attempts: 0, createdAt: now })), { session, ordered: true });
        } else if (action.kind === "capacity" || action.kind === "promote") {
          if (event.state !== "Upcoming" || (event.startAt as Date) <= now || !(event.registrationOpenAt instanceof Date) || !(event.registrationCloseAt instanceof Date) ||
            event.registrationOpenAt > now || event.registrationCloseAt <= now) conflict("registration is not open");
          if (action.kind === "capacity") {
            if (action.capacity < Number(event.confirmedRegistrationCount)) {
              const affected = await m.eventRegistrations!.find({ eventId: event._id, state: "Confirmed" }).session(session).distinct("_id");
              throw new DomainError("capacity cannot be below confirmed registrations", "conflict", { registrationIds: affected.map(String) });
            }
            await m.events!.updateOne({ _id: event._id }, { $set: { capacity: action.capacity } }, { session });
            await promoteEventWaitlist(session, oid(eventId), now, oid(actorId));
          } else await promoteEventWaitlist(session, oid(eventId), now, oid(actorId), oid(action.registrationId));
          await audit(session, oid(eventId), `EVENT_${action.kind.toUpperCase()}`, oid(actorId), action, now);
        } else {
          const version = await m.eventProposalVersions!.findOne({ eventId: event._id, revisionNo: event.currentRevisionNo }).session(session).lean();
          const direct = event.audienceScope === "MEMBERS_ONLY" && Number(String(version?.requestedBudgetTotal ?? 0)) === 0 && !(await m.eventBudgets!.exists({ eventId: event._id }).session(session));
          await applyEventAttendanceAction(session, event, action, oid(actorId), now, direct);
          await audit(session, oid(eventId), `EVENT_ATTENDANCE_${action.kind.toUpperCase()}`, oid(actorId), action, now, "reason" in action ? action.reason : undefined);
        }
      });
      return required(clubId, eventId);
    },
  };
}
