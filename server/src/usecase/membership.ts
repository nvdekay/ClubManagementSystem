import { DomainError } from "../domain/errors.js";
import { isBeforeToday, type MembershipRepository, type MembershipState } from "../domain/membership.js";
import type { ClubAccessRepository } from "../domain/access.js";
import { assertClubAccess, type AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function actorId(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState !== "Active") throw new DomainError("account is not active", "locked");
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

function validId(value: string, name: string) {
  if (!objectId.test(value)) throw new DomainError(`invalid ${name}`, "validation");
  return value;
}

async function authorize(access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, now: Date) {
  const userId = actorId(actor);
  validId(clubId, "club id");
  await assertClubAccess(access, actor, clubId, "club.member.manage", now);
  return userId;
}

export async function listMyMemberships(repo: MembershipRepository, actor: AccessActor | null) {
  return repo.listMine(actorId(actor));
}

export async function listClubMemberships(repo: MembershipRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, now = new Date()) {
  await authorize(access, actor, clubId, now);
  return repo.listClub(clubId);
}

export async function changeMembershipState(repo: MembershipRepository,
  access: ClubAccessRepository, actor: AccessActor | null, input: {
    clubId: string; membershipId: string; state: "Active" | "Inactive" | "Banned";
    effectiveDate: Date; reason?: string;
  }, now = new Date()) {
  const id = await authorize(access, actor, input.clubId, now);
  validId(input.membershipId, "membership id");
  if (Number.isNaN(input.effectiveDate.getTime()) || isBeforeToday(input.effectiveDate, now)
    || input.effectiveDate > now) {
    throw new DomainError("effective date must be today", "validation");
  }
  const reason = input.reason?.trim();
  if (input.state === "Banned" && !reason) {
    throw new DomainError("ban reason is required", "validation");
  }
  if (reason && reason.length > 2000) throw new DomainError("reason is too long", "validation");
  return repo.changeState({ ...input, ...(reason ? { reason } : {}), actorId: id, now });
}

export async function requestMembershipWithdrawal(repo: MembershipRepository,
  actor: AccessActor | null, input: { membershipId: string; reason: string; requestedEffectiveDate: Date },
  now = new Date()) {
  const userId = actorId(actor);
  validId(input.membershipId, "membership id");
  const reason = input.reason.trim();
  if (!reason || reason.length > 2000 || Number.isNaN(input.requestedEffectiveDate.getTime())
    || isBeforeToday(input.requestedEffectiveDate, now)) {
    throw new DomainError("invalid membership withdrawal request", "validation");
  }
  return repo.requestWithdrawal({ membershipId: input.membershipId, userId, reason,
    requestedEffectiveDate: input.requestedEffectiveDate, now });
}

export async function listMyMembershipWithdrawalRequests(repo: MembershipRepository,
  actor: AccessActor | null) {
  return repo.listMyWithdrawalRequests(actorId(actor));
}

export async function listClubMembershipWithdrawalRequests(repo: MembershipRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, now = new Date()) {
  await authorize(access, actor, clubId, now);
  return repo.listClubWithdrawalRequests(clubId);
}

export async function executeMembershipWithdrawal(repo: MembershipRepository,
  access: ClubAccessRepository, actor: AccessActor | null,
  input: { clubId: string; requestId: string }, now = new Date()) {
  const id = await authorize(access, actor, input.clubId, now);
  validId(input.requestId, "withdrawal request id");
  return repo.executeWithdrawal({ clubId: input.clubId, requestId: input.requestId,
    actorId: id, now });
}

export function canRequestWithdrawal(state: MembershipState): boolean {
  return state === "Active" || state === "Inactive";
}
