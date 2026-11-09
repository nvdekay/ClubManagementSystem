import { ApiError, apiFetch } from "@/services/apiError";
import type {
  PeriodicAchievementEntry,
  PeriodicCustomAnswer,
  PeriodicCustomField,
  PeriodicEventEntry,
  PeriodicMemberEntry,
  PeriodicReportDetail,
} from "./periodicReports";

export interface ClubPeriodicPeriod {
  code: string;
  startAt: string;
  endAt: string;
  dueAt: string;
  isOpen?: boolean;
  announcement?: string;
  customFields?: PeriodicCustomField[];
}

export interface ClubPeriodicOverview {
  periods: ClubPeriodicPeriod[];
  reports: PeriodicReportDetail[];
}

export interface PeriodicDraft {
  narrative?: string;
  nextPlan?: string;
  evidence?: { note?: string; url?: string }[];
  members?: PeriodicMemberEntry[];
  events?: PeriodicEventEntry[];
  achievements?: PeriodicAchievementEntry[];
  customAnswers?: PeriodicCustomAnswer[];
}

async function request<T>(clubId: string, path: string, init: RequestInit): Promise<T> {
  const res = await apiFetch(`/api/v1/clubs/${encodeURIComponent(clubId)}/periodic-reports${path}`, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(body?.message ?? `HTTP ${res.status}`);
  }
  return (await res.json() as { data: T }).data;
}

export function fetchClubPeriodicReports(clubId: string, signal: AbortSignal): Promise<ClubPeriodicOverview> {
  return request(clubId, "", { signal });
}

export function changePeriodicReport(clubId: string, action:
  | { kind: "create"; periodCode: string }
  | { kind: "save"; id: string; revision: number; input: PeriodicDraft }
  | { kind: "submit"; id: string; revision: number }, csrfToken: string): Promise<PeriodicReportDetail> {
  const path = action.kind === "create" ? "" : `/${encodeURIComponent(action.id)}${action.kind === "submit" ? "/submit" : ""}`;
  const body = action.kind === "create" ? { periodCode: action.periodCode } : { revision: action.revision, ...(action.kind === "save" ? action.input : {}) };
  return request(clubId, path, { method: action.kind === "save" ? "PUT" : "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
}
