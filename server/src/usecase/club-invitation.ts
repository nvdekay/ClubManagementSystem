import type { ClubAccessRepository } from '../domain/access.js'
import {
  normalizeInvitationResponse,
  type ClubInvitationRepository,
  type InvitationResponse,
} from '../domain/club-invitation.js'
import { assertClubAccess, parseObjectId, type AccessActor } from './access.js'

// CLB xem các lời mời tham gia sự kiện trường gửi tới
export async function listClubInvitations(
  repo: ClubInvitationRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.event.manage', now)
  return repo.list(clubId)
}

// CLB chấp nhận hoặc từ chối một lời mời sự kiện trường
export async function respondToClubInvitation(
  repo: ClubInvitationRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  id: string,
  input: InvitationResponse,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.event.manage', now)
  parseObjectId(id, 'invitation id')
  return repo.respond(clubId, id, normalizeInvitationResponse(input), actor!.id, now)
}
