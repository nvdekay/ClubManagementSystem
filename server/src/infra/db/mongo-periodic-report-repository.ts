import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  RETURN_SECTIONS,
  type PeriodFigures, type PeriodicOutcome, type PeriodicReportDetail, type PeriodicReportRepository, type PeriodicReportRow,
  type ReturnSection,
} from "../../domain/periodic-report.js";
import { clubBoardUserIds, queueNotifications } from "./club-board.js";
import { ucmsModels } from "./ucms-models.js";
import { insertViolationCase } from "./violation-case.js";

type Doc = Record<string, unknown>;
const TASK_TYPE = "PERIODIC_REPORT";
/** Clubs that owe a periodic report (UC38 precondition: Active, or Suspended/Dissolving with duties left). */
const owingStates = ["Active", "Suspended", "Dissolving"];
const submittedStates = ["Submitted", "Accepted", "Returned for correction"];
const heldEventStates = ["Completed", "Report Submitted", "Closed"];

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

function figuresFrom(raw: unknown): PeriodFigures {
  const doc = (raw && typeof raw === "object" ? raw : {}) as Doc;
  function part(key: string): Doc {
    return (doc[key] && typeof doc[key] === "object" ? doc[key] : {}) as Doc;
  }
  const events = part("events");
  const finance = part("finance");
  return {
    events: { completed: optionalNumber(events.completed), cancelled: optionalNumber(events.cancelled) },
    members: { active: optionalNumber(part("members").active) },
    attendance: { total: optionalNumber(part("attendance").total) },
    finance: { budgets: optionalNumber(finance.budgets), approvedTotal: optionalNumber(finance.approvedTotal),
      disbursedTotal: optionalNumber(finance.disbursedTotal) },
    ...(doc.capturedAt ? { capturedAt: new Date(String(doc.capturedAt)) } : {}),
  };
}

export async function periodicLiveFigures(clubId: Types.ObjectId, periodCode: string, session?: ClientSession): Promise<PeriodicReportDetail["live"]> {
    const m = ucmsModels;
    const [eventDocs, active, budgetDocs] = await Promise.all([
      m.events!.find({ clubId, semesterCode: periodCode }).select({ state: 1 }).session(session ?? null).lean(),
      m.clubMemberships!.countDocuments({ clubId, state: "Active" }).session(session ?? null),
      m.eventBudgets!.find({ clubId, periodCode, state: { $ne: "Cancelled" } })
        .select({ approvedTotal: 1, disbursedTotal: 1 }).session(session ?? null).lean(),
    ]);
    const held = eventDocs.filter((item) => heldEventStates.includes(String(item.state)));
    const total = await m.attendances!.countDocuments({ eventId: { $in: held.map((item) => item._id) } }).session(session ?? null);
    return {
      events: { completed: held.length, cancelled: eventDocs.filter((item) => item.state === "Cancelled").length },
      members: { active }, attendance: { total },
      finance: { budgets: budgetDocs.length, approvedTotal: budgetDocs.reduce((sum, item) => sum + money(item.approvedTotal), 0),
        disbursedTotal: budgetDocs.reduce((sum, item) => sum + money(item.disbursedTotal), 0) },
    };
  }


export function mongoPeriodicReportRepository(): PeriodicReportRepository {
  const m = ucmsModels;
  const reports = m.periodicReports!;

  async function missingCases(clubIds: Types.ObjectId[], periodCode: string): Promise<Map<string, string>> {
    const audits = await m.auditLogs!.find({ entityType: "Club", entityId: { $in: clubIds }, action: "PERIODIC_REPORT_MISSING",
      "after.periodCode": periodCode }).lean();
    return new Map(audits.map((item) => [String(item.entityId), String((item.after as Doc).violationId)]));
  }


  async function detail(id: Types.ObjectId): Promise<PeriodicReportDetail | null> {
    const report = await reports.findById(id).lean();
    if (!report) return null;
    const clubId = report.clubId as Types.ObjectId;
    const [club, figures, audits] = await Promise.all([
      m.clubs!.findById(clubId).select({ name: 1 }).lean(),
      periodicLiveFigures(clubId, String(report.periodCode)),
      m.auditLogs!.find({ entityType: "PeriodicReport", entityId: id }).sort({ at: -1 }).lean(),
    ]);
    const people = await m.users!.find({ _id: { $in: [...audits.map((item) => item.actorId), report.decidedBy].filter(Boolean) } })
      .select({ displayName: 1, email: 1 }).lean();
    const nameById = new Map(people.map((user) => [String(user._id), optionalText(user.displayName) ?? String(user.email)]));
    const outcome = optionalText(report.decisionOutcome) as PeriodicOutcome | undefined;
    // The return comments live on the decision's audit entry; the report row keeps only the outcome (UC39 FR-02).
    const returned = outcome === "Return" ? audits.find((item) => item.action === "PERIODIC_REPORT_RETURNED") : undefined;
    const sections = ((returned?.after as Doc | undefined)?.sections as string[] | undefined ?? [])
      .filter((item): item is ReturnSection => RETURN_SECTIONS.includes(item as ReturnSection));
    return {
      id: String(id), clubId: String(clubId), clubName: String(club?.name ?? ""), periodCode: String(report.periodCode),
      periodType: String(report.periodType ?? "SEMESTER"), state: String(report.state), versionNo: Number(report.versionNo ?? 1),
      revision: Number(report.__v ?? 0),
      versions: audits.filter((a) => a.action === "PERIODIC_REPORT_SUBMITTED").map((a) => {
        const snapshot = (a.after as { snapshot: import("../../domain/periodic-report.js").PeriodicReportVersion }).snapshot;
        const decision = audits.find((d) => ["PERIODIC_REPORT_ACCEPTED", "PERIODIC_REPORT_RETURNED"].includes(String(d.action))
          && (d.after as Doc | undefined)?.versionNo === snapshot.versionNo);
        return { ...snapshot, ...(decision ? { decision: { outcome: decision.action === "PERIODIC_REPORT_ACCEPTED" ? "Accept" : "Return",
          reason: optionalText(decision.reason), sections: (decision.after as Doc).sections as string[] | undefined,
          observation: optionalText((decision.after as Doc).observation), decidedAt: decision.at as Date } } : {}) };
      }),
      lateFlag: report.lateFlag === true, dueAt: report.dueAt as Date,
      ...(report.submittedAt ? { submittedAt: report.submittedAt as Date } : {}),
      narrative: optionalText(report.narrative), nextPlan: optionalText(report.nextPlan),
      evidence: Array.isArray(report.evidence) ? (report.evidence as Doc[]).map((item) => ({
        ...(optionalText(item.note) ? { note: String(item.note) } : {}), ...(optionalText(item.url) ? { url: String(item.url) } : {}) })) : [],
      preloadedFigures: figuresFrom(report.preloadedFigures), live: figures,
      ...(outcome && report.decidedAt ? { decision: { outcome, observation: optionalText(report.observation),
        reason: optionalText(returned?.reason), sections, decidedByName: nameById.get(String(report.decidedBy)),
        decidedAt: report.decidedAt as Date } } : {}),
      history: audits.map((item) => ({ action: String(item.action), at: item.at as Date,
        actorName: item.actorId ? nameById.get(String(item.actorId)) : undefined, reason: optionalText(item.reason) })),
    };
  }

  async function required(id: Types.ObjectId): Promise<PeriodicReportDetail> {
    const found = await detail(id);
    if (!found) throw new DomainError("periodic report not found", "not_found");
    return found;
  }

  return {
    async overview(periodCode, dueAt, now) {
      const reportDocs = await reports.find({ periodCode }).lean();
      const clubs = await m.clubs!.find({ $or: [{ state: { $in: owingStates } }, { _id: { $in: reportDocs.map((doc) => doc.clubId) } }] })
        .sort({ name: 1 }).collation({ locale: "vi" }).select({ name: 1, state: 1 }).lean();
      const cases = await missingCases(clubs.map((club) => club._id as Types.ObjectId), periodCode);
      const byClub = new Map(reportDocs.map((doc) => [String(doc.clubId), doc]));
      return clubs.map((club): PeriodicReportRow => {
        const report = byClub.get(String(club._id));
        const state = report ? String(report.state) : undefined;
        const due = (report?.dueAt as Date | undefined) ?? dueAt;
        return { clubId: String(club._id), clubName: String(club.name), clubState: String(club.state), dueAt: due,
          ...(report ? { reportId: String(report._id), state, versionNo: Number(report.versionNo ?? 1),
            lateFlag: report.lateFlag === true, ...(report.submittedAt ? { submittedAt: report.submittedAt as Date } : {}) } : {}),
          overdue: due < now && !submittedStates.includes(state ?? ""),
          ...(cases.has(String(club._id)) ? { violationId: cases.get(String(club._id)) } : {}) };
      });
    },

    async find(id) {
      return detail(new Types.ObjectId(id));
    },

    async decide(reportId, officerId, input, now) {
      const id = new Types.ObjectId(reportId);
      const actorId = new Types.ObjectId(officerId);
      await mongoose.connection.transaction(async (session) => {
        const report = await reports.findOne({ _id: id, state: "Submitted" }).session(session).lean();
        if (!report) return conflict("this report is not waiting for a decision");
        const nextState = input.outcome === "Accept" ? "Accepted" : "Returned for correction";
        const changed = await reports.updateOne({ _id: id, state: "Submitted" }, { $inc: { __v: 1 }, $set: { state: nextState,
          decisionOutcome: input.outcome, decidedBy: actorId, decidedAt: now,
          ...(input.observation ? { observation: input.observation } : {}) },
        ...(!input.observation ? { $unset: { observation: "" } } : {}) }, { session });
        if (changed.modifiedCount !== 1) return conflict("the report changed while deciding");
        await m.approvalTasks!.updateMany({ entityType: TASK_TYPE, entityId: id, state: "Open" },
          { $set: { state: "Decided", assigneeId: actorId, closedAt: now } }, { session });
        const action = input.outcome === "Accept" ? "PERIODIC_REPORT_ACCEPTED" : "PERIODIC_REPORT_RETURNED";
        await m.auditLogs!.create([{ entityType: "PeriodicReport", entityId: id, action, actorId, actorRole: "ICPDP_OFFICER",
          before: { state: "Submitted" }, after: { state: nextState, versionNo: report.versionNo ?? 1,
            ...(input.sections ? { sections: input.sections } : {}), ...(input.observation ? { observation: input.observation } : {}) },
          reason: input.reason, correlationId: randomUUID(), at: now }], { session });
        await queueNotifications(session, [...await clubBoardUserIds(report.clubId as Types.ObjectId, session), report.submittedBy],
          action, "PeriodicReport", id, { periodCode: report.periodCode, outcome: input.outcome, reason: input.reason,
            sections: input.sections, observation: input.observation }, now);
      });
      return required(id);
    },

    async recordMissing(clubId, periodCode, dueAt, officerId, input, now) {
      const club = new Types.ObjectId(clubId);
      let violationId: Types.ObjectId | undefined;
      await mongoose.connection.transaction(async (session) => {
        const found = await m.clubs!.findById(club).select({ name: 1 }).session(session).lean();
        if (!found) throw new DomainError("club not found", "not_found");
        const report = await reports.findOne({ clubId: club, periodCode }).session(session).lean();
        if (report && submittedStates.includes(String(report.state))) return conflict("the club has already submitted this report");
        if (await m.auditLogs!.exists({ entityType: "Club", entityId: club, action: "PERIODIC_REPORT_MISSING",
          "after.periodCode": periodCode }).session(session)) {
          return conflict("the missing report is already recorded");
        }
        violationId = await insertViolationCase(session, { clubId: club, originType: "OVERDUE_REPORT",
          severity: input.severity, title: `Không nộp báo cáo hoạt động định kỳ ${periodCode}`,
          description: `Hạn nộp ${dueAt.toISOString().slice(0, 10)} đã qua mà CLB chưa nộp báo cáo hoạt động kỳ ${periodCode}.`,
          evidenceNote: input.note }, officerId, now);
        await m.auditLogs!.create([{ entityType: "Club", entityId: club, action: "PERIODIC_REPORT_MISSING",
          actorId: new Types.ObjectId(officerId), actorRole: "ICPDP_OFFICER", after: { periodCode, violationId, dueAt },
          reason: input.note, correlationId: randomUUID(), at: now }], { session });
        await queueNotifications(session, await clubBoardUserIds(club, session), "PERIODIC_REPORT_MISSING", "Club", club,
          { periodCode, violationId }, now);
      });
      return { violationId: String(violationId) };
    },
  };
}
