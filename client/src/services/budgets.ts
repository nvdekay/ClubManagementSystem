import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
import type { Page } from '@/services/discovery'

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
  eventStartAt: string
  eventEndAt: string
  clubId: string
  clubName: string
  state: string
  periodCode?: string
  requestedTotal: number
  approvedTotal: number
  disbursedTotal: number
  refundedTotal: number
  itemCounts?: BudgetItemCounts
  createdAt: string
}

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

export interface BudgetPage extends Page<BudgetSummary> {
  /** Budgets per tab across every page, within the selected club. */
  counts: Record<BudgetFilter, number>
  /** Every club that has a budget, sorted by name. */
  clubs: { id: string; name: string }[]
}

export interface BudgetDetail extends BudgetSummary {
  lines: { category: string; requestedAmount: number; approvedAmount: number; reason?: string }[]
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/admin/budgets${path}`, options)
}

// GET một trang ngân sách của các CLB cho ICPDP theo bộ lọc và CLB (clubId rỗng = mọi CLB)
export function fetchBudgets(
  filter: BudgetFilter,
  clubId: string,
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<BudgetPage> {
  const params = new URLSearchParams({ filter, page: String(page), pageSize: String(pageSize) })
  if (clubId) {
    params.set('clubId', clubId)
  }
  return request(`?${params}`, { signal })
}

// GET chi tiết một ngân sách
export function fetchBudget(id: string, signal: AbortSignal): Promise<BudgetDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal })
}
