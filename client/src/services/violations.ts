export const VIOLATION_ORIGINS = ["COMPLAINT", "REPORT_FINDING", "OVERDUE_REPORT", "FINANCIAL_EXCEPTION",
  "UNAUTHORIZED_EVENT", "LATE_BOOKING_CANCELLATION", "OTHER"] as const;
export type ViolationOrigin = typeof VIOLATION_ORIGINS[number];
export const VIOLATION_SEVERITIES = ["MINOR", "MODERATE", "SERIOUS"] as const;
export type ViolationSeverity = typeof VIOLATION_SEVERITIES[number];

export interface ViolationEvidence {
  note: string;
  url?: string;
  addedBy: string;
  addedAt: string;
}

export interface ViolationSummary {
  id: string;
  clubId: string;
  clubName: string;
  originType: ViolationOrigin;
  severity: ViolationSeverity;
  title: string;
  state: string;
  openedAt: string;
  responseDueAt?: string;
  responseOverdue: boolean;
  pendingActions: number;
}

export interface CorrectiveAction {
  id: string;
  description: string;
  dueAt: string;
  state: "Pending" | "Verified" | "Failed";
  linkedLifecycleAction?: "SUSPEND" | "DISSOLVE";
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface ViolationDetail {
  id: string;
  clubId: string;
  clubName: string;
  clubState: string;
  originType: ViolationOrigin;
  originRefId?: string;
  severity: ViolationSeverity;
  title: string;
  description?: string;
  evidence: ViolationEvidence[];
  state: string;
  clubResponse?: {
    requestMessage: string; requestedBy: string; requestedAt: string; dueAt: string;
    source?: "CLUB" | "RECORDED_BY_ICPDP" | "NO_RESPONSE"; text?: string; respondedAt?: string;
  };
  decisionReason?: string;
  decisionEvidence: ViolationEvidence[];
  openedBy: string;
  openedAt: string;
  decidedAt?: string;
  responseDueAt?: string;
  resolvedAt?: string;
  actions: CorrectiveAction[];
  source?: { kind: "event" | "budget"; id: string; label: string };
  names: Record<string, string>;
  history: { action: string; at: string; actorName?: string; reason?: string }[];
}

export interface ViolationSources {
  events: { id: string; title: string; startAt: string; state: string }[];
  budgets: { id: string; eventTitle: string; state: string }[];
}

export interface EvidenceInput {
  note: string;
  url?: string;
}

export interface OpenViolationInput {
  clubId: string;
  originType: ViolationOrigin;
  originRefId?: string;
  severity: ViolationSeverity;
  title: string;
  description?: string;
  evidence?: EvidenceInput[];
}

export type ViolationStep =
  | { type: "investigate" }
  | { type: "addEvidence"; evidence: EvidenceInput }
  | { type: "requestResponse"; message: string; dueAt?: string }
  | { type: "recordResponse"; text?: string; noResponse?: boolean }
  | { type: "decide"; finding: "VIOLATION" | "NO_VIOLATION"; reason: string; evidence?: EvidenceInput[] }
  | { type: "addActions"; actions: { description: string; dueAt: string; linkedLifecycleAction?: "SUSPEND" | "DISSOLVE" }[] }
  | { type: "verifyAction"; actionId: string; outcome: "Verified" | "Failed"; note?: string }
  | { type: "resolve"; note?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/violations${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function post(csrfToken: string, body: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body) };
}

export function fetchViolations(signal: AbortSignal): Promise<ViolationSummary[]> {
  return request("", { signal });
}

export function fetchViolation(id: string, signal: AbortSignal): Promise<ViolationDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function fetchViolationSources(clubId: string, signal: AbortSignal): Promise<ViolationSources> {
  return request(`/sources/${encodeURIComponent(clubId)}`, { signal });
}

export function openViolation(input: OpenViolationInput, csrfToken: string): Promise<ViolationDetail> {
  return request("", post(csrfToken, input));
}

export function applyViolationStep(id: string, step: ViolationStep, csrfToken: string): Promise<ViolationDetail> {
  return request(`/${encodeURIComponent(id)}/steps`, post(csrfToken, step));
}
