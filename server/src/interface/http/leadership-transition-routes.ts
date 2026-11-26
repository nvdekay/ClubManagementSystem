import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type { LeadershipTransitionRepository } from '../../domain/leadership-transition.js'
import type { SessionService } from '../../domain/session.js'
import {
  claimLeadershipTransition,
  decideLeadershipTransition,
  getLeadershipTransition,
  listLeadershipTransitions,
} from '../../usecase/leadership-transition.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface LeadershipTransitionRouteDeps {
  repo: LeadershipTransitionRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const transitionDecisionBody = z
  .object({
    outcome: z.enum(['Approve', 'Request revision']),
    reason: z.string().trim().max(5_000).optional(),
    followUpObligationIds: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  })
  .strict()

// Mount các route ICPDP duyệt chuyển giao ban chủ nhiệm
export function leadershipTransitionRoutes(deps: LeadershipTransitionRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }
  // ICPDP liệt kê các yêu cầu chuyển giao ban chủ nhiệm
  router.get('/admin/leadership-transitions', authGuard(guard, false), async (_req, res) => {
    ok(res, await listLeadershipTransitions(deps.repo, deps.authRepo, actor(res)))
  })
  // ICPDP xem chi tiết một yêu cầu chuyển giao
  router.get('/admin/leadership-transitions/:id', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getLeadershipTransition(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'transition plan request'),
      ),
    )
  })
  // ICPDP nhận xử lý (claim) một yêu cầu chuyển giao
  router.post('/admin/leadership-transitions/:id/claim', authGuard(guard), async (req, res) => {
    ok(
      res,
      await claimLeadershipTransition(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'transition plan request'),
        new Date(),
      ),
    )
  })
  // ICPDP ghi quyết định chuyển giao ban chủ nhiệm
  router.post('/admin/leadership-transitions/:id/decision', authGuard(guard), async (req, res) => {
    const body = parse(transitionDecisionBody, req.body, 'transition plan request')
    ok(
      res,
      await decideLeadershipTransition(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'transition plan request'),
        { ...body, followUpObligationIds: body.followUpObligationIds ?? [] },
        new Date(),
      ),
    )
  })
  return router
}
