import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
export interface TransitionTerm {
  id: string
  name: string
  startAt: string
  endAt: string
  state: string
}

export interface TransitionObligation {
  id: string
  type: string
  entityId?: string
  description: string
  assigneeMembershipId: string
}

export interface LeadershipTransition {
  id: string
  clubId: string
  clubName: string
  clubState: string
  fromTerm: TransitionTerm
  toTerm: TransitionTerm
  candidates: Array<{
    positionCode: string
    positionName: string
    membershipId: string
    userId: string
    displayName: string
  }>
  outstandingObligations: TransitionObligation[]
  handover: {
    items: Array<{ id: string; description: string }>
    proposedBoardRoles?: Array<{
      code: string
      name: string
      unit?: string
      isLeaderRole: boolean
      isSingleHolder: boolean
      permissionCodes: string[]
    }>
  }
  state: string
  submittedBy: string
  submittedAt: string
  followUpConditions: TransitionObligation[]
  task: { id: string; state: string; assigneeId?: string; openedAt: string }
  decisions: Array<{
    id: string
    outcome: 'Approve' | 'Request revision'
    reason?: string
    followUpObligationIds: string[]
    actorId: string
    at: string
  }>
}

export interface TransitionDecisionInput {
  outcome: 'Approve' | 'Request revision'
  reason?: string
  followUpObligationIds: string[]
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1${path}`, options)
}

// GET hàng đợi chuyển giao lãnh đạo CLB cho ICPDP
export function fetchLeadershipTransitionQueue(signal: AbortSignal) {
  return request<LeadershipTransition[]>('/admin/leadership-transitions', { signal })
}

// GET chi tiết một yêu cầu chuyển giao lãnh đạo
export function fetchLeadershipTransition(id: string, signal: AbortSignal) {
  return request<LeadershipTransition>(`/admin/leadership-transitions/${encodeURIComponent(id)}`, {
    signal,
  })
}

// POST /claim: ICPDP nhận xử lý chuyển giao
export function claimLeadershipTransition(id: string, csrfToken: string) {
  return request<LeadershipTransition>(
    `/admin/leadership-transitions/${encodeURIComponent(id)}/claim`,
    { method: 'POST', csrfToken },
  )
}

// POST /decision: ICPDP quyết định chuyển giao lãnh đạo
export function decideLeadershipTransition(
  id: string,
  input: TransitionDecisionInput,
  csrfToken: string,
) {
  return request<LeadershipTransition>(
    `/admin/leadership-transitions/${encodeURIComponent(id)}/decision`,
    { method: 'POST', csrfToken, body: input },
  )
}
