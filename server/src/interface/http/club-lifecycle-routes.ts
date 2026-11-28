import { Router } from 'express'
import { z } from 'zod'
import type { ClubLifecycleRepository } from '../../domain/club-lifecycle.js'
import type { PolicyRepository } from '../../domain/policy.js'
import {
  dissolveClub,
  getClubLifecycle,
  listClubLifecycles,
  reactivateClub,
  suspendClub,
} from '../../usecase/club-lifecycle.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface ClubLifecycleRouteDeps extends SessionDeps {
  repo: ClubLifecycleRepository
  policy: PolicyRepository
}

export const lifecycleReasonBody = z.object({ reason: z.string().max(2_000) }).strict()
export const suspendBody = lifecycleReasonBody
  .extend({
    until: z.string().datetime({ offset: true }).optional(),
  })
  .strict()

// Mount các route quản lý vòng đời CLB của ICPDP
export function clubLifecycleRoutes(deps: ClubLifecycleRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // ICPDP liệt kê các CLB cùng trạng thái vòng đời
  router.get('/admin/clubs', read, async (_req, res) => {
    ok(res, await listClubLifecycles(deps.repo, deps.authRepo, actor(res), new Date()))
  })
  // ICPDP xem chi tiết vòng đời của một CLB
  router.get('/admin/clubs/:id', read, async (req, res) => {
    ok(
      res,
      await getClubLifecycle(
        deps.repo,
        deps.policy,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'club lifecycle request'),
        new Date(),
      ),
    )
  })
  // ICPDP tạm đình chỉ một CLB
  router.post('/admin/clubs/:id/suspend', write, async (req, res) => {
    const body = parse(suspendBody, req.body, 'club lifecycle request')
    ok(
      res,
      await suspendClub(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'club lifecycle request'),
        { reason: body.reason, ...(body.until ? { until: new Date(body.until) } : {}) },
        new Date(),
      ),
    )
  })
  // ICPDP kích hoạt lại CLB đã bị đình chỉ
  router.post('/admin/clubs/:id/reactivate', write, async (req, res) => {
    ok(
      res,
      await reactivateClub(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'club lifecycle request'),
        parse(lifecycleReasonBody, req.body, 'club lifecycle request'),
        new Date(),
      ),
    )
  })
  // ICPDP giải thể một CLB
  router.post('/admin/clubs/:id/dissolve', write, async (req, res) => {
    ok(
      res,
      await dissolveClub(
        deps.repo,
        deps.policy,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'club lifecycle request'),
        parse(lifecycleReasonBody, req.body, 'club lifecycle request'),
        new Date(),
      ),
    )
  })

  return router
}
