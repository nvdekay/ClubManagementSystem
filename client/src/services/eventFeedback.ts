import { apiClient } from '@/services/apiRequest'

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

const request = apiClient('/api/v1')

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
