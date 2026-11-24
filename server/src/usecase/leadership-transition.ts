import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'
import type {
  LeadershipTransitionRepository,
  TransitionDecisionInput,
} from '../domain/leadership-transition.js'
import type { AccessActor } from './access.js'

const objectId = /^[0-9a-f]{24}$/i

// Kiểm định dạng ObjectId
function validId(value: string): string {
  if (!objectId.test(value)) {
    throw new DomainError('invalid identifier', 'validation')
  }
  return value
}

// Kiểm actor là ICPDP officer và trả id
async function officer(auth: AuthRepository, actor: AccessActor | null): Promise<string> {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState === 'Locked') {
    throw new DomainError(actor.lockReason || 'account locked', 'locked')
  }
  const actorId = validId(actor.id)
  if (!(await auth.systemRoleCodes(actorId)).includes('ICPDP_OFFICER')) {
    throw new DomainError('ICPDP officer role required', 'forbidden')
  }
  return actorId
}

// ICPDP xem các kế hoạch bàn giao lãnh đạo đang chờ xử lý
export async function listLeadershipTransitions(
  repo: LeadershipTransitionRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
) {
  await officer(auth, actor)
  return repo.listOpen()
}

// ICPDP xem chi tiết một kế hoạch bàn giao lãnh đạo
export async function getLeadershipTransition(
  repo: LeadershipTransitionRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  planId: string,
) {
  await officer(auth, actor)
  const result = await repo.find(validId(planId))
  if (!result) {
    throw new DomainError('transition plan not found', 'not_found')
  }
  return result
}

// ICPDP officer nhận xử lý một kế hoạch bàn giao
export async function claimLeadershipTransition(
  repo: LeadershipTransitionRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  planId: string,
  now: Date,
) {
  return repo.claim(validId(planId), await officer(auth, actor), now)
}

// ICPDP duyệt hoặc trả lại kế hoạch bàn giao kèm nghĩa vụ theo dõi
export async function decideLeadershipTransition(
  repo: LeadershipTransitionRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  planId: string,
  input: TransitionDecisionInput,
  now: Date,
) {
  const officerId = await officer(auth, actor)
  const detail = await repo.find(validId(planId))
  if (!detail) {
    throw new DomainError('transition plan not found', 'not_found')
  }
  if (detail.task.state !== 'Open' || detail.task.assigneeId !== officerId) {
    throw new DomainError('transition plan must be claimed before deciding', 'conflict')
  }
  const reason = input.reason?.trim()
  if (input.outcome === 'Request revision' && !reason) {
    throw new DomainError('a reason is required when returning a transition plan', 'validation')
  }
  if (reason && reason.length > 5_000) {
    throw new DomainError('decision reason is too long', 'validation')
  }
  const followUpObligationIds = [...new Set(input.followUpObligationIds)]
  const obligationIds = new Set(detail.outstandingObligations.map((item) => item.id))
  if (input.outcome !== 'Approve' && followUpObligationIds.length) {
    throw new DomainError('returned plans cannot create follow-up obligations', 'validation')
  }
  if (followUpObligationIds.some((id) => !obligationIds.has(id))) {
    throw new DomainError('unknown follow-up obligation', 'validation')
  }
  return repo.decide(
    validId(planId),
    officerId,
    {
      outcome: input.outcome,
      ...(reason ? { reason } : {}),
      followUpObligationIds,
    },
    now,
  )
}
