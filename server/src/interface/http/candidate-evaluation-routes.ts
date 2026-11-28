import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { CandidateEvaluationRepository } from '../../domain/candidate-evaluation.js'
import {
  listCandidateEvaluations,
  recordCandidateEvaluation,
} from '../../usecase/candidate-evaluation.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface CandidateEvaluationRouteDeps extends SessionDeps {
  repo: CandidateEvaluationRepository
  accessRepo: ClubAccessRepository
}

export const candidateEvaluationBody = z
  .object({
    scores: z.record(z.string().max(50), z.number()),
    comment: z.string().max(2000).optional(),
  })
  .strict()

// Mount các route đánh giá ứng viên của chiến dịch tuyển thành viên
export function candidateEvaluationRoutes(deps: CandidateEvaluationRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)
  // Liệt kê đánh giá ứng viên của một chiến dịch tuyển thành viên
  router.get(
    '/clubs/:clubId/recruitment/campaigns/:campaignId/evaluations',
    read,
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
    write,
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
