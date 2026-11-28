import { ApiError } from '@/services/apiError'
import { apiClient, type ApiFailure } from '@/services/apiRequest'
import type { Property } from './properties'

export interface RoomAllocationOccurrence {
  bookingId: string
  startAt: string
  endAt: string
  state: string
}
export interface RoomAllocation {
  id: string
  semesterCode: string
  clubId: string
  clubName: string
  propertyId: string
  propertyName: string
  location: string
  /** 1 = Thứ Hai … 7 = Chủ nhật. */
  weekday: number
  slot: number
  note?: string
  allocatedBy: string
  allocatedByName?: string
  allocatedAt: string
  revokedAt?: string
  revokeReason?: string
  occurrences: RoomAllocationOccurrence[]
}
export interface RoomAllocationOptions {
  semesters: Array<{ code: string; startAt: string; endAt: string }>
  clubs: Array<{ id: string; name: string; state: string }>
  rooms: Property[]
}
export interface RoomAllocationInput {
  semesterCode: string
  clubId: string
  propertyId: string
  weekday: number
  slot: number
  note?: string
}
export interface RoomAllocationConflict {
  startAt: string
  endAt: string
  source: 'booking' | 'event'
  title: string
  clubName?: string
}
/** Ô trong lưới tuần bị chặn bởi sự kiện hoặc booking đã duyệt trên phòng đó (UC58 A3). */
export interface RoomOccupancyCell {
  weekday: number
  slot: number
  items: RoomAllocationConflict[]
}

/** Giữ `details` của server (vd các ngày bị trùng) cùng với thông báo. */
export class RoomAllocationError extends ApiError {
  constructor(
    message: string,
    status: number,
    readonly details?: unknown,
  ) {
    super(message, status)
    this.name = 'RoomAllocationError'
  }
}

const request = apiClient('/api/v1', toRoomAllocationError)

// Maps a failed response to this module's error type
function toRoomAllocationError(failure: ApiFailure): Error {
  return new RoomAllocationError(failure.message, failure.status, failure.details)
}

// GET /options: CLB, phòng và học kỳ có thể phân bổ
export function fetchRoomAllocationOptions(signal: AbortSignal): Promise<RoomAllocationOptions> {
  return request('/admin/room-allocations/options', { signal })
}
// GET phân bổ phòng của một học kỳ
export function fetchRoomAllocations(
  semesterCode: string,
  signal: AbortSignal,
): Promise<RoomAllocation[]> {
  return request(`/admin/room-allocations?${new URLSearchParams({ semesterCode })}`, { signal })
}
// GET /occupancy: tình trạng sử dụng của một phòng trong học kỳ
export function fetchRoomOccupancy(
  semesterCode: string,
  propertyId: string,
  signal: AbortSignal,
): Promise<RoomOccupancyCell[]> {
  return request(
    `/admin/room-allocations/occupancy?${new URLSearchParams({ semesterCode, propertyId })}`,
    { signal },
  )
}
// GET phòng được phân bổ cho CLB
export function fetchClubRoomAllocations(
  clubId: string,
  signal: AbortSignal,
): Promise<RoomAllocation[]> {
  return request(`/clubs/${encodeURIComponent(clubId)}/room-allocations`, { signal })
}
// POST tạo phân bổ phòng cho CLB
export function createRoomAllocation(
  input: RoomAllocationInput,
  csrfToken: string,
): Promise<RoomAllocation> {
  return request('/admin/room-allocations', { method: 'POST', csrfToken, body: input })
}
// POST /revoke: thu hồi phân bổ phòng
export function revokeRoomAllocation(
  id: string,
  reason: string,
  csrfToken: string,
): Promise<RoomAllocation> {
  return request(`/admin/room-allocations/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
    csrfToken,
    body: { reason },
  })
}
