import { randomUUID } from "node:crypto";
import mongoose, { Types, type ClientSession } from "mongoose";
import { normalizePeriodicDraft, type ClubPeriodicReportRepository } from "../../domain/club-periodic-report.js";
import { DomainError } from "../../domain/errors.js";
import { assertEventWriteAccess } from "./club-event-access.js";
import { openAccountabilityTask } from "./accountability-workflow.js";
import { queueNotifications } from "./club-board.js";
import { mongoPeriodicReportRepository, periodicLiveFigures } from "./mongo-periodic-report-repository.js";
import { ucmsModels as m } from "./ucms-models.js";

const editable = ["Draft", "Returned for correction"];
export function mongoClubPeriodicReportRepository(): ClubPeriodicReportRepository {
  const reader = mongoPeriodicReportRepository();
  async function required(id: string, clubId: string) {
    const result = await reader.find(id);
    if (!result || result.clubId !== clubId) throw new DomainError("periodic report not found", "not_found");
    return result;
  }
  async function lock(session: ClientSession, clubId: string, userId: string, now: Date) {
    await assertEventWriteAccess(session, new Types.ObjectId(clubId), new Types.ObjectId(userId), "club.report.submit", now);
    if (!(await m.clubs!.exists({ _id: new Types.ObjectId(clubId), state: { $in: ["Active", "Suspended", "Dissolving"] } }).session(session))) {
      throw new DomainError("club has no reporting obligations", "conflict");
    }
  }
  async function current(session: ClientSession, clubId: string, id: string, revision: number) {
    const report = await m.periodicReports!.findOne({ _id: new Types.ObjectId(id), clubId: new Types.ObjectId(clubId) }).session(session).lean();
    if (!report) throw new DomainError("periodic report not found", "not_found");
    if (!editable.includes(String(report.state)) || Number(report.__v ?? 0) !== revision) {
      throw new DomainError("report changed or is locked; reload before editing", "conflict");
    }
    return report;
  }
  async function audit(session: ClientSession, id: Types.ObjectId, action: string, userId: string, after: unknown, now: Date) {
    await m.auditLogs!.create([{ entityType: "PeriodicReport", entityId: id, action, actorId: new Types.ObjectId(userId),
      actorRole: "Club Leader", after, correlationId: randomUUID(), at: now }], { session });
  }
  return {
    async list(clubId) {
      const docs = await m.periodicReports!.find({ clubId: new Types.ObjectId(clubId) }).sort({ dueAt: -1, _id: -1 }).lean();
      return Promise.all(docs.map((d) => required(String(d._id), clubId)));
    },
    async create(clubId, periodCode, dueAt, userId, now) {
      const id = new Types.ObjectId();
      await mongoose.connection.transaction(async (session) => {
        await lock(session, clubId, userId, now);
        if (await m.periodicReports!.exists({ clubId: new Types.ObjectId(clubId), periodCode }).session(session)) {
          throw new DomainError("a report already exists for this period", "conflict");
        }
        await m.periodicReports!.create([{ _id: id, clubId: new Types.ObjectId(clubId), periodCode, periodType: "SEMESTER",
          dueAt, state: "Draft", versionNo: 1, preloadedFigures: {}, narrative: "", nextPlan: "", evidence: [] }], { session });
        await audit(session, id, "PERIODIC_REPORT_CREATED", userId, { periodCode }, now);
      });
      return required(String(id), clubId);
    },
    async save(clubId, id, revision, raw, userId, now) {
      const input = normalizePeriodicDraft(raw);
      await mongoose.connection.transaction(async (session) => {
        await lock(session, clubId, userId, now);
        await current(session, clubId, id, revision);
        await m.periodicReports!.updateOne({ _id: new Types.ObjectId(id) }, { $set: input, $inc: { __v: 1 } }, { session });
        await audit(session, new Types.ObjectId(id), "PERIODIC_REPORT_DRAFT_SAVED", userId, { revision: revision + 1 }, now);
      });
      return required(id, clubId);
    },
    async submit(clubId, id, revision, userId, now) {
      await mongoose.connection.transaction(async (session) => {
        await lock(session, clubId, userId, now);
        const report = await current(session, clubId, id, revision);
        const input = normalizePeriodicDraft({ narrative: String(report.narrative ?? ""), nextPlan: String(report.nextPlan ?? ""),
          evidence: (report.evidence ?? []) as { note?: string; url?: string }[] }, true);
        const preloadedFigures = { ...await periodicLiveFigures(new Types.ObjectId(clubId), String(report.periodCode), session), capturedAt: now };
        const versionNo = Number(report.versionNo ?? 1) + (report.submittedAt ? 1 : 0);
        const snapshot = { ...input, versionNo, preloadedFigures, submittedAt: now };
        await m.periodicReports!.updateOne({ _id: report._id }, { $set: { ...snapshot, state: "Submitted",
          submittedBy: new Types.ObjectId(userId), lateFlag: now > (report.dueAt as Date) }, $inc: { __v: 1 },
        $unset: { decisionOutcome: "", observation: "", decidedAt: "", decidedBy: "" } }, { session });
        await openAccountabilityTask(session, "PERIODIC_REPORT", report._id as Types.ObjectId, new Types.ObjectId(clubId),
          `Periodic report ${String(report.periodCode)}`, now);
        await audit(session, report._id as Types.ObjectId, "PERIODIC_REPORT_SUBMITTED", userId, { snapshot }, now);
        const roles = await m.roles!.find({ code: "ICPDP_OFFICER", scope: "system" }).session(session).distinct("_id");
        const officers = await m.userRoleAssignments!.find({ roleId: { $in: roles }, revokedAt: null }).session(session).distinct("userId");
        await queueNotifications(session, officers, "PERIODIC_REPORT_SUBMITTED", "PeriodicReport", report._id as Types.ObjectId,
          { clubId, periodCode: report.periodCode, versionNo }, now);
      });
      return required(id, clubId);
    },
  };
}
