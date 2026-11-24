import { ApiError, apiFetch } from '@/services/apiError'
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

// Gọi API /admin/clubs và trả về data, ném lỗi nếu thất bại
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1/admin/clubs${path}`, {
    credentials: 'same-origin',
    ...init,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string
      details?: { field?: unknown }
    } | null
    throw new LifecycleRequestError(
      body?.message ?? `HTTP ${response.status}`,
      response.status,
      typeof body?.details?.field === 'string' ? body.details.field : undefined,
    )
  }
  const body: { data: T } = await response.json()
  return body.data
}

// Dựng RequestInit POST có CSRF và body JSON
function post(path: string, csrfToken: string, body: object): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(body),
  }
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
  return request(`/${encodeURIComponent(id)}/suspend`, post('', csrfToken, input))
}

// POST /reactivate: kích hoạt lại CLB
export function reactivateClub(
  id: string,
  reason: string,
  csrfToken: string,
): Promise<{ reactivated: true }> {
  return request(`/${encodeURIComponent(id)}/reactivate`, post('', csrfToken, { reason }))
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
  return request(`/${encodeURIComponent(id)}/dissolve`, post('', csrfToken, { reason }))
}
