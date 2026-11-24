import { DomainError } from './errors.js'
import {
  EVALUATION_DIMENSIONS,
  type DimensionCode,
  type EvaluationScheme,
  type SchemeThresholds,
} from './evaluation-scheme.js'

export type EvaluationState = 'Draft' | 'Data Ready' | 'Under Review' | 'Finalized' | 'Published'
export type Classification = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT'

/** Một số liệu gốc đứng sau điểm số, và nguồn của nó (truy vết dữ liệu EVL-02). */
export interface MetricValue {
  value: number
  sourceEntity: string
  sourceIds: string[]
}

export const METRIC_KEYS = [
  'registrations',
  'attendances',
  'uniqueAttendees',
  'outsiderAttendees',
  'activeMembers',
  'completedEvents',
  'publicCompletedEvents',
  'cancelledEvents',
  'acceptedInvitations',
  'applications',
  'feedbackCount',
  'feedbackAverage',
  'reportsDue',
  'reportsOnTime',
  'reportReturns',
  'bookingsGranted',
  'bookingsUsed',
  'budgets',
  'budgetsClean',
  'leaderSeated',
  'membersLeft',
  'violationPenalty',
  'openViolations',
  'periodicReportOverdue',
] as const
export type MetricKey = (typeof METRIC_KEYS)[number]
export type ClubMetrics = Record<MetricKey, MetricValue>

export interface Lineage {
  metric: MetricKey
  sourceEntity: string
  sourceIds: string[]
  sourcePeriod: string
  value: number
}

export interface DimensionResult {
  code: DimensionCode
  /** Điểm cuối cùng dùng để tính tổng: điểm chấm tay nếu có, nếu không thì điểm hệ thống tính. */
  score?: number
  computedScore?: number
  insufficientData: boolean
  isManual: boolean
  justification?: string
  evidence: Lineage[]
}

export interface DimensionView extends DimensionResult {
  name: string
  weight: number
  allowsManual: boolean
}

export interface EvaluationRecord {
  id: string
  clubId: string
  clubName: string
  periodCode: string
  schemeId: string
  schemeVersion: number
  state: EvaluationState
  revisionNo: number
  totalScore?: number
  classification?: Classification
  generatedAt?: Date
  finalizedAt?: Date
  publishedAt?: Date
  dimensions: DimensionView[]
}

export interface EvaluationDetail extends EvaluationRecord {
  /** Mọi phiên bản của CLB và kỳ này, mới nhất trước (BR30: bản đã công bố vẫn đọc được). */
  revisions: {
    id: string
    revisionNo: number
    state: EvaluationState
    totalScore?: number
    publishedAt?: Date
  }[]
  /** Kết quả đã công bố của cùng CLB ở các kỳ trước (xu hướng FR-UC43-07). */
  trend: { periodCode: string; totalScore?: number; classification?: Classification }[]
  thresholds: SchemeThresholds
}

export interface EvaluationRow {
  evaluationId?: string
  clubId: string
  clubName: string
  clubState: string
  state?: EvaluationState
  revisionNo?: number
  totalScore?: number
  classification?: Classification
  insufficientCount: number
  manualCount: number
}

export interface EvaluationOverview {
  periods: { code: string; startAt: Date; endAt: Date; hasActiveScheme: boolean }[]
  periodCode?: string
  scheme?: { id: string; version: number }
  rows: EvaluationRow[]
  /** Mọi CLB trong phạm vi đều có phiên bản mới nhất và tất cả đều Finalized (BR60: một bảng điểm cho tất cả). */
  canPublish: boolean
}

export interface PeriodWindow {
  code: string
  startAt: Date
  endAt: Date
}

export type DraftTarget =
  | { kind: 'new' }
  | { kind: 'replace'; evaluationId: string }
  | { kind: 'revision'; fromEvaluationId: string }

export interface EvaluationRepository {
  /** CLB được đánh giá trong một kỳ: những CLB Active, Suspended hoặc Dissolving. */
  clubsInScope(): Promise<{ id: string; name: string; state: string }[]>
  /** Phiên bản mới nhất của mỗi CLB trong kỳ. */
  latest(periodCode: string): Promise<EvaluationRecord[]>
  find(id: string): Promise<EvaluationDetail | null>
  collectMetrics(clubId: string, period: PeriodWindow, now: Date): Promise<ClubMetrics>
  reportPenalty(clubId: string, periodCode: string, now: Date): Promise<MetricValue>
  /** CLB có báo cáo định kỳ của kỳ còn chờ UC39 rà soát (điều kiện tiên quyết của UC42). */
  unreviewedReports(
    periodCode: string,
    clubId?: string,
  ): Promise<{ clubId: string; clubName: string }[]>
  writeDraft(
    input: {
      clubId: string
      periodCode: string
      scheme: EvaluationScheme
      results: DimensionResult[]
      target: DraftTarget
    },
    officerId: string,
    now: Date,
  ): Promise<string>
  setManual(
    id: string,
    code: DimensionCode,
    manual: { score: number; justification: string } | null,
    officerId: string,
    now: Date,
  ): Promise<void>
  finalize(
    id: string,
    total: { totalScore?: number; classification?: Classification },
    officerId: string,
    now: Date,
  ): Promise<void>
  reopen(id: string, officerId: string, now: Date): Promise<void>
  /** Công bố mọi phiên bản mới nhất đã Finalized của kỳ và thông báo cho ban điều hành từng CLB. */
  publish(periodCode: string, officerId: string, now: Date): Promise<number>
}

const SEVERITY_PENALTY = { MINOR: 10, MODERATE: 25, SERIOUS: 50 } as const
export const OPEN_CASE_PENALTY = 5
/** Points D5 loses for each time ICPDP returned a report of the period for correction (SRS §9 "số lần phải sửa"). */
export const RETURN_PENALTY = 10

// Lấy điểm trừ tương ứng với mức độ nghiêm trọng của vi phạm
export function severityPenalty(severity: string): number {
  return SEVERITY_PENALTY[severity as keyof typeof SEVERITY_PENALTY] ?? 0
}

// Làm tròn số tới một chữ số thập phân
function round(value: number): number {
  return Math.round(value * 10) / 10
}

// Tính tỷ lệ phần trên tổng, giới hạn tối đa 1
function ratio(part: number, whole: number): number {
  return whole > 0 ? Math.min(1, part / whole) : 0
}

/** Quy tắc do hệ thống định nghĩa cho từng tiêu chí (BR60): đọc những số liệu nào và quy ra thang 0–100 ra sao. */
const RULES: Record<
  DimensionCode,
  { metrics: MetricKey[]; score: (m: ClubMetrics, minRespondents: number) => number | undefined }
> = {
  D1: {
    metrics: [
      'registrations',
      'attendances',
      'uniqueAttendees',
      'activeMembers',
      'completedEvents',
    ],
    score: (m) =>
      m.registrations.value > 0
        ? 50 * ratio(m.attendances.value, m.registrations.value) +
          50 * ratio(m.uniqueAttendees.value, Math.max(m.activeMembers.value, 1))
        : undefined,
  },
  D2: {
    metrics: [
      'outsiderAttendees',
      'attendances',
      'publicCompletedEvents',
      'acceptedInvitations',
      'applications',
    ],
    score: (m) =>
      m.publicCompletedEvents.value +
        m.acceptedInvitations.value +
        m.applications.value +
        m.attendances.value >
      0
        ? 50 * ratio(m.outsiderAttendees.value, m.attendances.value) +
          Math.min(30, 10 * (m.publicCompletedEvents.value + m.acceptedInvitations.value)) +
          Math.min(20, m.applications.value)
        : undefined,
  },
  D3: {
    metrics: ['feedbackCount', 'feedbackAverage'],
    score: (m, minRespondents) =>
      m.feedbackCount.value > 0 && m.feedbackCount.value >= minRespondents
        ? ((m.feedbackAverage.value - 1) / 4) * 100
        : undefined,
  },
  // Sự kiện đã tổ chức so với sự kiện bị huỷ, và cơ sở vật chất đã dùng so với đã được cấp (UC46, UC47), lấy trung bình
  // trên phần nào trong hai phần đó mà CLB có dữ liệu.
  D4: {
    metrics: ['completedEvents', 'cancelledEvents', 'bookingsGranted', 'bookingsUsed'],
    score: (m) => {
      const parts = [
        ...(m.completedEvents.value + m.cancelledEvents.value > 0
          ? [ratio(m.completedEvents.value, m.completedEvents.value + m.cancelledEvents.value)]
          : []),
        ...(m.bookingsGranted.value > 0
          ? [ratio(m.bookingsUsed.value, m.bookingsGranted.value)]
          : []),
      ]
      return parts.length
        ? (100 * parts.reduce((sum, part) => sum + part, 0)) / parts.length
        : undefined
    },
  },
  D5: {
    metrics: ['reportsDue', 'reportsOnTime', 'reportReturns'],
    score: (m) =>
      m.reportsDue.value > 0
        ? Math.max(
            0,
            100 * ratio(m.reportsOnTime.value, m.reportsDue.value) -
              RETURN_PENALTY * m.reportReturns.value,
          )
        : undefined,
  },
  D6: {
    metrics: ['budgets', 'budgetsClean'],
    score: (m) =>
      m.budgets.value > 0 ? 100 * ratio(m.budgetsClean.value, m.budgets.value) : undefined,
  },
  D7: {
    metrics: ['leaderSeated', 'activeMembers', 'membersLeft'],
    score: (m) =>
      50 * (m.leaderSeated.value > 0 ? 1 : 0) +
      50 * ratio(m.activeMembers.value, m.activeMembers.value + m.membersLeft.value),
  },
  D8: {
    metrics: ['violationPenalty', 'openViolations'],
    score: (m) =>
      Math.max(0, 100 - m.violationPenalty.value - OPEN_CASE_PENALTY * m.openViolations.value),
  },
}

// UC42: chấm điểm từng tiêu chí của thang đánh giá từ số liệu CLB
/** UC42: chấm mọi tiêu chí của scheme; tiêu chí không có dữ liệu thì được đánh dấu, không bao giờ chấm 0 (E1). */
export function scoreDimensions(
  metrics: ClubMetrics,
  scheme: Pick<EvaluationScheme, 'dimensions'>,
  periodCode: string,
  minRespondents: number,
): DimensionResult[] {
  // BR40: dưới ngưỡng người phản hồi, nguồn dữ liệu không mang điểm trung bình thật (0 như khi chưa có phản hồi).
  const shown: ClubMetrics =
    metrics.feedbackCount.value >= minRespondents
      ? metrics
      : { ...metrics, feedbackAverage: { ...metrics.feedbackAverage, value: 0, sourceIds: [] } }
  return scheme.dimensions.map(({ code }) => {
    const rule = RULES[code]
    const computed = rule.score(metrics, minRespondents)
    const evidence = rule.metrics.map((metric) => ({
      metric,
      sourceEntity: shown[metric].sourceEntity,
      sourceIds: shown[metric].sourceIds.slice(0, 50),
      sourcePeriod: periodCode,
      value: round(shown[metric].value),
    }))
    if (metrics.periodicReportOverdue.value > 0) {
      return {
        code,
        score: 0,
        computedScore: 0,
        insufficientData: false,
        isManual: false,
        justification: 'Periodic report submitted late or not submitted by the deadline',
        evidence: [
          ...evidence,
          {
            metric: 'periodicReportOverdue',
            ...metrics.periodicReportOverdue,
            sourcePeriod: periodCode,
          },
        ],
      }
    }
    return {
      code,
      ...(computed !== undefined ? { score: round(computed), computedScore: round(computed) } : {}),
      insufficientData: computed === undefined,
      isManual: false,
      evidence,
    }
  })
}

// Kiểm tra CLB có bị trừ điểm do nộp báo cáo định kỳ quá hạn không
export function hasReportPenalty(dimensions: Pick<DimensionResult, 'evidence'>[]): boolean {
  return dimensions.some((dimension) =>
    dimension.evidence.some((item) => item.metric === 'periodicReportOverdue' && item.value > 0),
  )
}

// Xếp loại CLB theo tổng điểm và các ngưỡng của thang
export function classify(total: number, thresholds: SchemeThresholds): Classification {
  return total >= thresholds.excellent
    ? 'EXCELLENT'
    : total >= thresholds.good
      ? 'GOOD'
      : total >= thresholds.fair
        ? 'FAIR'
        : 'NEEDS_IMPROVEMENT'
}

// Tính tổng điểm có trọng số và xếp loại, chia lại trọng số cho các tiêu chí có điểm
/** Tổng có trọng số trên các tiêu chí đã có điểm; trọng số được chia lại cho các tiêu chí đó (quyết định 14). */
export function totalOf(
  dimensions: Pick<DimensionView, 'score' | 'weight'>[],
  thresholds: SchemeThresholds,
): { totalScore?: number; classification?: Classification } {
  const scored = dimensions.filter((item) => item.score !== undefined && item.weight > 0)
  const weight = scored.reduce((sum, item) => sum + item.weight, 0)
  if (!weight) {
    return {}
  }
  const totalScore = round(
    scored.reduce((sum, item) => sum + item.weight * item.score!, 0) / weight,
  )
  return { totalScore, classification: classify(totalScore, thresholds) }
}

// UC43: chỉ cho chấm tay các tiêu chí mà thang cho phép
/** UC43 FR-02: chỉ tiêu chí mà scheme đánh dấu là chấm tay mới được chấm tay, kèm lý do. */
export function checkManualScore(
  dimension: Pick<DimensionView, 'allowsManual'> | undefined,
  manual: { score: number; justification: string } | null,
): { score: number; justification: string } | null {
  if (!dimension) {
    throw new DomainError('this dimension is not part of the evaluation', 'validation', {
      field: 'dimensionCode',
    })
  }
  if (!dimension.allowsManual) {
    throw new DomainError('the scheme does not allow scoring this dimension by hand', 'conflict')
  }
  if (!manual) {
    return null
  }
  if (!Number.isFinite(manual.score) || manual.score < 0 || manual.score > 100) {
    throw new DomainError('a manual score is between 0 and 100', 'validation', { field: 'score' })
  }
  const justification = manual.justification.trim()
  if (!justification) {
    throw new DomainError('a manual score needs a justification', 'validation', {
      field: 'justification',
    })
  }
  if (justification.length > 2_000) {
    throw new DomainError('justification is too long', 'validation', { field: 'justification' })
  }
  return { score: round(manual.score), justification }
}

export const DIMENSION_NAMES = new Map<string, string>(
  EVALUATION_DIMENSIONS.map((item) => [item.code, item.name]),
)
