import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { ClubProfileRepository } from '../../domain/club-profile.js'
import type { PolicyRepository } from '../../domain/policy.js'
import {
  applyClubDepartmentTemplate,
  createClubDepartment,
  deactivateClubDepartment,
  getClubSettings,
  updateClubDepartment,
  updateClubProfile,
} from '../../usecase/club-profile.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface ClubProfileRouteDeps extends SessionDeps {
  repo: ClubProfileRepository
  accessRepo: ClubAccessRepository
  policy: PolicyRepository
}

const channelBody = z
  .object({
    label: z.string().max(100),
    url: z.string().max(2_000),
  })
  .strict()
export const clubProfileBody = z
  .object({
    description: z.string().max(10_000).optional(),
    contactEmail: z.string().max(320).optional(),
    contactPhone: z.string().max(50).optional(),
    charterUrl: z.string().max(2_000).optional(),
    channels: z.array(channelBody).max(20),
    operatingScope: z.string().max(2_000).optional(),
  })
  .strict()
export const clubDepartmentBody = z
  .object({
    name: z.string().max(120),
    description: z.string().max(2_000).optional(),
    sortOrder: z.number().int().min(0).max(10_000),
  })
  .strict()

// Mount các route hồ sơ và phòng ban của CLB
export function clubProfileRoutes(deps: ClubProfileRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // Lấy cài đặt hồ sơ và phòng ban của CLB
  router.get('/clubs/:clubId/settings', read, async (req, res) => {
    ok(
      res,
      await getClubSettings(
        deps.repo,
        deps.accessRepo,
        deps.policy,
        actor(res),
        parse(id, req.params.clubId, 'club settings request'),
      ),
    )
  })
  // Cập nhật hồ sơ CLB
  router.patch('/clubs/:clubId/profile', write, async (req, res) => {
    ok(
      res,
      await updateClubProfile(
        deps.repo,
        deps.accessRepo,
        deps.policy,
        actor(res),
        parse(id, req.params.clubId, 'club settings request'),
        parse(clubProfileBody, req.body, 'club settings request'),
        new Date(),
      ),
    )
  })
  // Áp dụng mẫu phòng ban cho CLB
  router.post('/clubs/:clubId/departments/template', write, async (req, res) => {
    ok(
      res,
      await applyClubDepartmentTemplate(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'club settings request'),
        new Date(),
      ),
    )
  })
  // Tạo phòng ban của CLB
  router.post('/clubs/:clubId/departments', write, async (req, res) => {
    ok(
      res,
      await createClubDepartment(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'club settings request'),
        parse(clubDepartmentBody, req.body, 'club settings request'),
        new Date(),
      ),
      201,
    )
  })
  // Cập nhật phòng ban của CLB
  router.patch('/clubs/:clubId/departments/:departmentId', write, async (req, res) => {
    ok(
      res,
      await updateClubDepartment(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'club settings request'),
        parse(id, req.params.departmentId, 'club settings request'),
        parse(clubDepartmentBody, req.body, 'club settings request'),
        new Date(),
      ),
    )
  })
  // Vô hiệu hoá phòng ban của CLB
  router.delete('/clubs/:clubId/departments/:departmentId', write, async (req, res) => {
    ok(
      res,
      await deactivateClubDepartment(
        deps.repo,
        deps.accessRepo,
        actor(res),
        parse(id, req.params.clubId, 'club settings request'),
        parse(id, req.params.departmentId, 'club settings request'),
        new Date(),
      ),
    )
  })

  return router
}
