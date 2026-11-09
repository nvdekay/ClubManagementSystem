import { ApiError, apiFetch } from "@/services/apiError";

export const RETURN_SECTIONS = ["members", "events", "achievements", "customFields", "other"] as const;
export type ReturnSection = (typeof RETURN_SECTIONS)[number] | "narrative" | "nextPlan" | "figures" | "evidence";
export type PeriodicOutcome = "Accept" | "Return";
export type Severity = "MINOR" | "MODERATE" | "SERIOUS";
export type CustomFieldType = "text" | "number" | "evidence";

export interface PeriodicCustomField {
  id: string;
  label: string;
  description?: string;
  type: CustomFieldType;
  required: boolean;
}

export interface PeriodicCampaign {
  periodCode: string;
  isOpen: boolean;
  dueAt: string;
  announcement?: string;
  customFields: PeriodicCustomField[];
  updatedAt?: string;
}

export interface PeriodicCampaignInput {
  periodCode: string;
  isOpen: boolean;
  dueAt: string;
  announcement?: string;
  customFields: PeriodicCustomField[];
}

export interface PeriodicMemberEntry {
  userId?: string;
  fullName: string;
  studentCode: string;
  email: string;
  activityScore: number;
  source?: "SYSTEM" | "MANUAL";
}

export interface PeriodicEventEntry {
  eventId?: string;
  title: string;
  description: string;
  heldAt: string;
  participantCount: number;
  evidenceUrl?: string;
  evidenceNote?: string;
  source?: "SYSTEM" | "MANUAL";
}

export interface PeriodicAchievementEntry {
  title: string;
  description: string;
  evidenceUrl?: string;
  evidenceNote?: string;
}

export interface PeriodicCustomAnswer {
  fieldId: string;
  label?: string;
  type?: CustomFieldType;
  textValue?: string;
  numberValue?: number;
  evidenceUrl?: string;
}

export interface PeriodicSystemSnapshot {
  members: PeriodicMemberEntry[];
  events: PeriodicEventEntry[];
}

export interface PeriodFigures {
  events?: { completed?: number; cancelled?: number };
  members?: { active?: number };
  attendance?: { total?: number };
  finance?: { budgets?: number; approvedTotal?: number; disbursedTotal?: number };
  capturedAt?: string;
  systemData?: PeriodicSystemSnapshot;
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
  campaign?: PeriodicCampaign;
  rows: PeriodicReportRow[];
}

export interface PeriodicReportVersion {
  versionNo: number;
  narrative: string;
  nextPlan: string;
  evidence: { note?: string; url?: string }[];
  members?: PeriodicMemberEntry[];
  events?: PeriodicEventEntry[];
  achievements?: PeriodicAchievementEntry[];
  customAnswers?: PeriodicCustomAnswer[];
  preloadedFigures: PeriodFigures;
  submittedAt: string;
  decision?: {
    outcome: string;
    reason?: string;
    observation?: string;
    sections?: string[];
    resubmitDueAt?: string;
    decidedAt: string;
  };
}

export interface PeriodicReportDetail {
  revision?: number;
  versions?: PeriodicReportVersion[];
  id: string;
  clubId: string;
  clubName: string;
  periodCode: string;
  state: string;
  versionNo: number;
  lateFlag: boolean;
  dueAt: string;
  resubmitDueAt?: string;
  submittedAt?: string;
  narrative?: string;
  nextPlan?: string;
  evidence: { note?: string; url?: string }[];
  members?: PeriodicMemberEntry[];
  events?: PeriodicEventEntry[];
  achievements?: PeriodicAchievementEntry[];
  customAnswers?: PeriodicCustomAnswer[];
  campaign?: PeriodicCampaign;
  systemData?: PeriodicSystemSnapshot;
  preloadedFigures: PeriodFigures;
  live: PeriodFigures;
  decision?: {
    outcome: PeriodicOutcome;
    observation?: string;
    reason?: string;
    sections: ReturnSection[];
    resubmitDueAt?: string;
    decidedByName?: string;
    decidedAt: string;
  };
  history: { action: string; at: string; actorName?: string; reason?: string }[];
}

export interface PeriodicDecisionInput {
  outcome: PeriodicOutcome;
  observation?: string;
  reason?: string;
  sections?: ReturnSection[];
  resubmitDueAt?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1/admin/periodic-reports${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(csrfToken: string, body: object, method: "POST" | "PUT" = "POST"): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) };
}

export function fetchPeriodicOverview(period: string | undefined, signal: AbortSignal): Promise<PeriodicOverview> {
  return request(period ? `?period=${encodeURIComponent(period)}` : "", { signal });
}

export function savePeriodicCampaign(input: PeriodicCampaignInput, csrfToken: string): Promise<PeriodicCampaign> {
  return request("/campaign", mutation(csrfToken, input, "PUT"));
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
