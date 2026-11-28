import { Router } from 'express'
import { z } from 'zod'
import type { EvaluationRepository } from '../../domain/evaluation.js'
import {
  EVALUATION_DIMENSIONS,
  type DimensionCode,
  type EvaluationSchemeRepository,
} from '../../domain/evaluation-scheme.js'
import type { PolicyRepository } from '../../domain/policy.js'
import {
  evaluationOverview,
  finalizeEvaluation,
  generateEvaluations,
  getEvaluation,
  publishEvaluations,
  regenerateEvaluation,
  reopenEvaluation,
  setManualScore,
  type EvaluationDeps,
} from '../../usecase/evaluation.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface EvaluationRouteDeps extends SessionDeps {
  repo: EvaluationRepository
  schemes: EvaluationSchemeRepository
  policy: PolicyRepository
}

const periodCode = z.string().min(1).max(50)
const codes = EVALUATION_DIMENSIONS.map((dimension) => dimension.code) as [
  DimensionCode,
  ...DimensionCode[],
]

export const evaluationOverviewQuery = z.object({ period: periodCode.optional() }).strict()
export const evaluationPeriodBody = z.object({ periodCode }).strict()
export const evaluationManualBody = z
  .object({
    dimensionCode: z.enum(codes),
    /** `null` xoá điểm nhập tay và quay về điểm đã tính. */
    manual: z
      .object({ score: z.number().min(0).max(100), justification: z.string().max(2_000) })
      .strict()
      .nullable(),
  })
  .strict()

// Mount các route đánh giá CLB của ICPDP
export function evaluationRoutes(deps: EvaluationRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)
  const use: EvaluationDeps = {
    repo: deps.repo,
    schemes: deps.schemes,
    policy: deps.policy,
    auth: deps.authRepo,
  }

  // Xem tổng quan các đánh giá CLB
  router.get('/admin/evaluations', read, async (req, res) => {
    ok(
      res,
      await evaluationOverview(
        use,
        actor(res),
        parse(evaluationOverviewQuery, req.query, 'evaluation request').period,
        new Date(),
      ),
    )
  })
  // Sinh đánh giá CLB theo bộ tiêu chí đang hiệu lực
  router.post('/admin/evaluations/generate', write, async (req, res) => {
    ok(
      res,
      await generateEvaluations(
        use,
        actor(res),
        parse(evaluationPeriodBody, req.body, 'evaluation request').periodCode,
        new Date(),
      ),
    )
  })
  // Công bố các đánh giá CLB
  router.post('/admin/evaluations/publish', write, async (req, res) => {
    ok(
      res,
      await publishEvaluations(
        use,
        actor(res),
        parse(evaluationPeriodBody, req.body, 'evaluation request').periodCode,
        new Date(),
      ),
    )
  })
  // Xem chi tiết một đánh giá CLB
  router.get('/admin/evaluations/:id', read, async (req, res) => {
    ok(res, await getEvaluation(use, actor(res), parse(id, req.params.id, 'evaluation request')))
  })
  // Tính lại một đánh giá CLB
  router.post('/admin/evaluations/:id/regenerate', write, async (req, res) => {
    ok(
      res,
      await regenerateEvaluation(
        use,
        actor(res),
        parse(id, req.params.id, 'evaluation request'),
        new Date(),
      ),
    )
  })
  // Nhập điểm thủ công cho đánh giá
  router.post('/admin/evaluations/:id/manual', write, async (req, res) => {
    const body = parse(evaluationManualBody, req.body, 'evaluation request')
    ok(
      res,
      await setManualScore(
        use,
        actor(res),
        parse(id, req.params.id, 'evaluation request'),
        body.dimensionCode,
        body.manual,
        new Date(),
      ),
    )
  })
  // Chốt (finalize) đánh giá CLB
  router.post('/admin/evaluations/:id/finalize', write, async (req, res) => {
    ok(
      res,
      await finalizeEvaluation(
        use,
        actor(res),
        parse(id, req.params.id, 'evaluation request'),
        new Date(),
      ),
    )
  })
  // Mở lại đánh giá đã chốt
  router.post('/admin/evaluations/:id/reopen', write, async (req, res) => {
    ok(
      res,
      await reopenEvaluation(
        use,
        actor(res),
        parse(id, req.params.id, 'evaluation request'),
        new Date(),
      ),
    )
  })

  return router
}
