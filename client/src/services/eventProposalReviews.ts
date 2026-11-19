import { ApiError, apiFetch } from "@/services/apiError";
import type { EventProposalTemplateInfo, FileAccess } from "@/services/clubEvents";
import type { EventDefenseSession } from "@/services/eventDefense";

export type EventReviewOutcome = "Request revision" | "Approve" | "Reject" | "Re-defense";
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
  state: string;
  conflictResult?: string;
  conflictDetail?: unknown;
  approvalConditions: string[];
  currentRevisionNo: number;
  revisionDeadlineAt?: string;
  requestedBudgetTotal: number;
  hasPendingCancellation?: boolean;
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
  lines: { category: string; requestedAmount: number; approvedAmount: number; fundingDecision?: "NOT_SPONSORED" | "BEFORE_EVENT" | "AFTER_EVENT"; reason?: string }[];
}

export type ClubObligation = "overdueSettlement" | "overdueRefund" | "overdueReport";

export interface EventProposalQueueItem {
  task: EventProposalTask;
  event: EventProposalSummary;
}

export interface EventCancellationReviewInfo {
  state: "Pending" | "Approved" | "Rejected";
  reason: string;
  requestedAt: string;
  requestedBy?: string;
  reviewReason?: string;
  decidedAt?: string;
}

export interface EventProposalDetail extends EventProposalQueueItem {
  versions: EventProposalVersion[];
  decisions: EventReviewDecision[];
  club: { id: string; name: string; state: string; obligations: ClubObligation[] };
  bookings: { id: string; propertyId?: string; propertyCode?: string; propertyName?: string; startAt: string; endAt: string; state: string }[];
  semesterBudgets: EventBudgetSummary[];
  budget?: EventBudgetSummary;
  activeDefenseSession?: EventDefenseSession;
  defenseHistory?: EventDefenseSession[];
  cancellationRequest?: EventCancellationReviewInfo;
}

export interface EventReviewDecisionInput {
  outcome: EventReviewOutcome;
  reason?: string;
  sections?: EventReviewSection[];
  reviewNote?: string;
  revisionDeadlineAt?: string;
  conditions?: string[];
  budgetLines?: { approvedAmount: number; fundingDecision?: "NOT_SPONSORED" | "BEFORE_EVENT" | "AFTER_EVENT"; reason?: string }[];
}

// Gọi API /admin/event-proposals và trả về data, ném ApiError nếu lỗi
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1/admin/event-proposals${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

// Dựng RequestInit POST có CSRF và body JSON tuỳ chọn
function mutation(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

// GET hàng đợi đề xuất sự kiện chờ ICPDP
export function fetchEventProposalQueue(signal: AbortSignal): Promise<EventProposalQueueItem[]> {
  return request("", { signal });
}

// GET chi tiết một đề xuất sự kiện
export function fetchEventProposal(id: string, signal: AbortSignal): Promise<EventProposalDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

// POST /claim: ICPDP nhận xử lý đề xuất
export function claimEventProposal(id: string, csrfToken: string): Promise<EventProposalDetail> {
  return request(`/${encodeURIComponent(id)}/claim`, mutation(csrfToken));
}

// POST /decision: ICPDP ghi quyết định đề xuất
export function decideEventProposal(id: string, input: EventReviewDecisionInput,
  csrfToken: string): Promise<EventProposalDetail> {
  return request(`/${encodeURIComponent(id)}/decision`, mutation(csrfToken, input));
}

// POST /cancellation-decision: duyệt hoặc từ chối yêu cầu huỷ sự kiện
export function decideEventCancellation(
  id: string,
  input: { approve: boolean; reason?: string },
  csrfToken: string,
): Promise<EventProposalDetail> {
  return request(`/${encodeURIComponent(id)}/cancellation-decision`, mutation(csrfToken, input));
}

// POST /template: tải mẫu đề xuất sự kiện mới
/** Thay thế mẫu đang dùng (ICPDP_OFFICER); không có thao tác xoá. */
export function uploadProposalTemplate(file: File, mimeType: string, csrfToken: string): Promise<EventProposalTemplateInfo> {
  return request("/template", { method: "POST", body: file,
    headers: { "Content-Type": mimeType, "X-CSRF-Token": csrfToken, "X-Filename": encodeURIComponent(file.name) } });
}

// GET /document/access: lấy link xem file đề xuất khi xét duyệt
/** Không có `revisionNo`: file của bản chỉnh sửa đã nộp mới nhất. */
export function accessReviewProposalDocument(id: string, revisionNo?: number, inline = false): Promise<FileAccess> {
  const query = new URLSearchParams({ inline: String(inline), ...(revisionNo ? { revisionNo: String(revisionNo) } : {}) });
  return request(`/${encodeURIComponent(id)}/document/access?${query}`);
}
