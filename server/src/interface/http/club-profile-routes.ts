import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { AuthRepository } from '../../domain/auth.js'
import type { ClubProfileRepository } from '../../domain/club-profile.js'
import type { PolicyRepository } from '../../domain/policy.js'
import type { SessionService } from '../../domain/session.js'
import {
  applyClubDepartmentTemplate,
  createClubDepartment,
  deactivateClubDepartment,
  getClubSettings,
  updateClubDepartment,
  updateClubProfile,
} from '../../usecase/club-profile.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface ClubProfileRouteDeps {
  repo: ClubProfileRepository
  accessRepo: ClubAccessRepository
  policy: PolicyRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
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
  const guard = { repo: deps.authRepo, sessions: deps.sessions }

  // Lấy cài đặt hồ sơ và phòng ban của CLB
  router.get('/clubs/:clubId/settings', authGuard(guard, false), async (req, res) => {
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
  router.patch('/clubs/:clubId/profile', authGuard(guard), async (req, res) => {
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
  router.post('/clubs/:clubId/departments/template', authGuard(guard), async (req, res) => {
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
  router.post('/clubs/:clubId/departments', authGuard(guard), async (req, res) => {
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
  router.patch('/clubs/:clubId/departments/:departmentId', authGuard(guard), async (req, res) => {
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
  router.delete('/clubs/:clubId/departments/:departmentId', authGuard(guard), async (req, res) => {
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
