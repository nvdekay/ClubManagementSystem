import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
export interface BoardTerm {
  id: string
  name: string
  startAt: string
  endAt: string
  state: string
}

export interface BoardPosition {
  id: string
  code: string
  name: string
  unit?: string
  isLeaderRole: boolean
  isSingleHolder: boolean
}

export interface BoardCandidate {
  membershipId: string
  userId: string
  displayName: string
  state: string
}

export interface BoardNominationContext {
  clubId: string
  clubName: string
  clubState: string
  term: BoardTerm | null
  positions: BoardPosition[]
  candidates: BoardCandidate[]
  occupiedPositionIds: string[]
  pendingPositionIds: string[]
  seatedMembershipIds: string[]
  presidentConflictMembershipIds: string[]
}

export interface BoardSeat {
  id: string
  positionId: string
  positionCode: string
  positionName: string
  isLeaderRole: boolean
  membershipId: string
  userId: string
  displayName: string
  state: 'Pending Confirmation' | 'Confirmed' | 'Returned'
  reason?: string
}

export interface BoardNomination {
  id: string
  clubId: string
  clubName: string
  clubState: string
  term: BoardTerm
  state: string
  submittedBy: string
  submittedAt: string
  task: { id: string; state: string; assigneeId?: string; openedAt: string }
  seats: BoardSeat[]
  decisions: Array<{
    id: string
    taskId: string
    outcome: 'Approve' | 'Reject'
    reason?: string
    confirmedSeatIds: string[]
    returnedSeatIds: string[]
    actorId: string
    at: string
  }>
}

export interface BoardNominationDecisionInput {
  confirmedSeatIds: string[]
  returnedSeats: Array<{ seatId: string; reason: string }>
  reason?: string
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1${path}`, options)
}

// GET ngữ cảnh đề cử ban chủ nhiệm của CLB
export function fetchBoardNominationContext(
  clubId: string,
  signal: AbortSignal,
): Promise<BoardNominationContext> {
  return request(`/clubs/${encodeURIComponent(clubId)}/board-nomination-context`, { signal })
}

// GET các đề cử ban chủ nhiệm của CLB
export function fetchClubBoardNominations(clubId: string, signal: AbortSignal) {
  return request<BoardNomination[]>(`/clubs/${encodeURIComponent(clubId)}/board-nominations`, {
    signal,
  })
}

// POST nộp đề cử ban chủ nhiệm mới của CLB
export function submitBoardNomination(
  clubId: string,
  seats: Array<{ positionId: string; membershipId: string }>,
  csrfToken: string,
) {
  return request<BoardNomination>(`/clubs/${encodeURIComponent(clubId)}/board-nominations`, {
    method: 'POST',
    csrfToken,
    body: { seats },
  })
}

// GET hàng đợi đề cử ban chủ nhiệm cho ICPDP
export function fetchBoardNominationQueue(signal: AbortSignal) {
  return request<BoardNomination[]>('/admin/board-nominations', { signal })
}

// GET chi tiết một đề cử ban chủ nhiệm
export function fetchBoardNomination(id: string, signal: AbortSignal) {
  return request<BoardNomination>(`/admin/board-nominations/${encodeURIComponent(id)}`, { signal })
}

// POST /claim: ICPDP nhận xử lý đề cử
export function claimBoardNomination(id: string, csrfToken: string) {
  return request<BoardNomination>(`/admin/board-nominations/${encodeURIComponent(id)}/claim`, {
    method: 'POST',
    csrfToken,
  })
}

// POST /decision: ICPDP ghi quyết định đề cử
export function decideBoardNomination(
  id: string,
  input: BoardNominationDecisionInput,
  csrfToken: string,
) {
  return request<BoardNomination>(`/admin/board-nominations/${encodeURIComponent(id)}/decision`, {
    method: 'POST',
    csrfToken,
    body: input,
  })
}
