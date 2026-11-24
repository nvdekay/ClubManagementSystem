import type { EventRegistrationState } from './event-registration.js'
import type { MembershipState, MembershipWithdrawalRequest } from './membership.js'

/** UC24: góc nhìn chỉ đọc về một CLB dành cho một thành viên của CLB đó. */
export interface MemberSpace {
  club: { id: string; name: string; logoUrl?: string; state: string }
  membership: {
    id: string
    state: MembershipState
    joinedAt: Date
    positions: string[]
    pendingWithdrawal?: MembershipWithdrawalRequest
  }
  /** Chỉ gồm tên và vị trí — thông tin liên hệ của thành viên không được chia sẻ (BR49). */
  members: Array<{ displayName: string; state: MembershipState; positions: string[] }>
  board: Array<{ positionName: string; memberName: string }>
  upcomingEvents: Array<{
    id: string
    title: string
    startAt: Date
    endAt: Date
    venueText?: string
    registrationState: EventRegistrationState | null
  }>
  attendance: Array<{
    eventId: string
    eventTitle: string
    checkedInAt: Date
    eventEndAt: Date
    feedbackSubmitted: boolean
  }>
  otherClubs: Array<{ clubId: string; clubName: string; state: MembershipState }>
}

export interface MemberSpaceRepository {
  /** null khi người dùng hoàn toàn không có bản ghi membership trong CLB. */
  find(userId: string, clubId: string, now: Date): Promise<MemberSpace | null>
}

// Kiểm tra trạng thái membership có được dùng không gian thành viên không
export function canUseMemberSpace(state: MembershipState): boolean {
  return state === 'Active' || state === 'Inactive'
}
