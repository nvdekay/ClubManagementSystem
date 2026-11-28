import { Router } from 'express'
import { z } from 'zod'
import type { PolicyRepository } from '../../domain/policy.js'
import { MAX_INVITED_CLUBS, type SchoolEventRepository } from '../../domain/school-event.js'
import {
  checkSchoolEventConflicts,
  createSchoolEvent,
  getSchoolEvent,
  inviteClubs,
  listSchoolEvents,
  publishSchoolEvent,
  withdrawInvitation,
} from '../../usecase/school-event.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface SchoolEventRouteDeps extends SessionDeps {
  repo: SchoolEventRepository
  policy: PolicyRepository
}

const clubIds = z.array(id).max(MAX_INVITED_CLUBS)

export const schoolEventBody = z
  .object({
    title: z.string().min(1).max(200),
    objective: z.string().max(5_000).optional(),
    coordination: z.string().max(5_000).optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    venueText: z.string().max(200).optional(),
    propertyId: id.optional(),
    capacity: z.number().int().min(1).max(100_000),
    invitationDeadline: z.string().datetime().optional(),
    clubIds: clubIds.optional(),
    allActiveClubs: z.boolean().optional(),
  })
  .strict()

export const schoolEventInviteBody = z
  .object({
    clubIds: clubIds.optional(),
    allActiveClubs: z.boolean().optional(),
    deadline: z.string().datetime().optional(),
  })
  .strict()

export const schoolEventConflictQuery = z
  .object({
    propertyId: id.optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  })
  .strict()

// Chuyển chuỗi ngày thành Date, trả undefined nếu không có
function date(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined
}

// Mount các route sự kiện cấp trường của ICPDP
export function schoolEventRoutes(deps: SchoolEventRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // Liệt kê sự kiện cấp trường
  router.get('/admin/school-events', read, async (_req, res) => {
    ok(res, await listSchoolEvents(deps.repo, deps.authRepo, actor(res)))
  })
  // Kiểm tra xung đột lịch của sự kiện cấp trường
  router.get('/admin/school-events/conflicts', read, async (req, res) => {
    const query = parse(schoolEventConflictQuery, req.query, 'school event request')
    ok(
      res,
      await checkSchoolEventConflicts(deps.repo, deps.authRepo, actor(res), {
        propertyId: query.propertyId,
        startAt: new Date(query.startAt),
        endAt: new Date(query.endAt),
      }),
    )
  })
  // Xem chi tiết sự kiện cấp trường
  router.get('/admin/school-events/:id', read, async (req, res) => {
    ok(
      res,
      await getSchoolEvent(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'school event request'),
      ),
    )
  })
  // Tạo sự kiện cấp trường
  router.post('/admin/school-events', write, async (req, res) => {
    const body = parse(schoolEventBody, req.body, 'school event request')
    ok(
      res,
      await createSchoolEvent(
        deps.repo,
        deps.policy,
        deps.authRepo,
        actor(res),
        {
          ...body,
          startAt: new Date(body.startAt),
          endAt: new Date(body.endAt),
          invitationDeadline: date(body.invitationDeadline),
        },
        new Date(),
      ),
      201,
    )
  })
  // Mời CLB tham gia sự kiện cấp trường
  router.post('/admin/school-events/:id/invitations', write, async (req, res) => {
    const body = parse(schoolEventInviteBody, req.body, 'school event request')
    ok(
      res,
      await inviteClubs(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'school event request'),
        { ...body, deadline: date(body.deadline) },
        new Date(),
      ),
    )
  })
  // Rút lời mời CLB khỏi sự kiện cấp trường
  router.post(
    '/admin/school-events/:id/invitations/:invitationId/withdraw',
    write,
    async (req, res) => {
      ok(
        res,
        await withdrawInvitation(
          deps.repo,
          deps.authRepo,
          actor(res),
          parse(id, req.params.id, 'school event request'),
          parse(id, req.params.invitationId, 'school event request'),
          new Date(),
        ),
      )
    },
  )
  // Công bố sự kiện cấp trường
  router.post('/admin/school-events/:id/publish', write, async (req, res) => {
    ok(
      res,
      await publishSchoolEvent(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'school event request'),
        new Date(),
      ),
    )
  })

  return router
}
