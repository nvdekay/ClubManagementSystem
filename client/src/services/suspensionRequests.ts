import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
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
// GET yêu cầu tạm ngưng CLB (của CLB hoặc cho ICPDP)
export async function fetchSuspensions(
  clubId: string | undefined,
  signal: AbortSignal,
): Promise<SuspensionContext> {
  if (clubId) {
    return request(`/clubs/${encodeURIComponent(clubId)}/suspension-requests`, { signal })
  }
  return {
    requests: await request<SuspensionRequest[]>('/admin/suspension-requests', { signal }),
    impacts: [],
  }
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
): Promise<SuspensionRequest[]> {
  return request(`/admin/suspension-requests/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    csrfToken,
    body: { outcome, reason },
  })
}
