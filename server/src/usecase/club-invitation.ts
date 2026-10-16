import type { ClubAccessRepository } from "../domain/access.js";
import { normalizeInvitationResponse, type ClubInvitationRepository, type InvitationResponse } from "../domain/club-invitation.js";
import { DomainError } from "../domain/errors.js";
import { assertClubAccess, type AccessActor } from "./access.js";

export async function listClubInvitations(repo: ClubInvitationRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.event.manage", now);
  return repo.list(clubId);
}

export async function respondToClubInvitation(repo: ClubInvitationRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, id: string, input: InvitationResponse, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.event.manage", now);
  if (!/^[0-9a-f]{24}$/i.test(id)) throw new DomainError("invalid invitation id", "validation");
  return repo.respond(clubId, id, normalizeInvitationResponse(input), actor!.id, now);
}
