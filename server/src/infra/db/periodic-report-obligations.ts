import type { ClientSession, Types } from "mongoose";
import { periodicDueAt, periodicDueDays } from "../../domain/periodic-report.js";
import type { AcademicSemester, ReportDeadline } from "../../domain/policy.js";
import { ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;

/**
 * Periodic report periods the club owes and has not finished (BR21, UC38 E1): a report past its due
 * date still in Draft or Returned, or a past-due period the club never opened a report for. A club
 * only owes a period it already existed at the start of, so a newly founded club is not blocked.
 */
export async function overduePeriodicReports(clubId: Types.ObjectId, now: Date, session?: ClientSession): Promise<string[]> {
  const s = session ?? null;
  const [open, policy, club, filed, campaignAudits] = await Promise.all([
    m.periodicReports!.find({ clubId, dueAt: { $lt: now }, state: { $in: ["Draft", "Returned for correction"] } })
      .select({ periodCode: 1 }).session(s).lean(),
    m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).session(s).lean(),
    m.clubs!.findById(clubId).select({ createdAt: 1 }).session(s).lean(),
    m.periodicReports!.find({ clubId }).select({ periodCode: 1 }).session(s).lean(),
    m.auditLogs!.find({ entityType: "PeriodicCampaign", action: "PERIODIC_REPORT_CAMPAIGN_SAVED" })
      .sort({ at: -1, _id: -1 }).session(s).lean(),
  ]);
  const campaignByPeriod = new Map<string, { isOpen: boolean; dueAt: Date }>();
  for (const audit of campaignAudits) {
    const after = (audit.after && typeof audit.after === "object" ? audit.after : {}) as Doc;
    const periodCode = typeof after.periodCode === "string" ? after.periodCode : "";
    if (periodCode && !campaignByPeriod.has(periodCode)) {
      campaignByPeriod.set(periodCode, {
        isOpen: Boolean(after.isOpen),
        dueAt: new Date(String(after.dueAt)),
      });
    }
  }
  const owed = new Set(open.map((doc) => String(doc.periodCode)));
  const createdAt = club?.createdAt as Date | undefined;
  if (policy && createdAt) {
    const dueDays = periodicDueDays(policy.reportDeadlines as ReportDeadline[] | undefined);
    const opened = new Set(filed.map((doc) => String(doc.periodCode)));
    for (const period of (policy.academicCalendar ?? []) as AcademicSemester[]) {
      const campaign = campaignByPeriod.get(period.code);
      if (campaign && !campaign.isOpen) continue;
      const dueAt = campaign ? campaign.dueAt : periodicDueAt(period, dueDays);
      if (createdAt <= period.startAt && dueAt < now && !opened.has(period.code)) owed.add(period.code);
    }
  }
  return [...owed];
}
