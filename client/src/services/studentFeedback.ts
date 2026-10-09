export type FeedbackRecipient = "CLUB" | "ICPDP";
export type FeedbackCategory = "suggestion" | "praise" | "issue";

export interface SentFeedback {
  id: string;
  recipient: FeedbackRecipient;
  clubId?: string;
  clubName?: string;
  eventId?: string;
  eventTitle?: string;
  category: FeedbackCategory;
  message: string;
  isAnonymous: boolean;
  submittedAt: string;
}

export interface ReceivedFeedback extends SentFeedback {
  sender?: { displayName: string; email: string };
}

export interface StudentFeedbackInput {
  recipient: FeedbackRecipient;
  clubId?: string;
  eventId?: string;
  category: FeedbackCategory;
  message: string;
  isAnonymous: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

export function fetchMyStudentFeedback(signal: AbortSignal) {
  return request<SentFeedback[]>("/student-feedback/mine", { signal });
}

export function fetchClubFeedbackInbox(clubId: string, signal: AbortSignal) {
  return request<ReceivedFeedback[]>(`/clubs/${encodeURIComponent(clubId)}/student-feedback`, { signal });
}

export function fetchIcpdpFeedbackInbox(signal: AbortSignal) {
  return request<ReceivedFeedback[]>("/admin/student-feedback", { signal });
}

export function sendStudentFeedback(input: StudentFeedbackInput, csrfToken: string) {
  return request<SentFeedback>("/student-feedback", {
    method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  });
}
