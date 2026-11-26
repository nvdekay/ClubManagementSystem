import type { AuthRepository } from '../domain/auth.js'
import {
  validateClubFieldInput,
  type ClubFieldInput,
  type ClubFieldRepository,
} from '../domain/club-field.js'
import { parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

// ICPDP xem danh mục lĩnh vực CLB kèm mức độ sử dụng
export async function listClubFieldCatalog(
  repo: ClubFieldRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
) {
  await requireIcpdpOfficer(auth, actor)
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
  return repo.create(validateClubFieldInput(input), await requireIcpdpOfficer(auth, actor), now)
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
  const actorId = await requireIcpdpOfficer(auth, actor)
  return repo.update(
    parseObjectId(id, 'club field id'),
    validateClubFieldInput(input),
    actorId,
    now,
  )
}

// ICPDP xóa hoặc ẩn một lĩnh vực CLB khỏi danh mục
export async function removeClubField(
  repo: ClubFieldRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  const actorId = await requireIcpdpOfficer(auth, actor)
  return { result: await repo.remove(parseObjectId(id, 'club field id'), actorId, now) }
}
