export type EventReviewOutcome = "Request revision" | "Approve" | "Reject";
export const EVENT_REVIEW_SECTIONS = ["schedule", "venue", "content", "risk", "budget", "other"] as const;
export type EventReviewSection = typeof EVENT_REVIEW_SECTIONS[number];

export interface EventProposalTask {
  id: string;
  eventId: string;
  title: string;
  state: "Open" | "Decided" | "Closed";
  assigneeId?: string;
  openedAt: string;
}

export interface EventProposalSummary {
  id: string;
  clubId: string;
  clubName: string;
  title: string;
  objective?: string;
  startAt: string;
  endAt: string;
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
  revisionDeadlineAt?: string;
  requestedBudgetTotal: number;
}

export interface RequestedBudgetLine {
  category: string;
  amount: number;
  purpose: string;
  plannedItems?: string;
}

export interface EventProposalVersion {
  id: string;
  revisionNo: number;
  payload: Record<string, unknown>;
  budgetLines: RequestedBudgetLine[];
  requestedBudgetTotal: number;
  conflictResult?: string;
  submittedBy: string;
  submittedByName?: string;
  submittedAt: string;
}

export interface EventReviewDecision {
  id: string;
  outcome: EventReviewOutcome;
  reason?: string;
  sections: string[];
  conditions: string[];
  reviewNote?: string;
  at: string;
}

export interface EventBudgetSummary {
  id: string;
  eventId: string;
  eventTitle?: string;
  state: string;
  requestedTotal: number;
  approvedTotal: number;
  lines: { category: string; requestedAmount: number; approvedAmount: number; reason?: string }[];
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
  bookings: { id: string; propertyCode?: string; propertyName?: string; startAt: string; endAt: string; state: string }[];
  semesterBudgets: EventBudgetSummary[];
  budget?: EventBudgetSummary;
}

export interface EventReviewDecisionInput {
  outcome: EventReviewOutcome;
  reason?: string;
  sections?: EventReviewSection[];
  reviewNote?: string;
  revisionDeadlineAt?: string;
  conditions?: string[];
  budgetLines?: { approvedAmount: number; reason?: string }[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/event-proposals${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchEventProposalQueue(signal: AbortSignal): Promise<EventProposalQueueItem[]> {
  return request("", { signal });
}

export function fetchEventProposal(id: string, signal: AbortSignal): Promise<EventProposalDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function claimEventProposal(id: string, csrfToken: string): Promise<EventProposalDetail> {
  return request(`/${encodeURIComponent(id)}/claim`, mutation(csrfToken));
}

export function decideEventProposal(id: string, input: EventReviewDecisionInput,
  csrfToken: string): Promise<EventProposalDetail> {
  return request(`/${encodeURIComponent(id)}/decision`, mutation(csrfToken, input));
}
