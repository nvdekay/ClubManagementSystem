import { Router } from 'express'
import { z } from 'zod'
import type { EventCheckInRepository } from '../../domain/event-checkin.js'
import type { PolicyRepository } from '../../domain/policy.js'
import { checkInToEvent, listMyAttendances } from '../../usecase/event-checkin.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface EventCheckInRouteDeps extends SessionDeps {
  repo: EventCheckInRepository
  policy: PolicyRepository
}

export const eventCheckInBody = z.object({ code: z.string().trim().min(1).max(64) }).strict()

// Mount các route điểm danh sự kiện của sinh viên
export function eventCheckInRoutes(deps: EventCheckInRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)
  // Sinh viên điểm danh vào sự kiện
  router.post('/events/:id/check-in', write, async (req, res) => {
    const body = parse(eventCheckInBody, req.body, 'check-in request')
    ok(
      res,
      await checkInToEvent(
        deps.repo,
        deps.policy,
        actor(res),
        parse(id, req.params.id, 'check-in request'),
        body.code,
        new Date(),
      ),
    )
  })
  // Liệt kê lịch sử điểm danh của tôi
  router.get('/attendances/mine', read, async (_req, res) => {
    ok(res, await listMyAttendances(deps.repo, deps.policy, actor(res)))
  })
  return router
}
