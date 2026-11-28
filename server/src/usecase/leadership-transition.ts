import type { AuthRepository } from '../domain/auth.js'
import { DomainError, orNotFound } from '../domain/errors.js'
import type {
  LeadershipTransitionRepository,
  TransitionDecisionInput,
} from '../domain/leadership-transition.js'
import { parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

// ICPDP xem các kế hoạch bàn giao lãnh đạo đang chờ xử lý
export async function listLeadershipTransitions(
  repo: LeadershipTransitionRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
) {
  await requireIcpdpOfficer(auth, actor)
  return repo.listOpen()
}

// ICPDP xem chi tiết một kế hoạch bàn giao lãnh đạo
export async function getLeadershipTransition(
  repo: LeadershipTransitionRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  planId: string,
) {
  await requireIcpdpOfficer(auth, actor)
  const result = orNotFound(await repo.find(parseObjectId(planId, 'identifier')), 'transition plan')
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
  return repo.claim(
    parseObjectId(planId, 'identifier'),
    await requireIcpdpOfficer(auth, actor),
    now,
  )
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
  const officerId = await requireIcpdpOfficer(auth, actor)
  const detail = orNotFound(await repo.find(parseObjectId(planId, 'identifier')), 'transition plan')
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
    parseObjectId(planId, 'identifier'),
    officerId,
    {
      outcome: input.outcome,
      ...(reason ? { reason } : {}),
      followUpObligationIds,
    },
    now,
  )
}
