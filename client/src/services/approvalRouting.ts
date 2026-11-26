import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
export type RoutedRequestType = 'CLUB_APPLICATION' | 'EVENT_PROPOSAL' | 'PROPERTY_BOOKING'
export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH'
export type RoutedPropertyType = 'HALL' | 'OUTDOOR' | 'STAGE' | 'EQUIPMENT'

export interface RoutingRule {
  id: string
  requestType: RoutedRequestType
  minAmount?: number
  maxAmount?: number
  riskCategories?: RiskCategory[]
  propertyTypes?: RoutedPropertyType[]
  minOpenViolations?: number
  maxOpenViolations?: number
  slaHours: number
}

export interface RoutingRuleSet {
  id: string
  versionNo: number
  state: 'Draft' | 'Active' | 'Superseded'
  rules: RoutingRule[]
  createdAt: string
  activatedAt?: string
}

export interface RoutingSimulation {
  total: number
  matched: number
  items: Array<{
    entityType: RoutedRequestType
    entityId: string
    title: string
    decidedAt: string
    ruleId?: string
    slaHours?: number
  }>
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1${path}`, { ...options, toError: toRoutingError })
}

// Maps a failed response to this module's error type
function toRoutingError(failure: ApiFailure): Error {
  const overlaps = (failure.details as { overlaps?: string[][] } | undefined)?.overlaps
    ?.map((pair) => pair.join(' ↔ '))
    .join(', ')
  if (!overlaps) {
    return new ApiError(failure.message, failure.status)
  }
  const message = typeof failure.body?.message === 'string' ? failure.body.message : 'error'
  return new ApiError(`${message}: ${overlaps}`, failure.status)
}

// Gửi request có phương thức, CSRF và body JSON
function send<T>(
  method: ApiRequestOptions['method'],
  path: string,
  csrfToken: string,
  body?: unknown,
) {
  return request<T>(path, {
    method,
    csrfToken,
    body: body ?? {},
  })
}

// GET /admin/routing-rules: các bộ luật định tuyến phê duyệt
export function fetchRoutingRuleSets(signal: AbortSignal) {
  return request<RoutingRuleSet[]>('/admin/routing-rules', { signal })
}
// POST tạo bản nháp bộ luật định tuyến phê duyệt
export function createRoutingDraft(rules: RoutingRule[], csrfToken: string) {
  return send<RoutingRuleSet>('POST', '/admin/routing-rules', csrfToken, { rules })
}
// PUT lưu bản nháp bộ luật định tuyến
export function saveRoutingDraft(id: string, rules: RoutingRule[], csrfToken: string) {
  return send<RoutingRuleSet>('PUT', `/admin/routing-rules/${encodeURIComponent(id)}`, csrfToken, {
    rules,
  })
}
// POST /activate: kích hoạt bộ luật định tuyến
export function activateRoutingRuleSet(id: string, csrfToken: string) {
  return send<RoutingRuleSet>(
    'POST',
    `/admin/routing-rules/${encodeURIComponent(id)}/activate`,
    csrfToken,
  )
}
// GET /simulation: mô phỏng bộ luật trên dữ liệu thực
export function fetchRoutingSimulation(id: string, limit: number, signal: AbortSignal) {
  return request<RoutingSimulation>(
    `/admin/routing-rules/${encodeURIComponent(id)}/simulation?limit=${limit}`,
    { signal },
  )
}
