import { Types } from 'mongoose'
import type { MetricValue } from '../../domain/evaluation.js'
import type { AcademicSemester, ReportDeadline } from '../../domain/policy.js'
import { periodicDueAt, periodicDueDays } from '../../domain/periodic-report.js'
import { findPeriodicCampaign } from './mongo-periodic-report-repository.js'
import { ucmsModels as m } from './ucms-models.js'

// Tính điểm trừ nộp báo cáo định kỳ trễ hạn cho đánh giá CLB
/** Hạn nộp báo cáo vẫn áp dụng sau khi ICPDP đóng nộp cho kỳ đó. */
export async function evaluationReportPenalty(
  clubId: string,
  periodCode: string,
  now: Date,
): Promise<MetricValue> {
  const club = new Types.ObjectId(clubId)
  const [report, campaign, policy, clubDoc] = await Promise.all([
    m.periodicReports!.findOne({ clubId: club, periodCode }).lean(),
    findPeriodicCampaign(periodCode),
    m
      .policyVersions!.findOne({ effectiveFrom: { $lte: now } })
      .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
      .lean(),
    m.clubs!.findById(club).select({ createdAt: 1 }).lean(),
  ])
  const period = ((policy?.academicCalendar ?? []) as AcademicSemester[]).find(
    (item) => item.code === periodCode,
  )
  const dueAt =
    campaign?.dueAt ??
    (report?.dueAt instanceof Date
      ? report.dueAt
      : period
        ? periodicDueAt(
            period,
            periodicDueDays(policy?.reportDeadlines as ReportDeadline[] | undefined),
          )
        : undefined)
  const source = {
    sourceEntity: report ? 'periodicReports' : 'clubs',
    sourceIds: [String(report?._id ?? club)],
  }
  if (!dueAt) {
    return { value: 0, ...source }
  }
  if (report?.submittedAt instanceof Date) {
    return { value: report.submittedAt > dueAt ? 1 : 0, ...source }
  }
  const obligated = Boolean(
    report || (period && clubDoc?.createdAt instanceof Date && clubDoc.createdAt <= period.startAt),
  )
  return { value: obligated && now > dueAt ? 1 : 0, ...source }
}
