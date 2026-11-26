import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure, type ApiRequestOptions } from '@/services/apiRequest'
export type MembershipState = 'Active' | 'Inactive' | 'Left' | 'Banned'
export type WithdrawalState = 'Pending' | 'Held' | 'Executed' | 'Cancelled'

export interface WithdrawalRequest {
  id: string
  membershipId: string
  clubId: string
  clubName?: string
  memberName?: string
  reason: string
  requestedEffectiveDate: string
  state: WithdrawalState
  createdAt: string
  executedAt?: string
}

export interface MembershipStatusChange {
  fromState: MembershipState
  toState: MembershipState
  effectiveDate: string
  reason?: string
  actorId: string | null
  actorRole?: 'SYSTEM'
  at: string
}

export interface Membership {
  id: string
  clubId: string
  clubName?: string
  displayName?: string
  state: MembershipState
  joinedAt: string
  banReason?: string
  statusHistory?: MembershipStatusChange[]
  pendingWithdrawal?: WithdrawalRequest
}

/** Dòng danh sách thành viên UC21: thêm email của thành viên và các vai trò CLB họ đang giữ. */
export interface ClubRosterMember extends Membership {
  email: string
  positions: string[]
}

export type ManagedMembershipState = 'Active' | 'Inactive' | 'Banned'

export interface MemberSpace {
  club: { id: string; name: string; logoUrl?: string; state: string }
  membership: {
    id: string
    state: MembershipState
    joinedAt: string
    positions: string[]
    pendingWithdrawal?: WithdrawalRequest
  }
  members: Array<{ displayName: string; state: MembershipState; positions: string[] }>
  board: Array<{ positionName: string; memberName: string }>
  upcomingEvents: Array<{
    id: string
    title: string
    startAt: string
    endAt: string
    venueText?: string
    registrationState: 'Confirmed' | 'Waitlisted' | 'Cancelled' | null
  }>
  attendance: Array<{
    eventId: string
    eventTitle: string
    checkedInAt: string
    eventEndAt: string
    feedbackSubmitted: boolean
  }>
  feedbackToSend: Array<{ eventId: string; eventTitle: string; closesAt: string | null }>
  otherClubs: Array<{ clubId: string; clubName: string; state: MembershipState }>
}

/** Mang theo HTTP status để trang hiện "không phải thành viên" (403) thay vì lỗi chung chung. */
export class MemberSpaceError extends ApiError {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1${path}`, { ...options, toError: toMemberSpaceError })
}

// Maps a failed response to this module's error type
function toMemberSpaceError(failure: ApiFailure): Error {
  return new MemberSpaceError(failure.message, failure.status)
}

// GET /memberships/mine: các CLB tôi tham gia
export function fetchMyMemberships(signal: AbortSignal) {
  return request<Membership[]>('/memberships/mine', { signal })
}

// GET yêu cầu rời CLB của tôi
/** UC22: mọi yêu cầu rời CLB sinh viên đã gửi, mới nhất trước, để UC02 theo dõi. */
export function fetchMyWithdrawals(signal: AbortSignal) {
  return request<WithdrawalRequest[]>('/memberships/withdrawal-requests/mine', { signal })
}

// GET /member-space: không gian thành viên trong một CLB
export function fetchMemberSpace(clubId: string, signal: AbortSignal) {
  return request<MemberSpace>(`/clubs/${encodeURIComponent(clubId)}/member-space`, { signal })
}

// POST gửi yêu cầu rời CLB
export function requestWithdrawal(
  membershipId: string,
  input: { reason: string; requestedEffectiveDate: string },
  csrfToken: string,
) {
  return request<WithdrawalRequest>(
    `/memberships/${encodeURIComponent(membershipId)}/withdrawal-requests`,
    { method: 'POST', csrfToken, body: input },
  )
}

// GET danh sách thành viên của CLB
export function fetchClubMemberships(clubId: string, signal: AbortSignal) {
  return request<ClubRosterMember[]>(`/clubs/${encodeURIComponent(clubId)}/memberships`, { signal })
}

// GET yêu cầu rời CLB gửi tới CLB
export function fetchClubWithdrawals(clubId: string, signal: AbortSignal) {
  return request<WithdrawalRequest[]>(
    `/clubs/${encodeURIComponent(clubId)}/membership-withdrawals`,
    { signal },
  )
}

// POST /state: đổi trạng thái thành viên của CLB
/** UC21: ngày hiệu lực là hôm nay (server từ chối thay đổi lùi ngày hoặc hẹn ngày tương lai). */
export function changeMembershipState(
  clubId: string,
  membershipId: string,
  input: { state: ManagedMembershipState; reason?: string },
  csrfToken: string,
) {
  return request<Membership>(
    `/clubs/${encodeURIComponent(clubId)}/memberships/${encodeURIComponent(membershipId)}/state`,
    {
      method: 'PATCH',
      csrfToken,
      body: { ...input, effectiveDate: new Date().toISOString() },
    },
  )
}

// POST thêm thành viên vào CLB theo email
/** UC20 A1: thêm sinh viên đã từng đăng nhập, kèm lý do theo yêu cầu của BR13. */
export function onboardMember(
  clubId: string,
  input: { email: string; reason: string },
  csrfToken: string,
) {
  return request<Membership>(`/clubs/${encodeURIComponent(clubId)}/memberships`, {
    method: 'POST',
    csrfToken,
    body: input,
  })
}

// POST /execute: CLB thực hiện yêu cầu rời CLB
export function executeWithdrawal(clubId: string, requestId: string, csrfToken: string) {
  return request<Membership>(
    `/clubs/${encodeURIComponent(clubId)}/membership-withdrawals/${encodeURIComponent(requestId)}/execute`,
    { method: 'POST', csrfToken },
  )
}
