import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'
import {
  PROPERTY_TYPES,
  validatePropertyDetails,
  type PropertyDetails,
  type PropertyInput,
  type PropertyRepository,
} from '../domain/property.js'
import { parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

// ICPDP xem danh sách tài sản (phòng, thiết bị)
export async function listProperties(
  repo: PropertyRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
) {
  await requireIcpdpOfficer(auth, actor)
  return repo.list()
}

// ICPDP tạo tài sản mới theo loại
export async function createProperty(
  repo: PropertyRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  input: PropertyInput,
  now: Date,
) {
  const actorId = await requireIcpdpOfficer(auth, actor)
  if (!PROPERTY_TYPES.includes(input.type)) {
    throw new DomainError('invalid property type', 'validation', { field: 'type' })
  }
  return repo.create(
    { type: input.type, ...validatePropertyDetails(input.type, input) },
    actorId,
    now,
  )
}

// ICPDP cập nhật thông tin một tài sản
export async function updateProperty(
  repo: PropertyRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  details: PropertyDetails,
  now: Date,
) {
  const actorId = await requireIcpdpOfficer(auth, actor)
  const current = await repo.find(parseObjectId(id, 'property id'))
  if (!current) {
    throw new DomainError('property not found', 'not_found')
  }
  return repo.update(current.id, validatePropertyDetails(current.type, details), actorId, now)
}

// ICPDP bật hoặc tắt trạng thái hoạt động của tài sản
export async function setPropertyActive(
  repo: PropertyRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  isActive: boolean,
  now: Date,
) {
  const actorId = await requireIcpdpOfficer(auth, actor)
  return repo.setActive(parseObjectId(id, 'property id'), isActive, actorId, now)
}

// ICPDP xóa tài sản chưa từng được đặt
/** BR41: property từng được booking thì chỉ bị vô hiệu hoá, không bao giờ xoá. */
export async function deleteProperty(
  repo: PropertyRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  const actorId = await requireIcpdpOfficer(auth, actor)
  const current = await repo.find(parseObjectId(id, 'property id'))
  if (!current) {
    throw new DomainError('property not found', 'not_found')
  }
  if (await repo.hasBookings(current.id)) {
    throw new DomainError('property has bookings; deactivate it instead', 'conflict')
  }
  await repo.remove(current.id, actorId, now)
  return { deleted: true as const }
}
