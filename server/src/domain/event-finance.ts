import { DomainError } from "./errors.js";

export const EVIDENCE_TYPES = [
  "INVOICE",
  "RECEIPT",
  "PROOF_OF_PAYMENT",
] as const;
export interface ExpenseInput {
  category: string;
  amount: number;
  spentAt: Date;
  description?: string;
}
export interface EvidenceInput {
  type: (typeof EVIDENCE_TYPES)[number];
  externalLink: string;
}
export interface FinancialEvidence extends EvidenceInput {
  id: string;
  uploadedBy: string;
  uploadedAt: Date;
}
export interface Expense extends ExpenseInput {
  id: string;
  isOutOfCategory: boolean;
  isOverRemaining: boolean;
  hasEvidence: boolean;
  reviewOutcome?: string;
  reviewReason?: string;
  evidences: FinancialEvidence[];
}
export interface FinanceTotals {
  approvedTotal: number;
  advanceTotal: number;
  recordedTotal: number;
  supportedTotal: number;
  unsupportedTotal: number;
  remaining: number;
}
export interface FinanceDetail {
  id: string;
  clubId: string;
  eventId: string;
  eventTitle: string;
  eventState: string;
  state: string;
  revision: number;
  settlementDueAt?: Date;
  settlementSubmittedAt?: Date;
  isSettlementLate: boolean;
  acceptedTotal?: number;
  settlementBalance?: number;
  recoveryAmount?: number;
  recoveryDueAt?: Date;
  refundedTotal: number;
  lines: { category: string; approvedAmount: number }[];
  expenses: Expense[];
  totals: FinanceTotals;
  task?: { id: string; assigneeId?: string };
  history: { action: string; at: Date; snapshot: unknown; reason?: string }[];
}
export type FinanceAction =
  | {
      kind: "expense";
      revision: number;
      expenseId?: string;
      input: ExpenseInput;
    }
  | {
      kind: "evidence";
      revision: number;
      expenseId: string;
      input: EvidenceInput;
    }
  | { kind: "submit"; revision: number }
  | { kind: "claim"; revision: number }
  | { kind: "return"; revision: number; reason: string }
  | {
      kind: "finalize";
      revision: number;
      reviews: {
        expenseId: string;
        outcome: "Accepted" | "Rejected";
        reason: string;
      }[];
      overdue?: boolean;
    };
export interface EventFinanceRepository {
  list(clubId?: string): Promise<FinanceDetail[]>;
  find(id: string, clubId?: string): Promise<FinanceDetail | null>;
  act(
    id: string,
    clubId: string | undefined,
    actorId: string,
    action: FinanceAction,
    now: Date,
  ): Promise<FinanceDetail>;
}
export function validateExpense(input: ExpenseInput, now: Date): ExpenseInput {
  const category = input.category.trim();
  if (
    !category ||
    category.length > 100 ||
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    !Number.isFinite(input.spentAt.getTime()) ||
    input.spentAt > now ||
    (input.description?.length ?? 0) > 2000
  ) {
    throw new DomainError("invalid expense fields", "validation");
  }
  return { ...input, category, description: input.description?.trim() };
}
export function validateFinancialEvidence(input: EvidenceInput): EvidenceInput {
  let url: URL;
  try {
    url = new URL(input.externalLink);
  } catch {
    throw new DomainError("invalid evidence URL", "validation");
  }
  if (
    !EVIDENCE_TYPES.includes(input.type) ||
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    input.externalLink.length > 2000
  ) {
    throw new DomainError(
      "evidence requires a valid HTTPS link and type",
      "validation",
    );
  }
  return { ...input, externalLink: url.href };
}
export function financeTotals(
  approvedTotal: number,
  advanceTotal: number,
  expenses: Pick<Expense, "amount" | "hasEvidence">[],
): FinanceTotals {
  const recordedTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const supportedTotal = expenses
    .filter((item) => item.hasEvidence)
    .reduce((sum, item) => sum + item.amount, 0);
  if (
    ![approvedTotal, advanceTotal, recordedTotal, supportedTotal].every(
      Number.isSafeInteger,
    )
  ) {
    throw new DomainError(
      "finance total exceeds safe money range",
      "validation",
    );
  }
  return {
    approvedTotal,
    advanceTotal,
    recordedTotal,
    supportedTotal,
    unsupportedTotal: recordedTotal - supportedTotal,
    remaining: advanceTotal - recordedTotal,
  };
}
export function reconcileExpenses(
  totals: FinanceTotals,
  expenses: Expense[],
  reviews: Extract<FinanceAction, { kind: "finalize" }>["reviews"],
) {
  if (totals.advanceTotal > totals.approvedTotal)
    throw new DomainError("advances exceed approved budget", "conflict");
  if (
    reviews.length !== expenses.length ||
    new Set(reviews.map((r) => r.expenseId)).size !== reviews.length
  ) {
    throw new DomainError("review every expense exactly once", "validation");
  }
  let acceptedTotal = 0;
  for (const expense of expenses) {
    const review = reviews.find((r) => r.expenseId === expense.id);
    if (
      !review ||
      !["Accepted", "Rejected"].includes(review.outcome) ||
      !review.reason.trim() ||
      review.reason.length > 2000
    ) {
      throw new DomainError(
        "each expense review requires an outcome and reason",
        "validation",
      );
    }
    if (review.outcome === "Accepted" && !expense.hasEvidence)
      throw new DomainError(
        "unsupported expenses must be rejected",
        "validation",
      );
    if (review.outcome === "Accepted") acceptedTotal += expense.amount;
  }
  acceptedTotal = Math.min(acceptedTotal, totals.approvedTotal);
  const settlementBalance = acceptedTotal - totals.advanceTotal;
  return {
    acceptedTotal,
    settlementBalance,
    recoveryAmount: Math.max(-settlementBalance, 0),
    state:
      settlementBalance < 0
        ? "Recovery Pending"
        : settlementBalance > 0
          ? "Reconciled"
          : "Closed",
  };
}
export function assertFinanceEditable(state: string): void {
  if (!["Disbursed", "Reconciliation Pending"].includes(state))
    throw new DomainError("expenses are locked for this budget", "conflict");
}
export function assertSettlementEvent(
  state: string,
  endAt: Date,
  now: Date,
): void {
  if (
    state !== "Cancelled" &&
    (!["Completed", "Report Submitted", "Closed"].includes(state) ||
      endAt > now)
  ) {
    throw new DomainError(
      "settlement requires an ended or cancelled event",
      "conflict",
    );
  }
}
