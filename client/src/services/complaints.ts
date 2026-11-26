import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
import type { Page } from '@/services/discovery'
export const COMPLAINT_TYPES = ['CONDUCT', 'EVENT', 'FINANCE', 'SAFETY', 'OTHER'] as const
export type ComplaintType = (typeof COMPLAINT_TYPES)[number]
export type ComplaintState =
  | 'Submitted'
  | 'Under Triage'
  | 'Dismissed'
  | 'Forwarded'
  | 'Club Responded'
  | 'Escalated'
  | 'Closed'
  | 'Withdrawn'
export type TriageOutcome = 'Dismissed' | 'Forwarded' | 'Escalated'
export type Severity = 'MINOR' | 'MODERATE' | 'SERIOUS'
export type Validity = 'VALID' | 'PARTLY_VALID' | 'UNFOUNDED'

export interface ComplaintEvidence {
  label: string
  url: string
}
export interface ComplaintClubResponse {
  text: string
  action: string
  evidence: ComplaintEvidence[]
  at: string
}

export interface Complaint {
  id: string
  clubId?: string
  clubName?: string
  clubState?: string
  eventId?: string
  eventTitle?: string
  type: string
  description: string
  evidence: ComplaintEvidence[]
  state: ComplaintState
  triage?: {
    severity: Severity
    validity: Validity
    outcome: TriageOutcome
    reason: string
    at: string
  }
  clubResponse?: ComplaintClubResponse
  closure?: { reason: string; at: string }
  forwardedAt?: string
  respondedAt?: string
  responseDueAt?: string
  violationId?: string
  linkedComplaintId?: string
  submittedAt: string
  withdrawnAt?: string
  closedAt?: string
}

export interface ComplaintForIcpdp extends Complaint {
  complainant: { id: string; displayName: string; email: string }
  linkedComplaintIds: string[]
}

/** Một dòng hàng đợi ICPDP, kèm các khiếu nại cùng sự việc có thể liên kết (UC50 E1). */
export interface ComplaintQueueItem extends ComplaintForIcpdp {
  linkCandidates: { id: string; description: string }[]
}

/** Nội dung CLB nhận được: không bao giờ kèm người khiếu nại (D5). */
export interface ComplaintForClub {
  id: string
  clubId: string
  eventTitle?: string
  type: string
  description: string
  evidence: ComplaintEvidence[]
  state: 'Forwarded' | 'Club Responded' | 'Closed' | 'Escalated'
  forwardNote: string
  forwardedAt: string
  responseDueAt?: string
  clubResponse?: ComplaintClubResponse
}

export interface ComplaintInput {
  clubId: string
  eventId?: string
  type: ComplaintType
  description: string
  evidence: ComplaintEvidence[]
}

export type ComplaintDecisionInput =
  | { kind: 'open' }
  | {
      kind: 'triage'
      outcome: TriageOutcome
      severity: Severity
      validity: Validity
      reason: string
      responseDueAt?: string
    }
  | { kind: 'close'; reason: string }
  | { kind: 'escalate'; severity: Severity; reason: string }
  | { kind: 'link'; targetId: string; reason: string }

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1${path}`, options)
}

// GET /complaints/mine: khiếu nại của tôi
export function fetchMyComplaints(signal: AbortSignal) {
  return request<Complaint[]>('/complaints/mine', { signal })
}
// POST /complaints: gửi khiếu nại mới
export function submitComplaint(input: ComplaintInput, csrfToken: string) {
  return request<Complaint>('/complaints', { method: 'POST', csrfToken, body: input ?? {} })
}
// POST /withdraw: rút khiếu nại
export function withdrawComplaint(id: string, csrfToken: string) {
  return request<Complaint>(`/complaints/${encodeURIComponent(id)}/withdraw`, {
    method: 'POST',
    csrfToken,
    body: {},
  })
}
// GET /admin/complaints: một trang hàng đợi khiếu nại của ICPDP, lọc theo trạng thái
export function fetchComplaintQueue(
  state: ComplaintState | '',
  page: number,
  pageSize: number,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (state) {
    params.set('state', state)
  }
  return request<Page<ComplaintQueueItem>>(`/admin/complaints?${params}`, { signal })
}
// POST /admin/complaints/:id: ICPDP mở hoặc ra quyết định khiếu nại
export function decideComplaint(id: string, decision: ComplaintDecisionInput, csrfToken: string) {
  const { kind, ...body } = decision
  return request<ComplaintForIcpdp>(`/admin/complaints/${encodeURIComponent(id)}/${kind}`, {
    method: 'POST',
    csrfToken,
    body: kind === 'open' ? {} : (body ?? {}),
  })
}
// GET khiếu nại liên quan tới CLB
export function fetchClubComplaints(clubId: string, signal: AbortSignal) {
  return request<ComplaintForClub[]>(`/clubs/${encodeURIComponent(clubId)}/complaints`, { signal })
}
// POST /response: CLB phản hồi khiếu nại
export function respondToComplaint(
  clubId: string,
  id: string,
  input: Omit<ComplaintClubResponse, 'at'>,
  csrfToken: string,
) {
  return request<ComplaintForClub>(
    `/clubs/${encodeURIComponent(clubId)}/complaints/${encodeURIComponent(id)}/response`,
    { method: 'POST', csrfToken, body: input ?? {} },
  )
}
