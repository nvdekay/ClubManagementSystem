export interface BoardTerm {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  state: string;
}

export interface BoardPosition {
  id: string;
  code: string;
  name: string;
  unit?: string;
  isLeaderRole: boolean;
  /** Ghế nhiều người giữ (vd Phó chủ nhiệm) vẫn còn mở sau khi một người đã được xác nhận hoặc đang chờ. */
  isSingleHolder: boolean;
}

export interface BoardCandidate {
  membershipId: string;
  userId: string;
  displayName: string;
  state: string;
}

export interface BoardNominationContext {
  clubId: string;
  clubName: string;
  clubState: string;
  term: BoardTerm | null;
  positions: BoardPosition[];
  candidates: BoardCandidate[];
  occupiedPositionIds: string[];
  pendingPositionIds: string[];
  /** Thành viên đã giữ hoặc đang chờ một ghế ban điều hành trong nhiệm kỳ: mỗi người chỉ giữ một ghế. */
  seatedMembershipIds: string[];
  presidentConflictMembershipIds: string[];
}

export interface BoardNominationSeatInput {
  positionId: string;
  membershipId: string;
}

export interface BoardNominationSeat {
  id: string;
  positionId: string;
  positionCode: string;
  positionName: string;
  isLeaderRole: boolean;
  membershipId: string;
  userId: string;
  displayName: string;
  state: "Pending Confirmation" | "Confirmed" | "Returned";
  reason?: string;
}

export interface BoardNominationTask {
  id: string;
  state: string;
  assigneeId?: string;
  openedAt: Date;
}

export interface BoardNominationDecision {
  id: string;
  taskId: string;
  outcome: "Approve" | "Reject";
  reason?: string;
  confirmedSeatIds: string[];
  returnedSeatIds: string[];
  actorId: string;
  at: Date;
}

export interface BoardNominationSummary {
  id: string;
  clubId: string;
  clubName: string;
  term: BoardTerm;
  state: string;
  submittedBy: string;
  submittedAt: Date;
  task: BoardNominationTask;
  seats: BoardNominationSeat[];
}

export interface BoardNominationDetail extends BoardNominationSummary {
  clubState: string;
  decisions: BoardNominationDecision[];
}

export interface BoardNominationDecisionInput {
  confirmedSeatIds: string[];
  returnedSeats: Array<{ seatId: string; reason: string }>;
  reason?: string;
}

export interface BoardNominationRepository {
  getContext(clubId: string): Promise<BoardNominationContext | null>;
  submit(clubId: string, actorId: string, termId: string,
    seats: readonly BoardNominationSeatInput[], now: Date): Promise<BoardNominationDetail>;
  listOpen(): Promise<BoardNominationSummary[]>;
  /** Các đề cử gần nhất của một CLB, mới nhất trước, để CLB xem trạng thái và lý do trả lại. */
  listForClub(clubId: string): Promise<BoardNominationDetail[]>;
  find(nominationId: string): Promise<BoardNominationDetail | null>;
  claim(nominationId: string, officerId: string, now: Date): Promise<BoardNominationDetail>;
  decide(nominationId: string, officerId: string, input: BoardNominationDecisionInput,
    now: Date): Promise<BoardNominationDetail>;
}
