export type PostEventOutcome = "Accept" | "Return" | "AcceptWithFinding";
export type Severity = "MINOR" | "MODERATE" | "SERIOUS";

export interface PostEventReportSummary {
  id: string;
  eventId: string;
  eventTitle: string;
  clubId: string;
  clubName: string;
  eventEndAt: string;
  state: string;
  versionNo: number;
  lateFlag: boolean;
  submittedAt?: string;
  dueAt: string;
}

export interface MissingReport {
  eventId: string;
  eventTitle: string;
  clubId: string;
  clubName: string;
  eventEndAt: string;
  dueAt: string;
  violationId?: string;
}

export interface PostEventQueue {
  submitted: PostEventReportSummary[];
  missing: MissingReport[];
}

export interface PostEventReportDetail extends PostEventReportSummary {
  event: { id: string; title: string; objective?: string; startAt: string; endAt: string; state: string; capacity: number;
    audienceScope: string; approvalConditions: string[]; venue?: string };
  preloadedFigures: {
    attendance?: { registered?: number; checkedIn?: number };
    budget?: { approvedTotal?: number; disbursedTotal?: number; expenseTotal?: number };
    feedback?: { count?: number; average?: number };
    capturedAt?: string;
  };
  actualResult: string;
  incidents?: string;
  lessonsLearned?: string;
  evidence: { note?: string; url?: string }[];
  live: { registered: number; checkedIn: number; attendanceFinalized: boolean;
    budget?: { state: string; approvedTotal: number; disbursedTotal: number }; feedback: { count: number; average?: number } };
  attendanceMismatch: boolean;
  decision?: { outcome: PostEventOutcome; reason?: string; decidedByName?: string; decidedAt: string; findingViolationId?: string };
  history: { action: string; at: string; actorName?: string; reason?: string }[];
}

export interface PostEventDecisionInput {
  outcome: PostEventOutcome;
  reason?: string;
  finding?: { severity: Severity; title: string; description?: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/event-reports${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(csrfToken: string, body: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) };
}

export function fetchEventReportQueue(signal: AbortSignal): Promise<PostEventQueue> {
  return request("", { signal });
}

export function fetchEventReport(id: string, signal: AbortSignal): Promise<PostEventReportDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function decideEventReport(id: string, input: PostEventDecisionInput, csrfToken: string): Promise<PostEventReportDetail> {
  return request(`/${encodeURIComponent(id)}/decision`, mutation(csrfToken, input));
}

export function recordMissingEventReport(eventId: string, input: { severity: Severity; note?: string },
  csrfToken: string): Promise<{ violationId: string }> {
  return request(`/missing/${encodeURIComponent(eventId)}`, mutation(csrfToken, input));
}
