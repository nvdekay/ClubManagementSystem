import { Router } from 'express'
import { z } from 'zod'
import {
  MAX_COMMENT_LENGTH,
  MAX_RATING,
  MIN_RATING,
  type EventFeedbackRepository,
} from '../../domain/event-feedback.js'
import type { PolicyRepository } from '../../domain/policy.js'
import {
  getEventFeedbackContext,
  listMyEventFeedback,
  submitEventFeedback,
} from '../../usecase/event-feedback.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface EventFeedbackRouteDeps extends SessionDeps {
  repo: EventFeedbackRepository
  policy: PolicyRepository
}

export const eventFeedbackBody = z
  .object({
    rating: z.number().int().min(MIN_RATING).max(MAX_RATING),
    comment: z.string().max(MAX_COMMENT_LENGTH * 2),
    isAnonymous: z.boolean().default(false),
  })
  .strict()

// Mount các route phản hồi sự kiện của sinh viên
export function eventFeedbackRoutes(deps: EventFeedbackRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)
  // Lấy ngữ cảnh gửi phản hồi cho sự kiện
  router.get('/events/:id/feedback', read, async (req, res) => {
    ok(
      res,
      await getEventFeedbackContext(
        deps.repo,
        deps.policy,
        actor(res),
        parse(id, req.params.id, 'feedback request'),
        new Date(),
      ),
    )
  })
  // Sinh viên gửi phản hồi sự kiện
  router.post('/events/:id/feedback', write, async (req, res) => {
    const body = parse(eventFeedbackBody, req.body, 'feedback request')
    ok(
      res,
      await submitEventFeedback(
        deps.repo,
        deps.policy,
        actor(res),
        parse(id, req.params.id, 'feedback request'),
        { ...body, isAnonymous: body.isAnonymous ?? false },
        new Date(),
      ),
      201,
    )
  })
  // Liệt kê phản hồi sự kiện của tôi
  router.get('/event-feedbacks/mine', read, async (_req, res) => {
    ok(res, await listMyEventFeedback(deps.repo, actor(res)))
  })
  return router
}
