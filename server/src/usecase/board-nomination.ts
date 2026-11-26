import type { AuthRepository } from '../domain/auth.js'
import type {
  BoardNominationDecisionInput,
  BoardNominationRepository,
  BoardNominationSeatInput,
} from '../domain/board-nomination.js'
import { DomainError } from '../domain/errors.js'
import type { ClubAccessRepository } from '../domain/access.js'
import { assertClubAccess, parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

// Lấy ngữ cảnh đề cử ban chủ nhiệm (vị trí, ứng viên) của CLB
export async function getBoardNominationContext(
  repo: BoardNominationRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.board.nominate', now)
  const context = await repo.getContext(parseObjectId(clubId, 'identifier'))
  if (!context) {
    throw new DomainError('club not found', 'not_found')
  }
  return context
}

// CLB gửi đề cử các ghế ban chủ nhiệm sau khi kiểm ràng buộc
export async function submitBoardNomination(
  repo: BoardNominationRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  seats: readonly BoardNominationSeatInput[],
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.board.nominate', now)
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  const validClubId = parseObjectId(clubId, 'identifier')
  parseObjectId(actor.id, 'identifier')
  if (!seats.length || seats.length > 30) {
    throw new DomainError('at least one board seat is required', 'validation')
  }
  const context = await repo.getContext(validClubId)
  if (
    !context?.term ||
    context.term.state !== 'Active' ||
    context.term.startAt > now ||
    context.term.endAt <= now ||
    !['Pending Setup', 'Active'].includes(context.clubState)
  ) {
    throw new DomainError('club has no eligible active term', 'conflict')
  }
  if (new Set(seats.map((seat) => seat.positionId)).size !== seats.length) {
    throw new DomainError('duplicate board position', 'validation')
  }
  if (new Set(seats.map((seat) => seat.membershipId)).size !== seats.length) {
    throw new DomainError('one member cannot be nominated for two board seats', 'validation')
  }
  const positions = new Map(context.positions.map((position) => [position.id, position]))
  const candidates = new Map(
    context.candidates
      .filter((candidate) => candidate.state === 'Active')
      .map((candidate) => [candidate.membershipId, candidate]),
  )
  for (const seat of seats) {
    const positionId = parseObjectId(seat.positionId, 'identifier')
    const membershipId = parseObjectId(seat.membershipId, 'identifier')
    const position = positions.get(positionId)
    if (!position) {
      throw new DomainError('position is not an active board seat', 'validation')
    }
    if (
      position.isSingleHolder &&
      (context.occupiedPositionIds.includes(positionId) ||
        context.pendingPositionIds.includes(positionId))
    ) {
      throw new DomainError('board position is already occupied or pending', 'conflict')
    }
    if (context.seatedMembershipIds.includes(membershipId)) {
      throw new DomainError('nominee already holds or is pending for a board seat', 'conflict')
    }
    if (!candidates.has(membershipId)) {
      throw new DomainError('nominee must have an active membership in this club', 'validation')
    }
    if (position.isLeaderRole && context.presidentConflictMembershipIds.includes(membershipId)) {
      throw new DomainError('nominee has an overlapping president term', 'conflict')
    }
  }
  return repo.submit(
    validClubId,
    actor.id,
    context.term.id,
    seats.map((seat) => ({ positionId: seat.positionId, membershipId: seat.membershipId })),
    now,
  )
}

// Liệt kê các đề cử ban chủ nhiệm của một CLB
export async function listClubBoardNominations(
  repo: BoardNominationRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.board.nominate', now)
  return repo.listForClub(parseObjectId(clubId, 'identifier'))
}

// ICPDP xem các đề cử ban chủ nhiệm đang mở
export async function listBoardNominations(
  repo: BoardNominationRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
) {
  await requireIcpdpOfficer(auth, actor)
  return repo.listOpen()
}

// ICPDP xem chi tiết một đề cử ban chủ nhiệm
export async function getBoardNomination(
  repo: BoardNominationRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  nominationId: string,
) {
  await requireIcpdpOfficer(auth, actor)
  const detail = await repo.find(parseObjectId(nominationId, 'identifier'))
  if (!detail) {
    throw new DomainError('board nomination not found', 'not_found')
  }
  return detail
}

// ICPDP officer nhận xử lý một đề cử
export async function claimBoardNomination(
  repo: BoardNominationRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  nominationId: string,
  now: Date,
) {
  return repo.claim(
    parseObjectId(nominationId, 'identifier'),
    await requireIcpdpOfficer(auth, actor),
    now,
  )
}

// Chuẩn hóa và kiểm quyết định xác nhận hoặc trả lại từng ghế
function normalizeDecision(input: BoardNominationDecisionInput, detailSeatIds: readonly string[]) {
  const confirmedSeatIds = [
    ...new Set(input.confirmedSeatIds.map((seatId) => parseObjectId(seatId, 'identifier'))),
  ]
  const returnedSeats = input.returnedSeats.map((seat) => ({
    seatId: parseObjectId(seat.seatId, 'identifier'),
    reason: seat.reason.trim(),
  }))
  const returnedSeatIds = returnedSeats.map((seat) => seat.seatId)
  if (
    new Set(returnedSeatIds).size !== returnedSeatIds.length ||
    confirmedSeatIds.some((id) => returnedSeatIds.includes(id))
  ) {
    throw new DomainError('a seat must have exactly one decision', 'validation')
  }
  if (returnedSeats.some((seat) => !seat.reason || seat.reason.length > 5_000)) {
    throw new DomainError('a reason is required for every returned seat', 'validation')
  }
  const allSeatIds = new Set(detailSeatIds)
  if (
    confirmedSeatIds.some((id) => !allSeatIds.has(id)) ||
    returnedSeatIds.some((id) => !allSeatIds.has(id)) ||
    new Set([...confirmedSeatIds, ...returnedSeatIds]).size !== allSeatIds.size ||
    [...allSeatIds].some((id) => !confirmedSeatIds.includes(id) && !returnedSeatIds.includes(id))
  ) {
    throw new DomainError('every nominated seat must receive one decision', 'validation')
  }
  const reason = input.reason?.trim()
  if (!confirmedSeatIds.length && !reason) {
    throw new DomainError('a reason is required when returning all seats', 'validation')
  }
  if (reason && reason.length > 5_000) {
    throw new DomainError('decision reason is too long', 'validation')
  }
  return { confirmedSeatIds, returnedSeats, reason }
}

// ICPDP ghi quyết định xác nhận hoặc trả lại từng ghế ban chủ nhiệm
export async function decideBoardNomination(
  repo: BoardNominationRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  nominationId: string,
  input: BoardNominationDecisionInput,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  const detail = await repo.find(parseObjectId(nominationId, 'identifier'))
  if (!detail) {
    throw new DomainError('board nomination not found', 'not_found')
  }
  if (
    detail.task.state !== 'Open' ||
    !detail.task.assigneeId ||
    detail.task.assigneeId !== officerId
  ) {
    throw new DomainError('board nomination must be claimed before deciding', 'conflict')
  }
  const pending = detail.seats.filter((seat) => seat.state === 'Pending Confirmation')
  const normalized = normalizeDecision(
    input,
    pending.map((seat) => seat.id),
  )
  return repo.decide(parseObjectId(nominationId, 'identifier'), officerId, normalized, now)
}
