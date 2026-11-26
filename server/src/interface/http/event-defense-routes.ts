import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { AuthRepository } from '../../domain/auth.js'
import {
  MAX_DEFENSE_DURATION_MINUTES,
  MIN_DEFENSE_DURATION_MINUTES,
  type EventDefenseRepository,
} from '../../domain/event-defense.js'
import type { EventProposalReviewRepository } from '../../domain/event-proposal-review.js'
import type { SessionService } from '../../domain/session.js'
import {
  cancelEventDefense,
  confirmClubEventDefense,
  decideAfterDefense,
  endEventDefense,
  getClubEventDefense,
  getLiveDefenseSession,
  listAvailableDefenseRooms,
  markDefenseNoShow,
  requestClubDefenseReschedule,
  respondDefenseReschedule,
  saveDefenseNote,
  scheduleEventDefense,
  startEventDefense,
} from '../../usecase/event-defense.js'
import { authGuard } from './auth-routes.js'
import { eventReviewDecisionBody } from './event-proposal-review-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface EventDefenseRouteDeps {
  repo: EventDefenseRepository
  reviewRepo: EventProposalReviewRepository
  accessRepo: ClubAccessRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)

export const defenseRoomsQuery = z
  .object({
    startAt: z.string().datetime(),
    durationMinutes: z.coerce
      .number()
      .int()
      .min(MIN_DEFENSE_DURATION_MINUTES)
      .max(MAX_DEFENSE_DURATION_MINUTES),
    excludeDefenseId: id.optional(),
  })
  .strict()

export const defenseScheduleBody = z
  .object({
    title: z.string().min(1).max(200),
    startAt: z.string().datetime(),
    durationMinutes: z
      .number()
      .int()
      .min(MIN_DEFENSE_DURATION_MINUTES)
      .max(MAX_DEFENSE_DURATION_MINUTES),
    propertyId: id,
    note: z.string().max(2_000).optional(),
  })
  .strict()

export const defenseReasonBody = z
  .object({
    reason: z.string().min(1).max(2_000),
  })
  .strict()

export const defenseOptionalReasonBody = z
  .object({
    reason: z.string().max(2_000).optional(),
  })
  .strict()

export const defenseRespondRescheduleBody = z
  .object({
    accept: z.boolean(),
    startAt: z.string().datetime().optional(),
    durationMinutes: z
      .number()
      .int()
      .min(MIN_DEFENSE_DURATION_MINUTES)
      .max(MAX_DEFENSE_DURATION_MINUTES)
      .optional(),
    propertyId: id.optional(),
    note: z.string().max(2_000).optional(),
    reason: z.string().max(2_000).optional(),
  })
  .strict()

export const defenseNoteBody = z
  .object({
    content: z.string().max(50_000),
  })
  .strict()

// Mount các route phiên bảo vệ đề xuất sự kiện của ICPDP và CLB
export function eventDefenseRoutes(deps: EventDefenseRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }

  // Liệt kê phòng còn trống cho phiên bảo vệ
  router.get('/admin/event-defense/rooms', authGuard(guard, false), async (req, res) => {
    const query = parse(defenseRoomsQuery, req.query, 'event defense request')
    ok(
      res,
      await listAvailableDefenseRooms(
        deps.repo,
        deps.authRepo,
        actor(res),
        new Date(query.startAt),
        query.durationMinutes,
        query.excludeDefenseId,
      ),
    )
  })

  // ICPDP lên lịch phiên bảo vệ đề xuất sự kiện
  router.post('/admin/event-proposals/:id/defense/schedule', authGuard(guard), async (req, res) => {
    const body = parse(defenseScheduleBody, req.body, 'event defense request')
    ok(
      res,
      await scheduleEventDefense(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'event defense request'),
        {
          title: body.title,
          startAt: new Date(body.startAt),
          durationMinutes: body.durationMinutes,
          propertyId: body.propertyId,
          ...(body.note !== undefined ? { note: body.note } : {}),
        },
        new Date(),
      ),
    )
  })

  // ICPDP huỷ phiên bảo vệ kèm lý do
  router.post('/admin/event-proposals/:id/defense/cancel', authGuard(guard), async (req, res) => {
    const body = parse(defenseReasonBody, req.body, 'event defense request')
    ok(
      res,
      await cancelEventDefense(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'event defense request'),
        body.reason,
        new Date(),
      ),
    )
  })

  // ICPDP phản hồi yêu cầu dời lịch bảo vệ của CLB
  router.post(
    '/admin/event-proposals/:id/defense/respond-reschedule',
    authGuard(guard),
    async (req, res) => {
      const body = parse(defenseRespondRescheduleBody, req.body, 'event defense request')
      ok(
        res,
        await respondDefenseReschedule(
          deps.repo,
          deps.reviewRepo,
          deps.authRepo,
          actor(res),
          parse(id, req.params.id, 'event defense request'),
          {
            accept: body.accept,
            ...(body.startAt ? { startAt: new Date(body.startAt) } : {}),
            ...(body.durationMinutes !== undefined
              ? { durationMinutes: body.durationMinutes }
              : {}),
            ...(body.propertyId ? { propertyId: body.propertyId } : {}),
            ...(body.note !== undefined ? { note: body.note } : {}),
            ...(body.reason !== undefined ? { reason: body.reason } : {}),
          },
          new Date(),
        ),
      )
    },
  )

  // ICPDP bắt đầu phiên bảo vệ
  router.post('/admin/event-proposals/:id/defense/start', authGuard(guard), async (req, res) => {
    ok(
      res,
      await startEventDefense(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'event defense request'),
        new Date(),
      ),
    )
  })

  // Lấy trạng thái phiên bảo vệ đang diễn ra
  router.get(
    '/admin/event-proposals/:id/defense/session',
    authGuard(guard, false),
    async (req, res) => {
      ok(
        res,
        await getLiveDefenseSession(
          deps.repo,
          deps.authRepo,
          actor(res),
          parse(id, req.params.id, 'event defense request'),
        ),
      )
    },
  )

  // Lưu ghi chú của phiên bảo vệ
  router.put('/admin/event-proposals/:id/defense/notes', authGuard(guard), async (req, res) => {
    const body = parse(defenseNoteBody, req.body, 'event defense request')
    ok(
      res,
      await saveDefenseNote(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'event defense request'),
        body.content,
        new Date(),
      ),
    )
  })

  // ICPDP kết thúc phiên bảo vệ
  router.post('/admin/event-proposals/:id/defense/end', authGuard(guard), async (req, res) => {
    ok(
      res,
      await endEventDefense(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'event defense request'),
        new Date(),
      ),
    )
  })

  // Đánh dấu CLB vắng mặt tại phiên bảo vệ
  router.post('/admin/event-proposals/:id/defense/no-show', authGuard(guard), async (req, res) => {
    const body = parse(defenseOptionalReasonBody, req.body, 'event defense request')
    ok(
      res,
      await markDefenseNoShow(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'event defense request'),
        body.reason,
        new Date(),
      ),
    )
  })

  // ICPDP ghi quyết định sau phiên bảo vệ
  router.post('/admin/event-proposals/:id/defense/decision', authGuard(guard), async (req, res) => {
    const body = parse(eventReviewDecisionBody, req.body, 'event defense request')
    ok(
      res,
      await decideAfterDefense(
        deps.repo,
        deps.reviewRepo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'event defense request'),
        {
          ...body,
          revisionDeadlineAt: body.revisionDeadlineAt
            ? new Date(body.revisionDeadlineAt)
            : undefined,
        },
        new Date(),
      ),
    )
  })

  // CLB xem lịch bảo vệ của sự kiện
  router.get('/clubs/:clubId/events/:id/defense', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getClubEventDefense(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'event defense request'),
        parse(id, req.params.id, 'event defense request'),
        new Date(),
      ),
    )
  })

  // CLB xác nhận tham dự phiên bảo vệ
  router.post('/clubs/:clubId/events/:id/defense/confirm', authGuard(guard), async (req, res) => {
    ok(
      res,
      await confirmClubEventDefense(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'event defense request'),
        parse(id, req.params.id, 'event defense request'),
        new Date(),
      ),
    )
  })

  // CLB yêu cầu dời lịch phiên bảo vệ
  router.post(
    '/clubs/:clubId/events/:id/defense/reschedule-request',
    authGuard(guard),
    async (req, res) => {
      const body = parse(defenseReasonBody, req.body, 'event defense request')
      ok(
        res,
        await requestClubDefenseReschedule(
          deps.repo,
          deps.accessRepo,
          actor(res),
          parse(id, req.params.clubId, 'event defense request'),
          parse(id, req.params.id, 'event defense request'),
          body.reason,
          new Date(),
        ),
      )
    },
  )

  return router
}
