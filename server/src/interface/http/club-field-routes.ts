import { Router } from 'express'
import { z } from 'zod'
import type { ClubFieldRepository } from '../../domain/club-field.js'
import {
  createClubField,
  listClubFieldCatalog,
  removeClubField,
  updateClubField,
} from '../../usecase/club-field.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface ClubFieldRouteDeps extends SessionDeps {
  repo: ClubFieldRepository
}

export const clubFieldBody = z
  .object({
    name: z.string().max(100),
    sortOrder: z.number().int().min(0).max(10_000),
  })
  .strict()

// Mount các route danh mục lĩnh vực CLB của ICPDP
export function clubFieldRoutes(deps: ClubFieldRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // Liệt kê danh mục lĩnh vực CLB
  router.get('/admin/club-fields', read, async (_req, res) => {
    ok(res, await listClubFieldCatalog(deps.repo, deps.authRepo, actor(res)))
  })
  // Tạo lĩnh vực CLB mới
  router.post('/admin/club-fields', write, async (req, res) => {
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
  router.patch('/admin/club-fields/:id', write, async (req, res) => {
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
  router.delete('/admin/club-fields/:id', write, async (req, res) => {
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
