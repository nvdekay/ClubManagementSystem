import { ApiError, apiFetch } from "@/services/apiError";

export interface BudgetItemCounts {
  total: number;
  awaitingAdvance: number;
  awaitingReview: number;
  awaitingVendorPay: number;
  awaitingClubConfirm: number;
  awaitingRefundConfirm: number;
  awaitingClubRefund: number;
}

export interface BudgetSummary {
  id: string;
  eventId: string;
  eventTitle: string;
  eventState: string;
  eventStartAt: string;
  eventEndAt: string;
  clubId: string;
  clubName: string;
  state: string;
  periodCode?: string;
  requestedTotal: number;
  approvedTotal: number;
  disbursedTotal: number;
  refundedTotal: number;
  itemCounts?: BudgetItemCounts;
  createdAt: string;
}

export interface BudgetDetail extends BudgetSummary {
  lines: { category: string; requestedAmount: number; approvedAmount: number; reason?: string }[];
}

// Gọi API /admin/budgets và trả về data, ném ApiError nếu lỗi
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1/admin/budgets${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

// GET danh sách ngân sách của các CLB cho ICPDP
export function fetchBudgets(signal: AbortSignal): Promise<BudgetSummary[]> {
  return request("", { signal });
}

// GET chi tiết một ngân sách
export function fetchBudget(id: string, signal: AbortSignal): Promise<BudgetDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}
