import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
export type EvaluationState = 'Draft' | 'Data Ready' | 'Under Review' | 'Finalized' | 'Published'
export type Classification = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_IMPROVEMENT'

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
  periods: { code: string; startAt: string; endAt: string; hasActiveScheme: boolean }[]
  periodCode?: string
  scheme?: { id: string; version: number }
  rows: EvaluationRow[]
  canPublish: boolean
}

export interface Lineage {
  metric: string
  sourceEntity: string
  sourceIds: string[]
  sourcePeriod: string
  value: number
}

export interface DimensionView {
  code: string
  name: string
  weight: number
  allowsManual: boolean
  score?: number
  computedScore?: number
  insufficientData: boolean
  isManual: boolean
  justification?: string
  evidence: Lineage[]
}

export interface EvaluationDetail {
  id: string
  clubId: string
  clubName: string
  periodCode: string
  schemeVersion: number
  state: EvaluationState
  revisionNo: number
  totalScore?: number
  classification?: Classification
  generatedAt?: string
  finalizedAt?: string
  publishedAt?: string
  dimensions: DimensionView[]
  revisions: {
    id: string
    revisionNo: number
    state: EvaluationState
    totalScore?: number
    publishedAt?: string
  }[]
  trend: { periodCode: string; totalScore?: number; classification?: Classification }[]
  thresholds: { excellent: number; good: number; fair: number }
}

/** Response không phải 2xx; `pendingReviewClubs` nêu các CLB có báo cáo định kỳ còn chờ UC39. */
export class EvaluationRequestError extends ApiError {
  constructor(
    message: string,
    readonly pendingReviewClubs: string[] = [],
  ) {
    super(message)
  }
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/admin/evaluations${path}`, {
    ...options,
    toError: toEvaluationError,
  })
}

// Maps a failed response to this module's error type
function toEvaluationError(failure: ApiFailure): Error {
  const details = failure.details as { field?: unknown; clubs?: unknown } | undefined
  const clubs =
    details?.field === 'periodicReports' && Array.isArray(details.clubs)
      ? details.clubs.map(String)
      : []
  return new EvaluationRequestError(failure.message, clubs)
}

// GET tổng quan đánh giá CLB theo kỳ
export function fetchEvaluationOverview(
  period: string | undefined,
  signal: AbortSignal,
): Promise<EvaluationOverview> {
  return request(period ? `?period=${encodeURIComponent(period)}` : '', { signal })
}

// GET chi tiết đánh giá của một CLB
export function fetchEvaluation(id: string, signal: AbortSignal): Promise<EvaluationDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal })
}

// POST /generate: sinh bản đánh giá cho kỳ
export function generateEvaluations(
  periodCode: string,
  csrfToken: string,
): Promise<EvaluationOverview> {
  return request('/generate', { method: 'POST', csrfToken, body: { periodCode } })
}

// POST /publish: công bố kết quả đánh giá của kỳ
export function publishEvaluations(
  periodCode: string,
  csrfToken: string,
): Promise<EvaluationOverview> {
  return request('/publish', { method: 'POST', csrfToken, body: { periodCode } })
}

export type EvaluationAction =
  | { kind: 'regenerate' | 'finalize' | 'reopen' }
  | {
      kind: 'manual'
      dimensionCode: string
      manual: { score: number; justification: string } | null
    }

// POST tính lại, chốt, mở lại hoặc chấm tay một đánh giá
export function runEvaluationAction(
  id: string,
  action: EvaluationAction,
  csrfToken: string,
): Promise<EvaluationDetail> {
  const path = `/${encodeURIComponent(id)}/${action.kind}`
  return request(path, {
    method: 'POST',
    csrfToken,
    body:
      action.kind === 'manual'
        ? { dimensionCode: action.dimensionCode, manual: action.manual }
        : undefined,
  })
}
