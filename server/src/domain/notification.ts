/** Một dòng trong inbox thông báo trong ứng dụng của người dùng (NTF-04). */
export interface InboxNotification {
  id: string
  eventCode: string
  entityType?: string
  entityId?: string
  /** CLB mà thông báo nói đến, suy ra từ payload hoặc entity, để client tạo liên kết tới đó. */
  clubId?: string
  payload: Record<string, unknown>
  createdAt: Date
  readAt?: Date
}

export interface NotificationInbox {
  items: InboxNotification[]
  unread: number
  /** Truyền vào `before` để đọc trang kế tiếp (cũ hơn); không có ở trang cuối. */
  nextBefore?: string
}

/**
 * Thông báo thuộc workspace nào: cá nhân sinh viên (người nộp đơn, người đăng ký, thành viên,
 * người sáng lập, ứng viên tuyển thành viên), ICPDP officer, hoặc ban quản lý CLB hành động cho CLB đó.
 */
export type NotificationAudience = 'student' | 'icpdp' | 'club'
export const NOTIFICATION_AUDIENCES = [
  'student',
  'icpdp',
  'club',
] as const satisfies readonly NotificationAudience[]

/** Các mã gửi cho sinh viên về đơn, đăng ký, membership hoặc CLB của chính họ. */
export const STUDENT_NOTIFICATION_CODES: readonly string[] = [
  'CLUB_APPLICATION_SUBMITTED',
  'CLUB_APPLICATION_WITHDRAWN',
  'CLUB_APPLICATION_APPROVED',
  'CLUB_APPLICATION_REJECTED',
  'CLUB_APPLICATION_REVISION_REQUESTED',
  'CLUB_APPLICATION_EXPIRED',
  'EVENT_REGISTRATION_CONFIRMED',
  'EVENT_REGISTRATION_WAITLISTED',
  'EVENT_REGISTRATION_PROMOTED',
  'EVENT_REGISTRATION_CANCELLED',
  'EVENT_PUBLISHED',
  'EVENT_CANCELLED',
  'EVENT_RESCHEDULED',
  'EVENT_CHECKED_IN',
  'RECRUITMENT_APPLICATION_ACCEPTED',
  'RECRUITMENT_APPLICATION_REJECTED',
  'RECRUITMENT_APPLICATION_WAITLISTED',
  'RECRUITMENT_APPLICATION_ONBOARDED',
  'RECRUITMENT_APPLICATION_DECLINED',
  'RECRUITMENT_CAMPAIGN_CANCELLED',
  'CLUB_MEMBERSHIP_ONBOARDED',
  'CLUB_MEMBERSHIP_ACTIVE',
  'CLUB_MEMBERSHIP_INACTIVE',
  'CLUB_MEMBERSHIP_BANNED',
  'CLUB_MEMBERSHIP_LEFT',
  'MEMBERSHIP_RECONFIRMATION_REQUIRED',
  'MEMBERSHIP_RECONFIRMATION_EXPIRED',
  'CLUB_SUSPENDED',
  'CLUB_REACTIVATED',
  'CLUB_DISSOLUTION_DECIDED',
  'CLUB_DISSOLVING',
  'CLUB_DISSOLVED',
  // Không còn gửi nữa (UC23 đã rút); giữ lại để các dòng cũ vẫn nằm trong inbox của thành viên.
  'CLUB_ROLE_ASSIGNED',
  'CLUB_ROLE_REVOKED',
  'CLUB_ROLE_UPDATED',
  // UC50/UC51: người khiếu nại được báo kết quả phân loại và việc đóng hoặc nâng cấp cuối cùng.
  'COMPLAINT_TRIAGED',
  'COMPLAINT_CLOSED',
  'COMPLAINT_ESCALATED',
]

/** Các mã gửi cho ICPDP officer: việc đang chờ trong hàng đợi duyệt hoặc cảnh báo về một CLB. */
export const ICPDP_NOTIFICATION_CODES: readonly string[] = [
  'SPONSORED_ITEM_SUBMITTED',
  'BOOKING_SUBMITTED',
  'BOOKING_CANCELLED',
  'BOOKING_RELEASED',
  'BOARD_NOMINATION_SUBMITTED',
  'SUSPENSION_REQUEST_SUBMITTED',
  'PERIODIC_REPORT_SUBMITTED',
  'VIOLATION_RESPONSE_SUBMITTED',
  'CORRECTIVE_ACTION_SUBMITTED',
  'EVENT_INVITATION_ACCEPTED',
  'EVENT_INVITATION_DECLINED',
  'CLUB_SUSPENSION_ENDING',
  'CLUB_LIFECYCLE_FAILED',
  'CLUB_DISSOLUTION_COMPLETED',
  'REPORT_ESCALATED_TO_ICPDP',
  'REFUND_OVERDUE_TO_ICPDP',
  'COMPLAINT_SUBMITTED',
  'COMPLAINT_CLUB_RESPONDED',
  'COMPLAINT_RESPONSE_OVERDUE',
  'EVENT_DEFENSE_CONFIRMED',
  'EVENT_DEFENSE_RESCHEDULE_REQUESTED',
  'EVENT_DEFENSE_CONFIRM_OVERDUE',
  'EVENT_CANCELLATION_REQUESTED',
]

/** Các mã gửi cho những người điều hành CLB (leader, ban điều hành, người duyệt, thành viên gửi yêu cầu). */
export const CLUB_NOTIFICATION_CODES: readonly string[] = [
  'SPONSORED_ITEM_UPDATED',
  'EVENT_PROPOSAL_APPROVED',
  'EVENT_PROPOSAL_REJECTED',
  'EVENT_PROPOSAL_REVISION_REQUESTED',
  'EVENT_PROPOSAL_EXPIRED',
  'EVENT_EXPIRED_UNPUBLISHED',
  'EVENT_PROPOSAL_RE-DEFENSE_PENDING',
  'EVENT_DEFENSE_SCHEDULED',
  'EVENT_DEFENSE_CANCELLED',
  'EVENT_DEFENSE_RESCHEDULE_DECIDED',
  'EVENT_DEFENSE_NO_SHOW',
  'EVENT_CANCELLATION_DECIDED',
  'PROPERTY_BOOKING_STATUS',
  'ROOM_ALLOCATED',
  'ROOM_ALLOCATION_REVOKED',
  'RECRUITMENT_APPLICATION_SUBMITTED',
  'RECRUITMENT_APPLICATION_WITHDRAWN',
  'MEMBERSHIP_WITHDRAWAL_REQUESTED',
  'TRANSITION_PLAN_RETURNED',
  'LEADERSHIP_TRANSITION_CONFIRMED',
  'BOARD_NOMINATION_DECIDED',
  'SUSPENSION_REQUEST_REJECTED',
  'COMPLAINT_FORWARDED',
  'VIOLATION_RESPONSE_REQUESTED',
  'VIOLATION_CLOSED_NO_VIOLATION',
  'VIOLATION_DECIDED',
  'VIOLATION_ACTIONS_ASSIGNED',
  'VIOLATION_ACTION_VERIFIED',
  'VIOLATION_ACTION_FAILED',
  'VIOLATION_RESOLVED',
  'PERIODIC_REPORT_OPENED',
  'PERIODIC_REPORT_ACCEPTED',
  'PERIODIC_REPORT_RETURNED',
  'PERIODIC_REPORT_MISSING',
  'EVALUATION_PUBLISHED',
  'SCHOOL_EVENT_INVITATION',
  'SCHOOL_EVENT_INVITATION_WITHDRAWN',
  'REPORT_DUE_SOON',
  'REPORT_DEADLINE_PASSED',
  'REPORT_ESCALATED',
  'REPORT_SAVE',
  'REPORT_SUBMIT',
  'REPORT_CLAIM',
  'REPORT_DECISION',
  'REPORT_OVERDUE',
  'SETTLEMENT_DUE_SOON',
  'SETTLEMENT_OVERDUE',
  'REFUND_DUE_SOON',
  'REFUND_OVERDUE',
  'SETTLEMENT_EXPENSE',
  'SETTLEMENT_EVIDENCE',
  'SETTLEMENT_SUBMIT',
  'SETTLEMENT_CLAIM',
  'SETTLEMENT_RETURN',
  'SETTLEMENT_FINALIZE',
  'BUDGET_ADVANCE_RECORDED',
  'BUDGET_TOPUP_RECORDED',
  'BUDGET_REFUND_RECORDED',
]

/**
 * Các mã từng gửi cho hai nhóm đối tượng trước khi được tách ra. Dòng ghi trước khi tách
 * là bản của ICPDP khi payload của nó mang khoá này (CLUB_DISSOLVED → CLUB_DISSOLUTION_COMPLETED).
 */
export const LEGACY_ICPDP_PAYLOAD_KEYS: Readonly<Record<string, string>> = {
  CLUB_DISSOLVED: 'outstandingPeriodicReports',
}

const audienceByCode = new Map<string, NotificationAudience>([
  ...STUDENT_NOTIFICATION_CODES.map((code) => [code, 'student'] as const),
  ...ICPDP_NOTIFICATION_CODES.map((code) => [code, 'icpdp'] as const),
  ...CLUB_NOTIFICATION_CODES.map((code) => [code, 'club'] as const),
])

// Xác định đối tượng nhận của một thông báo theo mã sự kiện
/** Nhóm đối tượng của một thông báo; mã không nhận ra được coi là của sinh viên. */
export function notificationAudience(
  eventCode: string,
  payload: Record<string, unknown> = {},
): NotificationAudience {
  const legacyKey = LEGACY_ICPDP_PAYLOAD_KEYS[eventCode]
  if (legacyKey && payload[legacyKey] !== undefined) {
    return 'icpdp'
  }
  return audienceByCode.get(eventCode) ?? 'student'
}

/** Bộ lọc inbox cho một workspace; `clubId` thu hẹp phạm vi CLB về đúng một CLB. */
export interface NotificationScope {
  audience: NotificationAudience
  clubId?: string
}

export interface NotificationInboxQuery {
  limit: number
  before?: Date
  unreadOnly: boolean
  /** Không có: lấy mọi thông báo của người dùng. */
  scope?: NotificationScope
}

export interface NotificationRepository {
  listMine(userId: string, query: NotificationInboxQuery): Promise<NotificationInbox>
  unreadCount(userId: string, scope?: NotificationScope): Promise<number>
  /** False khi thông báo không tồn tại hoặc thuộc về người khác. */
  markRead(userId: string, id: string, now: Date): Promise<boolean>
  markAllRead(userId: string, now: Date, scope?: NotificationScope): Promise<number>
}

export const NOTIFICATION_CHANNEL_IN_APP = 'IN_APP'
export const NOTIFICATION_CHANNEL_EMAIL = 'EMAIL'

/**
 * Các sự kiện được gửi thêm qua email, theo ma trận thông báo ở SRS §8.2: yêu cầu chỉnh sửa/quyết định
 * hồ sơ thành lập, quyết định đề xuất sự kiện, quyết định booking, khiếu nại được gửi/chuyển xuống và hồ sơ
 * vi phạm được mở/quyết định.
 */
export const EMAIL_EVENT_CODES: ReadonlySet<string> = new Set([
  'CLUB_APPLICATION_REVISION_REQUESTED',
  'CLUB_APPLICATION_APPROVED',
  'CLUB_APPLICATION_REJECTED',
  'EVENT_PROPOSAL_APPROVED',
  'EVENT_PROPOSAL_REJECTED',
  'EVENT_DEFENSE_SCHEDULED',
  'EVENT_DEFENSE_CANCELLED',
  'EVENT_DEFENSE_RESCHEDULE_DECIDED',
  'EVENT_DEFENSE_NO_SHOW',
  'PROPERTY_BOOKING_STATUS',
  'COMPLAINT_SUBMITTED',
  'COMPLAINT_FORWARDED',
  'VIOLATION_RESPONSE_REQUESTED',
  'VIOLATION_DECIDED',
  'VIOLATION_CLOSED_NO_VIOLATION',
])

// Xác định kênh gửi thông báo (in-app, có thể kèm email) theo mã sự kiện
export function notificationChannels(eventCode: string): string[] {
  return EMAIL_EVENT_CODES.has(eventCode)
    ? [NOTIFICATION_CHANNEL_IN_APP, NOTIFICATION_CHANNEL_EMAIL]
    : [NOTIFICATION_CHANNEL_IN_APP]
}

/** Một thông báo email trong hàng đợi, được một worker nhận xử lý trong `MAIL_LEASE_MS` (NTF-07). */
export interface ClaimedEmail {
  id: string
  /** Số thứ tự lần gửi này, bắt đầu từ 1. */
  attempt: number
  eventCode: string
  payload: Record<string, unknown>
  toEmail?: string
  displayName?: string
}

export interface OutgoingEmail {
  to: string
  subject: string
  text: string
}

/** Adapter gửi (SMTP, API của nhà cung cấp, log). Ném lỗi khi thư không được chấp nhận. */
export interface MailTransport {
  readonly name: string
  send(email: OutgoingEmail): Promise<{ providerResponse?: string }>
}

export interface MailOutboxRepository {
  /** Đánh dấu các thông báo chỉ trong ứng dụng đã đến hạn là đã gửi; chúng đã đọc được trong inbox. */
  drainInApp(now: Date): Promise<number>
  /** Nhận xử lý nguyên tử thông báo email đến hạn cũ nhất, đẩy `dueAt` của nó qua hết thời gian lease. */
  claimNextEmail(now: Date, leaseMs: number): Promise<ClaimedEmail | null>
  recordSent(
    claim: ClaimedEmail,
    toEmail: string,
    providerResponse: string | undefined,
    now: Date,
  ): Promise<void>
  /** `retryAt` null nghĩa là bỏ cuộc và đánh dấu thông báo là `Failed`. */
  recordFailed(
    claim: ClaimedEmail,
    toEmail: string,
    error: string,
    retryAt: Date | null,
    now: Date,
  ): Promise<void>
}

export const MAIL_MAX_ATTEMPTS = 5
export const MAIL_LEASE_MS = 5 * 60_000

// Tính thời gian chờ trước khi thử gửi lại email sau lần lỗi
/** Thời gian chờ trước lần thử kế tiếp sau khi thất bại: 1, 2, 4, 8 phút, tối đa một giờ. */
export function mailRetryDelayMs(attempt: number): number {
  return Math.min(60_000 * 2 ** Math.max(0, attempt - 1), 3_600_000)
}

// Biến mã sự kiện thành chuỗi dễ đọc
function humanize(code: string): string {
  const words = code.toLowerCase().split('_').filter(Boolean).join(' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// Ép giá trị payload về chuỗi, undefined nếu rỗng hoặc không phải chuỗi
function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

// Dựng nội dung email song ngữ cho một thông báo
/** Email song ngữ đơn giản cho một thông báo; inbox trong UCMS vẫn là nơi xem đầy đủ chi tiết. */
export function renderNotificationEmail(
  claim: ClaimedEmail,
  toEmail: string,
  appUrl?: string,
): OutgoingEmail {
  const subject = text(claim.payload.title) ?? text(claim.payload.clubName)
  const lines = [
    `${claim.displayName ? `Xin chào ${claim.displayName},` : 'Xin chào,'}`,
    '',
    `UCMS có cập nhật mới: ${humanize(claim.eventCode)}${subject ? ` — ${subject}` : ''}.`,
    ...(text(claim.payload.state) ? [`Trạng thái / State: ${text(claim.payload.state)}`] : []),
    ...(text(claim.payload.reason) ? [`Lý do / Reason: ${text(claim.payload.reason)}`] : []),
    '',
    `Xem chi tiết trong hộp thông báo UCMS${appUrl ? `: ${appUrl}` : '.'}`,
    '',
    '—',
    `UCMS update: ${humanize(claim.eventCode)}${subject ? ` — ${subject}` : ''}. Open the UCMS notification inbox for details.`,
  ]
  return {
    to: toEmail,
    subject: `[UCMS] ${humanize(claim.eventCode)}${subject ? `: ${subject}` : ''}`,
    text: lines.join('\n'),
  }
}
