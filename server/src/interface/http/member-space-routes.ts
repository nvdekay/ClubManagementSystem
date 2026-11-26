import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import { DomainError } from '../../domain/errors.js'
import type { MemberSpaceRepository } from '../../domain/member-space.js'
import type { PolicyRepository } from '../../domain/policy.js'
import type { SessionService } from '../../domain/session.js'
import { getMemberSpace } from '../../usecase/member-space.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor } from './request.js'

export interface MemberSpaceRouteDeps {
  repo: MemberSpaceRepository
  policy: PolicyRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)

// Mount route không gian thành viên của CLB
export function memberSpaceRoutes(deps: MemberSpaceRouteDeps): Router {
  const router = Router()
  // Lấy dữ liệu không gian thành viên của CLB
  router.get(
    '/clubs/:clubId/member-space',
    authGuard({ repo: deps.authRepo, sessions: deps.sessions }, false),
    async (req, res) => {
      const clubId = id.safeParse(req.params.clubId)
      if (!clubId.success) {
        throw new DomainError('invalid club id', 'validation')
      }
      ok(res, await getMemberSpace(deps.repo, deps.policy, actor(res), clubId.data, new Date()))
    },
  )
  return router
}
