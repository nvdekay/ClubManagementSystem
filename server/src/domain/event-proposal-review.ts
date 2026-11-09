import { DomainError } from "./errors.js";

export type EventReviewOutcome = "Request revision" | "Approve" | "Reject";
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

/** One requested budget line as the club submitted it (UC25 FR-18). */
export interface RequestedBudgetLine {
  category: string;
  amount: number;
  purpose: string;
  plannedItems?: string;
}

export interface EventProposalVersion {
  id: string;
  revisionNo: number;
  /** Immutable snapshot of what the club submitted; shape is the UC25 contract in the SPEC. */
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

export interface EventProposalDetail extends EventProposalQueueItem {
  versions: EventProposalVersion[];
  decisions: EventReviewDecision[];
  club: { id: string; name: string; state: string; obligations: ClubObligation[] };
  bookings: AttachedBooking[];
  /** Other budgets the club already holds in the same semester (FR-UC26-13). */
  semesterBudgets: EventBudgetSummary[];
  budget?: EventBudgetSummary;
}

export interface EventReviewDecisionInput {
  outcome: EventReviewOutcome;
  reason?: string;
  sections?: string[];
  reviewNote?: string;
  revisionDeadlineAt?: Date;
  conditions?: string[];
  /** Same order as the requested lines of the current revision. */
  budgetLines?: { approvedAmount: number; reason?: string }[];
}

export interface NormalizedEventDecision {
  outcome: EventReviewOutcome;
  reason?: string;
  sections: EventReviewSection[];
  reviewNote?: string;
  revisionDeadlineAt?: Date;
  conditions: string[];
  budgetLines: { approvedAmount: number; reason?: string }[];
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
  /** Scheduler: expire overdue revisions and move published events along their own times. */
  advanceLifecycle(now: Date): Promise<EventLifecycleResult>;
}

/** Checks the per-line approved amounts against the requested lines of the revision being decided. */
export function approvedBudget(requested: RequestedBudgetLine[],
  decided: { approvedAmount: number; reason?: string }[]): ApprovedBudgetLine[] {
  if (decided.length !== requested.length) {
    throw new DomainError("an approved amount is required for every budget line", "validation",
      { field: "budgetLines" });
  }
  return requested.map((line, index) => {
    const { approvedAmount, reason } = decided[index]!;
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
    return { category: line.category, requestedAmount: line.amount, approvedAmount,
      ...(reason ? { reason } : {}) };
  });
}
