import { DomainError } from "./errors.js";
import type { ViolationSeverity } from "./violation.js";

/** BR58: time a club gets to pay back what it owes — a constant of the policy document, like BR57. */
export const RECOVERY_DUE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type ExpenseReviewOutcome = "Accepted" | "Rejected";
/** `settlement` = the club submitted (UC36); `overdue` = UC37 A2, the settlement deadline passed without one. */
export type ReconciliationMode = "settlement" | "overdue";
export type ReconciliationOutcome = "Closed" | "Reconciled" | "Recovery Pending";

export interface ExpenseEvidence {
  id: string;
  type: string;
  externalLink: string;
  uploadedAt: Date;
  uploadedByName?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  spentAt: Date;
  description?: string;
  isOutOfCategory: boolean;
  isOverRemaining: boolean;
  hasEvidence: boolean;
  evidence: ExpenseEvidence[];
  reviewOutcome?: ExpenseReviewOutcome;
  reviewReason?: string;
}

export interface ReconciliationTotals {
  approvedTotal: number;
  advancedTotal: number;
  recordedTotal: number;
  supportedTotal: number;
  unsupportedTotal: number;
  /** Advanced but not spent according to the club's own records. */
  remaining: number;
}

export interface ReconciliationResult {
  acceptedTotal: number;
  settlementBalance: number;
  outcome: ReconciliationOutcome;
  recoveryAmount?: number;
  recoveryDueAt?: Date;
  isOverdueSettlement: boolean;
  computedAt: Date;
  closedAt?: Date;
}

export interface ReconciliationView {
  budgetId: string;
  eventTitle: string;
  clubName: string;
  state: string;
  settlementDueAt?: Date;
  settlementSubmittedAt?: Date;
  isSettlementLate: boolean;
  /** Set when the officer can reconcile now. */
  mode?: ReconciliationMode;
  /** The officer can ask the club for more evidence (UC37 A1). */
  canRequestEvidence: boolean;
  totals: ReconciliationTotals;
  expenses: Expense[];
  lastEvidenceRequest?: { message: string; at: Date };
  result?: ReconciliationResult;
  /** E2: the refund deadline passed and the club still owes money. */
  recoveryOverdue: boolean;
  /** The FINANCIAL_EXCEPTION case already opened for this budget, if any. */
  caseId?: string;
}

export interface ExpenseReviewInput {
  expenseId: string;
  outcome: ExpenseReviewOutcome;
  reason?: string;
}

export interface ReconciliationDecision {
  reviews: { expenseId: string; outcome: ExpenseReviewOutcome; reason?: string }[];
  result: Omit<ReconciliationResult, "computedAt" | "closedAt">;
}

export interface BudgetReconciliationRepository {
  find(budgetId: string, now: Date): Promise<ReconciliationView | null>;
  /** Recomputes the decision from the stored expenses inside its transaction before writing. */
  reconcile(budgetId: string, officerId: string, reviews: ExpenseReviewInput[], now: Date): Promise<ReconciliationView>;
  requestEvidence(budgetId: string, officerId: string, message: string, now: Date): Promise<ReconciliationView>;
  openCase(budgetId: string, officerId: string, severity: ViolationSeverity, now: Date): Promise<{ violationId: string }>;
}

export const MISSING_EVIDENCE_REASON = "Thiếu chứng từ";

export function totalsOf(expenses: readonly Expense[], approvedTotal: number, advancedTotal: number): ReconciliationTotals {
  const recordedTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const supportedTotal = expenses.filter((item) => item.hasEvidence).reduce((sum, item) => sum + item.amount, 0);
  return { approvedTotal, advancedTotal, recordedTotal, supportedTotal, unsupportedTotal: recordedTotal - supportedTotal,
    remaining: advancedTotal - recordedTotal };
}

export function reconciliationMode(budget: { state: string; settlementDueAt?: Date }, now: Date): ReconciliationMode | undefined {
  if (budget.state === "Settlement Submitted") return "settlement";
  const overdue = budget.settlementDueAt !== undefined && budget.settlementDueAt < now;
  return overdue && ["Disbursed", "Reconciliation Pending"].includes(budget.state) ? "overdue" : undefined;
}

/**
 * FR-UC37-02..04 and A2: every expense gets an outcome, the accepted total is capped at the approved total,
 * and the balance against what was advanced decides who owes whom.
 */
export function decideReconciliation(input: { expenses: readonly Expense[]; reviews: readonly ExpenseReviewInput[];
  approvedTotal: number; advancedTotal: number; mode: ReconciliationMode }, now: Date): ReconciliationDecision {
  if (input.advancedTotal > input.approvedTotal) {
    // E1 / BR23: more was advanced than approved and no adjustment document exists in this release.
    throw new DomainError("more was advanced than approved; this budget cannot be reconciled", "conflict");
  }
  const byId = new Map(input.reviews.map((item) => [item.expenseId, item]));
  if (byId.size !== input.reviews.length || input.reviews.some((item) => !input.expenses.some((expense) => expense.id === item.expenseId))) {
    throw new DomainError("each review must name a different expense of this budget", "validation", { field: "reviews" });
  }
  const reviews = input.expenses.map((expense) => {
    const review = byId.get(expense.id);
    const reason = review?.reason?.trim() || undefined;
    if (reason && reason.length > 1_000) throw new DomainError("review reason is too long", "validation", { field: "reviews" });
    // An expense without evidence is always rejected (FR-UC37-02, UC36 A1).
    if (!expense.hasEvidence) return { expenseId: expense.id, outcome: "Rejected" as const, reason: MISSING_EVIDENCE_REASON };
    const flagged = expense.isOutOfCategory || expense.isOverRemaining;
    if (flagged && (!review || !reason)) {
      throw new DomainError("every flagged expense needs an outcome and a reason", "validation",
        { field: "reviews", expenseId: expense.id });
    }
    const outcome = review?.outcome ?? "Accepted";
    if (outcome === "Rejected" && !reason) {
      throw new DomainError("a rejected expense needs a reason", "validation", { field: "reviews", expenseId: expense.id });
    }
    return { expenseId: expense.id, outcome, ...(reason ? { reason } : {}) };
  });
  const accepted = input.expenses.filter((expense) =>
    reviews.find((item) => item.expenseId === expense.id)?.outcome === "Accepted");
  const acceptedTotal = Math.min(accepted.reduce((sum, item) => sum + item.amount, 0), input.approvedTotal);
  const settlementBalance = acceptedTotal - input.advancedTotal;
  const outcome: ReconciliationOutcome = settlementBalance === 0 ? "Closed" : settlementBalance > 0 ? "Reconciled" : "Recovery Pending";
  return { reviews, result: { acceptedTotal, settlementBalance, outcome, isOverdueSettlement: input.mode === "overdue",
    ...(settlementBalance < 0 ? { recoveryAmount: -settlementBalance,
      recoveryDueAt: new Date(now.getTime() + RECOVERY_DUE_DAYS * DAY_MS) } : {}) } };
}
