export type DashboardKind = "student" | "club" | "icpdp";

export const dashboardPanelKeys = [
  "foundingApplications", "recruitmentApplications", "memberships", "registrations",
  "attendanceHistory", "complaints", "openRecruitment", "upcomingEvents",
  "activeMembers", "openCampaigns", "pendingEventProposals", "activeBudgets",
  "missingEvidence", "overdueReports", "upcomingBookings", "feedback", "openViolations",
  "currentTerms", "structureHistory", "pendingClubApplications", "pendingReports",
  "approvalTasks", "overdueApprovals", "activeClubs", "suspendedClubs",
  "unreconciledBudgets", "overdueSettlements", "overdueRefunds", "internalEvents",
  "roleStructures", "boardHistory", "transitionFollowUps", "withdrawalRequests",
] as const;

export type DashboardPanelKey = (typeof dashboardPanelKeys)[number];

export interface ReadyDashboardPanel {
  key: DashboardPanelKey;
  status: "ready";
  count: number;
}

export interface FailedDashboardPanel {
  key: DashboardPanelKey;
  status: "error";
}

export interface DashboardMonthCount { month: string; count: number }

export interface IcpdpDashboardCharts {
  queues: { entityType: string; onTime: number; overdue: number }[];
  eventsByMonth: DashboardMonthCount[];
  clubsByField: { field: string; count: number }[];
  clubsByState: { state: string; count: number }[];
  budget: { periodCode?: string; approved: number; disbursed: number };
}

export interface ClubDashboardCharts {
  membersByMonth: DashboardMonthCount[];
  eventTurnout: { eventId: string; title: string; startAt: string; registered: number; attended: number }[];
  recruitment?: { campaignId: string; title: string; submitted: number; shortlisted: number; accepted: number; onboarded: number };
  feedback: { respondents: number; average?: number; distribution: number[] };
}

export interface Dashboard {
  kind: DashboardKind;
  clubId?: string;
  generatedAt: string;
  panels: Array<ReadyDashboardPanel | FailedDashboardPanel>;
  icpdpCharts?: IcpdpDashboardCharts;
  clubCharts?: ClubDashboardCharts;
}

export type DashboardContext =
  | { workspace: "student" }
  | { workspace: "icpdp" }
  | { workspace: "club"; clubId: string };

/** UC02 drill-down: a recorded internal event of any club (BR53). */
export interface InternalEventSummary {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  startAt: string;
  endAt: string;
  semesterCode: string;
  state: string;
  venueText?: string;
  capacity: number;
  registrations: number;
  attendances: number;
}

export interface InternalEventList {
  items: InternalEventSummary[];
  clubs: { id: string; name: string }[];
  semesters: string[];
}

export interface InternalEventDetail extends InternalEventSummary {
  objective?: string;
  attendance: { studentName: string; email: string; checkedInAt: string; method: string; finalized: boolean }[];
}

export type BoardSeatSource = "APPLICATION" | "NOMINATION" | "TRANSITION";

/** BR56: structure versions and the board of every term, newest first. */
export interface ClubBoardHistory {
  club: { id: string; code: string; name: string; state: string };
  structures: {
    versionNo: number;
    effectiveFrom: string;
    source: string;
    reason?: string;
    roles: { code: string; name: string; unit?: string; isBoardSeat: boolean; isLeaderRole: boolean }[];
  }[];
  terms: {
    id: string;
    name: string;
    state: string;
    startAt: string;
    endAt: string;
    seats: {
      positionName: string;
      memberName: string;
      effectiveFrom: string;
      effectiveTo?: string;
      source?: BoardSeatSource;
      confirmedAt?: string;
      confirmedByName?: string;
    }[];
  }[];
}

/** Non-2xx response; keeps the status so a 404 reads differently from a failed request. */
export class DashboardRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "DashboardRequestError";
  }
}

async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/dashboard${path}`, { signal, credentials: "same-origin" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new DashboardRequestError(body?.message ?? `HTTP ${response.status}`, response.status);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

export function fetchDashboard(context: DashboardContext, signal: AbortSignal): Promise<Dashboard> {
  return get(`?${new URLSearchParams(context).toString()}`, signal);
}

export function fetchInternalEvents(filter: { clubId: string; semesterCode: string }, signal: AbortSignal): Promise<InternalEventList> {
  const params = new URLSearchParams();
  if (filter.clubId) params.set("clubId", filter.clubId);
  if (filter.semesterCode) params.set("semesterCode", filter.semesterCode);
  const query = params.toString();
  return get(`/internal-events${query ? `?${query}` : ""}`, signal);
}

export function fetchInternalEvent(id: string, signal: AbortSignal): Promise<InternalEventDetail> {
  return get(`/internal-events/${encodeURIComponent(id)}`, signal);
}

export function fetchClubBoardHistory(clubId: string, signal: AbortSignal): Promise<ClubBoardHistory> {
  return get(`/clubs/${encodeURIComponent(clubId)}/board-history`, signal);
}
