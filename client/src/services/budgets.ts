export type BudgetFlowKind = "Advance" | "TopUp" | "Refund";

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
  settlementDueAt?: string;
  settlementBalance?: number;
  recoveryAmount?: number;
  recoveryDueAt?: string;
  createdAt: string;
}

export interface BudgetFlow {
  id: string;
  kind: BudgetFlowKind;
  amount: number;
  disbursedAt: string;
  paymentReference?: string;
  note?: string;
  recordedBy: string;
  recordedByName?: string;
}

export interface BudgetDetail extends BudgetSummary {
  lines: { category: string; requestedAmount: number; approvedAmount: number; reason?: string }[];
  flows: BudgetFlow[];
  allowed?: { kind: BudgetFlowKind; max: number; exact?: number };
}

export interface BudgetFlowInput {
  kind: BudgetFlowKind;
  amount: number;
  disbursedAt?: string;
  paymentReference?: string;
  note?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/budgets${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

export function fetchBudgets(signal: AbortSignal): Promise<BudgetSummary[]> {
  return request("", { signal });
}

export function fetchBudget(id: string, signal: AbortSignal): Promise<BudgetDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function recordBudgetFlow(id: string, input: BudgetFlowInput, csrfToken: string): Promise<BudgetDetail> {
  return request(`/${encodeURIComponent(id)}/flows`, { method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(input) });
}
