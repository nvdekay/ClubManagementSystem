import type { AuthRepository } from '../domain/auth.js'
import {
  validateClubFieldInput,
  type ClubFieldInput,
  type ClubFieldRepository,
} from '../domain/club-field.js'
import { DomainError } from '../domain/errors.js'
import type { AccessActor } from './access.js'

const objectId = /^[0-9a-f]{24}$/i

// Kiểm actor là ICPDP officer và trả id
async function officer(
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
): Promise<string> {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState === 'Locked') {
    throw new DomainError(actor.lockReason || 'account locked', 'locked')
  }
  if (!objectId.test(actor.id)) {
    throw new DomainError('invalid actor', 'validation')
  }
  if (!(await auth.systemRoleCodes(actor.id)).includes('ICPDP_OFFICER')) {
    throw new DomainError('ICPDP officer role required', 'forbidden')
  }
  return actor.id
}

// Kiểm định dạng id lĩnh vực CLB
function fieldId(value: string): string {
  if (!objectId.test(value)) {
    throw new DomainError('invalid club field id', 'validation')
  }
  return value
}

// ICPDP xem danh mục lĩnh vực CLB kèm mức độ sử dụng
export async function listClubFieldCatalog(
  repo: ClubFieldRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
) {
  await officer(auth, actor)
  return repo.listWithUsage()
}

// ICPDP thêm một lĩnh vực CLB vào danh mục
export async function createClubField(
  repo: ClubFieldRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  input: ClubFieldInput,
  now: Date,
) {
  return repo.create(validateClubFieldInput(input), await officer(auth, actor), now)
}

// ICPDP sửa một lĩnh vực CLB
export async function updateClubField(
  repo: ClubFieldRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  input: ClubFieldInput,
  now: Date,
) {
  const actorId = await officer(auth, actor)
  return repo.update(fieldId(id), validateClubFieldInput(input), actorId, now)
}

// ICPDP xóa hoặc ẩn một lĩnh vực CLB khỏi danh mục
export async function removeClubField(
  repo: ClubFieldRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  const actorId = await officer(auth, actor)
  return { result: await repo.remove(fieldId(id), actorId, now) }
}
