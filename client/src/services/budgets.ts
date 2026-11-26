import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'

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

export interface BudgetDetail extends BudgetSummary {
  lines: { category: string; requestedAmount: number; approvedAmount: number; reason?: string }[]
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/admin/budgets${path}`, options)
}

// GET danh sách ngân sách của các CLB cho ICPDP
export function fetchBudgets(signal: AbortSignal): Promise<BudgetSummary[]> {
  return request('', { signal })
}

// GET chi tiết một ngân sách
export function fetchBudget(id: string, signal: AbortSignal): Promise<BudgetDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal })
}
