import { DomainError } from "./errors.js";

/** BR57: a constant of the policy document, not an editable policy value (BR42). */
export const SETTLEMENT_DUE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export const BUDGET_FLOW_KINDS = ["Advance", "TopUp", "Refund"] as const;
export type BudgetFlowKind = (typeof BUDGET_FLOW_KINDS)[number];

export interface BudgetFlow {
  id: string;
  kind: BudgetFlowKind;
  amount: number;
  disbursedAt: Date;
  paymentReference?: string;
  note?: string;
  recordedBy: string;
  recordedByName?: string;
}

export interface BudgetSummary {
  id: string;
  eventId: string;
  eventTitle: string;
  eventState: string;
  eventStartAt: Date;
  eventEndAt: Date;
  clubId: string;
  clubName: string;
  state: string;
  periodCode?: string;
  requestedTotal: number;
  approvedTotal: number;
  /** Advance + TopUp, the amount BR23 compares with the approved total. */
  disbursedTotal: number;
  refundedTotal: number;
  settlementDueAt?: Date;
  settlementBalance?: number;
  recoveryAmount?: number;
  recoveryDueAt?: Date;
  createdAt: Date;
}

/** The one money flow the budget accepts right now, and its limit. */
export interface AllowedFlow {
  kind: BudgetFlowKind;
  max: number;
  /** A top-up must equal the settlement balance exactly (UC35 E2). */
  exact?: number;
}

export interface BudgetDetail extends BudgetSummary {
  lines: { category: string; requestedAmount: number; approvedAmount: number; reason?: string }[];
  flows: BudgetFlow[];
  allowed?: AllowedFlow;
}

export interface BudgetFlowInput {
  kind: BudgetFlowKind;
  amount: number;
  disbursedAt?: Date;
  paymentReference?: string;
  note?: string;
}

export interface NormalizedBudgetFlow {
  kind: BudgetFlowKind;
  amount: number;
  disbursedAt: Date;
  paymentReference?: string;
  note?: string;
}

export interface BudgetDisbursementRepository {
  list(): Promise<BudgetSummary[]>;
  find(id: string): Promise<BudgetDetail | null>;
  /** Re-checks `allowedFlow` inside its transaction, writes the flow, audit and notifications. */
  record(id: string, officerId: string, input: NormalizedBudgetFlow, now: Date): Promise<BudgetDetail>;
}

const closedEventStates = new Set(["Cancelled", "Rejected", "Expired"]);

export function settlementDueAt(eventEndAt: Date): Date {
  return new Date(eventEndAt.getTime() + SETTLEMENT_DUE_DAYS * DAY_MS);
}

export function allowedFlow(budget: Pick<BudgetSummary, "state" | "approvedTotal" | "disbursedTotal"
  | "refundedTotal" | "settlementBalance" | "recoveryAmount" | "eventState">): AllowedFlow | undefined {
  if (budget.state === "Approved" || budget.state === "Disbursed") {
    const max = budget.approvedTotal - budget.disbursedTotal;
    return max > 0 && !closedEventStates.has(budget.eventState) ? { kind: "Advance", max } : undefined;
  }
  if (budget.state === "Reconciled" && (budget.settlementBalance ?? 0) > 0) {
    const exact = Math.min(budget.settlementBalance!, budget.approvedTotal - budget.disbursedTotal);
    return exact > 0 ? { kind: "TopUp", max: exact, exact } : undefined;
  }
  if (budget.state === "Recovery Pending") {
    const max = (budget.recoveryAmount ?? 0) - budget.refundedTotal;
    return max > 0 ? { kind: "Refund", max } : undefined;
  }
  return undefined;
}

/** BR23 / BR26 / BR58: rejects a flow the budget cannot take in its current state. */
export function checkFlow(budget: Parameters<typeof allowedFlow>[0], flow: NormalizedBudgetFlow): void {
  const allowed = allowedFlow(budget);
  if (!allowed || allowed.kind !== flow.kind) {
    throw new DomainError(`a ${flow.kind} cannot be recorded for this budget now`, "conflict");
  }
  if (allowed.exact !== undefined && flow.amount !== allowed.exact) {
    throw new DomainError("a top-up must equal the settlement balance", "validation", { field: "amount", exact: allowed.exact });
  }
  if (flow.amount > allowed.max) {
    throw new DomainError("amount exceeds what this budget allows", "validation", { field: "amount", max: allowed.max });
  }
}

/** What the budget becomes after the flow is recorded. */
export function stateAfterFlow(budget: Pick<BudgetSummary, "state" | "refundedTotal" | "recoveryAmount">,
  flow: Pick<NormalizedBudgetFlow, "kind" | "amount">): string {
  if (flow.kind === "Advance") return "Disbursed";
  if (flow.kind === "TopUp") return "Closed";
  return budget.refundedTotal + flow.amount >= (budget.recoveryAmount ?? 0) ? "Closed" : budget.state;
}
