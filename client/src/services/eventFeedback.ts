import { EventRegistrationError } from "@/services/eventRegistrations";

export interface MyEventFeedback {
  id: string;
  eventId: string;
  eventTitle: string;
  clubName: string;
  rating: number;
  comment: string;
  isAnonymous: boolean;
  submittedAt: string;
}

export interface EventFeedbackContext {
  attended: boolean;
  canSubmit: boolean;
  opensAt: string | null;
  closesAt: string | null;
  feedback: MyEventFeedback | null;
}

export interface EventFeedbackInput {
  rating: number;
  comment: string;
  isAnonymous: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new EventRegistrationError(body?.message ?? `HTTP ${response.status}`, response.status);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

export function fetchEventFeedbackContext(eventId: string, signal: AbortSignal) {
  return request<EventFeedbackContext>(`/events/${encodeURIComponent(eventId)}/feedback`, { signal });
}

export function fetchMyEventFeedback(signal: AbortSignal) {
  return request<MyEventFeedback[]>("/event-feedbacks/mine", { signal });
}

export function submitEventFeedback(eventId: string, input: EventFeedbackInput, csrfToken: string) {
  return request<MyEventFeedback>(`/events/${encodeURIComponent(eventId)}/feedback`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  });
}
