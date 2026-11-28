import { apiClient } from '@/services/apiRequest'
export type EventRegistrationState = 'Confirmed' | 'Waitlisted' | 'Cancelled'
export type EventRegistrationAnswer = string | string[]

export interface EventRegistrationFormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox'
  required: boolean
  options?: string[]
}

export interface EventRegistration {
  id: string
  eventId: string
  studentId: string
  clubId?: string
  clubName: string
  eventTitle: string
  eventStartAt: string
  eventEndAt: string
  checkInOpensAt: string
  checkInClosesAt: string
  state: EventRegistrationState
  waitlistPosition?: number
  answers: Record<string, EventRegistrationAnswer>
  createdAt: string
  cancelledAt?: string
}

export interface EventRegistrationContext {
  event: {
    id: string
    clubId?: string
    clubName: string
    title: string
    state: string
    audienceScope: string
    startAt: string
    endAt: string
    registrationOpenAt?: string
    registrationCloseAt?: string
    capacity: number
    confirmedRegistrationCount: number
    waitlistEnabled: boolean
  }
  formSchema: EventRegistrationFormField[]
  isActiveClubMember: boolean
  registration: EventRegistration | null
  registrationOpen: boolean
}

const request = apiClient('/api/v1')

// GET /events/:id/registration: điều kiện đăng ký sự kiện
export function fetchEventRegistrationContext(eventId: string, signal: AbortSignal) {
  return request<EventRegistrationContext>(`/events/${encodeURIComponent(eventId)}/registration`, {
    signal,
  })
}

// GET /event-registrations/mine: đăng ký sự kiện của tôi
export function fetchMyEventRegistrations(signal: AbortSignal) {
  return request<EventRegistration[]>('/event-registrations/mine', { signal })
}

// POST /registrations: đăng ký tham gia sự kiện kèm câu trả lời
export function registerForEvent(
  eventId: string,
  answers: Record<string, EventRegistrationAnswer>,
  csrfToken: string,
) {
  return request<EventRegistration>(`/events/${encodeURIComponent(eventId)}/registrations`, {
    method: 'POST',
    csrfToken,
    body: { answers },
  })
}

// POST /cancel: huỷ đăng ký sự kiện
export function cancelEventRegistration(registrationId: string, csrfToken: string) {
  return request<EventRegistration>(
    `/event-registrations/${encodeURIComponent(registrationId)}/cancel`,
    { method: 'POST', csrfToken },
  )
}
