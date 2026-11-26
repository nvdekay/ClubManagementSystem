import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
import type { ViolationDetail } from './violations'
import type { EvaluationDetail } from './evaluations'
// Calls the API through the shared helper
function request<T>(clubId: string, path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/clubs/${encodeURIComponent(clubId)}${path}`, options)
}
// GET vi phạm của CLB
export function fetchClubViolations(
  clubId: string,
  signal: AbortSignal,
): Promise<ViolationDetail[]> {
  return request(clubId, '/violations', { signal })
}
// GET kết quả đánh giá của CLB
export function fetchClubEvaluations(
  clubId: string,
  signal: AbortSignal,
): Promise<EvaluationDetail[]> {
  return request(clubId, '/evaluations', { signal })
}
// POST giải trình vi phạm hoặc nộp minh chứng hành động khắc phục
export function submitComplianceResponse(
  clubId: string,
  action:
    | { id: string; text: string }
    | { id: string; actionId: string; note: string; evidence: { note: string; url?: string }[] },
  csrfToken: string,
): Promise<{ submitted: boolean }> {
  const path = `/violations/${encodeURIComponent(action.id)}${'text' in action ? '/response' : `/actions/${encodeURIComponent(action.actionId)}/submission`}`
  const body =
    'text' in action ? { text: action.text } : { note: action.note, evidence: action.evidence }
  return request(clubId, path, {
    method: 'POST',
    csrfToken,
    body,
  })
}
