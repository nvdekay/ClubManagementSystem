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

export type ExpenseReviewOutcome = "Accepted" | "Rejected";

export interface ReconciliationExpense {
  id: string;
  category: string;
  amount: number;
  spentAt: string;
  description?: string;
  isOutOfCategory: boolean;
  isOverRemaining: boolean;
  hasEvidence: boolean;
  evidence: { id: string; type: string; externalLink: string; uploadedAt: string; uploadedByName?: string }[];
  reviewOutcome?: ExpenseReviewOutcome;
  reviewReason?: string;
}

export interface ReconciliationView {
  budgetId: string;
  state: string;
  settlementDueAt?: string;
  settlementSubmittedAt?: string;
  isSettlementLate: boolean;
  mode?: "settlement" | "overdue";
  canRequestEvidence: boolean;
  totals: { approvedTotal: number; advancedTotal: number; recordedTotal: number; supportedTotal: number;
    unsupportedTotal: number; remaining: number };
  expenses: ReconciliationExpense[];
  lastEvidenceRequest?: { message: string; at: string };
  result?: { acceptedTotal: number; settlementBalance: number; outcome: "Closed" | "Reconciled" | "Recovery Pending";
    recoveryAmount?: number; recoveryDueAt?: string; isOverdueSettlement: boolean; computedAt: string; closedAt?: string };
  recoveryOverdue: boolean;
  caseId?: string;
}

export type ReconciliationAction =
  | { kind: "reconcile"; reviews: { expenseId: string; outcome: ExpenseReviewOutcome; reason?: string }[] }
  | { kind: "evidence"; message: string }
  | { kind: "case"; severity: "MINOR" | "MODERATE" | "SERIOUS" };

async function reconciliationRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/reconciliations${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

export function fetchReconciliation(id: string, signal: AbortSignal): Promise<ReconciliationView> {
  return reconciliationRequest(`/${encodeURIComponent(id)}`, { signal });
}

export function runReconciliationAction(id: string, action: ReconciliationAction,
  csrfToken: string): Promise<ReconciliationView | { violationId: string }> {
  const path = action.kind === "reconcile" ? "" : action.kind === "evidence" ? "/evidence-request" : "/case";
  const body = action.kind === "reconcile" ? { reviews: action.reviews } : action.kind === "evidence"
    ? { message: action.message } : { severity: action.severity };
  return reconciliationRequest(`/${encodeURIComponent(id)}${path}`, { method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
}
