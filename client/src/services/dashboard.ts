import { ApiError } from '@/services/apiError'
import { apiRequest } from '@/services/apiRequest'
export type DashboardKind = 'student' | 'club' | 'icpdp'

export const dashboardPanelKeys = [
  'foundingApplications',
  'recruitmentApplications',
  'memberships',
  'registrations',
  'attendanceHistory',
  'complaints',
  'openRecruitment',
  'upcomingEvents',
  'activeMembers',
  'openCampaigns',
  'pendingEventProposals',
  'activeBudgets',
  'missingEvidence',
  'overdueReports',
  'upcomingBookings',
  'feedback',
  'openViolations',
  'currentTerms',
  'structureHistory',
  'pendingClubApplications',
  'pendingReports',
  'approvalTasks',
  'overdueApprovals',
  'activeClubs',
  'suspendedClubs',
  'unreconciledBudgets',
  'overdueSettlements',
  'overdueRefunds',
  'roleStructures',
  'boardHistory',
  'transitionFollowUps',
  'withdrawalRequests',
] as const

export type DashboardPanelKey = (typeof dashboardPanelKeys)[number]

export interface ReadyDashboardPanel {
  key: DashboardPanelKey
  status: 'ready'
  count: number
}

export interface FailedDashboardPanel {
  key: DashboardPanelKey
  status: 'error'
}

export interface DashboardMonthCount {
  month: string
  count: number
}
/** UC02: `count = publicCount + internalCount` (nội bộ = chỉ dành cho thành viên, có ngân sách hoặc tự túc). */
export type DashboardMonthEventCount = DashboardMonthCount

export interface IcpdpDashboardCharts {
  queues: { entityType: string; onTime: number; overdue: number }[]
  eventsByMonth: DashboardMonthEventCount[]
  clubsByField: { field: string; count: number }[]
  clubsByState: { state: string; count: number }[]
  budget: { periodCode?: string; approved: number; disbursed: number }
}

export interface ClubDashboardCharts {
  membersByMonth: DashboardMonthCount[]
  eventTurnout: {
    eventId: string
    title: string
    startAt: string
    registered: number
    attended: number
  }[]
  recruitment?: {
    campaignId: string
    title: string
    submitted: number
    shortlisted: number
    accepted: number
    onboarded: number
  }
  feedback: { respondents: number; average?: number; distribution: number[] }
}

export interface Dashboard {
  kind: DashboardKind
  clubId?: string
  generatedAt: string
  panels: Array<ReadyDashboardPanel | FailedDashboardPanel>
  icpdpCharts?: IcpdpDashboardCharts
  clubCharts?: ClubDashboardCharts
}

export type DashboardContext =
  { workspace: 'student' } | { workspace: 'icpdp' } | { workspace: 'club'; clubId: string }

/** Nguồn tạo ghế ban chủ nhiệm: duyệt hồ sơ (UC08), đề cử (UC10/UC11) hoặc chuyển giao (UC12/UC13). */
export type BoardSeatSource = 'APPLICATION' | 'NOMINATION' | 'TRANSITION'

/** BR56: các phiên bản cơ cấu và ban chủ nhiệm của mọi nhiệm kỳ, mới nhất trước. */
export interface ClubBoardHistory {
  club: { id: string; code: string; name: string; state: string }
  structures: {
    versionNo: number
    effectiveFrom: string
    source: string
    reason?: string
    roles: {
      code: string
      name: string
      unit?: string
      isBoardSeat: boolean
      isLeaderRole: boolean
    }[]
  }[]
  terms: {
    id: string
    name: string
    state: string
    startAt: string
    endAt: string
    seats: {
      positionName: string
      memberName: string
      effectiveFrom: string
      effectiveTo?: string
      source?: BoardSeatSource
      confirmedAt?: string
      confirmedByName?: string
    }[]
  }[]
}

/** Response không phải 2xx; giữ status để phân biệt 404 với request thất bại. */
export class DashboardRequestError extends ApiError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message, status)
    this.name = 'DashboardRequestError'
  }
}

// GET /dashboard through the shared helper, failing with DashboardRequestError
function get<T>(path: string, signal: AbortSignal): Promise<T> {
  return apiRequest<T>(`/api/v1/dashboard${path}`, {
    signal,
    toError: (failure) => new DashboardRequestError(failure.message, failure.status),
  })
}

// GET /dashboard: số liệu dashboard theo ngữ cảnh
export function fetchDashboard(context: DashboardContext, signal: AbortSignal): Promise<Dashboard> {
  return get(`?${new URLSearchParams(context).toString()}`, signal)
}

// GET /dashboard/clubs/:clubId/board-history: lịch sử ban chủ nhiệm của một CLB
export function fetchClubBoardHistory(
  clubId: string,
  signal: AbortSignal,
): Promise<ClubBoardHistory> {
  return get(`/clubs/${encodeURIComponent(clubId)}/board-history`, signal)
}
