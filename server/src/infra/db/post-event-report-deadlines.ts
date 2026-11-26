import { Types, type ClientSession } from 'mongoose'
import type { ReportDeadline } from '../../domain/policy.js'
import { DomainError } from '../../domain/errors.js'
import { ucmsModels as m } from './ucms-models.js'
import { policyAt } from './repo-helpers.js'
type Doc = Record<string, unknown>
type FrozenDeadline = { dueAt?: Date | null; policyVersionId?: string | null }
export interface PostEventDeadline {
  policyVersionId: string
  dueAt: Date
  reminderAt: Date
  escalationAt: Date
}
// Tính hạn nộp từ policy đã chọn và giá trị đã đóng băng ở bản báo cáo đầu tiên
function deadlineFromPolicy(
  endAt: Date,
  frozen: FrozenDeadline | undefined,
  policy: Doc | null | undefined,
): PostEventDeadline {
  const deadline = ((policy?.reportDeadlines ?? []) as ReportDeadline[]).find(
    (d) => d.reportType === 'POST_EVENT',
  )
  if (!policy || !deadline) {
    throw new DomainError('post-event report deadline is not configured', 'unavailable')
  }
  const dueAt =
    frozen?.dueAt ?? new Date(endAt.getTime() + deadline.dueDaysAfterPeriodEnd * 86400000)
  return {
    policyVersionId: String(policy._id),
    dueAt,
    reminderAt: new Date(dueAt.getTime() - deadline.remindBeforeDays * 86400000),
    escalationAt: new Date(dueAt.getTime() + deadline.escalateAfterDays * 86400000),
  }
}
// Xác định hạn nộp, nhắc và leo thang của báo cáo sau sự kiện theo policy đã đóng băng
export async function postEventDeadline(
  event: Doc,
  session?: ClientSession,
): Promise<PostEventDeadline> {
  const first = await m
    .postEventReports!.findOne({ eventId: event._id })
    .sort({ versionNo: 1 })
    .session(session ?? null)
    .lean()
  const frozen = first?.preloadedFigures as FrozenDeadline | undefined
  const policy = frozen?.policyVersionId
    ? await m
        .policyVersions!.findById(frozen.policyVersionId)
        .session(session ?? null)
        .lean()
    : await policyAt(event.endAt as Date, session)
  return deadlineFromPolicy(event.endAt as Date, frozen, policy)
}
export interface PolicyCatalog {
  /** Policy hiệu lực tại `at`, cùng thứ tự với `findOne({ effectiveFrom: { $lte } })` đã sort. */
  at(at: Date): Doc | undefined
  byId(id: unknown): Doc | undefined
}
// Nạp mọi phiên bản policy một lần để tra hạn báo cáo cho nhiều sự kiện
export async function loadPolicyCatalog(session?: ClientSession): Promise<PolicyCatalog> {
  const policies = (await m
    .policyVersions!.find({}, { reportDeadlines: 1, effectiveFrom: 1 })
    .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
    .session(session ?? null)
    .lean()) as Doc[]
  return {
    at(at) {
      return policies.find((p) => new Date(p.effectiveFrom as Date).getTime() <= at.getTime())
    },
    byId(id) {
      return policies.find((p) => String(p._id) === String(id))
    },
  }
}
export interface ReportVersionSummary {
  /** Bản báo cáo mới nhất (versionNo lớn nhất), đủ mọi trường. */
  latest: Doc
  /** Hạn đã đóng băng ở bản đầu tiên (versionNo nhỏ nhất). */
  frozen: FrozenDeadline
  /** Bản đã nộp mới nhất, nếu có. */
  submitted?: { dueAt?: Date | null }
}
// Gom các phiên bản báo cáo sau sự kiện theo từng sự kiện bằng một aggregation
export async function reportVersionSummaries(
  eventIds: unknown[],
  session?: ClientSession,
): Promise<Map<string, ReportVersionSummary>> {
  if (!eventIds.length) {
    return new Map()
  }
  const rows = (await m
    .postEventReports!.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $sort: { eventId: 1, versionNo: -1, _id: -1 } },
      {
        $group: {
          _id: '$eventId',
          latest: { $first: '$$ROOT' },
          frozen: {
            $last: {
              dueAt: '$preloadedFigures.dueAt',
              policyVersionId: '$preloadedFigures.policyVersionId',
            },
          },
          versions: {
            $push: {
              submitted: { $cond: [{ $ifNull: ['$submittedAt', false] }, true, false] },
              dueAt: '$preloadedFigures.dueAt',
            },
          },
        },
      },
    ])
    .session(session ?? null)) as {
    _id: unknown
    latest: Doc
    frozen: FrozenDeadline
    versions: { submitted: boolean; dueAt?: Date | null }[]
  }[]
  return new Map(
    rows.map((row) => {
      const submitted = row.versions.find((v) => v.submitted)
      return [
        String(row._id),
        {
          latest: row.latest,
          frozen: row.frozen,
          submitted: submitted && { dueAt: submitted.dueAt },
        },
      ]
    }),
  )
}
// Hạn báo cáo của một sự kiện từ dữ liệu đã nạp sẵn; ném 'unavailable' giống postEventDeadline
export function postEventDeadlineFrom(
  event: Doc,
  summary: ReportVersionSummary | undefined,
  policies: PolicyCatalog,
): PostEventDeadline {
  const frozen = summary?.frozen
  const policy = frozen?.policyVersionId
    ? policies.byId(frozen.policyVersionId)
    : policies.at(event.endAt as Date)
  return deadlineFromPolicy(event.endAt as Date, frozen, policy)
}
// Liệt kê sự kiện CLB có báo cáo sau sự kiện quá hạn chưa nộp
export async function overduePostEventReports(
  clubId: Types.ObjectId | undefined,
  now: Date,
  session?: ClientSession,
): Promise<Types.ObjectId[]> {
  const events = await m
    .events!.find(
      {
        organizerType: 'CLUB',
        ...(clubId ? { clubId } : {}),
        state: { $in: ['Completed', 'Report Submitted'] },
      },
      { _id: 1, audienceScope: 1, endAt: 1 },
    )
    .session(session ?? null)
    .lean()
  if (!events.length) {
    return []
  }
  const eventIds = events.map((e) => e._id)
  const budgeted = await m
    .eventBudgets!.distinct('eventId', { eventId: { $in: eventIds } })
    .session(session ?? null)
  const summaries = await reportVersionSummaries(eventIds, session)
  const policies = await loadPolicyCatalog(session)
  const withBudget = new Set(budgeted.map(String))
  const overdue: Types.ObjectId[] = []
  for (const event of events) {
    if (event.audienceScope === 'MEMBERS_ONLY' && !withBudget.has(String(event._id))) {
      continue
    }
    const summary = summaries.get(String(event._id))
    if (summary && ['Submitted', 'Accepted'].includes(String(summary.latest.state))) {
      continue
    }
    try {
      if (postEventDeadlineFrom(event, summary, policies).dueAt < now) {
        overdue.push(event._id as Types.ObjectId)
      }
    } catch (error) {
      if (!(error instanceof DomainError && error.kind === 'unavailable')) {
        throw error
      }
    }
  }
  return overdue
}
