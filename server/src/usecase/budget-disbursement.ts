import type { AuthRepository } from '../domain/auth.js'
import type {
  BudgetDisbursementRepository,
  BudgetListQuery,
} from '../domain/budget-disbursement.js'
import { orNotFound } from '../domain/errors.js'
import { parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

// ICPDP xem một trang ngân sách được duyệt của các CLB theo bộ lọc
export async function listBudgets(
  repo: BudgetDisbursementRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  query: BudgetListQuery,
) {
  await requireIcpdpOfficer(auth, actor)
  return repo.list(query)
}

// ICPDP xem chi tiết một ngân sách và các khoản đã ghi
export async function getBudget(
  repo: BudgetDisbursementRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
) {
  await requireIcpdpOfficer(auth, actor)
  const detail = orNotFound(await repo.find(parseObjectId(id, 'budget id')), 'budget')
  return detail
}
