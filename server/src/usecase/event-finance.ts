import type { ClubAccessRepository } from '../domain/access.js'
import type { AuthRepository } from '../domain/auth.js'
import {
  type EventFinanceRepository,
  type FinanceAction,
  validateExpense,
  validateFinancialEvidence,
} from '../domain/event-finance.js'
import { DomainError, orNotFound } from '../domain/errors.js'
import {
  assertClubAccess,
  assertClubOrOfficer,
  parseObjectId,
  requireIcpdpOfficer,
  type AccessActor,
} from './access.js'

export interface EventFinanceDeps {
  repo: EventFinanceRepository
  access: ClubAccessRepository
  auth: Pick<AuthRepository, 'systemRoleCodes'>
}
// Kiểm định dạng id tài chính sự kiện
export function financeId(value: string): string {
  return parseObjectId(value, 'finance identifier')
}
// Liệt kê ngân sách sự kiện, theo CLB hoặc cho ICPDP
export async function listEventFinances(
  deps: EventFinanceDeps,
  actor: AccessActor | null,
  clubId: string | undefined,
  now: Date,
) {
  await assertClubOrOfficer(deps, actor, clubId && financeId(clubId), 'club.expense.record', now)
  return deps.repo.list(clubId)
}
// Xem chi tiết ngân sách và chi tiêu của một sự kiện
export async function getEventFinance(
  deps: EventFinanceDeps,
  actor: AccessActor | null,
  id: string,
  clubId: string | undefined,
  now: Date,
) {
  await assertClubOrOfficer(deps, actor, clubId && financeId(clubId), 'club.expense.record', now)
  const result = orNotFound(await deps.repo.find(financeId(id), clubId), 'budget')
  return result
}
// Thực hiện thao tác tài chính sự kiện (chi tiêu, minh chứng, nộp, nhận, trả, chốt)
export async function actOnEventFinance(
  deps: EventFinanceDeps,
  actor: AccessActor | null,
  id: string,
  clubId: string | undefined,
  action: FinanceAction,
  now: Date,
) {
  if (clubId) {
    await assertClubAccess(deps.access, actor, financeId(clubId), 'club.expense.record', now)
    if (!['expense', 'evidence', 'submit'].includes(action.kind)) {
      throw new DomainError('officer action required', 'forbidden')
    }
  } else {
    await requireIcpdpOfficer(deps.auth, actor)
    if (!['claim', 'return', 'finalize'].includes(action.kind)) {
      throw new DomainError('club action required', 'forbidden')
    }
  }
  if (!Number.isInteger(action.revision) || action.revision < 0) {
    throw new DomainError('invalid revision', 'validation')
  }
  if (action.kind === 'expense') {
    action = {
      ...action,
      expenseId: action.expenseId ? financeId(action.expenseId) : undefined,
      input: validateExpense(action.input, now),
    }
  }
  if (action.kind === 'evidence') {
    action = {
      ...action,
      expenseId: financeId(action.expenseId),
      input: validateFinancialEvidence(action.input),
    }
  }
  if (action.kind === 'return' && (!action.reason.trim() || action.reason.length > 2000)) {
    throw new DomainError('a correction reason is required', 'validation')
  }
  return deps.repo.act(financeId(id), clubId, actor!.id, action, now)
}
