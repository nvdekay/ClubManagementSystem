import { apiClient } from '@/services/apiRequest'
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

const request = apiClient('/api/v1/admin/clubs')

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
