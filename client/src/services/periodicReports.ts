export const RETURN_SECTIONS = ["narrative", "nextPlan", "figures", "evidence", "other"] as const;
export type ReturnSection = (typeof RETURN_SECTIONS)[number];
export type PeriodicOutcome = "Accept" | "Return";
export type Severity = "MINOR" | "MODERATE" | "SERIOUS";

export interface PeriodFigures {
  events?: { completed?: number; cancelled?: number };
  members?: { active?: number };
  attendance?: { total?: number };
  finance?: { budgets?: number; approvedTotal?: number; disbursedTotal?: number };
  capturedAt?: string;
}

export interface PeriodicReportRow {
  clubId: string;
  clubName: string;
  clubState: string;
  dueAt: string;
  reportId?: string;
  state?: string;
  versionNo?: number;
  lateFlag?: boolean;
  submittedAt?: string;
  overdue: boolean;
  violationId?: string;
}

export interface PeriodicOverview {
  periods: { code: string; startAt: string; endAt: string }[];
  periodCode?: string;
  dueAt?: string;
  rows: PeriodicReportRow[];
}

export interface PeriodicReportDetail {
  id: string;
  clubId: string;
  clubName: string;
  periodCode: string;
  state: string;
  versionNo: number;
  lateFlag: boolean;
  dueAt: string;
  submittedAt?: string;
  narrative?: string;
  nextPlan?: string;
  evidence: { note?: string; url?: string }[];
  preloadedFigures: PeriodFigures;
  live: PeriodFigures;
  decision?: { outcome: PeriodicOutcome; observation?: string; reason?: string; sections: ReturnSection[];
    decidedByName?: string; decidedAt: string };
  history: { action: string; at: string; actorName?: string; reason?: string }[];
}

export interface PeriodicDecisionInput {
  outcome: PeriodicOutcome;
  observation?: string;
  reason?: string;
  sections?: ReturnSection[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/periodic-reports${path}`, { credentials: "same-origin", ...init });
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

export function fetchPeriodicOverview(period: string | undefined, signal: AbortSignal): Promise<PeriodicOverview> {
  return request(period ? `?period=${encodeURIComponent(period)}` : "", { signal });
}

export function fetchPeriodicReport(id: string, signal: AbortSignal): Promise<PeriodicReportDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function decidePeriodicReport(id: string, input: PeriodicDecisionInput, csrfToken: string): Promise<PeriodicReportDetail> {
  return request(`/${encodeURIComponent(id)}/decision`, mutation(csrfToken, input));
}

export function recordMissingPeriodicReport(input: { clubId: string; periodCode: string; severity: Severity; note?: string },
  csrfToken: string): Promise<{ violationId: string }> {
  return request("/missing", mutation(csrfToken, input));
}
