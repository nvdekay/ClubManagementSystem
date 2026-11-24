import { ApiError, apiFetch } from '@/services/apiError'
import type { RecruitmentFormField, RecruitmentRubricCriterion } from './recruitmentCampaigns'

export type RecruitmentAnswer = string | string[]

export interface RecruitmentAttachment {
  id: string
  fieldKey: string
  fileName: string
  mimeType: string
  bytes: number
  uploadedAt: string
}

export interface RecruitmentApplication {
  id: string
  campaignId: string
  clubId: string
  userId: string
  campaignTitle?: string
  clubName?: string
  position: string
  answers: Record<string, RecruitmentAnswer>
  attachments: RecruitmentAttachment[]
  state:
    | 'Draft'
    | 'Submitted'
    | 'Screening'
    | 'Shortlisted'
    | 'Accepted'
    | 'Rejected'
    | 'Waitlisted'
    | 'Onboarded'
    | 'Withdrawn'
    | 'Declined'
  decisionOutcome?: string
  decisionReason?: string
  applicantName?: string
  submittedAt?: string
  withdrawnAt?: string
}

export type RecruitmentReviewAction =
  'screen' | 'shortlist' | 'decide' | 'promote' | 'close-withdrawn'

// Gọi API /api/v1 và trả về data, ném ApiError nếu lỗi
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1${path}`, { credentials: 'same-origin', ...init })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(body?.message ?? `HTTP ${response.status}`)
  }
  const body: { data: T } = await response.json()
  return body.data
}

// Dựng RequestInit có phương thức, CSRF và body JSON tuỳ chọn
function mutation(method: string, csrfToken: string, body?: object): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }
}

// GET đơn ứng tuyển CLB của tôi
export function fetchMyRecruitmentApplications(signal: AbortSignal) {
  return request<RecruitmentApplication[]>('/applications/recruitment/mine', { signal })
}

// GET đơn của tôi trong một đợt tuyển
export function fetchMyCampaignApplication(campaignId: string, signal: AbortSignal) {
  return request<RecruitmentApplication | null>(
    `/applications/recruitment/by-campaign/${encodeURIComponent(campaignId)}`,
    { signal },
  )
}

// GET chi tiết một đơn ứng tuyển của tôi
export function fetchMyRecruitmentApplication(applicationId: string, signal: AbortSignal) {
  return request<RecruitmentApplication>(
    `/applications/recruitment/${encodeURIComponent(applicationId)}`,
    { signal },
  )
}

// POST tạo đơn ứng tuyển cho vị trí trong đợt tuyển
export function createRecruitmentApplication(
  campaignId: string,
  position: string,
  csrfToken: string,
) {
  return request<RecruitmentApplication>(
    '/applications/recruitment',
    mutation('POST', csrfToken, { campaignId, position }),
  )
}

// Lưu nháp đơn ứng tuyển
export function saveRecruitmentApplication(
  applicationId: string,
  position: string,
  answers: Record<string, RecruitmentAnswer>,
  csrfToken: string,
) {
  return request<RecruitmentApplication>(
    `/applications/recruitment/${encodeURIComponent(applicationId)}/draft`,
    mutation('PATCH', csrfToken, { position, answers }),
  )
}

// POST /attachments: tải file đính kèm của đơn ứng tuyển
export async function uploadRecruitmentFile(
  applicationId: string,
  field: RecruitmentFormField,
  file: File,
  csrfToken: string,
) {
  const response = await apiFetch(
    `/api/v1/applications/recruitment/${encodeURIComponent(applicationId)}/attachments`,
    {
      method: 'POST',
      credentials: 'same-origin',
      body: file,
      headers: {
        'X-CSRF-Token': csrfToken,
        'X-Field-Key': encodeURIComponent(field.key),
        'X-Filename': encodeURIComponent(file.name),
        'Content-Type': file.type,
      },
    },
  )
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null
    throw new ApiError(body?.message ?? `HTTP ${response.status}`)
  }
  const body: { data: RecruitmentApplication } = await response.json()
  return body.data
}

// GET link file đính kèm của ứng viên khi CLB xét đơn
export function accessReviewRecruitmentFile(
  clubId: string,
  campaignId: string,
  applicationId: string,
  attachmentId: string,
) {
  return request<{ url: string; fileName: string }>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}/attachments/${encodeURIComponent(attachmentId)}/access`,
  )
}

// GET link file đính kèm của đơn ứng tuyển
export function accessRecruitmentFile(applicationId: string, attachmentId: string) {
  return request<{ url: string; fileName: string }>(
    `/applications/recruitment/${encodeURIComponent(applicationId)}/attachments/${encodeURIComponent(attachmentId)}/access`,
  )
}

// POST /submit: nộp đơn ứng tuyển
export function submitRecruitmentApplication(applicationId: string, csrfToken: string) {
  return request<RecruitmentApplication>(
    `/applications/recruitment/${encodeURIComponent(applicationId)}/submit`,
    mutation('POST', csrfToken),
  )
}

// POST /withdraw: rút đơn ứng tuyển
export function withdrawRecruitmentApplication(applicationId: string, csrfToken: string) {
  return request<RecruitmentApplication>(
    `/applications/recruitment/${encodeURIComponent(applicationId)}/withdraw`,
    mutation('POST', csrfToken),
  )
}

// GET đơn ứng tuyển của đợt tuyển để CLB xét
export function fetchApplicationsForReview(
  clubId: string,
  campaignId: string,
  signal: AbortSignal,
) {
  return request<RecruitmentApplication[]>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications`,
    { signal },
  )
}

// Gửi kết quả xét duyệt các đơn ứng tuyển của đợt tuyển
export function reviewApplications(
  clubId: string,
  campaignId: string,
  input: {
    action: RecruitmentReviewAction
    applicationIds: string[]
    outcome?: 'Accepted' | 'Rejected' | 'Waitlisted'
    reason?: string
    csrfToken: string
  },
) {
  const { csrfToken, ...body } = input
  return request<RecruitmentApplication[]>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/review`,
    mutation('POST', csrfToken, body),
  )
}

// Nhận ứng viên thành thành viên CLB
export function onboardRecruitmentApplication(
  clubId: string,
  campaignId: string,
  applicationId: string,
  csrfToken: string,
  joinedAt?: string,
) {
  return request<RecruitmentApplication>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}/onboard`,
    mutation('POST', csrfToken, joinedAt ? { joinedAt } : {}),
  )
}

// Từ chối ứng viên không nhận vào CLB
export function declineRecruitmentApplication(
  clubId: string,
  campaignId: string,
  applicationId: string,
  csrfToken: string,
) {
  return request<RecruitmentApplication>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}/decline`,
    mutation('POST', csrfToken),
  )
}

export interface CandidateEvaluation {
  id: string
  applicationId: string
  reviewerId: string
  reviewerName?: string
  scores: Record<string, number>
  totalScore?: number
  comment?: string
  createdAt: string
}

export interface CandidateEvaluationGroup {
  applicationId: string
  evaluations: CandidateEvaluation[]
  summary: {
    count: number
    scoredCount: number
    maxTotal: number
    mean?: number
    min?: number
    max?: number
    stdDev?: number
  }
}

export interface CandidateEvaluationList {
  rubric: RecruitmentRubricCriterion[]
  applications: CandidateEvaluationGroup[]
}

// GET đánh giá ứng viên của đợt tuyển
export function fetchCandidateEvaluations(clubId: string, campaignId: string, signal: AbortSignal) {
  return request<CandidateEvaluationList>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/evaluations`,
    { signal },
  )
}

// Lưu đánh giá cho một ứng viên
export function saveCandidateEvaluation(
  clubId: string,
  campaignId: string,
  applicationId: string,
  input: { scores: Record<string, number>; comment?: string },
  csrfToken: string,
) {
  return request<CandidateEvaluation>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/applications/${encodeURIComponent(applicationId)}/evaluation`,
    mutation('PUT', csrfToken, input),
  )
}
