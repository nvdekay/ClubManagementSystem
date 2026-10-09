import type { ClubPermission } from "./access.js";

export const STUDENT_DASHBOARD_PANELS = [
  "foundingApplications", "recruitmentApplications", "memberships", "registrations",
  "attendanceHistory", "complaints", "openRecruitment", "upcomingEvents",
] as const;

export const CLUB_DASHBOARD_PANELS = [
  "activeMembers", "openCampaigns", "upcomingEvents", "pendingEventProposals",
  "activeBudgets", "missingEvidence", "overdueReports", "upcomingBookings",
  "feedback", "openViolations", "currentTerms", "structureHistory",
  "transitionFollowUps",
] as const;

export const ICPDP_DASHBOARD_PANELS = [
  "pendingClubApplications", "pendingEventProposals", "pendingReports", "approvalTasks",
  "overdueApprovals", "activeClubs", "suspendedClubs", "overdueReports",
  "unreconciledBudgets", "overdueSettlements", "overdueRefunds", "openViolations",
  "upcomingBookings", "internalEvents", "roleStructures", "boardHistory",
] as const;

export type DashboardKind = "student" | "club" | "icpdp";
export type DashboardPanelKey =
  | (typeof STUDENT_DASHBOARD_PANELS)[number]
  | (typeof CLUB_DASHBOARD_PANELS)[number]
  | (typeof ICPDP_DASHBOARD_PANELS)[number];

export type DashboardPanel = {
  key: DashboardPanelKey;
  status: "ready";
  count: number;
} | {
  key: DashboardPanelKey;
  status: "error";
};

export interface DashboardSnapshot {
  kind: DashboardKind;
  clubId?: string;
  generatedAt: Date;
  panels: DashboardPanel[];
}

export interface DashboardRepository {
  student(userId: string, now: Date): Promise<DashboardSnapshot>;
  club(clubId: string, permissions: readonly ClubPermission[], now: Date): Promise<DashboardSnapshot>;
  icpdp(now: Date): Promise<DashboardSnapshot>;
}
