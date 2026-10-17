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

/** Open approval tasks of one queue, split by whether their SLA has passed. */
export interface DashboardQueue { entityType: string; onTime: number; overdue: number }
/** `month` is a Vietnam-time calendar month, `YYYY-MM`. */
export interface DashboardMonthCount { month: string; count: number }

export interface IcpdpDashboardCharts {
  queues: DashboardQueue[];
  /** Approved-or-later events per month, five months back to two months ahead. */
  eventsByMonth: DashboardMonthCount[];
  /** Clubs that still operate, by field; the tail past seven folds into `other`. */
  clubsByField: { field: string; count: number }[];
  clubsByState: { state: string; count: number }[];
  /** Money of the current semester's budgets, in VND. */
  budget: { periodCode?: string; approved: number; disbursed: number };
}

export interface ClubDashboardCharts {
  /** Active or Inactive members at the end of each of the last twelve months. */
  membersByMonth: DashboardMonthCount[];
  /** The latest finished events, oldest first. */
  eventTurnout: { eventId: string; title: string; startAt: Date; registered: number; attended: number }[];
  recruitment?: { campaignId: string; title: string; submitted: number; shortlisted: number; accepted: number; onboarded: number };
  /** `distribution[i]` counts ratings of `i + 1`. */
  feedback: { respondents: number; average?: number; distribution: number[] };
}

export interface DashboardSnapshot {
  kind: DashboardKind;
  clubId?: string;
  generatedAt: Date;
  panels: DashboardPanel[];
  /** Present when every chart query succeeded; panels still carry the totals otherwise. */
  icpdpCharts?: IcpdpDashboardCharts;
  clubCharts?: ClubDashboardCharts;
}

export interface DashboardRepository {
  student(userId: string, now: Date): Promise<DashboardSnapshot>;
  club(clubId: string, permissions: readonly ClubPermission[], now: Date): Promise<DashboardSnapshot>;
  icpdp(now: Date): Promise<DashboardSnapshot>;
}
