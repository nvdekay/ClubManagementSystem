import { ApiError, apiFetch } from "@/services/apiError";
export type MembershipState = "Active" | "Inactive" | "Left" | "Banned";
export type WithdrawalState = "Pending" | "Held" | "Executed" | "Cancelled";

export interface WithdrawalRequest {
  id: string;
  membershipId: string;
  clubId: string;
  clubName?: string;
  memberName?: string;
  reason: string;
  requestedEffectiveDate: string;
  state: WithdrawalState;
  createdAt: string;
  executedAt?: string;
}

export interface MembershipStatusChange {
  fromState: MembershipState;
  toState: MembershipState;
  effectiveDate: string;
  reason?: string;
  actorId: string | null;
  actorRole?: "SYSTEM";
  at: string;
}

export interface Membership {
  id: string;
  clubId: string;
  clubName?: string;
  displayName?: string;
  state: MembershipState;
  joinedAt: string;
  banReason?: string;
  statusHistory?: MembershipStatusChange[];
  pendingWithdrawal?: WithdrawalRequest;
}

/** UC21 roster row: adds the member's email and the club roles they hold right now. */
export interface ClubRosterMember extends Membership {
  email: string;
  positions: string[];
}

export type ManagedMembershipState = "Active" | "Inactive" | "Banned";

export interface MemberSpace {
  club: { id: string; name: string; logoUrl?: string; state: string };
  membership: { id: string; state: MembershipState; joinedAt: string; positions: string[];
    pendingWithdrawal?: WithdrawalRequest };
  members: Array<{ displayName: string; state: MembershipState; positions: string[] }>;
  board: Array<{ positionName: string; memberName: string }>;
  upcomingEvents: Array<{ id: string; title: string; startAt: string; endAt: string; venueText?: string;
    registrationState: "Confirmed" | "Waitlisted" | "Cancelled" | null }>;
  attendance: Array<{ eventId: string; eventTitle: string; checkedInAt: string; eventEndAt: string;
    feedbackSubmitted: boolean }>;
  feedbackToSend: Array<{ eventId: string; eventTitle: string; closesAt: string | null }>;
  otherClubs: Array<{ clubId: string; clubName: string; state: MembershipState }>;
}

/** Carries the HTTP status so the page can show "not a member" (403) instead of a generic error. */
export class MemberSpaceError extends ApiError {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

// Gọi API /api/v1 và trả về data, ném lỗi kèm status nếu thất bại
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new MemberSpaceError(body?.message ?? `HTTP ${response.status}`, response.status);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

// Dựng RequestInit POST có CSRF và body JSON tuỳ chọn
function post(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

// GET /memberships/mine: các CLB tôi tham gia
export function fetchMyMemberships(signal: AbortSignal) {
  return request<Membership[]>("/memberships/mine", { signal });
}

// GET yêu cầu rời CLB của tôi
/** UC22: every leave request the student has sent, newest first, so UC02 can track them. */
export function fetchMyWithdrawals(signal: AbortSignal) {
  return request<WithdrawalRequest[]>("/memberships/withdrawal-requests/mine", { signal });
}

// GET /member-space: không gian thành viên trong một CLB
export function fetchMemberSpace(clubId: string, signal: AbortSignal) {
  return request<MemberSpace>(`/clubs/${encodeURIComponent(clubId)}/member-space`, { signal });
}

// POST gửi yêu cầu rời CLB
export function requestWithdrawal(membershipId: string, input: { reason: string; requestedEffectiveDate: string },
  csrfToken: string) {
  return request<WithdrawalRequest>(`/memberships/${encodeURIComponent(membershipId)}/withdrawal-requests`,
    post(csrfToken, input));
}

// GET danh sách thành viên của CLB
export function fetchClubMemberships(clubId: string, signal: AbortSignal) {
  return request<ClubRosterMember[]>(`/clubs/${encodeURIComponent(clubId)}/memberships`, { signal });
}

// GET yêu cầu rời CLB gửi tới CLB
export function fetchClubWithdrawals(clubId: string, signal: AbortSignal) {
  return request<WithdrawalRequest[]>(`/clubs/${encodeURIComponent(clubId)}/membership-withdrawals`, { signal });
}

// POST /state: đổi trạng thái thành viên của CLB
/** UC21: the effective date is today (the server refuses back- or future-dated changes). */
export function changeMembershipState(clubId: string, membershipId: string,
  input: { state: ManagedMembershipState; reason?: string }, csrfToken: string) {
  return request<Membership>(
    `/clubs/${encodeURIComponent(clubId)}/memberships/${encodeURIComponent(membershipId)}/state`,
    { method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ ...input, effectiveDate: new Date().toISOString() }) });
}

// POST thêm thành viên vào CLB theo email
/** UC20 A1: adds a student who has signed in before, with the reason BR13 requires. */
export function onboardMember(clubId: string, input: { email: string; reason: string }, csrfToken: string) {
  return request<Membership>(`/clubs/${encodeURIComponent(clubId)}/memberships`, post(csrfToken, input));
}

// POST /execute: CLB thực hiện yêu cầu rời CLB
export function executeWithdrawal(clubId: string, requestId: string, csrfToken: string) {
  return request<Membership>(
    `/clubs/${encodeURIComponent(clubId)}/membership-withdrawals/${encodeURIComponent(requestId)}/execute`,
    post(csrfToken));
}
