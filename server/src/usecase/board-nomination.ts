import type { AuthRepository } from "../domain/auth.js";
import type {
  BoardNominationDecisionInput,
  BoardNominationRepository,
  BoardNominationSeatInput,
} from "../domain/board-nomination.js";
import { DomainError } from "../domain/errors.js";
import type { ClubAccessRepository } from "../domain/access.js";
import { assertClubAccess, type AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function validId(value: string): string {
  if (!objectId.test(value)) throw new DomainError("invalid identifier", "validation");
  return value;
}

async function officer(auth: AuthRepository, actor: AccessActor | null): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  const id = validId(actor.id);
  if (!(await auth.systemRoleCodes(id)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return id;
}

export async function getBoardNominationContext(repo: BoardNominationRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.board.nominate", now);
  const context = await repo.getContext(validId(clubId));
  if (!context) throw new DomainError("club not found", "not_found");
  return context;
}

export async function submitBoardNomination(repo: BoardNominationRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string,
  seats: readonly BoardNominationSeatInput[], now: Date) {
  await assertClubAccess(access, actor, clubId, "club.board.nominate", now);
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  const validClubId = validId(clubId);
  validId(actor.id);
  if (!seats.length || seats.length > 30) {
    throw new DomainError("at least one board seat is required", "validation");
  }
  const context = await repo.getContext(validClubId);
  if (!context?.term || context.term.state !== "Active"
    || context.term.startAt > now || context.term.endAt <= now
    || !["Pending Setup", "Active"].includes(context.clubState)) {
    throw new DomainError("club has no eligible active term", "conflict");
  }
  if (new Set(seats.map((seat) => seat.positionId)).size !== seats.length) {
    throw new DomainError("duplicate board position", "validation");
  }
  const positions = new Map(context.positions.map((position) => [position.id, position]));
  const candidates = new Map(context.candidates.filter((candidate) => candidate.state === "Active")
    .map((candidate) => [candidate.membershipId, candidate]));
  for (const seat of seats) {
    const positionId = validId(seat.positionId);
    const membershipId = validId(seat.membershipId);
    const position = positions.get(positionId);
    if (!position) throw new DomainError("position is not an active board seat", "validation");
    if (context.occupiedPositionIds.includes(positionId)
      || context.pendingPositionIds.includes(positionId)) {
      throw new DomainError("board position is already occupied or pending", "conflict");
    }
    if (!candidates.has(membershipId)) {
      throw new DomainError("nominee must have an active membership in this club", "validation");
    }
    if (position.isLeaderRole && context.presidentConflictMembershipIds.includes(membershipId)) {
      throw new DomainError("nominee has an overlapping president term", "conflict");
    }
  }
  return repo.submit(validClubId, actor.id, context.term.id,
    seats.map((seat) => ({ positionId: seat.positionId, membershipId: seat.membershipId })), now);
}

export async function listBoardNominations(repo: BoardNominationRepository,
  auth: AuthRepository, actor: AccessActor | null) {
  await officer(auth, actor);
  return repo.listOpen();
}

export async function getBoardNomination(repo: BoardNominationRepository,
  auth: AuthRepository, actor: AccessActor | null, nominationId: string) {
  await officer(auth, actor);
  const detail = await repo.find(validId(nominationId));
  if (!detail) throw new DomainError("board nomination not found", "not_found");
  return detail;
}

export async function claimBoardNomination(repo: BoardNominationRepository,
  auth: AuthRepository, actor: AccessActor | null, nominationId: string, now: Date) {
  return repo.claim(validId(nominationId), await officer(auth, actor), now);
}

function normalizeDecision(input: BoardNominationDecisionInput,
  detailSeatIds: readonly string[]) {
  const confirmedSeatIds = [...new Set(input.confirmedSeatIds.map(validId))];
  const returnedSeats = input.returnedSeats.map((seat) => ({
    seatId: validId(seat.seatId), reason: seat.reason.trim(),
  }));
  const returnedSeatIds = returnedSeats.map((seat) => seat.seatId);
  if (new Set(returnedSeatIds).size !== returnedSeatIds.length
    || confirmedSeatIds.some((id) => returnedSeatIds.includes(id))) {
    throw new DomainError("a seat must have exactly one decision", "validation");
  }
  if (returnedSeats.some((seat) => !seat.reason || seat.reason.length > 5_000)) {
    throw new DomainError("a reason is required for every returned seat", "validation");
  }
  const allSeatIds = new Set(detailSeatIds);
  if (confirmedSeatIds.some((id) => !allSeatIds.has(id))
    || returnedSeatIds.some((id) => !allSeatIds.has(id))
    || new Set([...confirmedSeatIds, ...returnedSeatIds]).size !== allSeatIds.size
    || [...allSeatIds].some((id) => !confirmedSeatIds.includes(id) && !returnedSeatIds.includes(id))) {
    throw new DomainError("every nominated seat must receive one decision", "validation");
  }
  const reason = input.reason?.trim();
  if (!confirmedSeatIds.length && !reason) {
    throw new DomainError("a reason is required when returning all seats", "validation");
  }
  if (reason && reason.length > 5_000) throw new DomainError("decision reason is too long", "validation");
  return { confirmedSeatIds, returnedSeats, reason };
}

export async function decideBoardNomination(repo: BoardNominationRepository,
  auth: AuthRepository, actor: AccessActor | null, nominationId: string,
  input: BoardNominationDecisionInput, now: Date) {
  const officerId = await officer(auth, actor);
  const detail = await repo.find(validId(nominationId));
  if (!detail) throw new DomainError("board nomination not found", "not_found");
  if (detail.task.state !== "Open" || !detail.task.assigneeId
    || detail.task.assigneeId !== officerId) {
    throw new DomainError("board nomination must be claimed before deciding", "conflict");
  }
  const pending = detail.seats.filter((seat) => seat.state === "Pending Confirmation");
  const normalized = normalizeDecision(input, pending.map((seat) => seat.id));
  return repo.decide(validId(nominationId), officerId, normalized, now);
}
