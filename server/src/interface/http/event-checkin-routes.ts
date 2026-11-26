import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type { EventCheckInRepository } from '../../domain/event-checkin.js'
import type { PolicyRepository } from '../../domain/policy.js'
import type { SessionService } from '../../domain/session.js'
import { checkInToEvent, listMyAttendances } from '../../usecase/event-checkin.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface EventCheckInRouteDeps {
  repo: EventCheckInRepository
  policy: PolicyRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const eventCheckInBody = z.object({ code: z.string().trim().min(1).max(64) }).strict()

// Mount các route điểm danh sự kiện của sinh viên
export function eventCheckInRoutes(deps: EventCheckInRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }
  // Sinh viên điểm danh vào sự kiện
  router.post('/events/:id/check-in', authGuard(guard), async (req, res) => {
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
  router.get('/attendances/mine', authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyAttendances(deps.repo, deps.policy, actor(res)))
  })
  return router
}
