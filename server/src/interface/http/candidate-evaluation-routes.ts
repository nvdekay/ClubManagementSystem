import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { CandidateEvaluationRepository } from '../../domain/candidate-evaluation.js'
import type { SessionService } from '../../domain/session.js'
import {
  listCandidateEvaluations,
  recordCandidateEvaluation,
} from '../../usecase/candidate-evaluation.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse } from './request.js'

export interface CandidateEvaluationRouteDeps {
  repo: CandidateEvaluationRepository
  accessRepo: ClubAccessRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const candidateEvaluationBody = z
  .object({
    scores: z.record(z.string().max(50), z.number()),
    comment: z.string().max(2000).optional(),
  })
  .strict()

// Mount các route đánh giá ứng viên của chiến dịch tuyển thành viên
export function candidateEvaluationRoutes(deps: CandidateEvaluationRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }
  // Liệt kê đánh giá ứng viên của một chiến dịch tuyển thành viên
  router.get(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/evaluations',
    authGuard(guard, false),
    async (req, res) => {
      ok(
        res,
        await listCandidateEvaluations(
          deps.repo,
          deps.accessRepo,
          actor(res),
          parse(id, req.params.clubId, 'candidate evaluation request'),
          parse(id, req.params.campaignId, 'candidate evaluation request'),
        ),
      )
    },
  )
  // Ghi hoặc cập nhật đánh giá cho một đơn ứng tuyển
  router.put(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/evaluation',
    authGuard(guard),
    async (req, res) => {
      const body = parse(candidateEvaluationBody, req.body, 'candidate evaluation request')
      ok(
        res,
        await recordCandidateEvaluation(deps.repo, deps.accessRepo, actor(res), {
          clubId: parse(id, req.params.clubId, 'candidate evaluation request'),
          campaignId: parse(id, req.params.campaignId, 'candidate evaluation request'),
          applicationId: parse(id, req.params.applicationId, 'candidate evaluation request'),
          scores: body.scores,
          ...(body.comment !== undefined ? { comment: body.comment } : {}),
        }),
      )
    },
  )
  return router
}
