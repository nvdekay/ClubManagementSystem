import { Router } from 'express'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { ClubEvaluationRepository } from '../../domain/club-evaluation.js'
import { DomainError } from '../../domain/errors.js'
import { publishedClubEvaluations } from '../../usecase/club-evaluation.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { objectId, actor } from './request.js'
// Mount route xem kết quả đánh giá đã công bố của CLB
export function clubEvaluationRoutes(
  deps: SessionDeps & {
    repo: ClubEvaluationRepository
    access: ClubAccessRepository
  },
): Router {
  const r = Router()
  const { read } = guards(deps)
  // Xem các đánh giá CLB đã được công bố
  r.get('/clubs/:clubId/evaluations', read, async (req, res) => {
    const club = objectId.safeParse(req.params.clubId)
    if (!club.success) {
      throw new DomainError('invalid club id', 'validation')
    }
    ok(
      res,
      await publishedClubEvaluations(deps.repo, deps.access, actor(res), club.data, new Date()),
    )
  })
  return r
}
