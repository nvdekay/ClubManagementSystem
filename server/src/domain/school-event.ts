import { DomainError } from './errors.js'
import type { AcademicSemester } from './policy.js'

/** Mặc định BR59: CLB phản hồi trước khi sự kiện bắt đầu ba ngày (hằng số của tài liệu chính sách). */
export const INVITATION_DEADLINE_DAYS_BEFORE = 3
export const MAX_INVITED_CLUBS = 200
/** Tên đơn vị tổ chức lưu trên sự kiện toàn trường vì không có CLB (DBML `events.clubName`). */
export const SCHOOL_ORGANIZER_NAME = 'ICPDP'
const DAY_MS = 24 * 60 * 60 * 1000

export type InvitationStatus = 'Pending' | 'Accepted' | 'Declined' | 'Expired' | 'Withdrawn'

export interface EventInvitation {
  id: string
  clubId: string
  clubName: string
  status: InvitationStatus
  deadline: Date
  invitedAt: Date
  respondedAt?: Date
  responseNote?: string
  responseDetails?: unknown
}

export interface InvitationCounts {
  invited: number
  pending: number
  accepted: number
  declined: number
  expired: number
  withdrawn: number
}

export interface ScheduleConflict {
  kind: 'event' | 'booking'
  title: string
  startAt: Date
  endAt: Date
}

export interface SchoolEventSummary {
  id: string
  title: string
  startAt: Date
  endAt: Date
  venueText?: string
  property?: { id: string; code: string; name: string }
  capacity: number
  state: string
  semesterCode: string
  publishedAt?: Date
  confirmedRegistrationCount: number
  counts: InvitationCounts
}

export interface SchoolEventDetail extends SchoolEventSummary {
  objective?: string
  coordination?: string
  conflictResult: 'No Conflict' | 'Warning'
  conflicts: ScheduleConflict[]
  checkInCode?: string
  registrationCloseAt?: Date
  invitations: EventInvitation[]
}

export interface SchoolEventInput {
  title: string
  objective?: string
  coordination?: string
  startAt: Date
  endAt: Date
  venueText?: string
  propertyId?: string
  capacity: number
  invitationDeadline?: Date
  clubIds?: string[]
  allActiveClubs?: boolean
}

export interface NormalizedSchoolEvent extends Omit<
  SchoolEventInput,
  'invitationDeadline' | 'clubIds' | 'allActiveClubs'
> {
  semesterCode: string
  invitation: NormalizedInvitation
}

export interface NormalizedInvitation {
  clubIds: string[]
  allActiveClubs: boolean
  deadline: Date
}

export interface InvitationOutcome {
  invited: string[]
  /** CLB bị bỏ qua vì không Active (BR59) hoặc đã được mời rồi. */
  skipped: { clubId: string; reason: 'notActive' | 'alreadyInvited' }[]
}

export interface SchoolEventRepository {
  list(): Promise<SchoolEventSummary[]>
  find(id: string): Promise<SchoolEventDetail | null>
  /** BR15: sự kiện và booking đã duyệt trên cùng property có thời gian chồng lấn với khoảng này. */
  conflicts(
    propertyId: string | undefined,
    startAt: Date,
    endAt: Date,
    excludeEventId?: string,
  ): Promise<ScheduleConflict[]>
  create(
    input: NormalizedSchoolEvent,
    officerId: string,
    now: Date,
  ): Promise<{ detail: SchoolEventDetail; outcome: InvitationOutcome }>
  invite(
    id: string,
    invitation: NormalizedInvitation,
    officerId: string,
    now: Date,
  ): Promise<{ detail: SchoolEventDetail; outcome: InvitationOutcome }>
  withdraw(
    id: string,
    invitationId: string,
    officerId: string,
    now: Date,
  ): Promise<SchoolEventDetail>
  publish(id: string, officerId: string, now: Date): Promise<SchoolEventDetail>
  /** BR59: lời mời Pending quá hạn chuyển thành Expired. */
  expireInvitations(now: Date): Promise<number>
}

// Ném lỗi validation cho trường sự kiện trường không hợp lệ
function invalid(message: string, field: string): never {
  throw new DomainError(message, 'validation', { field })
}

// Cắt khoảng trắng và kiểm tra độ dài trường văn bản của sự kiện trường
function text(value: string | undefined, max: number, field: string): string | undefined {
  const trimmed = value?.trim()
  if (trimmed && trimmed.length > max) {
    invalid(`${field} is too long`, field)
  }
  return trimmed || undefined
}

// BR44: tìm học kỳ chứa trọn sự kiện
/** BR44: học kỳ chứa trọn sự kiện. */
export function semesterOf(
  calendar: readonly AcademicSemester[],
  startAt: Date,
  endAt: Date,
): string {
  const found = calendar.find((semester) => semester.startAt <= startAt && endAt <= semester.endAt)
  if (!found) {
    invalid('the event must start and end within one semester of the academic calendar', 'startAt')
  }
  return found.code
}

// Tính hạn phản hồi lời mời mặc định trước ngày diễn ra sự kiện
export function defaultInvitationDeadline(startAt: Date, now: Date): Date {
  const deadline = new Date(startAt.getTime() - INVITATION_DEADLINE_DAYS_BEFORE * DAY_MS)
  return deadline > now ? deadline : startAt
}

// Chuẩn hoá danh sách CLB được mời và hạn phản hồi
export function normalizedInvitation(
  input: { clubIds?: string[]; allActiveClubs?: boolean; deadline?: Date },
  startAt: Date,
  now: Date,
  requireClubs: boolean,
): NormalizedInvitation {
  const clubIds = [...new Set(input.clubIds ?? [])]
  if (clubIds.length > MAX_INVITED_CLUBS) {
    invalid('too many clubs', 'clubIds')
  }
  if (requireClubs && !clubIds.length && !input.allActiveClubs) {
    invalid('choose at least one club to invite', 'clubIds')
  }
  const deadline = input.deadline ?? defaultInvitationDeadline(startAt, now)
  if (Number.isNaN(deadline.getTime()) || deadline <= now || deadline > startAt) {
    invalid(
      'the reply deadline must be in the future and no later than the event start',
      'invitationDeadline',
    )
  }
  return { clubIds, allActiveClubs: input.allActiveClubs === true, deadline }
}

// Kiểm tra và chuẩn hoá dữ liệu sự kiện do trường tổ chức
export function normalizedSchoolEvent(
  input: SchoolEventInput,
  calendar: readonly AcademicSemester[],
  now: Date,
): NormalizedSchoolEvent {
  const title = text(input.title, 200, 'title')
  if (!title) {
    invalid('a title is required', 'title')
  }
  if (Number.isNaN(input.startAt.getTime()) || input.startAt <= now) {
    invalid('the event must start in the future', 'startAt')
  }
  if (Number.isNaN(input.endAt.getTime()) || input.endAt <= input.startAt) {
    invalid('the event must end after it starts', 'endAt')
  }
  const venueText = text(input.venueText, 200, 'venueText')
  if (!venueText && !input.propertyId) {
    invalid('choose a room or type a venue', 'venueText')
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1 || input.capacity > 100_000) {
    invalid('invalid capacity', 'capacity')
  }
  return {
    title,
    objective: text(input.objective, 5_000, 'objective'),
    coordination: text(input.coordination, 5_000, 'coordination'),
    startAt: input.startAt,
    endAt: input.endAt,
    venueText,
    ...(input.propertyId ? { propertyId: input.propertyId } : {}),
    capacity: input.capacity,
    semesterCode: semesterOf(calendar, input.startAt, input.endAt),
    invitation: normalizedInvitation(
      {
        clubIds: input.clubIds,
        allActiveClubs: input.allActiveClubs,
        deadline: input.invitationDeadline,
      },
      input.startAt,
      now,
      false,
    ),
  }
}

// Sinh mã check-in ngắn cho sự kiện (UC31)
/** Mã ngắn sinh viên nhập tại địa điểm (UC31); các ký tự dễ nhầm được loại bỏ. */
export function checkInCode(random: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join('')
}
