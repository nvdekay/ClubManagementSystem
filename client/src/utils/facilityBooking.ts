import type { AppBadgeTone } from '@/components/ui/badge/AppBadge'
import type { BookingSlot } from '@/services/facilityBookings'

/** Mọi trạng thái của vòng đời booking cơ sở vật chất, theo thứ tự hiển thị trong bộ lọc. */
export const BOOKING_STATES = [
  'Draft',
  'Requested',
  'Under Review',
  'Revision Requested',
  'Approved',
  'Rejected',
  'In Use',
  'Completed',
  'Cancelled',
  'Released',
] as const

// Đổi thời điểm ISO sang chuỗi ngày giờ theo giờ Việt Nam (UTC+7)
export function bookingLocalTime(value: string) {
  return value ? new Date(new Date(value).getTime() + 7 * 3600000).toISOString().slice(0, 16) : ''
}
// Tìm số ca đặt phòng khớp với khoảng thời gian của booking
export function slotNumber(
  value: { startAt: string; endAt: string },
  slots: BookingSlot[],
): string {
  return String(
    slots.find(
      (slot) =>
        bookingLocalTime(value.startAt).slice(11) === slot.start &&
        bookingLocalTime(value.endAt).slice(11) === slot.end &&
        bookingLocalTime(value.startAt).slice(0, 10) === bookingLocalTime(value.endAt).slice(0, 10),
    )?.number ?? '',
  )
}
// Đổi ngày và số ca thành thời điểm bắt đầu, kết thúc ISO
export function slotInterval(day: string, number: string, slots: BookingSlot[]) {
  const slot = slots.find((item) => String(item.number) === number)
  if (!day || !slot) {
    return { startAt: '', endAt: '' }
  }
  return {
    startAt: new Date(`${day}T${slot.start}:00+07:00`).toISOString(),
    endAt: new Date(`${day}T${slot.end}:00+07:00`).toISOString(),
  }
}

/** Màu badge theo trạng thái booking; nhãn chữ vẫn là phần truyền đạt ý nghĩa. */
export function bookingTone(state: string): AppBadgeTone {
  if (state === 'Approved' || state === 'In Use' || state === 'Completed') {
    return 'success'
  }
  if (state === 'Requested' || state === 'Under Review') {
    return 'info'
  }
  if (state === 'Revision Requested') {
    return 'warning'
  }
  if (state === 'Rejected') {
    return 'danger'
  }
  return 'neutral'
}
