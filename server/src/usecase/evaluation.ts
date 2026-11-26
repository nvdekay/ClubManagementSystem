import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'
import {
  checkManualScore,
  hasReportPenalty,
  scoreDimensions,
  totalOf,
  type DimensionResult,
  type EvaluationDetail,
  type EvaluationOverview,
  type EvaluationRepository,
  type EvaluationRow,
  type PeriodWindow,
} from '../domain/evaluation.js'
import type {
  DimensionCode,
  EvaluationScheme,
  EvaluationSchemeRepository,
} from '../domain/evaluation-scheme.js'
import type { PolicyRepository } from '../domain/policy.js'
import { isObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

const editableStates = new Set(['Draft', 'Data Ready', 'Under Review'])

export interface EvaluationDeps {
  repo: EvaluationRepository
  schemes: Pick<EvaluationSchemeRepository, 'list'>
  policy: PolicyRepository
  auth: Pick<AuthRepository, 'systemRoleCodes'>
}

// Lấy đánh giá theo id, không có thì báo not_found
async function evaluation(repo: EvaluationRepository, id: string): Promise<EvaluationDetail> {
  if (!isObjectId(id)) {
    throw new DomainError('invalid evaluation id', 'validation')
  }
  const found = await repo.find(id)
  if (!found) {
    throw new DomainError('evaluation not found', 'not_found')
  }
  return found
}

// Gom lịch học vụ, số người phản hồi tối thiểu và các khung đánh giá
async function context(deps: EvaluationDeps, now: Date) {
  const policy = await deps.policy.findEffective(now)
  const schemes = await deps.schemes.list()
  return {
    calendar: [...(policy?.academicCalendar ?? [])],
    minRespondents: policy?.feedbackMinRespondents ?? 1,
    schemes,
  }
}

// Tìm khung đánh giá đang Active của một kỳ
function activeScheme(
  schemes: EvaluationScheme[],
  periodCode: string,
): EvaluationScheme | undefined {
  return schemes.find((scheme) => scheme.periodCode === periodCode && scheme.state === 'Active')
}

// Chọn khung đánh giá của kỳ, ưu tiên khung đã gắn cho các đánh giá có sẵn
/** BR51 + BR60: khi một kỳ đã có evaluation, mọi CLB của kỳ đó được chấm theo version mà chúng đã dùng. */
function periodScheme(
  schemes: EvaluationScheme[],
  periodCode: string,
  pinnedId?: string,
): EvaluationScheme | undefined {
  return pinnedId
    ? schemes.find((scheme) => scheme.id === pinnedId)
    : activeScheme(schemes, periodCode)
}

// Yêu cầu báo cáo định kỳ của kỳ đã được xét trước khi đánh giá
/** Tiền điều kiện UC42: báo cáo của kỳ đã qua UC39, nên không còn báo cáo nào chờ quyết định. */
async function assertReportsReviewed(
  repo: EvaluationRepository,
  periodCode: string,
  now: Date,
  clubId?: string,
): Promise<void> {
  const pending = await repo.unreviewedReports(periodCode, clubId)
  const blocking = (
    await Promise.all(
      pending.map(async (club) =>
        (await repo.reportPenalty(club.clubId, periodCode, now)).value > 0 ? undefined : club,
      ),
    )
  ).filter((club) => club !== undefined)
  if (blocking.length) {
    throw new DomainError('review the periodic reports of this period first', 'conflict', {
      field: 'periodicReports',
      clubs: blocking.map((club) => club.clubName),
    })
  }
}

// Tìm kỳ trong lịch học vụ, không có thì báo lỗi
function period(calendar: PeriodWindow[], code: string): PeriodWindow {
  const found = calendar.find((item) => item.code === code)
  if (!found) {
    throw new DomainError('this period is not in the academic calendar', 'validation', {
      field: 'periodCode',
    })
  }
  return found
}

// Giữ lại điểm nhập tay của officer khi sinh lại dữ liệu đánh giá
/** Giữ điểm nhập tay của officer khi dữ liệu được tạo lại (UC42 A1). */
function withManual(
  results: DimensionResult[],
  previous: EvaluationDetail | undefined,
  scheme: EvaluationScheme,
): DimensionResult[] {
  if (hasReportPenalty(results)) {
    return results
  }
  return results.map((result) => {
    const before = previous?.dimensions.find((item) => item.code === result.code && item.isManual)
    const allowed = scheme.dimensions.find((item) => item.code === result.code)?.allowsManual
    return before && allowed
      ? { ...result, score: before.score, isManual: true, justification: before.justification }
      : result
  })
}

// Tính điểm các tiêu chí của CLB từ số liệu thu thập
async function computed(
  deps: EvaluationDeps,
  clubId: string,
  window: PeriodWindow,
  scheme: EvaluationScheme,
  minRespondents: number,
  now: Date,
): Promise<DimensionResult[]> {
  return scoreDimensions(
    await deps.repo.collectMetrics(clubId, window, now),
    scheme,
    window.code,
    minRespondents,
  )
}

// ICPDP xem tổng quan đánh giá các CLB trong một kỳ và khả năng công bố
export async function evaluationOverview(
  deps: EvaluationDeps,
  actor: AccessActor | null,
  periodCode: string | undefined,
  now: Date,
): Promise<EvaluationOverview> {
  await requireIcpdpOfficer(deps.auth, actor)
  const { calendar, schemes } = await context(deps, now)
  const periods = calendar.map((item) => ({
    ...item,
    hasActiveScheme: Boolean(activeScheme(schemes, item.code)),
  }))
  const chosen =
    periodCode ??
    [...calendar].reverse().find((item) => item.startAt <= now)?.code ??
    calendar[0]?.code
  if (!chosen) {
    return { periods, rows: [], canPublish: false }
  }
  if (periodCode) {
    period(calendar, periodCode)
  }
  const [clubs, latest] = await Promise.all([deps.repo.clubsInScope(), deps.repo.latest(chosen)])
  const byClub = new Map(latest.map((item) => [item.clubId, item]))
  const rows: EvaluationRow[] = clubs.map((club) => {
    const item = byClub.get(club.id)
    return {
      clubId: club.id,
      clubName: club.name,
      clubState: club.state,
      ...(item
        ? {
            evaluationId: item.id,
            state: item.state,
            revisionNo: item.revisionNo,
            ...(item.totalScore !== undefined ? { totalScore: item.totalScore } : {}),
            ...(item.classification ? { classification: item.classification } : {}),
          }
        : {}),
      insufficientCount:
        item?.dimensions.filter((dimension) => dimension.score === undefined).length ?? 0,
      manualCount: item?.dimensions.filter((dimension) => dimension.isManual).length ?? 0,
    }
  })
  const scheme = periodScheme(schemes, chosen, latest[0]?.schemeId)
  return {
    periods,
    periodCode: chosen,
    ...(scheme ? { scheme: { id: scheme.id, version: scheme.version } } : {}),
    rows,
    canPublish:
      rows.length > 0 &&
      rows.every(
        (row) =>
          Number.isFinite(row.totalScore) &&
          (row.state === 'Finalized' || row.state === 'Published'),
      ) &&
      rows.some((row) => row.state === 'Finalized'),
  }
}

// Sinh bản nháp đánh giá cho mọi CLB trong phạm vi chưa có ở kỳ này
/** UC42: một bản nháp Data Ready cho mọi CLB trong phạm vi mà chưa có bản nào của kỳ. */
export async function generateEvaluations(
  deps: EvaluationDeps,
  actor: AccessActor | null,
  periodCode: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(deps.auth, actor)
  const { calendar, minRespondents, schemes } = await context(deps, now)
  const window = period(calendar, periodCode)
  const [clubs, latest] = await Promise.all([
    deps.repo.clubsInScope(),
    deps.repo.latest(periodCode),
  ])
  const scheme = periodScheme(schemes, periodCode, latest[0]?.schemeId)
  if (!scheme) {
    throw new DomainError('activate an evaluation scheme for this period first', 'conflict')
  }
  await assertReportsReviewed(deps.repo, periodCode, now)
  const done = new Set(latest.map((item) => item.clubId))
  for (const club of clubs.filter((item) => !done.has(item.id))) {
    await deps.repo.writeDraft(
      {
        clubId: club.id,
        periodCode,
        scheme,
        target: { kind: 'new' },
        results: await computed(deps, club.id, window, scheme, minRespondents, now),
      },
      officerId,
      now,
    )
  }
  return evaluationOverview(deps, actor, periodCode, now)
}

// Sinh bản nháp đánh giá cho một CLB sau khi báo cáo được chấp nhận
/** UC42 sau UC39 Accept: bản nháp Data Ready của CLB cho kỳ; lặng lẽ không làm gì khi chưa tạo được. */
export async function generateClubEvaluation(
  deps: EvaluationDeps,
  actor: AccessActor | null,
  clubId: string,
  periodCode: string,
  now: Date,
): Promise<void> {
  const officerId = await requireIcpdpOfficer(deps.auth, actor)
  const { calendar, minRespondents, schemes } = await context(deps, now)
  const window = calendar.find((item) => item.code === periodCode)
  if (!window) {
    return
  }
  const [clubs, latest] = await Promise.all([
    deps.repo.clubsInScope(),
    deps.repo.latest(periodCode),
  ])
  const scheme = periodScheme(schemes, periodCode, latest[0]?.schemeId)
  if (
    !scheme ||
    !clubs.some((club) => club.id === clubId) ||
    latest.some((item) => item.clubId === clubId)
  ) {
    return
  }
  await deps.repo.writeDraft(
    {
      clubId,
      periodCode,
      scheme,
      target: { kind: 'new' },
      results: await computed(deps, clubId, window, scheme, minRespondents, now),
    },
    officerId,
    now,
  )
}

// ICPDP xem chi tiết một đánh giá CLB
export async function getEvaluation(deps: EvaluationDeps, actor: AccessActor | null, id: string) {
  await requireIcpdpOfficer(deps.auth, actor)
  return evaluation(deps.repo, id)
}

// Tính lại đánh giá, tạo bản mới nếu đánh giá đã công bố
/** UC42 A1 (bản nháp chưa finalize) hoặc UC43 A1 (revision mới của kết quả đã publish). */
export async function regenerateEvaluation(
  deps: EvaluationDeps,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(deps.auth, actor)
  const current = await evaluation(deps.repo, id)
  const { calendar, minRespondents, schemes } = await context(deps, now)
  const scheme = periodScheme(schemes, current.periodCode, current.schemeId)
  if (!scheme) {
    throw new DomainError('the period has no active evaluation scheme', 'conflict')
  }
  const latestRevision = current.revisions[0]?.revisionNo ?? current.revisionNo
  if (current.revisionNo !== latestRevision) {
    throw new DomainError('only the latest revision can change', 'conflict')
  }
  const isPublished = current.state === 'Published'
  if (!isPublished && !editableStates.has(current.state)) {
    throw new DomainError('reopen the finalized evaluation before generating it again', 'conflict')
  }
  await assertReportsReviewed(deps.repo, current.periodCode, now, current.clubId)
  const results = withManual(
    await computed(
      deps,
      current.clubId,
      period(calendar, current.periodCode),
      scheme,
      minRespondents,
      now,
    ),
    current,
    scheme,
  )
  const newId = await deps.repo.writeDraft(
    {
      clubId: current.clubId,
      periodCode: current.periodCode,
      scheme,
      results,
      target: isPublished
        ? { kind: 'revision', fromEvaluationId: current.id }
        : { kind: 'replace', evaluationId: current.id },
    },
    officerId,
    now,
  )
  return evaluation(deps.repo, newId)
}

// ICPDP nhập hoặc xóa điểm tay của một tiêu chí kèm lý do
export async function setManualScore(
  deps: EvaluationDeps,
  actor: AccessActor | null,
  id: string,
  code: DimensionCode,
  manual: { score: number; justification: string } | null,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(deps.auth, actor)
  const current = await evaluation(deps.repo, id)
  if (!editableStates.has(current.state)) {
    throw new DomainError('only an evaluation under review can change', 'conflict')
  }
  if (
    hasReportPenalty(current.dimensions) ||
    (await deps.repo.reportPenalty(current.clubId, current.periodCode, now)).value > 0
  ) {
    throw new DomainError(
      'late or missing periodic reports require a zero evaluation score',
      'conflict',
    )
  }
  const checked = checkManualScore(
    current.dimensions.find((item) => item.code === code),
    manual,
  )
  await deps.repo.setManual(current.id, code, checked, officerId, now)
  return evaluation(deps.repo, current.id)
}

// ICPDP chốt đánh giá sau khi kiểm báo cáo và tổng điểm
export async function finalizeEvaluation(
  deps: EvaluationDeps,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(deps.auth, actor)
  let current = await evaluation(deps.repo, id)
  if (!editableStates.has(current.state)) {
    throw new DomainError('this evaluation cannot be finalized now', 'conflict')
  }
  await assertReportsReviewed(deps.repo, current.periodCode, now, current.clubId)
  const penalized =
    (await deps.repo.reportPenalty(current.clubId, current.periodCode, now)).value > 0
  if (penalized || hasReportPenalty(current.dimensions)) {
    current = await regenerateEvaluation(deps, actor, id, now)
  }
  const total = totalOf(current.dimensions, current.thresholds)
  if (!Number.isFinite(total.totalScore)) {
    throw new DomainError('an evaluation needs a total score before finalizing', 'conflict')
  }
  await deps.repo.finalize(current.id, total, officerId, now)
  return evaluation(deps.repo, current.id)
}

// ICPDP mở lại đánh giá đã chốt nhưng chưa công bố
export async function reopenEvaluation(
  deps: EvaluationDeps,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(deps.auth, actor)
  const current = await evaluation(deps.repo, id)
  if (current.state !== 'Finalized') {
    throw new DomainError('only a finalized, unpublished evaluation can be reopened', 'conflict')
  }
  await deps.repo.reopen(current.id, officerId, now)
  return evaluation(deps.repo, current.id)
}

// ICPDP công bố đánh giá của mọi CLB trong kỳ khi đã chốt hết
/** UC43 FR-03: một scorecard cho mọi CLB, nên kỳ chỉ được publish khi mọi CLB đã finalize. */
export async function publishEvaluations(
  deps: EvaluationDeps,
  actor: AccessActor | null,
  periodCode: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(deps.auth, actor)
  const overview = await evaluationOverview(deps, actor, periodCode, now)
  if (!overview.canPublish) {
    throw new DomainError('finalize the evaluation of every club before publishing', 'conflict')
  }
  for (const row of overview.rows.filter((item) => item.state === 'Finalized')) {
    const penalized = (await deps.repo.reportPenalty(row.clubId, periodCode, now)).value > 0
    const current = await evaluation(deps.repo, row.evaluationId!)
    if (penalized !== hasReportPenalty(current.dimensions) || (penalized && row.totalScore !== 0)) {
      throw new DomainError(
        'periodic report status changed; reopen and finalize the evaluation again',
        'conflict',
      )
    }
    await assertReportsReviewed(deps.repo, periodCode, now, row.clubId)
  }
  await deps.repo.publish(periodCode, officerId, now)
  return evaluationOverview(deps, actor, periodCode, now)
}
