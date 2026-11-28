import {
  requireClubPermission,
  resolveClubPermissions,
  type ClubAccessRepository,
} from '../domain/access.js'
import type { AuthRepository, AuthUser } from '../domain/auth.js'
import type {
  ClubBoardHistory,
  DashboardRepository,
  DashboardSnapshot,
} from '../domain/dashboard.js'
import { DomainError, orNotFound } from '../domain/errors.js'
import { parseObjectId } from './access.js'

export type DashboardContext =
  { workspace: 'student' } | { workspace: 'icpdp' } | { workspace: 'club'; clubId: string }

// Kiểm người dùng đã đăng nhập và chưa bị khóa
function assertActor(actor: AuthUser | null): asserts actor is AuthUser {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState === 'Locked') {
    throw new DomainError(actor.lockReason || 'account locked', 'locked')
  }
}

// Lấy dashboard theo workspace student, ICPDP hoặc CLB sau khi kiểm quyền
export async function getDashboard(
  repo: DashboardRepository,
  authRepo: AuthRepository,
  accessRepo: ClubAccessRepository,
  actor: AuthUser | null,
  context: DashboardContext,
  now: Date = new Date(),
): Promise<DashboardSnapshot> {
  assertActor(actor)
  if (context.workspace === 'student') {
    return repo.student(actor.id, now)
  }
  if (context.workspace === 'icpdp') {
    const roles = await authRepo.systemRoleCodes(actor.id)
    if (!roles.includes('ICPDP_OFFICER')) {
      throw new DomainError('ICPDP role required', 'forbidden')
    }
    return repo.icpdp(now)
  }
  parseObjectId(context.clubId, 'club identifier')
  const snapshot = await accessRepo.findSnapshot(actor.id, context.clubId)
  const activeMember =
    snapshot?.clubId === context.clubId &&
    snapshot.membership?.clubId === context.clubId &&
    snapshot.membership.state === 'Active'
  const pendingFounder =
    snapshot?.clubId === context.clubId &&
    snapshot.clubState === 'Pending Setup' &&
    snapshot.isApprovedFounder
  if (!snapshot || (!activeMember && !pendingFounder)) {
    throw new DomainError('club access denied', 'forbidden')
  }
  return repo.club(context.clubId, resolveClubPermissions(snapshot, now), now)
}

// Kiểm người dùng có role ICPDP officer
async function isOfficer(
  authRepo: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AuthUser,
): Promise<boolean> {
  return (await authRepo.systemRoleCodes(actor.id)).includes('ICPDP_OFFICER')
}

// Yêu cầu người dùng đã đăng nhập và là ICPDP officer
export async function getClubBoardHistory(
  repo: DashboardRepository,
  authRepo: Pick<AuthRepository, 'systemRoleCodes'>,
  accessRepo: ClubAccessRepository,
  actor: AuthUser | null,
  clubId: string,
  now: Date = new Date(),
): Promise<ClubBoardHistory> {
  assertActor(actor)
  parseObjectId(clubId, 'club identifier')
  if (!(await isOfficer(authRepo, actor))) {
    const snapshot = await accessRepo.findSnapshot(actor.id, clubId)
    if (!snapshot || snapshot.clubId !== clubId) {
      throw new DomainError('club access denied', 'forbidden')
    }
    requireClubPermission(snapshot, 'club.board.nominate', now)
  }
  const history = orNotFound(await repo.boardHistory(clubId), 'club')
  return history
}
