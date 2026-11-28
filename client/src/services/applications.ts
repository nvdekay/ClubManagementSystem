import { ApiError } from '@/services/apiError'
import { apiClient, type ApiFailure } from '@/services/apiRequest'
export type FounderRole = 'LEADER' | 'VICE_LEADER' | 'MEMBER'
export type ApplicationDocumentType = 'PROPOSAL' | 'LOGO'

export interface FoundingMember {
  userId: string
  role: FounderRole
}

export interface ApplicationDocument {
  id: string
  documentType: ApplicationDocumentType
  fileName: string
  mimeType: string
  bytes: number
  /** Chỉ có với logo đề xuất, được lưu công khai để xem trước. */
  publicUrl?: string
  uploadedAt: string
}

export interface DraftInput {
  clubName: string
  fieldId: string
  summary: string
  objectives: string
  fanpageUrl: string
  contactEmail: string
  founders: FoundingMember[]
}

export interface ApplicationDraft extends DraftInput {
  /** Tên trong danh mục của lĩnh vực đã chọn, do server phân giải. */
  field: string
  documents: ApplicationDocument[]
}

/** Gợi ý tham khảo về CLB tương tự (UC07/UC08); không bao giờ chặn việc nộp hay xét duyệt. */
export interface SimilarClubHint {
  kind: 'CLUB' | 'APPLICATION'
  id: string
  name: string
  field: string
  state: string
  score: number
  level: 'HIGH' | 'MEDIUM'
  /** Độ tương đồng từng thành phần trong khoảng 0–1; `content` là null khi một bên không có mô tả. */
  reasons: { name: number; content: number | null; field: number; sharedWords: string[] }
}

export type FoundingField =
  'summary' | 'objectives' | 'proposal' | 'logo' | 'fanpageUrl' | 'contactEmail'

/** Mọi thứ chặn việc nộp, theo bản xem trước của server hoặc khi nộp bị từ chối. */
export type FoundingIssue =
  | 'clubName'
  | 'field'
  | FoundingField
  | 'foundersTooFew'
  | 'applicantNotFounder'
  | 'duplicateFounder'
  | 'leaderCount'
  | 'viceLeaderCount'
  | 'fieldUnavailable'
  | 'leaderHoldsAnotherClub'

export interface FoundingRequirements {
  policyVersionId: string
  minFoundingMembers: number
  required: Record<FoundingField, boolean>
}

export interface ClubFieldOption {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
}

export interface ApplicationRecord {
  id: string
  founderUserId: string
  state: string
  currentVersionNo: number
  draftRevision: number
  draft: ApplicationDraft
  submittedAt?: string
  revisionDeadlineAt?: string
  createdAt: string
}

/** Thành viên sáng lập hiển thị bằng tên và email thay vì id tài khoản thô. */
export interface FounderProfile {
  id: string
  displayName: string
  email: string
}

/** Quyết định của ICPDP hiển thị cho người nộp hồ sơ (không kèm ghi chú xét duyệt nội bộ). */
export interface ApplicantDecision {
  outcome: 'Approve' | 'Request revision' | 'Reject'
  reason?: string
  sections: string[]
  decidedAt: string
}

export interface ApplicationVersion {
  id: string
  applicationId: string
  versionNo: number
  policyVersionId: string
  snapshot: ApplicationDraft
  submittedAt: string
}

export interface ApplicationConfig {
  requirements: FoundingRequirements
  fields: ClubFieldOption[]
  positions: { code: string; name: string; founderRole: FounderRole }[]
  maxViceLeaders: number
}

/** Được ném khi response không phải 2xx; giữ status và `details` của server (vd lỗi về thành viên sáng lập). */
export interface ApplicationRequestError extends Error {
  status: number
  details?: { issues?: FoundingIssue[]; required?: number }
}

export interface ApplicationDetail {
  application: ApplicationRecord
  versions: ApplicationVersion[]
  decisions: ApplicantDecision[]
  founders: FounderProfile[]
}

const request = apiClient('/api/v1/applications', toApplicationError)

// Maps a failed response to this module's error type
function toApplicationError(failure: ApiFailure): Error {
  // Keeps the status and details so callers can tell "not found" apart from other failures.
  return Object.assign(
    new ApiError(failure.message, failure.status),
    failure.details && typeof failure.details === 'object' ? { details: failure.details } : {},
  )
}

// GET /applications/config: cấu hình form hồ sơ thành lập CLB
export function fetchApplicationConfig(signal: AbortSignal): Promise<ApplicationConfig> {
  return request<ApplicationConfig>('/config', { signal })
}

// GET /applications/mine: hồ sơ thành lập CLB của tôi
export function fetchMyApplications(signal: AbortSignal): Promise<ApplicationRecord[]> {
  return request<ApplicationRecord[]>('/mine', { signal })
}

// GET chi tiết một hồ sơ thành lập CLB
export function fetchApplication(id: string, signal: AbortSignal): Promise<ApplicationDetail> {
  return request<ApplicationDetail>(`/${encodeURIComponent(id)}`, { signal })
}

// GET /preview: xem trước hồ sơ trước khi nộp
export function previewApplication(
  id: string,
  signal: AbortSignal,
): Promise<{
  requirements: FoundingRequirements
  issues: FoundingIssue[]
  activeNameConflict: boolean
  similarClubs: SimilarClubHint[]
}> {
  return request(`/${encodeURIComponent(id)}/preview`, { signal })
}

// POST tạo bản nháp hồ sơ thành lập CLB
export function createDraft(input: DraftInput, csrfToken: string): Promise<ApplicationRecord> {
  return request('', { method: 'POST', csrfToken, body: input })
}

// PATCH /draft: lưu bản nháp hồ sơ theo draftRevision
export function saveDraft(
  id: string,
  input: DraftInput,
  draftRevision: number,
  csrfToken: string,
): Promise<ApplicationRecord> {
  return request(`/${encodeURIComponent(id)}/draft`, {
    method: 'PATCH',
    csrfToken,
    body: { ...input, draftRevision },
  })
}

// POST /submit: nộp hồ sơ để ICPDP xét duyệt
export function submitDraft(
  id: string,
  csrfToken: string,
): Promise<{
  version: ApplicationVersion
  activeNameConflict: boolean
  similarClubs: SimilarClubHint[]
}> {
  return request(`/${encodeURIComponent(id)}/submit`, { method: 'POST', csrfToken })
}

// POST /withdraw: rút hồ sơ đã tạo
export function withdrawDraft(id: string, csrfToken: string): Promise<ApplicationRecord> {
  return request(`/${encodeURIComponent(id)}/withdraw`, { method: 'POST', csrfToken })
}

// POST /documents: tải tài liệu đính kèm lên hồ sơ
export function uploadDocument(
  id: string,
  documentType: ApplicationDocumentType,
  file: File,
  csrfToken: string,
): Promise<ApplicationDocument> {
  return request(`/${encodeURIComponent(id)}/documents`, {
    method: 'POST',
    csrfToken,
    headers: {
      'Content-Type': file.type,
      'X-Document-Type': encodeURIComponent(documentType),
      'X-Filename': encodeURIComponent(file.name),
    },
    body: file,
  })
}

// DELETE tài liệu đính kèm khỏi hồ sơ
export function removeDocument(
  id: string,
  documentId: string,
  csrfToken: string,
): Promise<ApplicationRecord> {
  return request(`/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
    csrfToken,
  })
}

// GET /founder-lookup: tra cứu thành viên sáng lập theo email
export function lookupFounder(email: string): Promise<FounderProfile> {
  return request(`/founder-lookup?email=${encodeURIComponent(email)}`)
}

// GET đường dẫn truy cập tài liệu đính kèm của hồ sơ
export function documentAccess(
  id: string,
  documentId: string,
): Promise<{ url: string; fileName: string }> {
  return request(`/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/access`)
}
