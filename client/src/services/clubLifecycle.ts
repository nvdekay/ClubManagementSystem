import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
export interface ClubSuspension {
  reason: string
  suspendedAt: string
  suspendedBy: string
  until: string | null
  reminderSentAt?: string
}

export interface ClubDissolution {
  decidedAt: string
  decidedBy: string
  reason: string
  effectiveSemester: string
  effectiveFrom: string
  effectiveTo: string
  /** Được đặt khi CLB được lưu trữ vào cuối học kỳ Dissolving (UC15 bước 6). */
  archivedAt?: string
  outstanding?: OutstandingObligations
}

export interface UnreconciledBudget {
  id: string
  eventTitle: string
  state: string
}

export interface OutstandingObligations {
  periodicReports: string[]
  postEventReports: { eventId: string; title: string }[]
  budgets: UnreconciledBudget[]
}

export interface ClubLifecycleSummary {
  id: string
  code: string
  name: string
  field: string
  state: string
  logoUrl?: string
  contactEmail?: string
  activeMembers: number
  suspension?: ClubSuspension
  dissolution?: ClubDissolution
}

export interface ClubLifecycleDetail extends ClubLifecycleSummary {
  openCampaigns: { id: string; title: string; windowEnd: string }[]
  upcomingEvents: {
    id: string
    title: string
    startAt: string
    endAt: string
    registrations: number
  }[]
  activeTerm?: { name: string; startAt: string; endAt: string }
  unreconciledBudgets: UnreconciledBudget[]
  history: { action: string; reason?: string; actorName?: string; at: string }[]
}

export interface CascadeResult {
  cancelledEvents: number
  cancelledRegistrations: number
  cancelledBookings: number
}

/** Response không phải 2xx; giữ status để phân biệt 409 (trạng thái đã đổi) với 400. */
export class LifecycleRequestError extends ApiError {
  constructor(
    message: string,
    readonly status: number,
    readonly field?: string,
  ) {
    super(message)
    this.name = 'LifecycleRequestError'
  }
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/admin/clubs${path}`, { ...options, toError: toLifecycleError })
}

// Maps a failed response to this module's error type
function toLifecycleError(failure: ApiFailure): Error {
  const field = (failure.details as { field?: unknown } | undefined)?.field
  return new LifecycleRequestError(
    failure.message,
    failure.status,
    typeof field === 'string' ? field : undefined,
  )
}

// GET trạng thái vòng đời của các CLB cho ICPDP
export function fetchClubLifecycles(signal: AbortSignal): Promise<{
  clubs: ClubLifecycleSummary[]
  expiringSuspensions: ClubLifecycleSummary[]
}> {
  return request('', { signal })
}

// GET chi tiết vòng đời một CLB
export function fetchClubLifecycle(
  id: string,
  signal: AbortSignal,
): Promise<{
  club: ClubLifecycleDetail
  nextSemester: { code: string; startAt: string; endAt: string } | null
}> {
  return request(`/${encodeURIComponent(id)}`, { signal })
}

// POST /suspend: tạm ngưng CLB
export function suspendClub(
  id: string,
  input: { reason: string; until?: string },
  csrfToken: string,
): Promise<CascadeResult> {
  return request(`/${encodeURIComponent(id)}/suspend`, { method: 'POST', csrfToken, body: input })
}

// POST /reactivate: kích hoạt lại CLB
export function reactivateClub(
  id: string,
  reason: string,
  csrfToken: string,
): Promise<{ reactivated: true }> {
  return request(`/${encodeURIComponent(id)}/reactivate`, {
    method: 'POST',
    csrfToken,
    body: { reason },
  })
}

// POST /dissolve: giải thể CLB
export function dissolveClub(
  id: string,
  reason: string,
  csrfToken: string,
): Promise<
  CascadeResult & {
    effectiveSemester: string
    unreconciledBudgets: number
  }
> {
  return request(`/${encodeURIComponent(id)}/dissolve`, {
    method: 'POST',
    csrfToken,
    body: { reason },
  })
}
