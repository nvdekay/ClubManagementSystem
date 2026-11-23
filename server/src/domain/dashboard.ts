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
  "upcomingBookings", "roleStructures", "boardHistory",
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

/** Các task duyệt đang mở của một hàng đợi, chia theo việc đã quá SLA hay chưa. */
export interface DashboardQueue { entityType: string; onTime: number; overdue: number }
/** `month` là tháng dương lịch theo giờ Việt Nam, dạng `YYYY-MM`. */
export interface DashboardMonthCount { month: string; count: number }
/** `count = publicCount + internalCount`; internal nghĩa là `MEMBERS_ONLY`. */
export type DashboardMonthEventCount = DashboardMonthCount;

export interface IcpdpDashboardCharts {
  queues: DashboardQueue[];
  /** Số sự kiện từ trạng thái Approved trở đi theo từng tháng, từ năm tháng trước đến hai tháng sau. */
  eventsByMonth: DashboardMonthEventCount[];
  /** CLB còn hoạt động theo lĩnh vực; phần đuôi sau bảy lĩnh vực được gộp vào `other`. */
  clubsByField: { field: string; count: number }[];
  clubsByState: { state: string; count: number }[];
  /** Số tiền ngân sách của học kỳ hiện tại, tính bằng VND. */
  budget: { periodCode?: string; approved: number; disbursed: number };
}

export interface ClubDashboardCharts {
  /** Thành viên Active hoặc Inactive vào cuối mỗi tháng trong mười hai tháng gần nhất. */
  membersByMonth: DashboardMonthCount[];
  /** Các sự kiện đã kết thúc gần nhất, cũ nhất trước. */
  eventTurnout: { eventId: string; title: string; startAt: Date; registered: number; attended: number }[];
  recruitment?: { campaignId: string; title: string; submitted: number; shortlisted: number; accepted: number; onboarded: number };
  /** `distribution[i]` đếm số đánh giá `i + 1` sao. */
  feedback: { respondents: number; average?: number; distribution: number[] };
}

export interface DashboardSnapshot {
  kind: DashboardKind;
  clubId?: string;
  generatedAt: Date;
  panels: DashboardPanel[];
  /** Có khi mọi query biểu đồ đều thành công; nếu không, các panel vẫn mang số tổng. */
  icpdpCharts?: IcpdpDashboardCharts;
  clubCharts?: ClubDashboardCharts;
}

/** Các trạng thái sự kiện được coi là đã ghi nhận (BR53): đề xuất đã duyệt và sự kiện nội bộ qua DRAFT, không bao giờ gồm sự kiện đã huỷ. */
export const RECORDED_EVENT_STATES = [
  "Approved", "Upcoming", "Ongoing", "Completed", "Report Submitted", "Closed", "CREATED", "PUBLIC", "ONGOING", "FINISH",
] as const;

/** UC02 drill-down (FR-UC02-02): sự kiện `MEMBERS_ONLY` đã ghi nhận của bất kỳ CLB nào, ICPDP chỉ được xem. */
export type BoardSeatSource = "APPLICATION" | "NOMINATION" | "TRANSITION";

/** BR56: các phiên bản cơ cấu vai trò và ban điều hành của mọi nhiệm kỳ, mới nhất trước. */
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
  boardHistory(clubId: string): Promise<ClubBoardHistory | null>;
}
