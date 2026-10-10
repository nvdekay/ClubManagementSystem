import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  attendanceMismatch, reportDueAt,
  type LiveFigures, type MissingReport, type PostEventOutcome, type PostEventReportDetail, type PostEventReportRepository,
  type PostEventReportSummary, type PreloadedFigures, type ReportEvidence,
} from "../../domain/post-event-report.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { ucmsModels } from "./ucms-models.js";
import { insertViolationCase } from "./violation-case.js";

type Doc = Record<string, unknown>;
const TASK_TYPE = "POST_EVENT_REPORT";
const DAY_MS = 24 * 60 * 60 * 1000;
const outcomes = new Set<string>(["Accept", "Return", "AcceptWithFinding"]);

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function money(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const parsed = Number(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function conflict(message: string): never {
  throw new DomainError(message, "conflict");
}

function figuresFrom(raw: unknown): PreloadedFigures {
  const doc = (raw && typeof raw === "object" ? raw : {}) as Doc;
  const attendance = (doc.attendance ?? {}) as Doc;
  const budget = doc.budget as Doc | undefined;
  const feedback = doc.feedback as Doc | undefined;
  return {
    attendance: { registered: optionalNumber(attendance.registered), checkedIn: optionalNumber(attendance.checkedIn) },
    ...(budget ? { budget: { approvedTotal: optionalNumber(budget.approvedTotal),
      disbursedTotal: optionalNumber(budget.disbursedTotal), expenseTotal: optionalNumber(budget.expenseTotal) } } : {}),
    ...(feedback ? { feedback: { count: optionalNumber(feedback.count), average: optionalNumber(feedback.average) } } : {}),
    ...(doc.capturedAt ? { capturedAt: new Date(String(doc.capturedAt)) } : {}),
  };
}

function evidenceFrom(raw: unknown): ReportEvidence[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item: unknown) => {
    if (!item || typeof item !== "object") return [];
    const doc = item as Doc;
    const note = optionalText(doc.note);
    const url = optionalText(doc.url);
    return note || url ? [{ ...(note ? { note } : {}), ...(url ? { url } : {}) }] : [];
  });
}

export function mongoPostEventReportRepository(): PostEventReportRepository {
  const m = ucmsModels;
  const reports = m.postEventReports!;
  const events = m.events!;

  function summaryFrom(report: Doc, event: Doc | undefined, dueDays: number): PostEventReportSummary {
    const endAt = (event?.endAt as Date | undefined) ?? new Date(0);
    return { id: String(report._id), eventId: String(report.eventId), eventTitle: String(event?.title ?? ""),
      clubId: String(report.clubId), clubName: String(event?.clubName ?? ""), eventEndAt: endAt,
      state: String(report.state), versionNo: Number(report.versionNo ?? 1), lateFlag: report.lateFlag === true,
      ...(report.submittedAt ? { submittedAt: report.submittedAt as Date } : {}), dueAt: reportDueAt(endAt, dueDays) };
  }

  /**
   * Only an event the system approved owes a report (it has a UC25 proposal on file); events BR53 recorded
   * directly (members-only without money) close at UC32 and owe none.
   */
  async function owingEvents(filter: Doc, session?: ClientSession): Promise<Doc[]> {
    const docs = await events.find({ organizerType: "CLUB", state: "Completed", ...filter })
      .select({ title: 1, clubId: 1, clubName: 1, endAt: 1, audienceScope: 1 }).session(session ?? null).lean();
    const ids = docs.map((doc) => doc._id);
    const [proposed, funded] = await Promise.all([
      m.eventProposalVersions!.find({ eventId: { $in: ids } }).session(session ?? null).distinct("eventId"),
      m.eventBudgets!.find({ eventId: { $in: ids } }).session(session ?? null).distinct("eventId"),
    ]);
    const withProposal = new Set(proposed.map(String));
    const withBudget = new Set(funded.map(String));
    return docs.filter((doc) => withProposal.has(String(doc._id))
      && (doc.audienceScope !== "MEMBERS_ONLY" || withBudget.has(String(doc._id))));
  }

  async function live(eventId: Types.ObjectId, event: Doc, session?: ClientSession): Promise<LiveFigures> {
    const [registered, checkedIn, budget, feedbackDocs] = await Promise.all([
      m.eventRegistrations!.countDocuments({ eventId, state: "Confirmed" }).session(session ?? null),
      m.attendances!.countDocuments({ eventId }).session(session ?? null),
      m.eventBudgets!.findOne({ eventId }).select({ state: 1, approvedTotal: 1, disbursedTotal: 1 }).session(session ?? null).lean(),
      m.eventFeedbacks!.find({ eventId }).select({ scores: 1 }).session(session ?? null).lean(),
    ]);
    const ratings = feedbackDocs.flatMap((item) => Array.isArray(item.scores)
      ? (item.scores as { score?: unknown }[]).map((score) => Number(score.score)).filter(Number.isFinite).slice(0, 1) : []);
    return { registered, checkedIn, attendanceFinalized: event.attendanceFinalized === true,
      ...(budget ? { budget: { state: String(budget.state), approvedTotal: money(budget.approvedTotal),
        disbursedTotal: money(budget.disbursedTotal) } } : {}),
      feedback: { count: ratings.length,
        ...(ratings.length ? { average: Math.round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length * 10) / 10 } : {}) } };
  }

  async function detail(id: Types.ObjectId, dueDays: number): Promise<PostEventReportDetail | null> {
    const report = await reports.findById(id).lean();
    if (!report) return null;
    const eventId = report.eventId as Types.ObjectId;
    const event = await events.findById(eventId).lean();
    if (!event) return null;
    const [figures, audits] = await Promise.all([
      live(eventId, event),
      m.auditLogs!.find({ entityType: "PostEventReport", entityId: id }).sort({ at: -1 }).lean(),
    ]);
    const people = await m.users!.find({ _id: { $in: [...audits.map((item) => item.actorId), report.decidedBy].filter(Boolean) } })
      .select({ displayName: 1, email: 1 }).lean();
    const nameById = new Map(people.map((user) => [String(user._id), optionalText(user.displayName) ?? String(user.email)]));
    const preloaded = figuresFrom(report.preloadedFigures);
    const outcome = optionalText(report.decisionOutcome);
    return {
      ...summaryFrom(report, event, dueDays),
      event: { id: String(eventId), title: String(event.title), objective: optionalText(event.objective),
        startAt: event.startAt as Date, endAt: event.endAt as Date, state: String(event.state),
        capacity: Number(event.capacity ?? 0), audienceScope: String(event.audienceScope ?? "PUBLIC"),
        approvalConditions: Array.isArray(event.approvalConditions) ? event.approvalConditions.map(String) : [],
        ...(optionalText(event.venueText) ? { venue: String(event.venueText) } : {}) },
      preloadedFigures: preloaded, actualResult: String(report.actualResult ?? ""),
      incidents: optionalText(report.incidents), lessonsLearned: optionalText(report.lessonsLearned),
      evidence: evidenceFrom(report.evidence), live: figures, attendanceMismatch: attendanceMismatch(preloaded, figures),
      ...(outcome && outcomes.has(outcome) && report.decidedBy ? { decision: { outcome: outcome as PostEventOutcome,
        reason: optionalText(report.decisionReason), decidedBy: String(report.decidedBy),
        decidedByName: nameById.get(String(report.decidedBy)), decidedAt: report.decidedAt as Date,
        ...(report.findingViolationId ? { findingViolationId: String(report.findingViolationId) } : {}) } } : {}),
      history: audits.map((item) => ({ action: String(item.action), at: item.at as Date,
        actorName: item.actorId ? nameById.get(String(item.actorId)) : undefined, reason: optionalText(item.reason) })),
    };
  }

  async function required(id: Types.ObjectId, dueDays: number): Promise<PostEventReportDetail> {
    const found = await detail(id, dueDays);
    if (!found) throw new DomainError("post-event report not found", "not_found");
    return found;
  }

  return {
    async queue(now, dueDays) {
      const submittedDocs = await reports.find({ state: "Submitted" }).sort({ submittedAt: 1, _id: 1 }).lean();
      const cutoff = new Date(now.getTime() - dueDays * DAY_MS);
      const overdue = await owingEvents({ endAt: { $lt: cutoff } });
      const [eventDocs, reportsOfOverdue, cases] = await Promise.all([
        events.find({ _id: { $in: submittedDocs.map((doc) => doc.eventId) } }).select({ title: 1, clubName: 1, endAt: 1 }).lean(),
        reports.find({ eventId: { $in: overdue.map((doc) => doc._id) }, state: { $ne: "Draft" } }).select({ eventId: 1 }).lean(),
        m.violations!.find({ originType: "OVERDUE_REPORT", originRefId: { $in: overdue.map((doc) => doc._id) } })
          .select({ originRefId: 1 }).lean(),
      ]);
      const eventById = new Map(eventDocs.map((doc) => [String(doc._id), doc]));
      const reported = new Set(reportsOfOverdue.map((doc) => String(doc.eventId)));
      const caseByEvent = new Map(cases.map((doc) => [String(doc.originRefId), String(doc._id)]));
      const missing: MissingReport[] = overdue.filter((doc) => !reported.has(String(doc._id)))
        .sort((left, right) => (left.endAt as Date).getTime() - (right.endAt as Date).getTime())
        .map((doc) => ({ eventId: String(doc._id), eventTitle: String(doc.title), clubId: String(doc.clubId),
          clubName: String(doc.clubName ?? ""), eventEndAt: doc.endAt as Date, dueAt: reportDueAt(doc.endAt as Date, dueDays),
          ...(caseByEvent.has(String(doc._id)) ? { violationId: caseByEvent.get(String(doc._id)) } : {}) }));
      return { submitted: submittedDocs.map((doc) => summaryFrom(doc, eventById.get(String(doc.eventId)), dueDays)), missing };
    },

    async find(id, _now, dueDays) {
      return detail(new Types.ObjectId(id), dueDays);
    },

    async decide(reportId, officerId, input, now, dueDays) {
      const id = new Types.ObjectId(reportId);
      const actorId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const report = await reports.findOne({ _id: id, state: "Submitted" }).session(session).lean();
        if (!report) return conflict("this report is not waiting for a decision");
        const eventId = report.eventId as Types.ObjectId;
        const event = await events.findOne({ _id: eventId, state: "Report Submitted" }).session(session).lean();
        if (!event) return conflict("the event is not waiting for its report decision");
        if (input.outcome !== "Return"
          && attendanceMismatch(figuresFrom(report.preloadedFigures), await live(eventId, event, session))) {
          // E1: figures that contradict the finalized attendance cannot be accepted.
          return conflict("the report's attendance contradicts the finalized attendance; return it for correction");
        }
        let violationId: Types.ObjectId | undefined;
        if (input.outcome === "AcceptWithFinding" && input.finding) {
          violationId = await insertViolationCase(session, { clubId: report.clubId as Types.ObjectId,
            originType: "REPORT_FINDING", originRefId: eventId, severity: input.finding.severity, title: input.finding.title,
            description: input.finding.description, evidenceNote: input.reason }, officerId, now);
        }
        const reportState = input.outcome === "Return" ? "Returned for correction" : "Accepted";
        const eventState = input.outcome === "Return" ? "Completed" : "Closed";
        const changed = await reports.updateOne({ _id: id, state: "Submitted" }, { $set: { state: reportState,
          decisionOutcome: input.outcome, decidedBy: actorId, decidedAt: now,
          ...(input.reason ? { decisionReason: input.reason } : {}), ...(violationId ? { findingViolationId: violationId } : {}) },
        ...(!input.reason ? { $unset: { decisionReason: "" } } : {}) }, { session });
        if (changed.modifiedCount !== 1) return conflict("the report changed while deciding");
        await events.updateOne({ _id: eventId, state: "Report Submitted" }, { $set: { state: eventState } }, { session });
        await m.approvalTasks!.updateMany({ entityType: TASK_TYPE, entityId: id, state: "Open" },
          { $set: { state: "Decided", assigneeId: actorId, closedAt: now } }, { session });
        const action = input.outcome === "Return" ? "POST_EVENT_REPORT_RETURNED" : input.outcome === "Accept"
          ? "POST_EVENT_REPORT_ACCEPTED" : "POST_EVENT_REPORT_ACCEPTED_WITH_FINDING";
        await m.auditLogs!.create([{ entityType: "PostEventReport", entityId: id, action, actorId, actorRole: "ICPDP_OFFICER",
          before: { state: "Submitted", eventState: "Report Submitted" },
          after: { state: reportState, eventState, versionNo: report.versionNo ?? 1, ...(violationId ? { violationId } : {}) },
          reason: input.reason, correlationId: randomUUID(), at: now }], { session });
        await queueNotifications(session, [...await clubBoardUserIds(report.clubId as Types.ObjectId, session), report.submittedBy],
          action, "PostEventReport", id, { title: event.title, outcome: input.outcome, reason: input.reason }, now);
      });
      return required(id, dueDays);
    },

    async recordMissing(eventId, officerId, input, now, dueDays) {
      const id = new Types.ObjectId(eventId);
      let violationId: Types.ObjectId | undefined;
      await mongoose.connection.transaction(async (session) => {
        const [event] = await owingEvents({ _id: id }, session);
        if (!event) return conflict("this event owes no post-event report");
        if (reportDueAt(event.endAt as Date, dueDays) > now) return conflict("the report deadline has not passed yet");
        if (await reports.exists({ eventId: id, state: { $ne: "Draft" } }).session(session)) {
          return conflict("the club has already submitted a report");
        }
        if (await m.violations!.exists({ originType: "OVERDUE_REPORT", originRefId: id }).session(session)) {
          return conflict("the missing report is already recorded");
        }
        violationId = await insertViolationCase(session, { clubId: event.clubId as Types.ObjectId, originType: "OVERDUE_REPORT",
          originRefId: id, severity: input.severity, title: `Không nộp báo cáo sau sự kiện: ${String(event.title)}`,
          description: `Hạn nộp ${reportDueAt(event.endAt as Date, dueDays).toISOString().slice(0, 10)} đã qua mà CLB chưa nộp báo cáo.`,
          evidenceNote: input.note }, officerId, now);
        await m.auditLogs!.create([{ entityType: "Event", entityId: id, action: "POST_EVENT_REPORT_MISSING",
          actorId: new Types.ObjectId(officerId), actorRole: "ICPDP_OFFICER", after: { violationId },
          reason: input.note, correlationId: randomUUID(), at: now }], { session });
        await queueNotifications(session, await clubBoardUserIds(event.clubId as Types.ObjectId, session),
          "POST_EVENT_REPORT_MISSING", "Event", id, { title: event.title, violationId }, now);
      });
      return { violationId: String(violationId) };
    },
  };
}
