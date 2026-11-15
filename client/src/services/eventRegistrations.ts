import { ApiError, apiFetch } from "@/services/apiError";
export type EventRegistrationState = "Confirmed" | "Waitlisted" | "Cancelled";
export type EventRegistrationAnswer = string | string[];

export interface EventRegistrationFormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox";
  required: boolean;
  options?: string[];
}

export interface EventRegistration {
  id: string;
  eventId: string;
  studentId: string;
  clubId?: string;
  clubName: string;
  eventTitle: string;
  eventStartAt: string;
  eventEndAt: string;
  checkInOpensAt: string;
  checkInClosesAt: string;
  state: EventRegistrationState;
  waitlistPosition?: number;
  answers: Record<string, EventRegistrationAnswer>;
  createdAt: string;
  cancelledAt?: string;
}

export interface EventRegistrationContext {
  event: {
    id: string;
    clubId?: string;
    clubName: string;
    title: string;
    state: string;
    audienceScope: string;
    startAt: string;
    endAt: string;
    registrationOpenAt?: string;
    registrationCloseAt?: string;
    capacity: number;
    confirmedRegistrationCount: number;
    waitlistEnabled: boolean;
  };
  formSchema: EventRegistrationFormField[];
  isActiveClubMember: boolean;
  registration: EventRegistration | null;
  registrationOpen: boolean;
}

/** Mang theo HTTP status để màn hình phân biệt "cần đăng nhập" (401) với các lỗi thật. */
export class EventRegistrationError extends ApiError {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// Gọi API /api/v1 và trả về data, ném lỗi kèm status nếu thất bại
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new EventRegistrationError(body?.message ?? `HTTP ${response.status}`, response.status);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

// Dựng RequestInit POST có CSRF và body JSON tuỳ chọn
function mutation(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

// GET /events/:id/registration: điều kiện đăng ký sự kiện
export function fetchEventRegistrationContext(eventId: string, signal: AbortSignal) {
  return request<EventRegistrationContext>(`/events/${encodeURIComponent(eventId)}/registration`, { signal });
}

// GET /event-registrations/mine: đăng ký sự kiện của tôi
export function fetchMyEventRegistrations(signal: AbortSignal) {
  return request<EventRegistration[]>("/event-registrations/mine", { signal });
}

// POST /registrations: đăng ký tham gia sự kiện kèm câu trả lời
export function registerForEvent(eventId: string, answers: Record<string, EventRegistrationAnswer>,
  csrfToken: string) {
  return request<EventRegistration>(`/events/${encodeURIComponent(eventId)}/registrations`,
    mutation(csrfToken, { answers }));
}

// POST /cancel: huỷ đăng ký sự kiện
export function cancelEventRegistration(registrationId: string, csrfToken: string) {
  return request<EventRegistration>(`/event-registrations/${encodeURIComponent(registrationId)}/cancel`,
    mutation(csrfToken));
}
