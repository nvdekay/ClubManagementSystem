import { z } from 'zod'
import {
  requireClubPermission,
  resolveClubPermissions,
  type ClubAccessRepository,
  type ClubAccessSnapshot,
  type ClubPermission,
} from '../domain/access.js'
import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'

const mongoId = z.string().regex(/^[0-9a-f]{24}$/i)
const OBJECT_ID = /^[0-9a-f]{24}$/i

export interface AccessActor {
  id: string
  accountState: 'Active' | 'Locked'
  lockReason?: string | null
}

/** True when the value is a 24-hex-digit ObjectId string. */
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID.test(value)
}

/** Validates an ObjectId string; anything else is a validation error `invalid <label>`. */
export function parseObjectId(value: string, label: string): string {
  if (!isObjectId(value)) {
    throw new DomainError(`invalid ${label}`, 'validation')
  }
  return value
}

/**
 * The one ICPDP officer guard: signed in, account Active (a Locked account is refused with its
 * lock reason), a valid id and the ICPDP_OFFICER system role. Returns the officer's id.
 */
export async function requireIcpdpOfficer(
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  deniedMessage = 'ICPDP officer role required',
): Promise<string> {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState !== 'Active') {
    throw new DomainError(actor.lockReason || 'account locked', 'locked')
  }
  if (!isObjectId(actor.id)) {
    throw new DomainError('invalid actor', 'validation')
  }
  if (!(await auth.systemRoleCodes(actor.id)).includes('ICPDP_OFFICER')) {
    throw new DomainError(deniedMessage, 'forbidden')
  }
  return actor.id
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
  const userIdResult = mongoId.safeParse(actor.id)
  const clubIdResult = mongoId.safeParse(clubId)
  if (!userIdResult.success || !clubIdResult.success) {
    throw new DomainError('invalid identifier', 'validation')
  }
  const snapshot = await repo.findSnapshot(userIdResult.data, clubIdResult.data)
  if (!snapshot) {
    throw new DomainError('club access denied', 'forbidden', { requiredPermission: permission })
  }
  requireClubPermission(snapshot, permission, now)
  return snapshot
}

// Cho thành viên hiện tại hoặc founder đã duyệt xem cấu hình CLB
/** Thành viên hiện tại được xem cài đặt; founder đã được duyệt giữ quyền thiết lập. */
export async function assertClubSettingsRead(
  repo: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now = new Date(),
) {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState === 'Locked') {
    throw new DomainError(actor.lockReason || 'account locked', 'locked')
  }
  if (!mongoId.safeParse(actor.id).success || !mongoId.safeParse(clubId).success) {
    throw new DomainError('invalid identifier', 'validation')
  }
  const snapshot = await repo.findSnapshot(actor.id, clubId)
  if (!snapshot || snapshot.clubId !== clubId) {
    throw new DomainError('club access denied', 'forbidden')
  }
  const member = snapshot.membership
  if (
    !(member?.clubId === clubId && ['Active', 'Inactive'].includes(member.state)) &&
    !resolveClubPermissions(snapshot, now).includes('club.profile.manage')
  ) {
    throw new DomainError('club access denied', 'forbidden')
  }
  return snapshot
}
