import type { TFunction } from 'i18next'

import type { AppBadgeTone } from '@/components/ui/badge/AppBadge'

/** Nhận xét ICPDP lưu kèm quyết định (UC26): các phần cần sửa và điều kiện duyệt (nếu có). */
export type DecisionComments = { sections?: string[]; conditions?: string[] }

export const stateTones: Record<string, AppBadgeTone> = {
  Draft: 'neutral',
  'Pending Approval': 'warning',
  'Revision Requested': 'warning',
  'Re-defense Pending': 'info',
  Approved: 'success',
  Upcoming: 'success',
  Ongoing: 'success',
  Completed: 'neutral',
  'Report Submitted': 'neutral',
  Closed: 'neutral',
  Rejected: 'danger',
  Cancelled: 'danger',
  DRAFT: 'neutral',
  CREATED: 'success',
  PUBLIC: 'success',
  ONGOING: 'success',
  FINISH: 'neutral',
  CANCELLED: 'danger',
}

/** Các trạng thái trong vòng đời sự kiện nội bộ tự túc; đề xuất gửi ICPDP dùng các trạng thái viết hoa chữ đầu. */
const internalStates = ['DRAFT', 'CREATED', 'PUBLIC', 'ONGOING', 'FINISH', 'CANCELLED']
// Kiểm tra trạng thái có thuộc nhóm sự kiện nội bộ không
export function isInternalState(state: string) {
  return internalStates.includes(state)
}

// Nhãn hiển thị của trạng thái sự kiện
/** `clubEvents.PUBLIC` là nhãn đối tượng tham dự, nên trạng thái `PUBLIC` nội bộ có key riêng. */
export function stateLabel(t: TFunction, state: string) {
  return state === 'PUBLIC'
    ? t('clubEvents.statePUBLIC')
    : t(`clubEvents.${state}`, { defaultValue: state })
}

// Đổi thời điểm ISO sang giờ Việt Nam cho ô nhập datetime-local
export function localTime(value: string) {
  return new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16)
}

// Đổi giá trị datetime-local (giờ Việt Nam) sang chuỗi ISO
export function iso(value: string) {
  return new Date(`${value}:00+07:00`).toISOString()
}

// Kiểm tra số nguyên nằm trong khoảng cho phép, trả thông báo lỗi nếu sai
export function numberError(t: TFunction, value: number, min: number, max: number) {
  if (!Number.isInteger(value)) {
    return t('common.invalidNumber')
  }
  if (value < min) {
    return t('common.numberMin', { min })
  }
  return value > max ? t('common.numberMax', { max }) : null
}

// Nhãn của mục sự kiện bị yêu cầu chỉnh sửa khi review
export function sectionLabel(t: TFunction, value: string) {
  switch (value) {
    case 'schedule':
      return t('eventReviews.sectionschedule')
    case 'venue':
      return t('eventReviews.sectionvenue')
    case 'content':
      return t('eventReviews.sectioncontent')
    case 'risk':
      return t('eventReviews.sectionrisk')
    case 'budget':
      return t('eventReviews.sectionbudget')
    default:
      return t('eventReviews.sectionother')
  }
}

export interface BookingScheduleOption {
  id: string
  propertyId: string
  propertyType?: string
  startAt: string
  endAt: string
}

const CONSECUTIVE_SLOT_GAP_MS = 15 * 60_000
const TIMEZONE_OFFSET_MS = 7 * 3600_000
const DAY_MS = 86_400_000

// Tính chỉ số ngày theo múi giờ Việt Nam từ mốc thời gian
function vietnamDayIndex(timeMs: number): number {
  return Math.floor((timeMs + TIMEZONE_OFFSET_MS) / DAY_MS)
}

// Gộp các khoảng thời gian liền kề hoặc chồng nhau thành một khoảng
function mergeConsecutiveIntervals(intervals: readonly { startMs: number; endMs: number }[]) {
  if (!intervals.length) {
    return []
  }
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  const merged = [{ ...sorted[0]! }]
  for (let i = 1; i < sorted.length; i += 1) {
    const prev = merged[merged.length - 1]!
    const next = sorted[i]!
    const sameDay = vietnamDayIndex(prev.endMs - 1) === vietnamDayIndex(next.startMs)
    if (
      next.startMs <= prev.endMs ||
      (sameDay && next.startMs - prev.endMs <= CONSECUTIVE_SLOT_GAP_MS)
    ) {
      if (next.endMs > prev.endMs) {
        prev.endMs = next.endMs
      }
    } else {
      merged.push({ ...next })
    }
  }
  return merged
}

// Kiểm tra các booking đã liên kết có phủ kín lịch sự kiện không
/** Kiểm tra ở client các booking cơ sở vật chất đính kèm so với tài sản đã chọn và khoảng thời gian sự kiện. */
export function bookingsScheduleError(
  t: TFunction,
  bookingIds: readonly string[],
  availableBookings: readonly BookingScheduleOption[] | undefined,
  propertyId: string | undefined,
  intervals: readonly { startAt: string; endAt: string; propertyId?: string }[],
): string | null {
  if (!bookingIds.length || !availableBookings) {
    return null
  }
  const parsedIntervals = intervals
    .map((item) => ({
      startMs: Date.parse(item.startAt),
      endMs: Date.parse(item.endAt),
      propertyId: item.propertyId || propertyId,
    }))
    .filter(
      (item) =>
        Number.isFinite(item.startMs) && Number.isFinite(item.endMs) && item.endMs > item.startMs,
    )
  if (!parsedIntervals.length) {
    return null
  }

  const sessionPropertyIds = new Set(
    parsedIntervals.map((item) => item.propertyId).filter((id): id is string => Boolean(id)),
  )
  if (propertyId) {
    sessionPropertyIds.add(propertyId)
  }

  const selected = bookingIds
    .map((id) => availableBookings.find((b) => b.id === id))
    .filter((b): b is BookingScheduleOption => Boolean(b))

  for (const booking of selected) {
    if (booking.propertyType !== 'EQUIPMENT' && !sessionPropertyIds.has(booking.propertyId)) {
      return t('clubEvents.errors.bookingPropertyMismatch')
    }
  }

  for (const booking of selected) {
    const startMs = Date.parse(booking.startAt)
    const endMs = Date.parse(booking.endAt)
    const sameProperty = selected
      .filter((other) => other.propertyId === booking.propertyId)
      .map((other) => ({ startMs: Date.parse(other.startAt), endMs: Date.parse(other.endAt) }))
      .filter((item) => Number.isFinite(item.startMs) && Number.isFinite(item.endMs))
    const merged = mergeConsecutiveIntervals(sameProperty)
    const containing = merged.find((w) => w.startMs <= startMs && w.endMs >= endMs)
    const targetIntervals =
      booking.propertyType === 'EQUIPMENT'
        ? parsedIntervals
        : parsedIntervals.filter((ev) => ev.propertyId === booking.propertyId)
    if (
      !containing ||
      !targetIntervals.some(
        (ev) => containing.startMs <= ev.startMs && containing.endMs >= ev.endMs,
      )
    ) {
      return t('clubEvents.errors.bookingScheduleNotCovered')
    }
  }
  return null
}

/** Thao tác mở trong hộp thoại của trang sự kiện CLB. */
export type ClubEventOperation =
  'publish' | 'cancel' | 'reschedule' | 'capacity' | 'check-in' | 'correct' | 'unlock'

/** Đề xuất đã được duyệt: huỷ phải gửi yêu cầu cho ICPDP thay vì huỷ ngay. */
export function isApprovedProposalState(state: string) {
  return ['Approved', 'Upcoming', 'Ongoing'].includes(state)
}

// Tiêu đề hộp thoại thao tác theo loại thao tác và trạng thái sự kiện
export function operationTitle(
  t: TFunction,
  operation: ClubEventOperation | null,
  state: string | undefined,
) {
  return t(
    `clubEvents.${operation === 'check-in' ? 'checkin' : operation === 'capacity' ? 'maxParticipants' : operation === 'cancel' && state && isApprovedProposalState(state) ? 'requestCancel' : (operation ?? 'details')}`,
  )
}

// Tông màu huy hiệu của trạng thái buổi bảo vệ đề xuất
export function defenseStateTone(state: string): AppBadgeTone {
  if (state === 'CONFIRMED' || state === 'IN_PROGRESS') {
    return 'success'
  }
  if (state === 'RESCHEDULE_REQUESTED') {
    return 'warning'
  }
  return state === 'NO_SHOW' ? 'danger' : 'info'
}

// Nhãn kết quả một quyết định ICPDP trên đề xuất
export function decisionOutcomeLabel(t: TFunction, outcome: string) {
  if (outcome === 'Re-defense') {
    return t('eventDefense.outcomeReDefense')
  }
  return t(
    `eventReviews.${outcome === 'Approve' ? 'approve' : outcome === 'Reject' ? 'reject' : 'requestRevision'}`,
  )
}
