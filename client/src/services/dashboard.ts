export type DashboardKind = "student" | "club" | "icpdp";

export const dashboardPanelKeys = [
  "foundingApplications", "recruitmentApplications", "memberships", "registrations",
  "attendanceHistory", "complaints", "openRecruitment", "upcomingEvents",
  "activeMembers", "openCampaigns", "pendingEventProposals", "activeBudgets",
  "missingEvidence", "overdueReports", "upcomingBookings", "feedback", "openViolations",
  "currentTerms", "structureHistory", "pendingClubApplications", "pendingReports",
  "approvalTasks", "overdueApprovals", "activeClubs", "suspendedClubs",
  "unreconciledBudgets", "overdueSettlements", "overdueRefunds", "internalEvents",
  "roleStructures", "boardHistory", "transitionFollowUps",
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

export interface Dashboard {
  kind: DashboardKind;
  clubId?: string;
  generatedAt: string;
  panels: Array<ReadyDashboardPanel | FailedDashboardPanel>;
}

export type DashboardContext =
  | { workspace: "student" }
  | { workspace: "icpdp" }
  | { workspace: "club"; clubId: string };

export async function fetchDashboard(
  context: DashboardContext,
  signal: AbortSignal,
): Promise<Dashboard> {
  const params = new URLSearchParams(context);
  const response = await fetch(`/api/v1/dashboard?${params.toString()}`, {
    signal, credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body = await response.json() as { data: Dashboard };
  return body.data;
}
