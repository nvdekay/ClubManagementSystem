export type MembershipState = "Active" | "Inactive" | "Left" | "Banned";
export type WithdrawalRequestState = "Pending" | "Held" | "Executed" | "Cancelled";

export interface MembershipStatusChange {
  fromState: MembershipState;
  toState: MembershipState;
  effectiveDate: Date;
  reason?: string;
  actorId: string;
  at: Date;
}

export interface ClubMembershipRecord {
  id: string;
  clubId: string;
  clubName?: string;
  userId: string;
  displayName?: string;
  state: MembershipState;
  joinedAt: Date;
  leftAt?: Date;
  departmentId?: string;
  defaultRole?: string;
  sourceApplicationId?: string;
  banReason?: string;
  statusHistory: MembershipStatusChange[];
  pendingWithdrawal?: MembershipWithdrawalRequest;
}

export interface MembershipWithdrawalRequest {
  id: string;
  membershipId: string;
  clubId: string;
  clubName?: string;
  userId: string;
  memberName?: string;
  reason: string;
  requestedEffectiveDate: Date;
  state: WithdrawalRequestState;
  createdAt: Date;
  executedBy?: string;
  executedAt?: Date;
}

export interface MembershipRepository {
  listMine(userId: string): Promise<ClubMembershipRecord[]>;
  listClub(clubId: string): Promise<ClubMembershipRecord[]>;
  changeState(input: { clubId: string; membershipId: string; actorId: string;
    state: "Active" | "Inactive" | "Banned"; effectiveDate: Date;
    reason?: string; now: Date }): Promise<ClubMembershipRecord>;
  requestWithdrawal(input: { membershipId: string; userId: string; reason: string;
    requestedEffectiveDate: Date; now: Date }): Promise<MembershipWithdrawalRequest>;
  listMyWithdrawalRequests(userId: string): Promise<MembershipWithdrawalRequest[]>;
  listClubWithdrawalRequests(clubId: string): Promise<MembershipWithdrawalRequest[]>;
  executeWithdrawal(input: { clubId: string; requestId: string; actorId: string;
    now: Date }): Promise<ClubMembershipRecord>;
}

export function isBeforeToday(value: Date, now: Date): boolean {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  });
  return formatter.format(value) < formatter.format(now);
}
