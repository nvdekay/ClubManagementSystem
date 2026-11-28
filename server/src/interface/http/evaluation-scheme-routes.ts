import { Router } from 'express'
import { z } from 'zod'
import type { EvaluationSchemeRepository } from '../../domain/evaluation-scheme.js'
import type { PolicyRepository } from '../../domain/policy.js'
import {
  activateEvaluationScheme,
  createEvaluationScheme,
  deleteEvaluationScheme,
  listEvaluationSchemes,
  updateEvaluationScheme,
} from '../../usecase/evaluation-scheme.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId as id } from './request.js'

export interface EvaluationSchemeRouteDeps extends SessionDeps {
  repo: EvaluationSchemeRepository
  policy: PolicyRepository
}

export const evaluationSchemeCreateBody = z
  .object({
    periodCode: z.string().min(1).max(50),
    copyFromId: id.optional(),
  })
  .strict()
export const evaluationSchemeSettingsBody = z
  .object({
    dimensions: z
      .array(
        z
          .object({
            code: z.enum(['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8']),
            weight: z.number(),
            allowsManual: z.boolean(),
          })
          .strict(),
      )
      .max(8),
    thresholds: z.object({ excellent: z.number(), good: z.number(), fair: z.number() }).strict(),
  })
  .strict()

// Mount các route bộ tiêu chí đánh giá CLB của ICPDP
export function evaluationSchemeRoutes(deps: EvaluationSchemeRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // Liệt kê các bộ tiêu chí đánh giá
  router.get('/admin/evaluation-schemes', read, async (_req, res) => {
    ok(
      res,
      await listEvaluationSchemes(deps.repo, deps.policy, deps.authRepo, actor(res), new Date()),
    )
  })
  // Tạo bộ tiêu chí đánh giá
  router.post('/admin/evaluation-schemes', write, async (req, res) => {
    ok(
      res,
      await createEvaluationScheme(
        deps.repo,
        deps.policy,
        deps.authRepo,
        actor(res),
        parse(evaluationSchemeCreateBody, req.body, 'evaluation scheme request'),
        new Date(),
      ),
      201,
    )
  })
  // Cập nhật bộ tiêu chí đánh giá
  router.patch('/admin/evaluation-schemes/:id', write, async (req, res) => {
    ok(
      res,
      await updateEvaluationScheme(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'evaluation scheme request'),
        parse(evaluationSchemeSettingsBody, req.body, 'evaluation scheme request'),
        new Date(),
      ),
    )
  })
  // Kích hoạt bộ tiêu chí đánh giá
  router.post('/admin/evaluation-schemes/:id/activate', write, async (req, res) => {
    ok(
      res,
      await activateEvaluationScheme(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'evaluation scheme request'),
        new Date(),
      ),
    )
  })
  // Xoá bộ tiêu chí đánh giá
  router.delete('/admin/evaluation-schemes/:id', write, async (req, res) => {
    ok(
      res,
      await deleteEvaluationScheme(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'evaluation scheme request'),
        new Date(),
      ),
    )
  })

  return router
}
