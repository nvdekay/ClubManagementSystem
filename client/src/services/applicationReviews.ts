import type { ApplicationRecord, ApplicationVersion, FounderProfile } from "./applications";

export type ReviewOutcome = "Request revision" | "Approve" | "Reject";

export interface ReviewTask {
  id: string;
  applicationId: string;
  title: string;
  state: "Open" | "Decided" | "Closed";
  assigneeId?: string;
  openedAt: string;
  slaDueAt?: string;
}

export interface ReviewDecision {
  id: string;
  taskId: string;
  outcome: ReviewOutcome;
  reason?: string;
  sections: string[];
  reviewNote?: string;
  actorId: string;
  at: string;
}

export interface ReviewQueueItem {
  task: ReviewTask;
  application: ApplicationRecord;
}

export interface ReviewDetail extends ReviewQueueItem {
  versions: ApplicationVersion[];
  decisions: ReviewDecision[];
  founders: FounderProfile[];
}

export interface ReviewDecisionInput {
  outcome: ReviewOutcome;
  reason?: string;
  sections?: string[];
  reviewNote?: string;
  revisionDeadlineAt?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/application-reviews${path}`, {
    credentials: "same-origin", ...init,
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json",
    "X-CSRF-Token": csrfToken }, ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchReviewQueue(signal: AbortSignal): Promise<ReviewQueueItem[]> {
  return request("", { signal });
}

export function fetchReview(id: string, signal: AbortSignal): Promise<ReviewDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function claimReview(id: string, csrfToken: string): Promise<ReviewDetail> {
  return request(`/${encodeURIComponent(id)}/claim`, mutation(csrfToken));
}

export function decideReview(id: string, input: ReviewDecisionInput,
  csrfToken: string): Promise<ReviewDetail> {
  return request(`/${encodeURIComponent(id)}/decision`, mutation(csrfToken, input));
}

export function reviewDocumentAccess(id: string, documentId: string): Promise<{
  fileName: string; url: string;
}> {
  return request(`/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/access`);
}
