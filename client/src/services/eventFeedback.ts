import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
import { EventRegistrationError } from '@/services/eventRegistrations'

export interface MyEventFeedback {
  id: string
  eventId: string
  eventTitle: string
  clubName: string
  rating: number
  comment: string
  isAnonymous: boolean
  submittedAt: string
}

export interface EventFeedbackContext {
  attended: boolean
  canSubmit: boolean
  opensAt: string | null
  closesAt: string | null
  feedback: MyEventFeedback | null
}

export interface EventFeedbackInput {
  rating: number
  comment: string
  isAnonymous: boolean
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1${path}`, { ...options, toError: toRegistrationError })
}

// Maps a failed response to this module's error type
function toRegistrationError(failure: ApiFailure): Error {
  return new EventRegistrationError(failure.message, failure.status)
}

// GET /events/:id/feedback: điều kiện và form phản hồi sự kiện
export function fetchEventFeedbackContext(eventId: string, signal: AbortSignal) {
  return request<EventFeedbackContext>(`/events/${encodeURIComponent(eventId)}/feedback`, {
    signal,
  })
}

// GET /event-feedbacks/mine: phản hồi sự kiện của tôi
export function fetchMyEventFeedback(signal: AbortSignal) {
  return request<MyEventFeedback[]>('/event-feedbacks/mine', { signal })
}

// POST gửi phản hồi sự kiện
export function submitEventFeedback(eventId: string, input: EventFeedbackInput, csrfToken: string) {
  return request<MyEventFeedback>(`/events/${encodeURIComponent(eventId)}/feedback`, {
    method: 'POST',
    csrfToken,
    body: input,
  })
}
