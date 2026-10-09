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

export interface Membership {
  id: string;
  clubId: string;
  clubName?: string;
  displayName?: string;
  state: MembershipState;
  joinedAt: string;
  pendingWithdrawal?: WithdrawalRequest;
}

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
export class MemberSpaceError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new MemberSpaceError(body?.message ?? `HTTP ${response.status}`, response.status);
  }
  const body = await response.json() as { data: T };
  return body.data;
}

function post(csrfToken: string, body?: object): RequestInit {
  return { method: "POST", headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchMyMemberships(signal: AbortSignal) {
  return request<Membership[]>("/memberships/mine", { signal });
}

export function fetchMemberSpace(clubId: string, signal: AbortSignal) {
  return request<MemberSpace>(`/clubs/${encodeURIComponent(clubId)}/member-space`, { signal });
}

export function requestWithdrawal(membershipId: string, input: { reason: string; requestedEffectiveDate: string },
  csrfToken: string) {
  return request<WithdrawalRequest>(`/memberships/${encodeURIComponent(membershipId)}/withdrawal-requests`,
    post(csrfToken, input));
}

export function fetchClubMemberships(clubId: string, signal: AbortSignal) {
  return request<Membership[]>(`/clubs/${encodeURIComponent(clubId)}/memberships`, { signal });
}

export function fetchClubWithdrawals(clubId: string, signal: AbortSignal) {
  return request<WithdrawalRequest[]>(`/clubs/${encodeURIComponent(clubId)}/membership-withdrawals`, { signal });
}

export function executeWithdrawal(clubId: string, requestId: string, csrfToken: string) {
  return request<Membership>(
    `/clubs/${encodeURIComponent(clubId)}/membership-withdrawals/${encodeURIComponent(requestId)}/execute`,
    post(csrfToken));
}
