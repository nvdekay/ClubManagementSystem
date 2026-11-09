import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import {
  CUSTOM_FIELD_TYPES,
  RETURN_SECTIONS,
  type CustomFieldType,
  type PeriodicAchievementEntry,
  type PeriodicCampaign,
  type PeriodicCustomAnswer,
  type PeriodicCustomField,
  type PeriodicEventEntry,
  type PeriodicMemberEntry,
  type PeriodicOutcome,
  type PeriodicReportDetail,
  type PeriodicReportRepository,
  type PeriodicReportRow,
  type PeriodicReportVersion,
  type PeriodicSystemSnapshot,
  type PeriodFigures,
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

function fallbackStudentCode(email: string, index: number): string {
  const match = email.match(/([a-z]{2}\d{6})@/i);
  if (match?.[1]) return match[1].toUpperCase();
  const prefix = email.split("@")[0]?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return prefix ? prefix.slice(0, 12) : `SV${String(index + 1).padStart(4, "0")}`;
}

export function parseMembersList(raw: unknown): PeriodicMemberEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item, idx) => {
    const doc = (item && typeof item === "object" ? item : {}) as Doc;
    const email = String(doc.email ?? "");
    return {
      ...(optionalText(doc.userId) ? { userId: String(doc.userId) } : {}),
      fullName: String(doc.fullName ?? ""),
      studentCode: optionalText(doc.studentCode) ?? fallbackStudentCode(email, idx),
      email,
      activityScore: optionalNumber(doc.activityScore) ?? 0,
      source: doc.source === "SYSTEM" ? "SYSTEM" : "MANUAL",
    };
  });
}

export function parseEventsList(raw: unknown): PeriodicEventEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item) => {
    const doc = (item && typeof item === "object" ? item : {}) as Doc;
    return {
      ...(optionalText(doc.eventId) ? { eventId: String(doc.eventId) } : {}),
      title: String(doc.title ?? ""),
      description: String(doc.description ?? ""),
      heldAt: String(doc.heldAt ?? ""),
      participantCount: optionalNumber(doc.participantCount) ?? 0,
      ...(optionalText(doc.evidenceUrl) ? { evidenceUrl: String(doc.evidenceUrl) } : {}),
      ...(optionalText(doc.evidenceNote) ? { evidenceNote: String(doc.evidenceNote) } : {}),
      source: doc.source === "SYSTEM" ? "SYSTEM" : "MANUAL",
    };
  });
}

export function parseAchievementsList(raw: unknown): PeriodicAchievementEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item) => {
    const doc = (item && typeof item === "object" ? item : {}) as Doc;
    return {
      title: String(doc.title ?? ""),
      description: String(doc.description ?? ""),
      ...(optionalText(doc.evidenceUrl) ? { evidenceUrl: String(doc.evidenceUrl) } : {}),
      ...(optionalText(doc.evidenceNote) ? { evidenceNote: String(doc.evidenceNote) } : {}),
    };
  });
}

export function parseCustomAnswersList(raw: unknown): PeriodicCustomAnswer[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item) => {
    const doc = (item && typeof item === "object" ? item : {}) as Doc;
    const type = optionalText(doc.type) as CustomFieldType | undefined;
    return {
      fieldId: String(doc.fieldId ?? ""),
      ...(optionalText(doc.label) ? { label: String(doc.label) } : {}),
      ...(type && CUSTOM_FIELD_TYPES.includes(type) ? { type } : {}),
      ...(optionalText(doc.textValue) ? { textValue: String(doc.textValue) } : {}),
      ...(optionalNumber(doc.numberValue) !== undefined ? { numberValue: optionalNumber(doc.numberValue) } : {}),
      ...(optionalText(doc.evidenceUrl) ? { evidenceUrl: String(doc.evidenceUrl) } : {}),
    };
  });
}

function parseSystemSnapshot(raw: unknown): PeriodicSystemSnapshot | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const doc = raw as Doc;
  const members = parseMembersList(doc.members);
  const events = parseEventsList(doc.events);
  if (!members && !events) return undefined;
  return { members: members ?? [], events: events ?? [] };
}

function figuresFrom(raw: unknown): PeriodFigures {
  const doc = (raw && typeof raw === "object" ? raw : {}) as Doc;
  function part(key: string): Doc {
    return (doc[key] && typeof doc[key] === "object" ? doc[key] : {}) as Doc;
  }
  const events = part("events");
  const finance = part("finance");
  const systemData = parseSystemSnapshot(doc.systemData);
  return {
    events: { completed: optionalNumber(events.completed), cancelled: optionalNumber(events.cancelled) },
    members: { active: optionalNumber(part("members").active) },
    attendance: { total: optionalNumber(part("attendance").total) },
    finance: {
      budgets: optionalNumber(finance.budgets),
      approvedTotal: optionalNumber(finance.approvedTotal),
      disbursedTotal: optionalNumber(finance.disbursedTotal),
    },
    ...(doc.capturedAt ? { capturedAt: new Date(String(doc.capturedAt)) } : {}),
    ...(systemData ? { systemData } : {}),
  };
}

export async function periodicSystemData(
  clubId: Types.ObjectId,
  periodCode: string,
  session?: ClientSession,
): Promise<PeriodicSystemSnapshot> {
  const m = ucmsModels;
  const s = session ?? null;
  const [memberships, eventDocs] = await Promise.all([
    m.clubMemberships!.find({ clubId, state: "Active" }).select({ userId: 1 }).session(s).lean(),
    m.events!.find({ clubId, semesterCode: periodCode, state: { $in: heldEventStates } })
      .select({ title: 1, description: 1, objective: 1, startAt: 1 })
      .sort({ startAt: 1 })
      .session(s)
      .lean(),
  ]);
  const userIds = memberships.map((item) => item.userId as Types.ObjectId);
  const eventIds = eventDocs.map((item) => item._id as Types.ObjectId);
  const [users, profiles, attendances] = await Promise.all([
    userIds.length
      ? m.users!.find({ _id: { $in: userIds } }).select({ displayName: 1, email: 1 }).session(s).lean()
      : Promise.resolve([]),
    userIds.length && m.studentProfiles
      ? m.studentProfiles.find({ userId: { $in: userIds } }).select({ userId: 1, studentCode: 1, fullName: 1 }).session(s).lean()
      : Promise.resolve([]),
    eventIds.length
      ? m.attendances!.find({ eventId: { $in: eventIds } }).select({ eventId: 1 }).session(s).lean()
      : Promise.resolve([]),
  ]);
  const userById = new Map(users.map((u) => [String(u._id), u]));
  const profileByUserId = new Map(profiles.map((p) => [String(p.userId), p]));
  const attendanceByEvent = new Map<string, number>();
  for (const att of attendances) {
    const key = String(att.eventId);
    attendanceByEvent.set(key, (attendanceByEvent.get(key) ?? 0) + 1);
  }

  const members: PeriodicMemberEntry[] = memberships.map((membership, idx): PeriodicMemberEntry => {
    const uid = String(membership.userId);
    const user = userById.get(uid);
    const profile = profileByUserId.get(uid);
    const email = String(user?.email ?? "");
    const fullName = optionalText(profile?.fullName) ?? optionalText(user?.displayName) ?? email;
    const studentCode = optionalText(profile?.studentCode) ?? fallbackStudentCode(email, idx);
    return {
      userId: uid,
      fullName,
      studentCode,
      email,
      activityScore: 8,
      source: "SYSTEM",
    };
  }).sort((a, b) => a.fullName.localeCompare(b.fullName, "vi"));

  const events: PeriodicEventEntry[] = eventDocs.map((ev) => {
    const eid = String(ev._id);
    const startAt = ev.startAt instanceof Date ? ev.startAt.toISOString().slice(0, 10) : String(ev.startAt ?? "");
    return {
      eventId: eid,
      title: String(ev.title ?? ""),
      description: optionalText(ev.description) ?? optionalText(ev.objective) ?? String(ev.title ?? ""),
      heldAt: startAt,
      participantCount: attendanceByEvent.get(eid) ?? 0,
      source: "SYSTEM",
    };
  });

  return { members, events };
}

export async function periodicLiveFigures(
  clubId: Types.ObjectId,
  periodCode: string,
  session?: ClientSession,
): Promise<PeriodicReportDetail["live"]> {
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
    members: { active },
    attendance: { total },
    finance: {
      budgets: budgetDocs.length,
      approvedTotal: budgetDocs.reduce((sum, item) => sum + money(item.approvedTotal), 0),
      disbursedTotal: budgetDocs.reduce((sum, item) => sum + money(item.disbursedTotal), 0),
    },
  };
}

function parseCustomFields(raw: unknown): PeriodicCustomField[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const doc = (item && typeof item === "object" ? item : {}) as Doc;
    const id = optionalText(doc.id);
    const label = optionalText(doc.label);
    const type = optionalText(doc.type) as CustomFieldType | undefined;
    if (!id || !label || !type || !CUSTOM_FIELD_TYPES.includes(type)) return [];
    return [{
      id,
      label,
      ...(optionalText(doc.description) ? { description: String(doc.description) } : {}),
      type,
      required: Boolean(doc.required),
    }];
  });
}

export async function findPeriodicCampaign(periodCode: string, session?: ClientSession): Promise<PeriodicCampaign | null> {
  const m = ucmsModels;
  const s = session ?? null;
  const audit = await m.auditLogs!.findOne({
    entityType: "PeriodicCampaign",
    action: "PERIODIC_REPORT_CAMPAIGN_SAVED",
    "after.periodCode": periodCode,
  }).sort({ at: -1, _id: -1 }).session(s).lean();

  if (audit) {
    const after = (audit.after && typeof audit.after === "object" ? audit.after : {}) as Doc;
    return {
      periodCode,
      isOpen: Boolean(after.isOpen),
      dueAt: new Date(String(after.dueAt)),
      ...(optionalText(after.announcement) ? { announcement: String(after.announcement) } : {}),
      customFields: parseCustomFields(after.customFields),
      updatedAt: audit.at as Date,
    };
  }
  return null;
}

export function mongoPeriodicReportRepository(): PeriodicReportRepository {
  const m = ucmsModels;
  const reports = m.periodicReports!;

  async function missingCases(clubIds: Types.ObjectId[], periodCode: string): Promise<Map<string, string>> {
    const audits = await m.auditLogs!.find({
      entityType: "Club",
      entityId: { $in: clubIds },
      action: "PERIODIC_REPORT_MISSING",
      "after.periodCode": periodCode,
    }).lean();
    return new Map(audits.map((item) => [String(item.entityId), String((item.after as Doc).violationId)]));
  }

  async function detail(id: Types.ObjectId): Promise<PeriodicReportDetail | null> {
    const report = await reports.findById(id).lean();
    if (!report) return null;
    const clubId = report.clubId as Types.ObjectId;
    const periodCode = String(report.periodCode);
    const [club, figures, liveSysData, audits, campaign] = await Promise.all([
      m.clubs!.findById(clubId).select({ name: 1 }).lean(),
      periodicLiveFigures(clubId, periodCode),
      periodicSystemData(clubId, periodCode),
      m.auditLogs!.find({ entityType: "PeriodicReport", entityId: id }).sort({ at: -1 }).lean(),
      findPeriodicCampaign(periodCode),
    ]);
    const people = await m.users!.find({ _id: { $in: [...audits.map((item) => item.actorId), report.decidedBy].filter(Boolean) } })
      .select({ displayName: 1, email: 1 }).lean();
    const nameById = new Map(people.map((user) => [String(user._id), optionalText(user.displayName) ?? String(user.email)]));
    const outcome = optionalText(report.decisionOutcome) as PeriodicOutcome | undefined;
    // The return comments live on the decision's audit entry; the report row keeps only the outcome (UC39 FR-02).
    const returned = outcome === "Return" ? audits.find((item) => item.action === "PERIODIC_REPORT_RETURNED") : undefined;
    const returnedAfter = (returned?.after as Doc | undefined) ?? {};
    const sections = ((returnedAfter.sections as string[] | undefined) ?? [])
      .filter((item): item is ReturnSection => RETURN_SECTIONS.includes(item as ReturnSection));
    const resubmitDueAt = returnedAfter.resubmitDueAt ? new Date(String(returnedAfter.resubmitDueAt)) : undefined;

    const rawPreloaded = (report.preloadedFigures && typeof report.preloadedFigures === "object" ? report.preloadedFigures : {}) as Doc;
    const clubData = (rawPreloaded.clubData && typeof rawPreloaded.clubData === "object" ? rawPreloaded.clubData : {}) as Doc;
    const parsedFigures = figuresFrom(report.preloadedFigures);
    const systemData = parsedFigures.systemData ?? liveSysData;

    const members = parseMembersList(clubData.members) ?? systemData.members;
    const events = parseEventsList(clubData.events) ?? systemData.events;
    const achievements = parseAchievementsList(clubData.achievements) ?? [];
    const customAnswers = parseCustomAnswersList(clubData.customAnswers) ?? [];

    const versions: PeriodicReportVersion[] = audits
      .filter((a) => a.action === "PERIODIC_REPORT_SUBMITTED")
      .map((a) => {
        const snapshot = (a.after as { snapshot: Record<string, unknown> }).snapshot ?? {};
        const vNo = Number(snapshot.versionNo ?? 1);
        const decision = audits.find((d) =>
          ["PERIODIC_REPORT_ACCEPTED", "PERIODIC_REPORT_RETURNED"].includes(String(d.action))
          && (d.after as Doc | undefined)?.versionNo === vNo);
        const decisionAfter = (decision?.after as Doc | undefined) ?? {};
        return {
          versionNo: vNo,
          narrative: String(snapshot.narrative ?? ""),
          nextPlan: String(snapshot.nextPlan ?? ""),
          evidence: Array.isArray(snapshot.evidence)
            ? (snapshot.evidence as Doc[]).map((item) => ({
                ...(optionalText(item.note) ? { note: String(item.note) } : {}),
                ...(optionalText(item.url) ? { url: String(item.url) } : {}),
              }))
            : [],
          ...(parseMembersList(snapshot.members) ? { members: parseMembersList(snapshot.members) } : {}),
          ...(parseEventsList(snapshot.events) ? { events: parseEventsList(snapshot.events) } : {}),
          ...(parseAchievementsList(snapshot.achievements) ? { achievements: parseAchievementsList(snapshot.achievements) } : {}),
          ...(parseCustomAnswersList(snapshot.customAnswers) ? { customAnswers: parseCustomAnswersList(snapshot.customAnswers) } : {}),
          preloadedFigures: figuresFrom(snapshot.preloadedFigures),
          submittedAt: new Date(String(snapshot.submittedAt ?? a.at)),
          ...(decision
            ? {
                decision: {
                  outcome: decision.action === "PERIODIC_REPORT_ACCEPTED" ? "Accept" : "Return",
                  reason: optionalText(decision.reason),
                  sections: decisionAfter.sections as string[] | undefined,
                  observation: optionalText(decisionAfter.observation),
                  ...(decisionAfter.resubmitDueAt ? { resubmitDueAt: new Date(String(decisionAfter.resubmitDueAt)) } : {}),
                  decidedAt: decision.at as Date,
                },
              }
            : {}),
        };
      });

    return {
      id: String(id),
      clubId: String(clubId),
      clubName: String(club?.name ?? ""),
      periodCode,
      periodType: String(report.periodType ?? "SEMESTER"),
      state: String(report.state),
      versionNo: Number(report.versionNo ?? 1),
      revision: Number(report.__v ?? 0),
      versions,
      lateFlag: report.lateFlag === true,
      dueAt: report.dueAt as Date,
      ...(resubmitDueAt ? { resubmitDueAt } : {}),
      ...(report.submittedAt ? { submittedAt: report.submittedAt as Date } : {}),
      narrative: optionalText(report.narrative),
      nextPlan: optionalText(report.nextPlan),
      evidence: Array.isArray(report.evidence)
        ? (report.evidence as Doc[]).map((item) => ({
            ...(optionalText(item.note) ? { note: String(item.note) } : {}),
            ...(optionalText(item.url) ? { url: String(item.url) } : {}),
          }))
        : [],
      members,
      events,
      achievements,
      customAnswers,
      ...(campaign ? { campaign } : {}),
      systemData,
      preloadedFigures: parsedFigures,
      live: figures,
      ...(outcome && report.decidedAt
        ? {
            decision: {
              outcome,
              observation: optionalText(report.observation),
              reason: optionalText(returned?.reason),
              sections,
              ...(resubmitDueAt ? { resubmitDueAt } : {}),
              decidedByName: nameById.get(String(report.decidedBy)),
              decidedAt: report.decidedAt as Date,
            },
          }
        : {}),
      history: audits.map((item) => ({
        action: String(item.action),
        at: item.at as Date,
        actorName: item.actorId ? nameById.get(String(item.actorId)) : undefined,
        reason: optionalText(item.reason),
      })),
    };
  }

  async function required(id: Types.ObjectId): Promise<PeriodicReportDetail> {
    const found = await detail(id);
    if (!found) throw new DomainError("periodic report not found", "not_found");
    return found;
  }

  return {
    async getCampaign(periodCode) {
      return findPeriodicCampaign(periodCode);
    },

    async saveCampaign(officerId, input, now) {
      const actorId = new Types.ObjectId(officerId);
      const entityId = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        await m.auditLogs!.create([{
          entityType: "PeriodicCampaign",
          entityId,
          action: "PERIODIC_REPORT_CAMPAIGN_SAVED",
          actorId,
          actorRole: "ICPDP_OFFICER",
          after: {
            periodCode: input.periodCode,
            isOpen: input.isOpen,
            dueAt: input.dueAt,
            ...(input.announcement ? { announcement: input.announcement } : {}),
            customFields: input.customFields,
          },
          correlationId: randomUUID(),
          at: now,
        }], { session });

        await reports.updateMany(
          { periodCode: input.periodCode, state: "Draft" },
          { $set: { dueAt: input.dueAt } },
          { session },
        );

        if (input.isOpen) {
          const clubs = await m.clubs!.find({ state: { $in: owingStates } }).select({ _id: 1 }).session(session).lean();
          for (const club of clubs) {
            const clubId = club._id as Types.ObjectId;
            const recipients = await clubBoardUserIds(clubId, session);
            if (recipients.length) {
              await queueNotifications(
                session,
                recipients,
                "PERIODIC_REPORT_OPENED",
                "Club",
                clubId,
                {
                  clubId: String(clubId),
                  periodCode: input.periodCode,
                  dueAt: input.dueAt,
                  ...(input.announcement ? { announcement: input.announcement } : {}),
                },
                now,
              );
            }
          }
        }
      });
      return { ...input, updatedAt: now };
    },

    async overview(periodCode, dueAt, now) {
      const reportDocs = await reports.find({ periodCode }).lean();
      const clubs = await m.clubs!.find({
        $or: [{ state: { $in: owingStates } }, { _id: { $in: reportDocs.map((doc) => doc.clubId) } }],
      }).sort({ name: 1 }).collation({ locale: "vi" }).select({ name: 1, state: 1 }).lean();
      const cases = await missingCases(clubs.map((club) => club._id as Types.ObjectId), periodCode);
      const byClub = new Map(reportDocs.map((doc) => [String(doc.clubId), doc]));
      return clubs.map((club): PeriodicReportRow => {
        const report = byClub.get(String(club._id));
        const state = report ? String(report.state) : undefined;
        const due = (report?.dueAt as Date | undefined) ?? dueAt;
        return {
          clubId: String(club._id),
          clubName: String(club.name),
          clubState: String(club.state),
          dueAt: due,
          ...(report
            ? {
                reportId: String(report._id),
                state,
                versionNo: Number(report.versionNo ?? 1),
                lateFlag: report.lateFlag === true,
                ...(report.submittedAt ? { submittedAt: report.submittedAt as Date } : {}),
              }
            : {}),
          overdue: due < now && !submittedStates.includes(state ?? ""),
          ...(cases.has(String(club._id)) ? { violationId: cases.get(String(club._id)) } : {}),
        };
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
        const changed = await reports.updateOne(
          { _id: id, state: "Submitted" },
          {
            $inc: { __v: 1 },
            $set: {
              state: nextState,
              decisionOutcome: input.outcome,
              decidedBy: actorId,
              decidedAt: now,
              ...(input.observation ? { observation: input.observation } : {}),
            },
            ...(!input.observation ? { $unset: { observation: "" } } : {}),
          },
          { session },
        );
        if (changed.modifiedCount !== 1) return conflict("the report changed while deciding");
        await m.approvalTasks!.updateMany(
          { entityType: TASK_TYPE, entityId: id, state: "Open" },
          { $set: { state: "Decided", assigneeId: actorId, closedAt: now } },
          { session },
        );
        const action = input.outcome === "Accept" ? "PERIODIC_REPORT_ACCEPTED" : "PERIODIC_REPORT_RETURNED";
        await m.auditLogs!.create([{
          entityType: "PeriodicReport",
          entityId: id,
          action,
          actorId,
          actorRole: "ICPDP_OFFICER",
          before: { state: "Submitted" },
          after: {
            state: nextState,
            versionNo: report.versionNo ?? 1,
            ...(input.sections ? { sections: input.sections } : {}),
            ...(input.observation ? { observation: input.observation } : {}),
            ...(input.resubmitDueAt ? { resubmitDueAt: input.resubmitDueAt } : {}),
          },
          reason: input.reason,
          correlationId: randomUUID(),
          at: now,
        }], { session });
        await queueNotifications(
          session,
          [...await clubBoardUserIds(report.clubId as Types.ObjectId, session), report.submittedBy],
          action,
          "PeriodicReport",
          id,
          {
            periodCode: report.periodCode,
            outcome: input.outcome,
            reason: input.reason,
            sections: input.sections,
            observation: input.observation,
            ...(input.resubmitDueAt ? { resubmitDueAt: input.resubmitDueAt } : {}),
          },
          now,
        );
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
        if (await m.auditLogs!.exists({
          entityType: "Club",
          entityId: club,
          action: "PERIODIC_REPORT_MISSING",
          "after.periodCode": periodCode,
        }).session(session)) {
          return conflict("the missing report is already recorded");
        }
        violationId = await insertViolationCase(
          session,
          {
            clubId: club,
            originType: "OVERDUE_REPORT",
            severity: input.severity,
            title: `Không nộp báo cáo hoạt động định kỳ ${periodCode}`,
            description: `Hạn nộp ${dueAt.toISOString().slice(0, 10)} đã qua mà CLB chưa nộp báo cáo hoạt động kỳ ${periodCode}.`,
            evidenceNote: input.note,
          },
          officerId,
          now,
        );
        await m.auditLogs!.create([{
          entityType: "Club",
          entityId: club,
          action: "PERIODIC_REPORT_MISSING",
          actorId: new Types.ObjectId(officerId),
          actorRole: "ICPDP_OFFICER",
          after: { periodCode, violationId, dueAt },
          reason: input.note,
          correlationId: randomUUID(),
          at: now,
        }], { session });
        await queueNotifications(
          session,
          await clubBoardUserIds(club, session),
          "PERIODIC_REPORT_MISSING",
          "Club",
          club,
          { periodCode, violationId },
          now,
        );
      });
      return { violationId: String(violationId) };
    },
  };
}
