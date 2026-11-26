import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
export type DimensionCode = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8'
export type SchemeState = 'Draft' | 'Active' | 'Superseded'
export type ActivationIssue = 'totalWeight' | 'coreWeight'

export interface SchemeDimension {
  code: DimensionCode
  weight: number
  allowsManual: boolean
}

export interface SchemeThresholds {
  excellent: number
  good: number
  fair: number
}

export interface SchemeSettings {
  dimensions: SchemeDimension[]
  thresholds: SchemeThresholds
}

export interface EvaluationScheme extends SchemeSettings {
  id: string
  periodCode: string
  version: number
  state: SchemeState
  totalWeight: number
  activatedAt?: string
  createdAt: string
}

export interface DimensionInfo {
  code: DimensionCode
  name: string
  core: boolean
  measures: string
}

export interface SchemeCatalogue {
  schemes: EvaluationScheme[]
  /** `evaluated`: kỳ đã có đánh giá, nên phiên bản thang điểm bị cố định (BR51, BR60). */
  periods: { code: string; startAt: string; endAt: string; evaluated: boolean }[]
  dimensions: DimensionInfo[]
}

/** Response không phải 2xx; giữ `field` / `issues` từ details của server. */
export class SchemeRequestError extends ApiError {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: string,
    readonly issues: ActivationIssue[] = [],
  ) {
    super(message)
    this.name = 'SchemeRequestError'
  }
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/admin/evaluation-schemes${path}`, {
    ...options,
    toError: toSchemeError,
  })
}

// Maps a failed response to this module's error type
function toSchemeError(failure: ApiFailure): Error {
  const details = failure.details as { field?: unknown; issues?: unknown } | undefined
  return new SchemeRequestError(
    failure.message,
    failure.status,
    typeof details?.field === 'string' ? details.field : undefined,
    Array.isArray(details?.issues) ? (details.issues as ActivationIssue[]) : [],
  )
}

// GET danh mục thang đánh giá CLB
export function fetchSchemes(signal: AbortSignal): Promise<SchemeCatalogue> {
  return request('', { signal })
}

// POST tạo thang đánh giá cho kỳ, có thể sao chép từ thang cũ
export function createScheme(
  input: { periodCode: string; copyFromId?: string },
  csrfToken: string,
): Promise<EvaluationScheme> {
  return request('', { method: 'POST', csrfToken, body: input })
}

// PATCH cập nhật thiết lập thang đánh giá
export function updateScheme(
  id: string,
  settings: SchemeSettings,
  csrfToken: string,
): Promise<EvaluationScheme> {
  return request(`/${encodeURIComponent(id)}`, { method: 'PATCH', csrfToken, body: settings })
}

// POST /activate: kích hoạt thang đánh giá
export function activateScheme(id: string, csrfToken: string): Promise<EvaluationScheme> {
  return request(`/${encodeURIComponent(id)}/activate`, { method: 'POST', csrfToken })
}

// DELETE thang đánh giá
export function deleteScheme(id: string, csrfToken: string): Promise<{ deleted: true }> {
  return request(`/${encodeURIComponent(id)}`, { method: 'DELETE', csrfToken })
}
