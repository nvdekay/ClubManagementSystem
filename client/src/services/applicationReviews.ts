import { apiClient } from '@/services/apiRequest'
import type {
  ApplicationRecord,
  ApplicationVersion,
  FounderProfile,
  SimilarClubHint,
} from './applications'

export type ReviewOutcome = 'Request revision' | 'Approve' | 'Reject'

export interface ReviewTask {
  id: string
  applicationId: string
  title: string
  state: 'Open' | 'Decided' | 'Closed'
  assigneeId?: string
  openedAt: string
  slaDueAt?: string
}

export interface ReviewDecision {
  id: string
  taskId: string
  outcome: ReviewOutcome
  reason?: string
  sections: string[]
  reviewNote?: string
  actorId: string
  at: string
}

export interface ReviewQueueItem {
  task: ReviewTask
  application: ApplicationRecord
}

export interface ReviewDetail extends ReviewQueueItem {
  versions: ApplicationVersion[]
  decisions: ReviewDecision[]
  founders: FounderProfile[]
  nameConflicts: Array<{ id: string; code: string; name: string }>
  similarClubs: SimilarClubHint[]
}

export interface ReviewDecisionInput {
  outcome: ReviewOutcome
  reason?: string
  sections?: string[]
  reviewNote?: string
  revisionDeadlineAt?: string
}

const request = apiClient('/api/v1/admin/application-reviews')

// GET hàng đợi hồ sơ thành lập CLB chờ ICPDP xét duyệt
export function fetchReviewQueue(signal: AbortSignal): Promise<ReviewQueueItem[]> {
  return request('', { signal })
}

// GET chi tiết một hồ sơ đang xét duyệt
export function fetchReview(id: string, signal: AbortSignal): Promise<ReviewDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal })
}

// POST /claim: ICPDP nhận xử lý hồ sơ
export function claimReview(id: string, csrfToken: string): Promise<ReviewDetail> {
  return request(`/${encodeURIComponent(id)}/claim`, { method: 'POST', csrfToken })
}

// POST /decision: ghi quyết định xét duyệt hồ sơ
export function decideReview(
  id: string,
  input: ReviewDecisionInput,
  csrfToken: string,
): Promise<ReviewDetail> {
  return request(`/${encodeURIComponent(id)}/decision`, { method: 'POST', csrfToken, body: input })
}

// GET đường dẫn truy cập tài liệu đính kèm của hồ sơ khi xét duyệt
export function reviewDocumentAccess(
  id: string,
  documentId: string,
): Promise<{
  fileName: string
  url: string
}> {
  return request(`/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/access`)
}
