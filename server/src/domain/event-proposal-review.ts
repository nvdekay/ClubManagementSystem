import { DomainError } from "./errors.js";
import { FUNDING_DECISIONS, type FundingDecision } from "./sponsored-item.js";
import type { EventDefenseSession } from "./event-defense.js";

export type EventReviewOutcome = "Request revision" | "Approve" | "Reject" | "Re-defense";
export const EVENT_REVIEW_SECTIONS = ["schedule", "venue", "content", "risk", "budget", "other"] as const;
export type EventReviewSection = typeof EVENT_REVIEW_SECTIONS[number];
export const MAX_APPROVAL_CONDITIONS = 10;

export interface EventProposalTask {
  id: string;
  eventId: string;
  title: string;
  state: "Open" | "Decided" | "Closed";
  assigneeId?: string;
  openedAt: Date;
  slaDueAt?: Date;
}

/** Một dòng ngân sách yêu cầu đúng như CLB đã nộp (UC25 FR-18). */
export interface RequestedBudgetLine {
  category: string;
  amount: number;
  purpose: string;
  plannedItems?: string;
}

export interface EventProposalVersion {
  id: string;
  revisionNo: number;
  /** Ảnh chụp bất biến của những gì CLB đã nộp; cấu trúc là hợp đồng UC25 trong SPEC. */
  payload: Record<string, unknown>;
  budgetLines: RequestedBudgetLine[];
  requestedBudgetTotal: number;
  conflictResult?: string;
  submittedBy: string;
  submittedByName?: string;
  submittedAt: Date;
}

export interface EventProposalSummary {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  objective?: string;
  startAt: Date;
  endAt: Date;
  semesterCode: string;
  venueText?: string;
  property?: { id: string; code: string; name: string };
  audienceScope: string;
  capacity: number;
  riskCategory?: string;
  state: string;
  conflictResult?: string;
  conflictDetail?: unknown;
  approvalConditions: string[];
  currentRevisionNo: number;
  revisionDeadlineAt?: Date;
  requestedBudgetTotal: number;
  hasPendingCancellation?: boolean;
}

export interface EventReviewDecision {
  id: string;
  taskId: string;
  outcome: EventReviewOutcome;
  reason?: string;
  sections: string[];
  conditions: string[];
  reviewNote?: string;
  actorId: string;
  at: Date;
}

export interface ApprovedBudgetLine {
  fundingDecision?: FundingDecision;
  category: string;
  requestedAmount: number;
  approvedAmount: number;
  reason?: string;
}

export interface EventBudgetSummary {
  id: string;
  eventId: string;
  eventTitle?: string;
  state: string;
  requestedTotal: number;
  approvedTotal: number;
  lines: ApprovedBudgetLine[];
}

export interface AttachedBooking {
  id: string;
  propertyId?: string;
  propertyCode?: string;
  propertyName?: string;
  startAt: Date;
  endAt: Date;
  state: string;
}

export type ClubObligation = "overdueSettlement" | "overdueRefund" | "overdueReport";

export interface EventProposalQueueItem {
  task: EventProposalTask;
  event: EventProposalSummary;
}

export interface EventCancellationReviewInfo {
  taskId?: string;
  assigneeId?: string;
  state: "Pending" | "Approved" | "Rejected";
  reason: string;
  requestedAt: Date;
  reviewReason?: string;
  decidedAt?: Date;
}

export interface EventProposalDetail extends EventProposalQueueItem {
  versions: EventProposalVersion[];
  decisions: EventReviewDecision[];
  club: { id: string; name: string; state: string; obligations: ClubObligation[] };
  bookings: AttachedBooking[];
  /** Các ngân sách khác CLB đã có trong cùng học kỳ (FR-UC26-13). */
  semesterBudgets: EventBudgetSummary[];
  budget?: EventBudgetSummary;
  activeDefenseSession?: EventDefenseSession;
  defenseHistory?: EventDefenseSession[];
  cancellationRequest?: EventCancellationReviewInfo;
}

export interface EventReviewDecisionInput {
  outcome: EventReviewOutcome;
  reason?: string;
  sections?: string[];
  reviewNote?: string;
  revisionDeadlineAt?: Date;
  conditions?: string[];
  /** Cùng thứ tự với các dòng yêu cầu của phiên bản hiện tại. */
  budgetLines?: { approvedAmount: number; reason?: string; fundingDecision?: FundingDecision }[];
}

export interface NormalizedEventDecision {
  outcome: EventReviewOutcome;
  reason?: string;
  sections: EventReviewSection[];
  reviewNote?: string;
  revisionDeadlineAt?: Date;
  conditions: string[];
  budgetLines: { approvedAmount: number; reason?: string; fundingDecision?: FundingDecision }[];
}

export interface EventLifecycleResult {
  expired: number;
  started: number;
  completed: number;
}

export interface EventProposalReviewRepository {
  listOpen(): Promise<EventProposalQueueItem[]>;
  find(eventId: string, now: Date): Promise<EventProposalDetail | null>;
  claim(eventId: string, officerId: string, now: Date): Promise<EventProposalDetail>;
  decide(eventId: string, officerId: string, input: NormalizedEventDecision,
    now: Date): Promise<EventProposalDetail>;
  decideCancellation?(eventId: string, officerId: string, input: { approve: boolean; reason?: string },
    now: Date): Promise<EventProposalDetail>;
  /** Scheduler: cho hết hạn các phiên bản quá hạn và chuyển trạng thái sự kiện đã công bố theo giờ của chúng. */
  advanceLifecycle(now: Date): Promise<EventLifecycleResult>;
}

// Kiểm tra số tiền duyệt cho từng dòng so với dòng ngân sách đề xuất
/** Kiểm tra số tiền duyệt của từng dòng so với các dòng yêu cầu của phiên bản đang được quyết định. */
export function approvedBudget(requested: RequestedBudgetLine[],
  decided: { approvedAmount: number; reason?: string; fundingDecision?: FundingDecision }[]): ApprovedBudgetLine[] {
  if (decided.length !== requested.length) {
    throw new DomainError("an approved amount is required for every budget line", "validation",
      { field: "budgetLines" });
  }
  return requested.map((line, index) => {
    const { approvedAmount, reason, fundingDecision } = decided[index]!;
    if (fundingDecision !== undefined && (!FUNDING_DECISIONS.includes(fundingDecision)
      || (fundingDecision === "NOT_SPONSORED" ? approvedAmount !== 0 : approvedAmount !== line.amount || approvedAmount <= 0))) {
      throw new DomainError("funding decision and approved amount disagree", "validation");
    }
    if (!Number.isInteger(approvedAmount) || approvedAmount < 0) {
      throw new DomainError("approved amounts must be whole, non-negative numbers", "validation",
        { field: "budgetLines", index });
    }
    if (approvedAmount > line.amount) {
      throw new DomainError("an approved amount cannot exceed the requested amount", "validation",
        { field: "budgetLines", index });
    }
    if (approvedAmount < line.amount && !reason) {
      throw new DomainError("a reduced budget line needs a reason", "validation",
        { field: "budgetLines", index });
    }
    return { category: line.category, requestedAmount: line.amount, approvedAmount, fundingDecision,
      ...(reason ? { reason } : {}) };
  });
}
