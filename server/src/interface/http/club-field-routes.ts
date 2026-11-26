import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type { ClubFieldRepository } from '../../domain/club-field.js'
import type { SessionService } from '../../domain/session.js'
import {
  createClubField,
  listClubFieldCatalog,
  removeClubField,
  updateClubField,
} from '../../usecase/club-field.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface ClubFieldRouteDeps {
  repo: ClubFieldRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const clubFieldBody = z
  .object({
    name: z.string().max(100),
    sortOrder: z.number().int().min(0).max(10_000),
  })
  .strict()

// Mount các route danh mục lĩnh vực CLB của ICPDP
export function clubFieldRoutes(deps: ClubFieldRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }

  // Liệt kê danh mục lĩnh vực CLB
  router.get('/admin/club-fields', authGuard(guard, false), async (_req, res) => {
    ok(res, await listClubFieldCatalog(deps.repo, deps.authRepo, actor(res)))
  })
  // Tạo lĩnh vực CLB mới
  router.post('/admin/club-fields', authGuard(guard), async (req, res) => {
    ok(
      res,
      await createClubField(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(clubFieldBody, req.body, 'club field request'),
        new Date(),
      ),
      201,
    )
  })
  // Cập nhật lĩnh vực CLB
  router.patch('/admin/club-fields/:id', authGuard(guard), async (req, res) => {
    ok(
      res,
      await updateClubField(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'club field request'),
        parse(clubFieldBody, req.body, 'club field request'),
        new Date(),
      ),
    )
  })
  // Xoá lĩnh vực CLB
  router.delete('/admin/club-fields/:id', authGuard(guard), async (req, res) => {
    ok(
      res,
      await removeClubField(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'club field request'),
        new Date(),
      ),
    )
  })

  return router
}
