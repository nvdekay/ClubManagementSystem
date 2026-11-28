import { Router } from 'express'
import { DomainError } from '../../domain/errors.js'
import type { MembershipReconfirmationRepository } from '../../domain/membership-reconfirmation.js'
import { confirmMembership, myReconfirmations } from '../../usecase/membership-reconfirmation.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { objectId, actor } from './request.js'
// Mount các route xác nhận lại tư cách thành viên
export function membershipReconfirmationRoutes(
  deps: SessionDeps & {
    repo: MembershipReconfirmationRepository
  },
): Router {
  const r = Router()
  const { read, write } = guards(deps)
  // Liệt kê yêu cầu xác nhận lại thành viên của tôi
  r.get('/memberships/reconfirmations/mine', read, async (_req, res) => {
    ok(res, await myReconfirmations(deps.repo, actor(res)))
  })
  // Thành viên xác nhận lại tư cách của mình
  r.post('/memberships/reconfirmations/:id/confirm', write, async (req, res) => {
    const id = objectId.safeParse(req.params.id)
    if (!id.success) {
      throw new DomainError('invalid reconfirmation id', 'validation')
    }
    ok(res, await confirmMembership(deps.repo, actor(res), id.data, new Date()))
  })
  return r
}
