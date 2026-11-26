import { proposalDocumentMaxBytes } from '@/utils/proposalFile'
import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
export interface EventBudgetLine {
  category: string
  amount: number
  purpose: string
  plannedItems?: string
}
export interface EventFormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'
  required: boolean
  options?: string[]
}
export interface EventOccurrence {
  startAt: string
  endAt: string
  propertyId?: string
  venueText?: string
}
export interface ClubEventInput {
  title: string
  objective: string
  plan: string
  startAt: string
  endAt: string
  venueText?: string
  propertyId?: string
  audienceScope: 'PUBLIC' | 'MEMBERS_ONLY'
  capacity: number
  riskNote?: string
  facilityNeeds?: string
  occurrences?: EventOccurrence[]
  budgetLines: EventBudgetLine[]
  bookingIds: string[]
  registrationForm?: EventFormField[]
}
/** File đề xuất đính kèm bản nháp hiện tại hoặc được chốt vào bản chỉnh sửa đã nộp (`versions[].payload.proposalDocument`). */
export interface EventProposalDocumentInfo {
  id: string
  fileName: string
  mimeType: string
  bytes: number
  uploadedAt: string
  uploadedBy: string
}
export interface EventProposalTemplateInfo {
  fileName: string
  mimeType: string
  bytes: number
  updatedAt: string
  isSystemDefault: boolean
}
/** Link có chữ ký, sống ngắn, tới một file đã lưu. */
export interface FileAccess {
  fileName: string
  mimeType: string
  url: string
}
export interface EventCancellationRequest {
  state: 'Pending' | 'Approved' | 'Rejected'
  reason: string
  requestedAt: string
  reviewReason?: string
  decidedAt?: string
}
export interface ClubEvent extends ClubEventInput {
  id: string
  clubId: string
  clubName: string
  state: string
  semesterCode: string
  version: number
  currentRevisionNo: number
  confirmedRegistrationCount: number
  approvalConditions: string[]
  attendanceFinalized: boolean
  conflictResult?: string
  conflictDetail?: unknown
  publishedAt?: string
  registrationOpenAt?: string
  registrationCloseAt?: string
  checkInCode?: string
  checkInOpenAt?: string
  checkInCloseAt?: string
  allowWalkIn: boolean
  waitlistEnabled: boolean
  revisionDeadlineAt?: string
  proposalDocument?: EventProposalDocumentInfo
  cancellationRequest?: EventCancellationRequest
}
export interface ClubEventSubmittedVersion {
  revisionNo: number
  payload: Partial<ClubEventInput> & { proposalDocument?: EventProposalDocumentInfo }
  budgetLines: EventBudgetLine[]
  requestedBudgetTotal?: number
  conflictResult?: string
  submittedBy?: string
  submittedByName?: string
  submittedAt: string
}
export interface ClubEventDetail {
  event: ClubEvent
  versions: ClubEventSubmittedVersion[]
  decisions: { outcome: string; reason?: string; comments?: unknown; at: string }[]
  bookings: {
    id: string
    state: string
    propertyId: string
    propertyName: string
    startAt: string
    endAt: string
  }[]
  budget?: { id?: string; state: string; approvedTotal: number; disbursedTotal: number }
}
export interface EventParticipant {
  studentId: string
  name: string
  email: string
  registrationId?: string
  state?: string
  waitlistPosition?: number
  attendanceId?: string
  checkedInAt?: string
  method?: string
  abnormalFlags: string[]
  correctionReason?: string
  finalized: boolean
}
export interface EventFeedbackSummary {
  eventId: string
  title: string
  respondents: number
  visible: boolean
  averageRating?: number
  distribution?: Record<number, number>
  comments?: string[]
}
export interface ClubEventErrorDetails {
  obligations?: string[]
  registrationIds?: string[]
  conflicts?: string[]
  bookingId?: string
  bookingError?: string
  noticeHours?: number
}
/** Response không phải 2xx; giữ các thông tin server nêu: nghĩa vụ quá hạn, đăng ký bị ảnh hưởng, xung đột lịch, lỗi booking. */
export class ClubEventError extends ApiError {
  constructor(
    message: string,
    readonly details: ClubEventErrorDetails,
    readonly statusCode?: number,
  ) {
    super(message, statusCode)
  }
}
// Chuẩn hoá giá trị không rõ kiểu thành mảng chuỗi
function strings(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined
}
// Calls /clubs/:clubId/events through the shared helper, failing with ClubEventError
function request<T>(clubId: string, path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/clubs/${encodeURIComponent(clubId)}/events${path}`, {
    ...options,
    toError: toClubEventError,
  })
}

// Keeps the structured details (obligations, conflicts, booking errors) of a failed event request
function toClubEventError(failure: ApiFailure): Error {
  const d = failure.details as Record<string, unknown> | undefined
  return new ClubEventError(
    failure.message,
    {
      obligations: strings(d?.obligations),
      registrationIds: strings(d?.registrationIds),
      conflicts: strings(d?.conflicts),
      bookingId: typeof d?.bookingId === 'string' ? d.bookingId : undefined,
      bookingError: typeof d?.bookingError === 'string' ? d.bookingError : undefined,
      noticeHours: typeof d?.noticeHours === 'number' ? d.noticeHours : undefined,
    },
    failure.status,
  )
}
// GET danh sách sự kiện của CLB
export function fetchClubEvents(clubId: string, signal: AbortSignal): Promise<ClubEvent[]> {
  return request(clubId, '', { signal })
}
// GET chi tiết một sự kiện của CLB
export function fetchClubEvent(
  clubId: string,
  id: string,
  signal: AbortSignal,
): Promise<ClubEventDetail> {
  return request(clubId, `/${encodeURIComponent(id)}`, { signal })
}
// GET người tham gia của một sự kiện
export function fetchEventParticipants(
  clubId: string,
  id: string,
  signal: AbortSignal,
): Promise<EventParticipant[]> {
  return request(clubId, `/${encodeURIComponent(id)}/participants`, { signal })
}
// GET phản hồi của các sự kiện theo danh sách id
export function fetchClubEventFeedback(
  clubId: string,
  ids: string[],
  signal: AbortSignal,
): Promise<EventFeedbackSummary[]> {
  return request(clubId, `/feedback?${new URLSearchParams({ eventIds: ids.join(',') })}`, {
    signal,
  })
}
// POST tạo đề xuất sự kiện của CLB
export function createClubEvent(
  clubId: string,
  input: ClubEventInput,
  csrfToken: string,
): Promise<ClubEventDetail> {
  return request(clubId, '', {
    method: 'POST',
    csrfToken,
    body: input,
  })
}
// POST thao tác (nộp, huỷ...) lên một sự kiện của CLB
export function actOnClubEvent(
  clubId: string,
  id: string,
  action: string,
  body: object,
  csrfToken: string,
): Promise<ClubEventDetail> {
  return request(clubId, `/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    csrfToken,
    body,
  })
}

/** Sự kiện tự túc chỉ dành cho thành viên (DRAFT → CREATED → PUBLIC → ONGOING → FINISH): không chọn đối tượng, không có ngân sách. */
export interface EventPublishInput {
  registrationOpenAt?: string
  registrationCloseAt?: string
  checkInOpenAt: string
  checkInCloseAt: string
  allowWalkIn: boolean
  waitlistEnabled: boolean
  notifyMembers?: boolean
}
// Dựng RequestInit JSON có CSRF cho phương thức và body cho trước

// POST tạo sự kiện nội bộ của CLB

// PUT cập nhật sự kiện nội bộ kèm expectedVersion

// POST /create: chuyển sự kiện nội bộ từ DRAFT sang CREATED
/** DRAFT → CREATED; server áp dụng quy tắc báo trước 24 giờ. */

export interface ClubEventOptions {
  properties: { id: string; name: string }[]
  bookings: {
    id: string
    propertyId: string
    propertyType?: string
    eventId?: string
    title: string
    startAt: string
    endAt: string
  }[]
}
// GET các lựa chọn (phòng, ngân sách...) khi tạo sự kiện
export function fetchClubEventOptions(
  clubId: string,
  signal: AbortSignal,
): Promise<ClubEventOptions> {
  return request(clubId, '/options', { signal })
}

/** Tải cùng origin: mẫu mặc định được stream dưới dạng file đính kèm, file ICPDP tải lên thì chuyển hướng tới URL có chữ ký. */
export const EVENT_PROPOSAL_TEMPLATE_DOWNLOAD_URL = '/api/v1/events/proposal-template/download'
// GET /events/proposal-template: thông tin mẫu đề xuất sự kiện
export async function fetchEventProposalTemplate(
  signal: AbortSignal,
): Promise<EventProposalTemplateInfo> {
  return apiRequest<EventProposalTemplateInfo>('/api/v1/events/proposal-template', { signal })
}
// POST /proposal-document: tải file đề xuất sự kiện lên
/** Upload thô; `event.version` trong response là phiên bản dùng khi nộp. */
export function uploadEventProposalDocument(
  clubId: string,
  id: string,
  file: File,
  mimeType: string,
  csrfToken: string,
): Promise<ClubEventDetail> {
  return request(clubId, `/${encodeURIComponent(id)}/proposal-document`, {
    method: 'POST',
    body: file,
    csrfToken,
    headers: { 'Content-Type': mimeType, 'X-Filename': encodeURIComponent(file.name) },
  })
}
// GET /proposal-document/access: lấy link xem file đề xuất
/** Không có `revisionNo`: file của bản nháp hiện tại. */
export function accessEventProposalDocument(
  clubId: string,
  id: string,
  revisionNo?: number,
  inline = false,
): Promise<FileAccess> {
  const query = new URLSearchParams({
    inline: String(inline),
    ...(revisionNo ? { revisionNo: String(revisionNo) } : {}),
  })
  return request(clubId, `/${encodeURIComponent(id)}/proposal-document/access?${query}`, {})
}

// Retrieve the original saved document for the isolated full-document viewer.
export async function fetchEventProposalPreviewFile(
  clubId: string,
  id: string,
  signal: AbortSignal,
): Promise<File> {
  const access = await accessEventProposalDocument(clubId, id)
  const response = await fetch(access.url, { signal, credentials: 'omit' })
  if (!response.ok) {
    throw new ApiError(`HTTP ${response.status}`, response.status)
  }
  if (Number(response.headers.get('content-length')) > proposalDocumentMaxBytes) {
    throw new ApiError('Document too large')
  }
  const blob = await response.blob()
  if (blob.size > proposalDocumentMaxBytes) {
    throw new ApiError('Document too large')
  }
  return new File([blob], access.fileName, { type: access.mimeType })
}
