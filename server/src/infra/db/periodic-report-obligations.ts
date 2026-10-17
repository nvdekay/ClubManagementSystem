import type { ClientSession, Types } from "mongoose";
import { periodicDueAt, periodicDueDays } from "../../domain/periodic-report.js";
import type { AcademicSemester, ReportDeadline } from "../../domain/policy.js";
import { ucmsModels as m } from "./ucms-models.js";

/**
 * Periodic report periods the club owes and has not finished (BR21, UC38 E1): a report past its due
 * date still in Draft or Returned, or a past-due period the club never opened a report for. A club
 * only owes a period it already existed at the start of, so a newly founded club is not blocked.
 */
export async function overduePeriodicReports(clubId: Types.ObjectId, now: Date, session?: ClientSession): Promise<string[]> {
  const s = session ?? null;
  const [open, policy, club, filed] = await Promise.all([
    m.periodicReports!.find({ clubId, dueAt: { $lt: now }, state: { $in: ["Draft", "Returned for correction"] } })
      .select({ periodCode: 1 }).session(s).lean(),
    m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).session(s).lean(),
    m.clubs!.findById(clubId).select({ createdAt: 1 }).session(s).lean(),
    m.periodicReports!.find({ clubId }).select({ periodCode: 1 }).session(s).lean(),
  ]);
  const owed = new Set(open.map((doc) => String(doc.periodCode)));
  const createdAt = club?.createdAt as Date | undefined;
  if (policy && createdAt) {
    const dueDays = periodicDueDays(policy.reportDeadlines as ReportDeadline[] | undefined);
    const opened = new Set(filed.map((doc) => String(doc.periodCode)));
    for (const period of (policy.academicCalendar ?? []) as AcademicSemester[]) {
      if (createdAt <= period.startAt && periodicDueAt(period, dueDays) < now && !opened.has(period.code)) owed.add(period.code);
    }
  }
  return [...owed];
}
