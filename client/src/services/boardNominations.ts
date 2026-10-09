export interface BoardTerm {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  state: string;
}

export interface BoardPosition {
  id: string;
  code: string;
  name: string;
  unit?: string;
  isLeaderRole: boolean;
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
  presidentConflictMembershipIds: string[];
}

export interface BoardSeat {
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

export interface BoardNomination {
  id: string;
  clubId: string;
  clubName: string;
  clubState: string;
  term: BoardTerm;
  state: string;
  submittedBy: string;
  submittedAt: string;
  task: { id: string; state: string; assigneeId?: string; openedAt: string };
  seats: BoardSeat[];
  decisions: Array<{ id: string; taskId: string; outcome: "Approve" | "Reject";
    reason?: string; confirmedSeatIds: string[]; returnedSeatIds: string[];
    actorId: string; at: string }>;
}

export interface BoardNominationDecisionInput {
  confirmedSeatIds: string[];
  returnedSeats: Array<{ seatId: string; reason: string }>;
  reason?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: T } = await response.json();
  return body.data;
}

function mutation(method: string, csrfToken: string, body?: object): RequestInit {
  return { method, headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    ...(body ? { body: JSON.stringify(body) } : {}) };
}

export function fetchBoardNominationContext(clubId: string,
  signal: AbortSignal): Promise<BoardNominationContext> {
  return request(`/clubs/${encodeURIComponent(clubId)}/board-nomination-context`, { signal });
}

export function submitBoardNomination(clubId: string,
  seats: Array<{ positionId: string; membershipId: string }>, csrfToken: string) {
  return request<BoardNomination>(`/clubs/${encodeURIComponent(clubId)}/board-nominations`,
    mutation("POST", csrfToken, { seats }));
}

export function fetchBoardNominationQueue(signal: AbortSignal) {
  return request<BoardNomination[]>("/admin/board-nominations", { signal });
}

export function fetchBoardNomination(id: string, signal: AbortSignal) {
  return request<BoardNomination>(`/admin/board-nominations/${encodeURIComponent(id)}`, { signal });
}

export function claimBoardNomination(id: string, csrfToken: string) {
  return request<BoardNomination>(`/admin/board-nominations/${encodeURIComponent(id)}/claim`,
    mutation("POST", csrfToken));
}

export function decideBoardNomination(id: string, input: BoardNominationDecisionInput,
  csrfToken: string) {
  return request<BoardNomination>(`/admin/board-nominations/${encodeURIComponent(id)}/decision`,
    mutation("POST", csrfToken, input));
}
