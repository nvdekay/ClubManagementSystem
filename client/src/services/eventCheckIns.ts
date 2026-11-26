import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
import { EventRegistrationError } from '@/services/eventRegistrations'

export type AttendanceMethod = 'self' | 'manual' | 'walk-in'

export interface Attendance {
  id: string
  eventId: string
  eventTitle: string
  clubId?: string
  clubName: string
  eventStartAt: string
  eventEndAt: string
  checkedInAt: string
  method: AttendanceMethod
  abnormalFlags: string[]
  feedbackOpensAt: string
  feedbackClosesAt: string | null
}

export interface CheckInResult extends Attendance {
  alreadyCheckedIn: boolean
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1${path}`, { ...options, toError: toRegistrationError })
}

// Maps a failed response to this module's error type
function toRegistrationError(failure: ApiFailure): Error {
  return new EventRegistrationError(failure.message, failure.status)
}

// GET /attendances/mine: lịch sử điểm danh của tôi
export function fetchMyAttendances(signal: AbortSignal) {
  return request<Attendance[]>('/attendances/mine', { signal })
}

// POST /check-in: điểm danh sự kiện bằng mã
export function checkInToEvent(eventId: string, code: string, csrfToken: string) {
  return request<CheckInResult>(`/events/${encodeURIComponent(eventId)}/check-in`, {
    method: 'POST',
    csrfToken,
    body: { code },
  })
}
