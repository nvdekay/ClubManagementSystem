import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
import type {
  PeriodicAchievementEntry,
  PeriodicCustomAnswer,
  PeriodicCustomField,
  PeriodicEventEntry,
  PeriodicMemberEntry,
  PeriodicReportDetail,
} from './periodicReports'

export interface ClubPeriodicPeriod {
  code: string
  startAt: string
  endAt: string
  dueAt: string
  isOpen?: boolean
  announcement?: string
  customFields?: PeriodicCustomField[]
}

export interface ClubPeriodicOverview {
  periods: ClubPeriodicPeriod[]
  reports: PeriodicReportDetail[]
}

export interface PeriodicDraft {
  narrative?: string
  nextPlan?: string
  evidence?: { note?: string; url?: string }[]
  members?: PeriodicMemberEntry[]
  events?: PeriodicEventEntry[]
  achievements?: PeriodicAchievementEntry[]
  customAnswers?: PeriodicCustomAnswer[]
}

// Calls /clubs/:clubId/periodic-reports through the shared helper
function request<T>(clubId: string, path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/periodic-reports${path}`,
    options,
  )
}

// GET báo cáo định kỳ của CLB
export function fetchClubPeriodicReports(
  clubId: string,
  signal: AbortSignal,
): Promise<ClubPeriodicOverview> {
  return request(clubId, '', { signal })
}

// POST/PUT tạo, lưu nháp hoặc nộp báo cáo định kỳ
export function changePeriodicReport(
  clubId: string,
  action:
    | { kind: 'create'; periodCode: string }
    | { kind: 'save'; id: string; revision: number; input: PeriodicDraft }
    | { kind: 'submit'; id: string; revision: number },
  csrfToken: string,
): Promise<PeriodicReportDetail> {
  const path =
    action.kind === 'create'
      ? ''
      : `/${encodeURIComponent(action.id)}${action.kind === 'submit' ? '/submit' : ''}`
  const body =
    action.kind === 'create'
      ? { periodCode: action.periodCode }
      : { revision: action.revision, ...(action.kind === 'save' ? action.input : {}) }
  return request(clubId, path, {
    method: action.kind === 'save' ? 'PUT' : 'POST',
    csrfToken,
    body,
  })
}

/** Ảnh minh chứng server nhận: PNG, JPEG, WebP, tối đa 5 MB. */
export const EVIDENCE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const EVIDENCE_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export interface UploadedEvidenceImage {
  reference: string
  url: string
  mimeType: string
  bytes: number
}

// POST ảnh minh chứng dạng byte thô, trả tham chiếu để lưu vào báo cáo và signed URL để xem trước
export function uploadPeriodicEvidenceImage(
  clubId: string,
  file: Blob,
  csrfToken: string,
): Promise<UploadedEvidenceImage> {
  return request(clubId, '/evidence-images', {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    csrfToken,
    body: file,
  })
}
