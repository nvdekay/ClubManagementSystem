import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { AuthUser } from '../../domain/auth.js'
import type { DashboardRepository } from '../../domain/dashboard.js'
import {
  getClubBoardHistory,
  getDashboard,
  type DashboardContext,
} from '../../usecase/dashboard.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, objectId, parse } from './request.js'

export interface DashboardRouteDeps extends SessionDeps {
  repo: DashboardRepository
  accessRepo: ClubAccessRepository
}

export const dashboardQuery = z.discriminatedUnion('workspace', [
  z.object({ workspace: z.literal('student') }).strict(),
  z.object({ workspace: z.literal('icpdp') }).strict(),
  z
    .object({
      workspace: z.literal('club'),
      clubId: objectId,
    })
    .strict(),
])

// Mount các route dashboard theo workspace
export function dashboardRoutes(deps: DashboardRouteDeps): Router {
  const router = Router()
  const { read } = guards(deps)
  // Lấy dữ liệu dashboard theo workspace của người dùng
  router.get('/dashboard', read, async (req, res) => {
    const query = parse(dashboardQuery, req.query, 'dashboard context')
    ok(
      res,
      await getDashboard(
        deps.repo,
        deps.authRepo,
        deps.accessRepo,
        actor(res) as AuthUser,
        query as DashboardContext,
      ),
    )
  })
  // Drill-down UC02: ICPDP mở một con số trên dashboard thành các bản ghi phía sau nó (FR-UC02-02/03).
  // Xem lịch sử ban chủ nhiệm của một CLB
  router.get('/dashboard/clubs/:clubId/board-history', read, async (req, res) => {
    ok(
      res,
      await getClubBoardHistory(
        deps.repo,
        deps.authRepo,
        deps.accessRepo,
        actor(res) as AuthUser,
        String(req.params.clubId),
      ),
    )
  })
  return router
}
