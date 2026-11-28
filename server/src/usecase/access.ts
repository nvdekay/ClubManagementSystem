import { isObjectId } from '../domain/access-denial.js'
import {
  requireClubPermission,
  type ClubAccessRepository,
  type ClubAccessSnapshot,
  type ClubPermission,
} from '../domain/access.js'
import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'

export { isObjectId }

export interface AccessActor {
  id: string
  accountState: 'Active' | 'Locked'
  lockReason?: string | null
}

/** Validates an ObjectId string; anything else is a validation error `invalid <label>`. */
export function parseObjectId(value: string, label: string): string {
  if (!isObjectId(value)) {
    throw new DomainError(`invalid ${label}`, 'validation')
  }
  return value
}

/**
 * Signed in, account Active (a Locked account is refused with its lock reason) and a valid id.
 * Returns the actor's id.
 */
export function requireSignedIn(actor: AccessActor | null): string {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState !== 'Active') {
    throw new DomainError(actor.lockReason || 'account locked', 'locked')
  }
  if (!isObjectId(actor.id)) {
    throw new DomainError('invalid actor', 'validation')
  }
  return actor.id
}

/**
 * The one ICPDP officer guard: {@link requireSignedIn} plus the ICPDP_OFFICER system role.
 * Returns the officer's id.
 */
export async function requireIcpdpOfficer(
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  deniedMessage = 'ICPDP officer role required',
): Promise<string> {
  const id = requireSignedIn(actor)
  if (!(await auth.systemRoleCodes(id)).includes('ICPDP_OFFICER')) {
    throw new DomainError(deniedMessage, 'forbidden')
  }
  return id
}

// Kiểm actor đăng nhập, chưa bị khóa và có permission yêu cầu trong CLB
export async function assertClubAccess(
  repo: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  permission: ClubPermission,
  now: Date = new Date(),
): Promise<ClubAccessSnapshot> {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState === 'Locked') {
    throw new DomainError(actor.lockReason || 'account locked', 'locked')
  }
  if (!isObjectId(actor.id) || !isObjectId(clubId)) {
    throw new DomainError('invalid identifier', 'validation')
  }
  const snapshot = await repo.findSnapshot(actor.id, clubId)
  if (!snapshot) {
    throw new DomainError('club access denied', 'forbidden', { requiredPermission: permission })
  }
  requireClubPermission(snapshot, permission, now)
  return snapshot
}

// Có clubId thì kiểm permission trong CLB, không có thì yêu cầu ICPDP officer
export async function assertClubOrOfficer(
  deps: { access: ClubAccessRepository; auth: Pick<AuthRepository, 'systemRoleCodes'> },
  actor: AccessActor | null,
  clubId: string | null | undefined,
  permission: ClubPermission,
  now: Date,
): Promise<void> {
  if (clubId) {
    await assertClubAccess(deps.access, actor, clubId, permission, now)
  } else {
    await requireIcpdpOfficer(deps.auth, actor)
  }
}
