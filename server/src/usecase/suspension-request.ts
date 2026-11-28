import type { ClubAccessRepository } from '../domain/access.js'
import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'
import { DEFAULT_PAGE_SIZE, type PageRequest } from '../domain/paging.js'
import {
  normalizedSuspensionRequest,
  type SuspensionRequestInput,
  type SuspensionRequestRepository,
} from '../domain/suspension-request.js'
import { assertClubAccess, isObjectId, type AccessActor } from './access.js'
// CLB xem ngữ cảnh để gửi yêu cầu tạm ngừng hoạt động
export async function suspensionContext(
  repo: SuspensionRequestRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.suspension.request', now)
  return repo.context(clubId, now)
}
// CLB gửi yêu cầu tạm ngừng hoạt động lên ICPDP
export async function submitSuspension(
  repo: SuspensionRequestRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  input: SuspensionRequestInput,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.suspension.request', now)
  return repo.submit(clubId, normalizedSuspensionRequest(input, now), actor!.id, now)
}
// ICPDP xem và duyệt hoặc từ chối các yêu cầu tạm ngừng
/** Trả về một trang hàng đợi; sau một quyết định là trang đầu tiên. */
export async function reviewSuspensions(
  repo: SuspensionRequestRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  action?: { id: string; outcome: 'Approve' | 'Reject'; reason: string },
  now = new Date(),
  page: PageRequest = { page: 1, pageSize: DEFAULT_PAGE_SIZE },
) {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState !== 'Active') {
    throw new DomainError('account locked', 'locked')
  }
  if (!(await auth.systemRoleCodes(actor.id)).includes('ICPDP_OFFICER')) {
    throw new DomainError('ICPDP officer role required', 'forbidden')
  }
  if (action) {
    if (!isObjectId(action.id) || !action.reason.trim() || action.reason.length > 2000) {
      throw new DomainError('valid request and decision reason required', 'validation')
    }
    await repo.decide(action.id, action.outcome, action.reason.trim(), actor.id, now)
  }
  return repo.list(page)
}
