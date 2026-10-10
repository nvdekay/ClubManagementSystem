export type BookingReviewOutcome = "Request revision" | "Approve" | "Reject";
export type ClubObligation = "overdueSettlement" | "overdueRefund" | "overdueReport";

export interface BookingSummary {
  id: string;
  clubId: string;
  clubName: string;
  property: { id: string; code: string; name: string; type: string; location: string; capacity?: number };
  purpose: string;
  startAt: string;
  endAt: string;
  semesterCode: string;
  headcount?: number;
  state: string;
  currentVersionNo: number;
  conflictResult?: string;
  event?: { id: string; title: string; state: string };
}

export interface BookingQueueItem {
  task: { id: string; bookingId: string; state: "Open" | "Decided" | "Closed"; assigneeId?: string; openedAt: string };
  booking: BookingSummary;
}

export interface BookingConflict {
  kind: "booking" | "event";
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  state: string;
  blocking: boolean;
}

export interface BookingDecision {
  id: string;
  outcome: BookingReviewOutcome;
  reason?: string;
  reviewNote?: string;
  alternative?: { propertyId?: string; propertyLabel?: string; startAt?: string; endAt?: string };
  versionNo?: number;
  at: string;
}

export interface BookingDetail extends BookingQueueItem {
  club: { id: string; name: string; state: string; obligations: ClubObligation[] };
  conflicts: BookingConflict[];
  allowOverbooking: boolean;
  outsideHours: boolean;
  decisions: BookingDecision[];
}

export interface BookingDecisionInput {
  outcome: BookingReviewOutcome;
  reason?: string;
  reviewNote?: string;
  alternative?: { propertyId?: string; startAt?: string; endAt?: string };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1/admin/bookings${path}`, { credentials: "same-origin", ...init });
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

export function fetchBookingQueue(signal: AbortSignal): Promise<BookingQueueItem[]> {
  return request("", { signal });
}

export function fetchBooking(id: string, signal: AbortSignal): Promise<BookingDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

export function claimBooking(id: string, csrfToken: string): Promise<BookingDetail> {
  return request(`/${encodeURIComponent(id)}/claim`, mutation(csrfToken));
}

export function decideBooking(id: string, input: BookingDecisionInput, csrfToken: string): Promise<BookingDetail> {
  return request(`/${encodeURIComponent(id)}/decision`, mutation(csrfToken, input));
}
