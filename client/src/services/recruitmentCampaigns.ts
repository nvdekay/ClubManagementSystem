import { ApiError } from '@/services/apiError'
import { apiClient, type ApiFailure } from '@/services/apiRequest'
export interface RecruitmentSelectionStep {
  name: string
  description?: string
  startsAt?: string
  endsAt?: string
}

export interface RecruitmentFormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'select' | 'multiselect' | 'file'
  required: boolean
  options?: string[]
}

export interface RecruitmentRubricCriterion {
  key: string
  label: string
  maxScore: number
}

export interface RecruitmentCampaignInput {
  title: string
  positions: string[]
  criteria?: string
  windowStart: string
  windowEnd: string
  capacity: number
  selectionSteps: RecruitmentSelectionStep[]
  formSchema: RecruitmentFormField[]
  rubric: RecruitmentRubricCriterion[]
}

export interface RecruitmentCampaign extends RecruitmentCampaignInput {
  id: string
  clubId: string
  state: 'Draft' | 'Published' | 'Accepting Applications' | 'Screening' | 'Completed' | 'Cancelled'
  publishedBy?: string
  publishedAt?: string
  createdAt: string
}

export interface OverlappingCampaign {
  id: string
  title: string
  positions: string[]
  windowStart: string
  windowEnd: string
  state: RecruitmentCampaign['state']
}

export interface PublicRecruitmentCampaign {
  id: string
  clubId: string
  title: string
  state: RecruitmentCampaign['state']
  windowStart: string
  windowEnd: string
  capacity: number
  positions: string[]
  criteria?: string
  selectionSteps: RecruitmentSelectionStep[]
  formSchema: RecruitmentFormField[]
  rubric: RecruitmentRubricCriterion[]
  /** CLB đang bị tạm ngưng (UC15): chiến dịch vẫn hiển thị nhưng tạm thời không nhận hồ sơ. */
  clubSuspended?: boolean
}

export interface CampaignResult {
  campaign: RecruitmentCampaign
  overlaps: OverlappingCampaign[]
}

export class CampaignApiError extends ApiError {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown,
  ) {
    super(message, status)
    this.name = 'CampaignApiError'
  }
}

const request = apiClient('/api/v1', toCampaignError)

// Maps a failed response to this module's error type
function toCampaignError(failure: ApiFailure): Error {
  return new CampaignApiError(failure.message, failure.status, failure.details)
}

// GET các đợt tuyển của CLB
export function fetchRecruitmentCampaigns(clubId: string, signal: AbortSignal) {
  return request<RecruitmentCampaign[]>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns`,
    { signal },
  )
}

// GET đợt tuyển công khai theo id
export function fetchPublicRecruitmentCampaign(campaignId: string, signal: AbortSignal) {
  return request<PublicRecruitmentCampaign>(`/public/campaigns/${encodeURIComponent(campaignId)}`, {
    signal,
  })
}

// POST tạo đợt tuyển của CLB
export function createRecruitmentCampaign(
  clubId: string,
  input: RecruitmentCampaignInput,
  csrfToken: string,
) {
  return request<CampaignResult>(`/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns`, {
    method: 'POST',
    csrfToken,
    body: input,
  })
}

// Cập nhật đợt tuyển của CLB
export function updateRecruitmentCampaign(
  clubId: string,
  campaignId: string,
  input: RecruitmentCampaignInput,
  csrfToken: string,
) {
  return request<CampaignResult>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}`,
    { method: 'PATCH', csrfToken, body: input },
  )
}

// POST /publish: công khai đợt tuyển
export function publishRecruitmentCampaign(
  clubId: string,
  campaignId: string,
  confirmOverlap: boolean,
  csrfToken: string,
) {
  return request<CampaignResult>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/publish`,
    { method: 'POST', csrfToken, body: { confirmOverlap } },
  )
}

// Huỷ đợt tuyển của CLB
export function cancelRecruitmentCampaign(clubId: string, campaignId: string, csrfToken: string) {
  return request<RecruitmentCampaign>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/cancel`,
    { method: 'POST', csrfToken },
  )
}
