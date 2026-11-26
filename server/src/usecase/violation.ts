import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'
import {
  normalizedOpenInput,
  type OpenViolationInput,
  type ViolationListQuery,
  type ViolationRepository,
  type ViolationStep,
} from '../domain/violation.js'
import { parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

// ICPDP xem một trang các vụ vi phạm theo bộ lọc
export async function listViolations(
  repo: ViolationRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  query: ViolationListQuery,
) {
  await requireIcpdpOfficer(auth, actor)
  return repo.list(query)
}

// ICPDP xem chi tiết một vụ vi phạm
export async function getViolation(
  repo: ViolationRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  await requireIcpdpOfficer(auth, actor)
  const found = await repo.find(parseObjectId(id, 'case id'), now)
  if (!found) {
    throw new DomainError('violation case not found', 'not_found')
  }
  return found
}

// ICPDP xem các nguồn có thể dẫn tới vụ vi phạm của một CLB
export async function getViolationSources(
  repo: ViolationRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  clubId: string,
) {
  await requireIcpdpOfficer(auth, actor)
  const found = await repo.sources(parseObjectId(clubId, 'club id'))
  if (!found) {
    throw new DomainError('club not found', 'not_found')
  }
  return found
}

// ICPDP mở vụ vi phạm mới cho một CLB
export async function openViolation(
  repo: ViolationRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  input: OpenViolationInput,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  parseObjectId(input.clubId, 'club id')
  if (input.originRefId) {
    parseObjectId(input.originRefId, 'source record id')
  }
  return repo.open(normalizedOpenInput(input), officerId, now)
}

// ICPDP thực hiện một bước xử lý trong vụ vi phạm
export async function applyViolationCaseStep(
  repo: ViolationRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  step: ViolationStep,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  return repo.apply(parseObjectId(id, 'case id'), officerId, step, now)
}
