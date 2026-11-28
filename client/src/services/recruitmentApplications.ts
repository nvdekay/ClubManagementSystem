import { apiClient, apiRequest } from '@/services/apiRequest'
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

const request = apiClient('/api/v1')

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

// POST tạo đơn ứng tuyển cho vị trí trong đợt tuyển
export function createRecruitmentApplication(
  campaignId: string,
  position: string,
  csrfToken: string,
) {
  return request<RecruitmentApplication>('/applications/recruitment', {
    method: 'POST',
    csrfToken,
    body: { campaignId, position },
  })
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
    { method: 'PATCH', csrfToken, body: { position, answers } },
  )
}

// POST /attachments: tải file đính kèm của đơn ứng tuyển
export async function uploadRecruitmentFile(
  applicationId: string,
  field: RecruitmentFormField,
  file: File,
  csrfToken: string,
) {
  return apiRequest<RecruitmentApplication>(
    `/api/v1/applications/recruitment/${encodeURIComponent(applicationId)}/attachments`,
    {
      method: 'POST',
      csrfToken,
      body: file,
      headers: {
        'X-Field-Key': encodeURIComponent(field.key),
        'X-Filename': encodeURIComponent(file.name),
        'Content-Type': file.type,
      },
    },
  )
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
    { method: 'POST', csrfToken },
  )
}

// POST /withdraw: rút đơn ứng tuyển
export function withdrawRecruitmentApplication(applicationId: string, csrfToken: string) {
  return request<RecruitmentApplication>(
    `/applications/recruitment/${encodeURIComponent(applicationId)}/withdraw`,
    { method: 'POST', csrfToken },
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
    { method: 'POST', csrfToken, body },
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
    { method: 'POST', csrfToken, body: joinedAt ? { joinedAt } : {} },
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
    { method: 'POST', csrfToken },
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
    { method: 'PUT', csrfToken, body: input },
  )
}
