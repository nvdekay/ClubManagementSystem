import { ApiError, apiFetch } from "@/services/apiError";
export interface EventBudgetLine { category: string; amount: number; purpose: string; plannedItems?: string }
export interface EventFormField { key: string; label: string; type: "text" | "textarea" | "select" | "radio" | "checkbox"; required: boolean; options?: string[] }
export interface EventOccurrence { startAt: string; endAt: string; propertyId?: string; venueText?: string }
export interface ClubEventInput {
  title: string; objective: string; plan: string; startAt: string; endAt: string; venueText?: string; propertyId?: string;
  audienceScope: "PUBLIC" | "MEMBERS_ONLY"; capacity: number; riskCategory: "LOW" | "MEDIUM" | "HIGH";
  riskNote?: string; facilityNeeds?: string; occurrences?: EventOccurrence[];
  budgetLines: EventBudgetLine[]; bookingIds: string[]; registrationForm?: EventFormField[];
}
/** Proposal file attached to the current draft or frozen into a submitted revision (`versions[].payload.proposalDocument`). */
export interface EventProposalDocumentInfo { id: string; fileName: string; mimeType: string; bytes: number; uploadedAt: string; uploadedBy: string }
export interface EventProposalTemplateInfo { fileName: string; mimeType: string; bytes: number; updatedAt: string; isSystemDefault: boolean }
/** Short-lived signed link to a stored file. */
export interface FileAccess { fileName: string; mimeType: string; url: string }
export interface ClubEvent extends ClubEventInput {
  id: string; clubId: string; clubName: string; state: string; semesterCode: string; version: number;
  currentRevisionNo: number; confirmedRegistrationCount: number; approvalConditions: string[]; attendanceFinalized: boolean;
  conflictResult?: string; conflictDetail?: unknown; publishedAt?: string; registrationOpenAt?: string; registrationCloseAt?: string;
  checkInCode?: string; checkInOpenAt?: string; checkInCloseAt?: string; allowWalkIn: boolean; waitlistEnabled: boolean; revisionDeadlineAt?: string;
  proposalDocument?: EventProposalDocumentInfo;
}
export interface ClubEventDetail {
  event: ClubEvent;
  versions: { revisionNo: number; payload: unknown; budgetLines: EventBudgetLine[]; submittedAt: string }[];
  decisions: { outcome: string; reason?: string; comments?: unknown; at: string }[];
  bookings: { id: string; state: string; propertyId: string; propertyName: string; startAt: string; endAt: string }[];
  budget?: { id?: string; state: string; approvedTotal: number; disbursedTotal: number };
}
export interface EventParticipant {
  studentId: string; name: string; email: string; registrationId?: string; state?: string; waitlistPosition?: number;
  attendanceId?: string; checkedInAt?: string; method?: string; abnormalFlags: string[]; correctionReason?: string; finalized: boolean;
}
export interface EventFeedbackSummary {
  eventId: string; title: string; respondents: number; visible: boolean; averageRating?: number;
  distribution?: Record<number, number>; comments?: string[];
}
export interface ClubEventErrorDetails {
  obligations?: string[];
  registrationIds?: string[];
  conflicts?: string[];
  bookingId?: string;
  bookingError?: string;
  noticeHours?: number;
}
/** Non-2xx response; keeps what the server names: overdue obligations, affected registrations, schedule conflicts, booking errors. */
export class ClubEventError extends ApiError {
  constructor(message: string, readonly details: ClubEventErrorDetails, readonly statusCode?: number) {
    super(message);
  }
}
function strings(value: unknown): string[] | undefined {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined;
}
async function request<T>(clubId: string, path: string, init: RequestInit, resource: "events" | "internal-events" = "events"): Promise<T> {
  const res = await apiFetch(`/api/v1/clubs/${encodeURIComponent(clubId)}/${resource}${path}`, { credentials: "same-origin", ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string; details?: Record<string, unknown> } | null;
    const d = body?.details;
    throw new ClubEventError(body?.message ?? `HTTP ${res.status}`, {
      obligations: strings(d?.obligations),
      registrationIds: strings(d?.registrationIds),
      conflicts: strings(d?.conflicts),
      bookingId: typeof d?.bookingId === "string" ? d.bookingId : undefined,
      bookingError: typeof d?.bookingError === "string" ? d.bookingError : undefined,
      noticeHours: typeof d?.noticeHours === "number" ? d.noticeHours : undefined,
    }, res.status);
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

/** Self-funded members-only event (DRAFT → CREATED → PUBLIC → ONGOING → FINISH): no audience choice, no budget. */
export type InternalClubEventInput = Pick<ClubEventInput, "title" | "objective" | "plan" | "startAt" | "endAt" | "venueText" | "propertyId" | "capacity" | "riskCategory" | "bookingIds">;
export interface EventPublishInput {
  registrationOpenAt?: string; registrationCloseAt?: string; checkInOpenAt: string; checkInCloseAt: string; allowWalkIn: boolean; waitlistEnabled: boolean;
  notifyMembers?: boolean;
}
export type InternalCreateMode = "draft" | "create" | "publish";
function jsonInit(method: string, body: object, csrfToken: string): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken }, body: JSON.stringify(body) };
}
export function createInternalClubEvent(clubId: string, input: InternalClubEventInput, mode: InternalCreateMode, publishInput: EventPublishInput | undefined, csrfToken: string): Promise<ClubEventDetail> {
  return request(clubId, "", jsonInit("POST", { ...input, mode, ...(publishInput ? { publishInput } : {}) }, csrfToken), "internal-events");
}
export function updateInternalClubEvent(clubId: string, id: string, input: InternalClubEventInput, expectedVersion: number, csrfToken: string): Promise<ClubEventDetail> {
  return request(clubId, `/${encodeURIComponent(id)}`, jsonInit("PUT", { ...input, expectedVersion }, csrfToken), "internal-events");
}
/** DRAFT → CREATED; the server enforces the 24-hour notice. */
export function confirmInternalClubEvent(clubId: string, id: string, expectedVersion: number, csrfToken: string): Promise<ClubEventDetail> {
  return request(clubId, `/${encodeURIComponent(id)}/create`, jsonInit("POST", { expectedVersion }, csrfToken), "internal-events");
}

export interface ClubEventOptions { properties: { id: string; name: string }[]; bookings: { id: string; propertyId: string; propertyType?: string; eventId?: string; title: string; startAt: string; endAt: string }[] }
export function fetchClubEventOptions(clubId: string, signal: AbortSignal): Promise<ClubEventOptions> { return request(clubId, "/options", { signal }); }

/** Same-origin download: the default template streams as an attachment, an ICPDP upload redirects to a signed URL. */
export const EVENT_PROPOSAL_TEMPLATE_DOWNLOAD_URL = "/api/v1/events/proposal-template/download";
export async function fetchEventProposalTemplate(signal: AbortSignal): Promise<EventProposalTemplateInfo> {
  const res = await apiFetch("/api/v1/events/proposal-template", { credentials: "same-origin", signal });
  if (!res.ok) {
    const body = await res.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(body?.message ?? `HTTP ${res.status}`);
  }
  return ((await res.json()) as { data: EventProposalTemplateInfo }).data;
}
/** Raw upload; the response's `event.version` is the one to submit with. */
export function uploadEventProposalDocument(clubId: string, id: string, file: File, mimeType: string, csrfToken: string): Promise<ClubEventDetail> {
  return request(clubId, `/${encodeURIComponent(id)}/proposal-document`, { method: "POST", body: file,
    headers: { "Content-Type": mimeType, "X-CSRF-Token": csrfToken, "X-Filename": encodeURIComponent(file.name) } });
}
/** No `revisionNo`: the current draft's file. */
export function accessEventProposalDocument(clubId: string, id: string, revisionNo?: number, inline = false): Promise<FileAccess> {
  const query = new URLSearchParams({ inline: String(inline), ...(revisionNo ? { revisionNo: String(revisionNo) } : {}) });
  return request(clubId, `/${encodeURIComponent(id)}/proposal-document/access?${query}`, {});
}
