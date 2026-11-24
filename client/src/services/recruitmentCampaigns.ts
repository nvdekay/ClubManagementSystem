import { ApiError, apiFetch } from '@/services/apiError'
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
  readonly status: number
  readonly details: unknown

  constructor(message: string, status: number, details: unknown) {
    super(message)
    this.name = 'CampaignApiError'
    this.status = status
    this.details = details
  }
}

// Gọi API /api/v1 và trả về data, ném lỗi kèm chi tiết nếu thất bại
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1${path}`, {
    credentials: 'same-origin',
    ...init,
  })
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string
      details?: unknown
    } | null
    throw new CampaignApiError(
      body?.message ?? `HTTP ${response.status}`,
      response.status,
      body?.details,
    )
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
  return request<CampaignResult>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns`,
    mutation('POST', csrfToken, input),
  )
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
    mutation('PATCH', csrfToken, input),
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
    mutation('POST', csrfToken, { confirmOverlap }),
  )
}

// Huỷ đợt tuyển của CLB
export function cancelRecruitmentCampaign(clubId: string, campaignId: string, csrfToken: string) {
  return request<RecruitmentCampaign>(
    `/clubs/${encodeURIComponent(clubId)}/recruitment/campaigns/${encodeURIComponent(campaignId)}/cancel`,
    mutation('POST', csrfToken),
  )
}
