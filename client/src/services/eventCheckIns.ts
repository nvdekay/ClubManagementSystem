import { EventRegistrationError } from "@/services/eventRegistrations";

export type AttendanceMethod = "self" | "manual" | "walk-in";

export interface Attendance {
  id: string;
  eventId: string;
  eventTitle: string;
  clubId: string;
  clubName: string;
  eventStartAt: string;
  eventEndAt: string;
  checkedInAt: string;
  method: AttendanceMethod;
  abnormalFlags: string[];
  feedbackOpensAt: string;
  feedbackClosesAt: string | null;
}

export interface CheckInResult extends Attendance {
  alreadyCheckedIn: boolean;
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

export function fetchMyAttendances(signal: AbortSignal) {
  return request<Attendance[]>("/attendances/mine", { signal });
}

export function checkInToEvent(eventId: string, code: string, csrfToken: string) {
  return request<CheckInResult>(`/events/${encodeURIComponent(eventId)}/check-in`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ code }),
  });
}
