import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
import type { Page } from '@/services/discovery'
export interface SuspensionRequest {
  id: string
  clubId: string
  clubName: string
  state: 'Pending' | 'Approved' | 'Rejected'
  reason: string
  until: string
  obligationsPlan: string
  recoveryPlan: string
  submittedAt: string
  decisionReason?: string
}
export interface SuspensionContext {
  requests: SuspensionRequest[]
  impacts: { id: string; kind: string; title: string; startAt: string }[]
}
// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1${path}`, options)
}
// GET yêu cầu tạm ngưng và tác động hiện tại của một CLB
export function fetchSuspensions(clubId: string, signal: AbortSignal): Promise<SuspensionContext> {
  return request(`/clubs/${encodeURIComponent(clubId)}/suspension-requests`, { signal })
}
// GET một trang hàng đợi yêu cầu tạm ngưng của mọi CLB cho ICPDP
export function fetchAdminSuspensions(
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<Page<SuspensionRequest>> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  return request(`/admin/suspension-requests?${params}`, { signal })
}
// POST CLB gửi yêu cầu tạm ngưng
export function submitSuspension(
  clubId: string,
  input: {
    reason: string
    until: string
    obligationsPlan: string
    recoveryPlan: string
    acknowledgedImpactIds: string[]
  },
  csrfToken: string,
): Promise<SuspensionRequest> {
  return request(`/clubs/${encodeURIComponent(clubId)}/suspension-requests`, {
    method: 'POST',
    csrfToken,
    body: input,
  })
}
// POST /decision: ICPDP duyệt hoặc từ chối yêu cầu tạm ngưng
export function decideSuspension(
  id: string,
  outcome: 'Approve' | 'Reject',
  reason: string,
  csrfToken: string,
): Promise<Page<SuspensionRequest>> {
  return request(`/admin/suspension-requests/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    csrfToken,
    body: { outcome, reason },
  })
}
