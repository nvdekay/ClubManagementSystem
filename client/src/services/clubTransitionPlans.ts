import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
export interface TransitionInput {
  toTerm: { name: string; startAt: string; endAt: string }
  candidates: { positionCode: string; membershipId: string }[]
  handoverItems: { id: string; description: string }[]
  assignees: Record<string, string>
  earlyReason?: string
}
export interface TransitionPlan {
  id: string
  revision: number
  state: string
  input: TransitionInput
  history: { action: string; at: string; reason?: string; snapshot?: TransitionInput }[]
}
export interface TransitionContext {
  term: { id: string; name: string; startAt: string; endAt: string } | null
  positions: { code: string; name: string; isLeaderRole: boolean; isSingleHolder: boolean }[]
  members: { id: string; displayName: string }[]
  obligations: { id: string; description: string }[]
  plans: TransitionPlan[]
}
// Calls the API through the shared helper
function request<T>(clubId: string, path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/transition-plans${path}`,
    options,
  )
}
// GET ngữ cảnh và kế hoạch chuyển giao nhiệm kỳ của CLB
export function fetchTransitionContext(
  clubId: string,
  signal: AbortSignal,
): Promise<TransitionContext> {
  return request(clubId, '', { signal })
}
// POST/PUT tạo, lưu hoặc nộp kế hoạch chuyển giao nhiệm kỳ
export function writeTransitionPlan(
  clubId: string,
  action: { id?: string; revision?: number; input?: TransitionInput },
  csrfToken: string,
): Promise<TransitionPlan> {
  const path = action.id ? `/${encodeURIComponent(action.id)}${action.input ? '' : '/submit'}` : ''
  return request(clubId, path, {
    method: action.id && action.input ? 'PUT' : 'POST',
    csrfToken,
    body: {
      ...(action.input ?? {}),
      ...(action.revision !== undefined ? { revision: action.revision } : {}),
    },
  })
}
