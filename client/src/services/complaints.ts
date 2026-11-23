import { ApiError, apiFetch } from "@/services/apiError";
export const COMPLAINT_TYPES = ["CONDUCT", "EVENT", "FINANCE", "SAFETY", "OTHER"] as const;
export type ComplaintType = (typeof COMPLAINT_TYPES)[number];
export type ComplaintState = "Submitted" | "Under Triage" | "Dismissed" | "Forwarded" | "Club Responded" | "Escalated"
  | "Closed" | "Withdrawn";
export type TriageOutcome = "Dismissed" | "Forwarded" | "Escalated";
export type Severity = "MINOR" | "MODERATE" | "SERIOUS";
export type Validity = "VALID" | "PARTLY_VALID" | "UNFOUNDED";

export interface ComplaintEvidence { label: string; url: string }
export interface ComplaintClubResponse { text: string; action: string; evidence: ComplaintEvidence[]; at: string }

export interface Complaint {
  id: string;
  clubId?: string;
  clubName?: string;
  clubState?: string;
  eventId?: string;
  eventTitle?: string;
  type: string;
  description: string;
  evidence: ComplaintEvidence[];
  state: ComplaintState;
  triage?: { severity: Severity; validity: Validity; outcome: TriageOutcome; reason: string; at: string };
  clubResponse?: ComplaintClubResponse;
  closure?: { reason: string; at: string };
  forwardedAt?: string;
  respondedAt?: string;
  responseDueAt?: string;
  violationId?: string;
  linkedComplaintId?: string;
  submittedAt: string;
  withdrawnAt?: string;
  closedAt?: string;
}

export interface ComplaintForIcpdp extends Complaint {
  complainant: { id: string; displayName: string; email: string };
  linkedComplaintIds: string[];
}

/** What a club receives: never the complainant (D5). */
export interface ComplaintForClub {
  id: string;
  clubId: string;
  eventTitle?: string;
  type: string;
  description: string;
  evidence: ComplaintEvidence[];
  state: "Forwarded" | "Club Responded" | "Closed" | "Escalated";
  forwardNote: string;
  forwardedAt: string;
  responseDueAt?: string;
  clubResponse?: ComplaintClubResponse;
}

export interface ComplaintInput {
  clubId: string;
  eventId?: string;
  type: ComplaintType;
  description: string;
  evidence: ComplaintEvidence[];
}

export type ComplaintDecisionInput =
  | { kind: "open" }
  | { kind: "triage"; outcome: TriageOutcome; severity: Severity; validity: Validity; reason: string; responseDueAt?: string }
  | { kind: "close"; reason: string }
  | { kind: "escalate"; severity: Severity; reason: string }
  | { kind: "link"; targetId: string; reason: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(body?.message ?? `HTTP ${response.status}`);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

function post<T>(path: string, csrfToken: string, body?: unknown) {
  return request<T>(path, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body ?? {}) });
}

export function fetchMyComplaints(signal: AbortSignal) {
  return request<Complaint[]>("/complaints/mine", { signal });
}
export function submitComplaint(input: ComplaintInput, csrfToken: string) {
  return post<Complaint>("/complaints", csrfToken, input);
}
export function withdrawComplaint(id: string, csrfToken: string) {
  return post<Complaint>(`/complaints/${encodeURIComponent(id)}/withdraw`, csrfToken);
}
export function fetchComplaintQueue(state: ComplaintState | "", signal: AbortSignal) {
  return request<ComplaintForIcpdp[]>(`/admin/complaints${state ? `?state=${encodeURIComponent(state)}` : ""}`, { signal });
}
export function decideComplaint(id: string, decision: ComplaintDecisionInput, csrfToken: string) {
  const { kind, ...body } = decision;
  return post<ComplaintForIcpdp>(`/admin/complaints/${encodeURIComponent(id)}/${kind}`, csrfToken, kind === "open" ? {} : body);
}
export function fetchClubComplaints(clubId: string, signal: AbortSignal) {
  return request<ComplaintForClub[]>(`/clubs/${encodeURIComponent(clubId)}/complaints`, { signal });
}
export function respondToComplaint(clubId: string, id: string, input: Omit<ComplaintClubResponse, "at">, csrfToken: string) {
  return post<ComplaintForClub>(`/clubs/${encodeURIComponent(clubId)}/complaints/${encodeURIComponent(id)}/response`, csrfToken, input);
}
