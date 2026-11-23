import { DomainError } from "./errors.js";

/** BR57: hằng số của tài liệu chính sách, không phải giá trị chính sách có thể chỉnh sửa (BR42). */
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
  eventStartAt: Date;
  eventEndAt: Date;
  clubId: string;
  clubName: string;
  state: string;
  periodCode?: string;
  requestedTotal: number;
  approvedTotal: number;
  /** Advance + TopUp, số tiền mà BR23 đem so với tổng đã duyệt. */
  disbursedTotal: number;
  refundedTotal: number;
  settlementDueAt?: Date;
  settlementBalance?: number;
  recoveryAmount?: number;
  recoveryDueAt?: Date;
  itemCounts?: BudgetItemCounts;
  createdAt: Date;
}

/** Dòng tiền duy nhất mà ngân sách chấp nhận lúc này, cùng mức tối đa của nó. */
export interface AllowedFlow {
  kind: BudgetFlowKind;
  max: number;
  /** Top-up phải đúng bằng số dư quyết toán (UC35 E2). */
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
  /** Kiểm tra lại `allowedFlow` trong transaction, rồi ghi dòng tiền, audit và thông báo. */
  record(id: string, officerId: string, input: NormalizedBudgetFlow, now: Date): Promise<BudgetDetail>;
}

const closedEventStates = new Set(["Cancelled", "Rejected", "Expired"]);

// Tính hạn quyết toán kể từ lúc sự kiện kết thúc
export function settlementDueAt(eventEndAt: Date): Date {
  return new Date(eventEndAt.getTime() + SETTLEMENT_DUE_DAYS * DAY_MS);
}

// Xác định loại dòng tiền (tạm ứng, hoàn trả...) và mức tối đa ngân sách đang cho phép
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

// Từ chối dòng tiền mà ngân sách không thể nhận ở trạng thái hiện tại
/** BR23 / BR26 / BR58: từ chối dòng tiền mà ngân sách không thể nhận ở trạng thái hiện tại. */
export function checkFlow(budget: Parameters<typeof allowedFlow>[0] & Partial<Pick<BudgetSummary, "eventEndAt">>,
  flow: NormalizedBudgetFlow): void {
  const allowed = allowedFlow(budget);
  if (!allowed || allowed.kind !== flow.kind) {
    throw new DomainError(`a ${flow.kind} cannot be recorded for this budget now`, "conflict");
  }
  // UC35: tạm ứng là để cấp vốn cho sự kiện nên không thể ghi ngày sau khi sự kiện kết thúc.
  if (flow.kind === "Advance" && budget.eventEndAt instanceof Date && flow.disbursedAt > budget.eventEndAt) {
    throw new DomainError("an advance must be paid before the event ends", "validation", { field: "disbursedAt" });
  }
  if (allowed.exact !== undefined && flow.amount !== allowed.exact) {
    throw new DomainError("a top-up must equal the settlement balance", "validation", { field: "amount", exact: allowed.exact });
  }
  if (flow.amount > allowed.max) {
    throw new DomainError("amount exceeds what this budget allows", "validation", { field: "amount", max: allowed.max });
  }
}

// Tính trạng thái ngân sách sau khi ghi nhận dòng tiền
/** Trạng thái ngân sách sau khi ghi nhận dòng tiền. */
export function stateAfterFlow(budget: Pick<BudgetSummary, "state" | "refundedTotal" | "recoveryAmount">,
  flow: Pick<NormalizedBudgetFlow, "kind" | "amount">): string {
  if (flow.kind === "Advance") return "Disbursed";
  if (flow.kind === "TopUp") return "Closed";
  return budget.refundedTotal + flow.amount >= (budget.recoveryAmount ?? 0) ? "Closed" : budget.state;
}
