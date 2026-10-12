export interface TransitionTerm {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  state: string;
}

export interface TransitionCandidate {
  positionCode: string;
  positionName: string;
  membershipId: string;
  userId: string;
  displayName: string;
}

export interface TransitionObligation {
  id: string;
  type: string;
  entityId?: string;
  description: string;
  assigneeMembershipId: string;
}

export interface TransitionBoardRole {
  code: string;
  name: string;
  unit?: string;
  isLeaderRole: boolean;
  isSingleHolder: boolean;
  permissionCodes: string[];
}

export interface TransitionHandover {
  items: Array<{ id: string; description: string }>;
  proposedBoardRoles?: TransitionBoardRole[];
}

export interface TransitionTask {
  id: string;
  state: string;
  assigneeId?: string;
  openedAt: Date;
}

export interface TransitionDecision {
  id: string;
  outcome: "Approve" | "Request revision";
  reason?: string;
  followUpObligationIds: string[];
  actorId: string;
  at: Date;
}

export interface LeadershipTransition {
  id: string;
  clubId: string;
  clubName: string;
  clubState: string;
  fromTerm: TransitionTerm;
  toTerm: TransitionTerm;
  candidates: TransitionCandidate[];
  outstandingObligations: TransitionObligation[];
  handover: TransitionHandover;
  state: string;
  submittedBy: string;
  submittedAt: Date;
  followUpConditions: TransitionObligation[];
  task: TransitionTask;
  decisions: TransitionDecision[];
}

export interface TransitionDecisionInput {
  outcome: "Approve" | "Request revision";
  reason?: string;
  followUpObligationIds: string[];
}

export interface LeadershipTransitionRepository {
  listOpen(): Promise<LeadershipTransition[]>;
  find(planId: string): Promise<LeadershipTransition | null>;
  claim(planId: string, officerId: string, now: Date): Promise<LeadershipTransition>;
  decide(planId: string, officerId: string, input: TransitionDecisionInput,
    now: Date): Promise<LeadershipTransition>;
}
