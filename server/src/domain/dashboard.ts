import type { ClubPermission } from "./access.js";

export const STUDENT_DASHBOARD_PANELS = [
  "foundingApplications", "recruitmentApplications", "memberships", "registrations",
  "attendanceHistory", "complaints", "openRecruitment", "upcomingEvents", "withdrawalRequests",
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

/** Event states that mean an internal event was recorded (BR53) and later ran, ended or was cancelled. */
export const RECORDED_EVENT_STATES = [
  "Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed", "Cancelled",
] as const;

/** UC02 drill-down (FR-UC02-02): a recorded `MEMBERS_ONLY` event of any club, read-only for ICPDP. */
export interface InternalEventSummary {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  startAt: Date;
  endAt: Date;
  semesterCode: string;
  state: string;
  venueText?: string;
  capacity: number;
  registrations: number;
  attendances: number;
}

export interface InternalEventFilter { clubId?: string; semesterCode?: string }

export interface InternalEventList {
  items: InternalEventSummary[];
  /** Filter options: every club and semester that has a recorded internal event. */
  clubs: { id: string; name: string }[];
  semesters: string[];
}

export interface InternalEventDetail extends InternalEventSummary {
  objective?: string;
  attendance: { studentName: string; email: string; checkedInAt: Date; method: string; finalized: boolean }[];
}

/** Which confirmation put a board seat in place: UC08 founding, UC11 nomination or UC13 transition. */
export type BoardSeatSource = "APPLICATION" | "NOMINATION" | "TRANSITION";

/** BR56: the role-structure versions and the board of every term, newest first. */
export interface ClubBoardHistory {
  club: { id: string; code: string; name: string; state: string };
  structures: {
    versionNo: number;
    effectiveFrom: Date;
    source: string;
    reason?: string;
    roles: { code: string; name: string; unit?: string; isBoardSeat: boolean; isLeaderRole: boolean }[];
  }[];
  terms: {
    id: string;
    name: string;
    state: string;
    startAt: Date;
    endAt: Date;
    seats: {
      positionName: string;
      memberName: string;
      effectiveFrom: Date;
      effectiveTo?: Date;
      source?: BoardSeatSource;
      confirmedAt?: Date;
      confirmedByName?: string;
    }[];
  }[];
}

export interface DashboardRepository {
  student(userId: string, now: Date): Promise<DashboardSnapshot>;
  club(clubId: string, permissions: readonly ClubPermission[], now: Date): Promise<DashboardSnapshot>;
  icpdp(now: Date): Promise<DashboardSnapshot>;
  internalEvents(filter: InternalEventFilter): Promise<InternalEventList>;
  internalEvent(eventId: string): Promise<InternalEventDetail | null>;
  boardHistory(clubId: string): Promise<ClubBoardHistory | null>;
}
