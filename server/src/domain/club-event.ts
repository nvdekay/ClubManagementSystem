import type { ClubPermission } from './access.js'
import type { RequestedBudgetLine } from './event-proposal-review.js'
import type { EventRegistrationFormField } from './event-registration.js'
import type { FeedbackSummary } from './event-feedback.js'

/** Vòng đời của sự kiện nội bộ tự túc kinh phí, chỉ dành cho thành viên, không qua ICPDP duyệt. */
export const INTERNAL_CLUB_EVENT_STATES = [
  'DRAFT',
  'CREATED',
  'PUBLIC',
  'ONGOING',
  'FINISH',
  'CANCELLED',
] as const
export type InternalClubEventState = (typeof INTERNAL_CLUB_EVENT_STATES)[number]
// Kiểm tra trạng thái có thuộc nhóm sự kiện nội bộ hay không
export function isInternalClubEventState(state: string): state is InternalClubEventState {
  return (INTERNAL_CLUB_EVENT_STATES as readonly string[]).includes(state)
}
export type ClubEventState =
  | 'Draft'
  | 'Pending Approval'
  | 'Under Review'
  | 'Revision Requested'
  | 'Approved'
  | 'Rejected'
  | 'Expired'
  | 'Upcoming'
  | 'Ongoing'
  | 'Completed'
  | 'Report Submitted'
  | 'Cancelled'
  | 'Closed'
  | InternalClubEventState
export interface EventOccurrence {
  startAt: Date
  endAt: Date
  propertyId?: string
  venueText?: string
}
export interface ClubEventInput {
  title: string
  objective: string
  plan: string
  startAt: Date
  endAt: Date
  venueText?: string
  propertyId?: string
  audienceScope: 'PUBLIC' | 'MEMBERS_ONLY'
  capacity: number
  riskCategory?: 'LOW' | 'MEDIUM' | 'HIGH'
  riskNote?: string
  facilityNeeds?: string
  occurrences?: EventOccurrence[]
  budgetLines: RequestedBudgetLine[]
  bookingIds: string[]
  registrationForm?: EventRegistrationFormField[]
}
/** Tài liệu đề xuất (UC25) mà CLB đính kèm đề xuất ICPDP; được đóng băng trong mỗi phiên bản đã nộp. */
export interface EventProposalDocument {
  id: string
  fileName: string
  mimeType: string
  bytes: number
  assetId: string
  uploadedAt: Date
  uploadedBy: string
}
/** Phần client được thấy: id asset lưu trữ không bao giờ rời khỏi server. */
export type PublicEventProposalDocument = Omit<EventProposalDocument, 'assetId'>
// Bỏ assetId khỏi tài liệu đề xuất trước khi trả ra ngoài
export function publicProposalDocument(
  document: EventProposalDocument,
): PublicEventProposalDocument {
  const { assetId: _assetId, ...rest } = document
  return rest
}
// Bỏ assetId của tài liệu đề xuất trong payload sự kiện đã lưu
/** Bỏ asset id khỏi `proposalDocument` trong payload sự kiện đã lưu, các phần khác giữ nguyên. */
export function publicEventPayload<T>(payload: T): T {
  if (!payload || typeof payload !== 'object' || !('proposalDocument' in payload)) {
    return payload
  }
  const { proposalDocument, ...rest } = payload as Record<string, unknown>
  return (
    proposalDocument && typeof proposalDocument === 'object'
      ? {
          ...rest,
          proposalDocument: publicProposalDocument(proposalDocument as EventProposalDocument),
        }
      : rest
  ) as T
}
export interface EventProposalTemplateInfo {
  fileName: string
  mimeType: string
  bytes: number
  updatedAt: Date
  isSystemDefault: boolean
}
/** Mẫu đang dùng: mẫu mặc định đi kèm hệ thống (phục vụ từ bytes có sẵn) hoặc bản ICPDP tải lên mới nhất (phục vụ từ kho lưu trữ). */
export type EventProposalTemplate = EventProposalTemplateInfo &
  ({ isSystemDefault: true; content: Buffer } | { isSystemDefault: false; assetId: string })
export interface EventProposalFileStorage {
  uploadProposalDocument(input: {
    clubId: string
    eventId: string
    actorId: string
    fileName: string
    mimeType: string
    bytes: Buffer
    now: Date
  }): Promise<EventProposalDocument>
  uploadTemplateDocument(input: {
    actorId: string
    fileName: string
    mimeType: string
    bytes: Buffer
    now: Date
  }): Promise<EventProposalDocument>
  /** URL có chữ ký, sống ngắn. */
  accessUrl(assetId: string, options?: { inline: boolean }): Promise<string>
  /** Deletes a stored asset; used to clean up an upload whose database write then failed. */
  remove(assetId: string): Promise<void>
}
export interface EventCancellationRequest {
  state: 'Pending' | 'Approved' | 'Rejected'
  reason: string
  requestedAt: Date
  reviewReason?: string
  decidedAt?: Date
}
export interface ClubEvent extends ClubEventInput {
  proposalDocument?: PublicEventProposalDocument
  cancellationRequest?: EventCancellationRequest
  id: string
  clubId: string
  clubName: string
  state: ClubEventState
  semesterCode: string
  version: number
  currentRevisionNo: number
  confirmedRegistrationCount: number
  approvalConditions: string[]
  attendanceFinalized: boolean
  conflictResult?: string
  conflictDetail?: unknown
  publishedAt?: Date
  registrationOpenAt?: Date
  registrationCloseAt?: Date
  checkInCode?: string
  checkInOpenAt?: Date
  checkInCloseAt?: Date
  allowWalkIn: boolean
  waitlistEnabled: boolean
  revisionDeadlineAt?: Date
}
export interface ClubEventDetail {
  event: ClubEvent
  versions: {
    revisionNo: number
    payload: unknown
    budgetLines: RequestedBudgetLine[]
    requestedBudgetTotal?: number
    conflictResult?: string
    submittedBy?: string
    submittedByName?: string
    submittedAt: Date
  }[]
  decisions: { outcome: string; reason?: string; comments?: unknown; at: Date }[]
  bookings: {
    id: string
    state: string
    propertyId: string
    propertyName: string
    startAt: Date
    endAt: Date
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
  checkedInAt?: Date
  method?: string
  abnormalFlags: string[]
  correctionReason?: string
  finalized: boolean
}
export type ClubFeedbackSummary = FeedbackSummary & {
  eventId: string
  title: string
  comments?: string[]
}
export interface EventPublishInput {
  registrationOpenAt?: Date
  registrationCloseAt?: Date
  checkInOpenAt: Date
  checkInCloseAt: Date
  allowWalkIn: boolean
  waitlistEnabled: boolean
  notifyMembers?: boolean
}
export type ClubEventAction =
  | { kind: 'save'; input: ClubEventInput; expectedVersion: number }
  | { kind: 'submit'; expectedVersion: number }
  | { kind: 'attach-document'; document: EventProposalDocument }
  | { kind: 'publish'; input: EventPublishInput; expectedVersion: number }
  | { kind: 'cancel'; reason: string; expectedVersion: number }
  | {
      kind: 'reschedule'
      startAt: Date
      endAt: Date
      venueText?: string
      propertyId?: string
      reason: string
      expectedVersion: number
    }
  | { kind: 'capacity'; capacity: number }
  | { kind: 'promote'; registrationId: string }
  | { kind: 'check-in'; studentId: string; reason?: string }
  | { kind: 'correct'; studentId: string; reason: string; checkedInAt?: Date; absent: boolean }
  | { kind: 'finalize' }
  | { kind: 'unlock'; reason: string }
export interface ClubEventRepository {
  options(clubId: string): Promise<{
    properties: { id: string; name: string }[]
    bookings: {
      id: string
      propertyId: string
      propertyType?: string
      eventId?: string
      title: string
      startAt: Date
      endAt: Date
    }[]
  }>
  list(clubId: string): Promise<ClubEvent[]>
  find(clubId: string, eventId: string): Promise<ClubEventDetail | null>
  create(
    clubId: string,
    input: ClubEventInput,
    actorId: string,
    now: Date,
  ): Promise<ClubEventDetail>
  act(
    clubId: string,
    eventId: string,
    action: ClubEventAction,
    actorId: string,
    now: Date,
  ): Promise<ClubEventDetail>
  participants(clubId: string, eventId: string): Promise<EventParticipant[]>
  feedback(clubId: string, eventIds: string[], now: Date): Promise<ClubFeedbackSummary[]>
  /** "draft" là bản đang soạn của CLB, "latest" là phiên bản đã nộp cao nhất; null khi sự kiện không tồn tại. */
  proposalDocument(
    eventId: string,
    revision: number | 'draft' | 'latest',
  ): Promise<{ clubId: string; document: EventProposalDocument | null } | null>
  proposalTemplate(): Promise<EventProposalTemplate>
  saveProposalTemplate(
    document: EventProposalDocument,
    actorId: string,
    now: Date,
  ): Promise<EventProposalTemplateInfo>
}
// Xác định permission CLB cần có cho một thao tác trên sự kiện
export function eventActionPermission(action: ClubEventAction): ClubPermission {
  return action.kind === 'check-in' || action.kind === 'unlock'
    ? 'club.attendance.manage'
    : 'club.event.manage'
}
