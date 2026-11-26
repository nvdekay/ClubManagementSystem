import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type { BoardNominationRepository } from '../../domain/board-nomination.js'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { SessionService } from '../../domain/session.js'
import {
  claimBoardNomination,
  decideBoardNomination,
  getBoardNomination,
  getBoardNominationContext,
  listBoardNominations,
  listClubBoardNominations,
  submitBoardNomination,
} from '../../usecase/board-nomination.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface BoardNominationRouteDeps {
  repo: BoardNominationRepository
  accessRepo: ClubAccessRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const boardNominationBody = z
  .object({
    seats: z
      .array(z.object({ positionId: id, membershipId: id }).strict())
      .min(1)
      .max(30),
  })
  .strict()
export const boardNominationDecisionBody = z
  .object({
    confirmedSeatIds: z.array(id).max(30),
    returnedSeats: z
      .array(z.object({ seatId: id, reason: z.string().trim().min(1).max(5_000) }).strict())
      .max(30),
    reason: z.string().trim().max(5_000).optional(),
  })
  .strict()

// Mount các route đề cử ban chủ nhiệm của CLB và ICPDP
export function boardNominationRoutes(deps: BoardNominationRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }
  // Lấy ngữ cảnh đề cử ban chủ nhiệm của CLB
  router.get(
    '/clubs/:clubId/board-nomination-context',
    authGuard(guard, false),
    async (req, res) => {
      ok(
        res,
        await getBoardNominationContext(
          deps.repo,
          deps.accessRepo,
          actor(res),
          parse(id, req.params.clubId, 'board nomination request'),
          new Date(),
        ),
      )
    },
  )
  // Liệt kê các lần đề cử ban chủ nhiệm của CLB
  router.get('/clubs/:clubId/board-nominations', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await listClubBoardNominations(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'board nomination request'),
        new Date(),
      ),
    )
  })
  // Club Leader gửi đề cử các ghế ban chủ nhiệm
  router.post('/clubs/:clubId/board-nominations', authGuard(guard), async (req, res) => {
    const body = parse(boardNominationBody, req.body, 'board nomination request')
    ok(
      res,
      await submitBoardNomination(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'board nomination request'),
        body.seats,
        new Date(),
      ),
      201,
    )
  })
  // ICPDP liệt kê hàng đợi đề cử ban chủ nhiệm
  router.get('/admin/board-nominations', authGuard(guard, false), async (_req, res) => {
    ok(res, await listBoardNominations(deps.repo, deps.authRepo, actor(res)))
  })
  // ICPDP xem chi tiết một đề cử ban chủ nhiệm
  router.get('/admin/board-nominations/:id', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getBoardNomination(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'board nomination request'),
      ),
    )
  })
  // ICPDP nhận xử lý (claim) một đề cử
  router.post('/admin/board-nominations/:id/claim', authGuard(guard), async (req, res) => {
    ok(
      res,
      await claimBoardNomination(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'board nomination request'),
        new Date(),
      ),
    )
  })
  // ICPDP ghi quyết định xác nhận từng ghế ban chủ nhiệm
  router.post('/admin/board-nominations/:id/decision', authGuard(guard), async (req, res) => {
    ok(
      res,
      await decideBoardNomination(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'board nomination request'),
        parse(boardNominationDecisionBody, req.body, 'board nomination request'),
        new Date(),
      ),
    )
  })
  return router
}
