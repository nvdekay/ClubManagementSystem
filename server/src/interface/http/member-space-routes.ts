import { Router } from 'express'
import { DomainError } from '../../domain/errors.js'
import type { MemberSpaceRepository } from '../../domain/member-space.js'
import type { PolicyRepository } from '../../domain/policy.js'
import { getMemberSpace } from '../../usecase/member-space.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, objectId as id } from './request.js'

export interface MemberSpaceRouteDeps extends SessionDeps {
  repo: MemberSpaceRepository
  policy: PolicyRepository
}

// Mount route không gian thành viên của CLB
export function memberSpaceRoutes(deps: MemberSpaceRouteDeps): Router {
  const router = Router()
  // Lấy dữ liệu không gian thành viên của CLB
  router.get('/clubs/:clubId/member-space', guards(deps).read, async (req, res) => {
    const clubId = id.safeParse(req.params.clubId)
    if (!clubId.success) {
      throw new DomainError('invalid club id', 'validation')
    }
    ok(res, await getMemberSpace(deps.repo, deps.policy, actor(res), clubId.data, new Date()))
  })
  return router
}
