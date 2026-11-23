import { ApiError, apiFetch } from "@/services/apiError";
export type InvitationStatus = "Pending" | "Accepted" | "Declined" | "Expired" | "Withdrawn";

export interface InvitationCounts {
  invited: number;
  pending: number;
  accepted: number;
  declined: number;
  expired: number;
  withdrawn: number;
}

export interface ScheduleConflict {
  kind: "event" | "booking";
  title: string;
  startAt: string;
  endAt: string;
}

export interface SchoolEventSummary {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  venueText?: string;
  property?: { id: string; code: string; name: string };
  capacity: number;
  state: string;
  semesterCode: string;
  publishedAt?: string;
  confirmedRegistrationCount: number;
  counts: InvitationCounts;
}

export interface SchoolEventInvitation {
  id: string;
  clubId: string;
  clubName: string;
  status: InvitationStatus;
  deadline: string;
  invitedAt: string;
  respondedAt?: string;
  responseNote?: string;
  responseDetails?: unknown;
}

export interface SchoolEventDetail extends SchoolEventSummary {
  objective?: string;
  coordination?: string;
  conflictResult: "No Conflict" | "Warning";
  conflicts: ScheduleConflict[];
  checkInCode?: string;
  registrationCloseAt?: string;
  invitations: SchoolEventInvitation[];
}

export interface InvitationOutcome {
  invited: string[];
  skipped: { clubId: string; reason: "notActive" | "alreadyInvited" }[];
}

export interface SchoolEventInput {
  title: string;
  objective?: string;
  coordination?: string;
  startAt: string;
  endAt: string;
  venueText?: string;
  propertyId?: string;
  capacity: number;
  invitationDeadline?: string;
  clubIds?: string[];
  allActiveClubs?: boolean;
}

export interface InviteInput {
  clubIds?: string[];
  allActiveClubs?: boolean;
  deadline?: string;
}

// Gọi API /admin/school-events và trả về data, ném lỗi nếu thất bại
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1/admin/school-events${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

// Dựng RequestInit POST có CSRF và body JSON tuỳ chọn
function post(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

// GET danh sách sự kiện do trường tổ chức
export function fetchSchoolEvents(signal: AbortSignal): Promise<SchoolEventSummary[]> {
  return request("", { signal });
}

// GET chi tiết một sự kiện của trường
export function fetchSchoolEvent(id: string, signal: AbortSignal): Promise<SchoolEventDetail> {
  return request(`/${encodeURIComponent(id)}`, { signal });
}

// GET /conflicts: kiểm tra xung đột lịch của cơ sở vật chất
export function fetchScheduleConflicts(input: { propertyId: string; startAt: string; endAt: string },
  signal: AbortSignal): Promise<ScheduleConflict[]> {
  return request(`/conflicts?${new URLSearchParams(input).toString()}`, { signal });
}

// POST tạo sự kiện của trường
export function createSchoolEvent(input: SchoolEventInput, csrfToken: string): Promise<{ detail: SchoolEventDetail; outcome: InvitationOutcome }> {
  return request("", post(csrfToken, input));
}

// POST /invitations: mời CLB tham gia sự kiện trường
export function inviteClubs(id: string, input: InviteInput, csrfToken: string): Promise<{ detail: SchoolEventDetail; outcome: InvitationOutcome }> {
  return request(`/${encodeURIComponent(id)}/invitations`, post(csrfToken, input));
}

// POST /withdraw: thu hồi lời mời CLB
export function withdrawInvitation(id: string, invitationId: string, csrfToken: string): Promise<SchoolEventDetail> {
  return request(`/${encodeURIComponent(id)}/invitations/${encodeURIComponent(invitationId)}/withdraw`, post(csrfToken));
}

// POST /publish: công khai sự kiện trường
export function publishSchoolEvent(id: string, csrfToken: string): Promise<SchoolEventDetail> {
  return request(`/${encodeURIComponent(id)}/publish`, post(csrfToken));
}
