import type { EventRegistrationState } from "./event-registration.js";
import type { MembershipState, MembershipWithdrawalRequest } from "./membership.js";

/** UC24: read-only view of one club for one of its members. */
export interface MemberSpace {
  club: { id: string; name: string; logoUrl?: string; state: string };
  membership: { id: string; state: MembershipState; joinedAt: Date; positions: string[];
    pendingWithdrawal?: MembershipWithdrawalRequest };
  /** Names and positions only — member contact details are not shared (BR49). */
  members: Array<{ displayName: string; state: MembershipState; positions: string[] }>;
  board: Array<{ positionName: string; memberName: string }>;
  upcomingEvents: Array<{ id: string; title: string; startAt: Date; endAt: Date; venueText?: string;
    registrationState: EventRegistrationState | null }>;
  attendance: Array<{ eventId: string; eventTitle: string; checkedInAt: Date; eventEndAt: Date;
    feedbackSubmitted: boolean }>;
  otherClubs: Array<{ clubId: string; clubName: string; state: MembershipState }>;
}

export interface MemberSpaceRepository {
  /** null when the user has no membership record in the club at all. */
  find(userId: string, clubId: string, now: Date): Promise<MemberSpace | null>;
}

export function canUseMemberSpace(state: MembershipState): boolean {
  return state === "Active" || state === "Inactive";
}
