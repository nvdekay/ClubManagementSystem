import type { Page, PageRequest } from './paging.js'

/** BR57: hằng số của tài liệu chính sách, không phải giá trị chính sách có thể chỉnh sửa (BR42). */
export const SETTLEMENT_DUE_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

export const BUDGET_FLOW_KINDS = ['Advance', 'TopUp', 'Refund'] as const
export type BudgetFlowKind = (typeof BUDGET_FLOW_KINDS)[number]

export interface BudgetFlow {
  id: string
  kind: BudgetFlowKind
  amount: number
  disbursedAt: Date
  paymentReference?: string
  note?: string
  recordedBy: string
  recordedByName?: string
}

export interface BudgetItemCounts {
  total: number
  awaitingAdvance: number
  awaitingReview: number
  awaitingVendorPay: number
  awaitingClubConfirm: number
  awaitingRefundConfirm: number
  awaitingClubRefund: number
}

export interface BudgetSummary {
  id: string
  eventId: string
  eventTitle: string
  eventState: string
  eventStartAt: Date
  eventEndAt: Date
  clubId: string
  clubName: string
  state: string
  periodCode?: string
  requestedTotal: number
  approvedTotal: number
  /** Advance + TopUp, số tiền mà BR23 đem so với tổng đã duyệt. */
  disbursedTotal: number
  refundedTotal: number
  settlementDueAt?: Date
  settlementBalance?: number
  recoveryAmount?: number
  recoveryDueAt?: Date
  itemCounts?: BudgetItemCounts
  createdAt: Date
}

export interface BudgetDetail extends BudgetSummary {
  lines: { category: string; requestedAmount: number; approvedAmount: number; reason?: string }[]
  flows: BudgetFlow[]
}

/**
 * Tabs of the ICPDP budget queue. The `awaiting*` tabs hold budgets with at least one sponsored
 * item waiting on the officer in that step; the counting rules match `BudgetItemCounts`.
 */
export const BUDGET_FILTERS = [
  'all',
  'awaitingAdvance',
  'awaitingReview',
  'awaitingVendorPay',
  'awaitingRefundConfirm',
  'inProgress',
  'closed',
] as const
export type BudgetFilter = (typeof BUDGET_FILTERS)[number]

export interface BudgetListQuery extends PageRequest {
  filter: BudgetFilter
  /** Only budgets of this club; the counts follow the same scope. */
  clubId?: string
}

export interface BudgetPage extends Page<BudgetSummary> {
  /** Budgets per tab across every page, within the club scope. */
  counts: Record<BudgetFilter, number>
  /** Every club that has a budget, sorted by name, for the club picker. */
  clubs: { id: string; name: string }[]
}

export interface BudgetDisbursementRepository {
  /** One page of budgets matching the tab and club, newest first, with per-tab counts. */
  list(query: BudgetListQuery): Promise<BudgetPage>
  find(id: string): Promise<BudgetDetail | null>
}

// Tính hạn quyết toán kể từ lúc sự kiện kết thúc
export function settlementDueAt(eventEndAt: Date): Date {
  return new Date(eventEndAt.getTime() + SETTLEMENT_DUE_DAYS * DAY_MS)
}
