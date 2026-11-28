import { Router } from 'express'
import { z } from 'zod'
import type { EventRegistrationRepository } from '../../domain/event-registration.js'
import type { PolicyRepository } from '../../domain/policy.js'
import {
  cancelEventRegistration,
  getEventRegistrationContext,
  listMyEventRegistrations,
  registerForEvent,
} from '../../usecase/event-registration.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface EventRegistrationRouteDeps extends SessionDeps {
  repo: EventRegistrationRepository
  policy: PolicyRepository
}

const answer = z.union([z.string().max(2_000), z.array(z.string().max(2_000)).max(30)])
export const eventRegistrationBody = z
  .object({
    answers: z.record(z.string().regex(/^[a-z][a-z0-9_]{0,49}$/), answer).default({}),
  })
  .strict()

// Mount các route đăng ký tham gia sự kiện của sinh viên
export function eventRegistrationRoutes(deps: EventRegistrationRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)
  // Lấy ngữ cảnh đăng ký của sự kiện
  router.get('/events/:id/registration', read, async (req, res) => {
    ok(
      res,
      await getEventRegistrationContext(
        deps.repo,
        actor(res),
        parse(id, req.params.id, 'event registration request'),
        new Date(),
      ),
    )
  })
  // Sinh viên đăng ký tham gia sự kiện
  router.post('/events/:id/registrations', write, async (req, res) => {
    const body = parse(eventRegistrationBody, req.body, 'event registration request')
    ok(
      res,
      await registerForEvent(
        deps.repo,
        deps.policy,
        actor(res),
        parse(id, req.params.id, 'event registration request'),
        body.answers ?? {},
        new Date(),
      ),
      201,
    )
  })
  // Liệt kê đăng ký sự kiện của tôi
  router.get('/event-registrations/mine', read, async (_req, res) => {
    ok(res, await listMyEventRegistrations(deps.repo, actor(res)))
  })
  // Sinh viên huỷ đăng ký sự kiện
  router.post('/event-registrations/:id/cancel', write, async (req, res) => {
    ok(
      res,
      await cancelEventRegistration(
        deps.repo,
        actor(res),
        parse(id, req.params.id, 'event registration request'),
        new Date(),
      ),
    )
  })
  return router
}
