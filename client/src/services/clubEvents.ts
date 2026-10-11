export interface EventBudgetLine { category: string; amount: number; purpose: string; plannedItems?: string }
export interface EventFormField { key: string; label: string; type: "text" | "textarea" | "select" | "radio" | "checkbox"; required: boolean; options?: string[] }
export interface ClubEventInput {
  title: string; objective: string; plan: string; startAt: string; endAt: string; venueText?: string; propertyId?: string;
  audienceScope: "PUBLIC" | "MEMBERS_ONLY"; capacity: number; riskCategory: "LOW" | "MEDIUM" | "HIGH";
  riskNote?: string; facilityNeeds?: string; occurrences?: { startAt: string; endAt: string }[];
  budgetLines: EventBudgetLine[]; bookingIds: string[]; registrationForm?: EventFormField[];
}
export interface ClubEvent extends ClubEventInput {
  id: string; clubId: string; clubName: string; state: string; semesterCode: string; version: number;
  currentRevisionNo: number; confirmedRegistrationCount: number; approvalConditions: string[]; attendanceFinalized: boolean;
  conflictResult?: string; conflictDetail?: unknown; publishedAt?: string; registrationOpenAt?: string; registrationCloseAt?: string;
  checkInCode?: string; checkInOpenAt?: string; checkInCloseAt?: string; allowWalkIn: boolean; waitlistEnabled: boolean; revisionDeadlineAt?: string;
}
export interface ClubEventDetail {
  event: ClubEvent;
  versions: { revisionNo: number; payload: unknown; budgetLines: EventBudgetLine[]; submittedAt: string }[];
  decisions: { outcome: string; reason?: string; comments?: unknown; at: string }[];
  bookings: { id: string; state: string; propertyId: string; propertyName: string; startAt: string; endAt: string }[];
  budget?: { state: string; approvedTotal: number; disbursedTotal: number };
}
export interface EventParticipant {
  studentId: string; name: string; email: string; registrationId?: string; state?: string; waitlistPosition?: number;
  attendanceId?: string; checkedInAt?: string; method?: string; abnormalFlags: string[]; correctionReason?: string; finalized: boolean;
}
export interface EventFeedbackSummary {
  eventId: string; title: string; respondents: number; visible: boolean; averageRating?: number;
  distribution?: Record<number, number>; comments?: string[];
}
async function request<T>(clubId: string, path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1/clubs/${encodeURIComponent(clubId)}/events${path}`, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${res.status}`);
  }
  return ((await res.json()) as { data: T }).data;
}
export function fetchClubEvents(clubId: string, signal: AbortSignal): Promise<ClubEvent[]> { return request(clubId, "", { signal }); }
export function fetchClubEvent(clubId: string, id: string, signal: AbortSignal): Promise<ClubEventDetail> { return request(clubId, `/${encodeURIComponent(id)}`, { signal }); }
export function fetchEventParticipants(clubId: string, id: string, signal: AbortSignal): Promise<EventParticipant[]> { return request(clubId, `/${encodeURIComponent(id)}/participants`, { signal }); }
export function fetchClubEventFeedback(clubId: string, ids: string[], signal: AbortSignal): Promise<EventFeedbackSummary[]> {
  return request(clubId, `/feedback?${new URLSearchParams({ eventIds: ids.join(",") })}`, { signal });
}
export function createClubEvent(clubId: string, input: ClubEventInput, csrfToken: string): Promise<ClubEventDetail> {
  return request(clubId, "", { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(input) });
}
export function actOnClubEvent(clubId: string, id: string, action: string, body: object, csrfToken: string): Promise<ClubEventDetail> {
  return request(clubId, `/${encodeURIComponent(id)}/${action}`, { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) });
}

export interface ClubEventOptions { properties: { id: string; name: string }[]; bookings: { id: string; propertyId: string; propertyType?: string; title: string; startAt: string; endAt: string }[] }
export function fetchClubEventOptions(clubId: string, signal: AbortSignal): Promise<ClubEventOptions> { return request(clubId, "/options", { signal }); }
