import { Router } from 'express'
import { z } from 'zod'
import {
  LIFECYCLE_LINKS,
  MAX_CORRECTIVE_ACTIONS,
  VIOLATION_FILTERS,
  VIOLATION_ORIGINS,
  VIOLATION_SEVERITIES,
  type ViolationRepository,
  type ViolationStep,
} from '../../domain/violation.js'
import {
  applyViolationCaseStep,
  getViolation,
  getViolationSources,
  listViolations,
  openViolation,
} from '../../usecase/violation.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, pageQuery, parse, objectId as id } from './request.js'

export interface ViolationRouteDeps extends SessionDeps {
  repo: ViolationRepository
}

const evidence = z
  .object({ note: z.string().max(1_000), url: z.string().max(500).optional() })
  .strict()
const future = z.string().datetime()

export const violationListQuery = pageQuery
  .extend({ filter: z.enum(VIOLATION_FILTERS).default('all') })
  .strict()

export const violationOpenBody = z
  .object({
    clubId: id,
    originType: z.enum(VIOLATION_ORIGINS),
    originRefId: id.optional(),
    severity: z.enum(VIOLATION_SEVERITIES),
    title: z.string().min(1).max(200),
    description: z.string().max(5_000).optional(),
    evidence: z.array(evidence).max(20).optional(),
  })
  .strict()

export const violationStepBody = z.discriminatedUnion('type', [
  z.object({ type: z.literal('investigate') }).strict(),
  z.object({ type: z.literal('addEvidence'), evidence }).strict(),
  z
    .object({
      type: z.literal('requestResponse'),
      message: z.string().max(2_000),
      dueAt: future.optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('recordResponse'),
      text: z.string().max(5_000).optional(),
      noResponse: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('decide'),
      finding: z.enum(['VIOLATION', 'NO_VIOLATION']),
      reason: z.string().max(5_000),
      evidence: z.array(evidence).max(20).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('addActions'),
      actions: z
        .array(
          z
            .object({
              description: z.string().max(1_000),
              dueAt: future,
              linkedLifecycleAction: z.enum(LIFECYCLE_LINKS).optional(),
            })
            .strict(),
        )
        .min(1)
        .max(MAX_CORRECTIVE_ACTIONS),
    })
    .strict(),
  z
    .object({
      type: z.literal('verifyAction'),
      actionId: id,
      outcome: z.enum(['Verified', 'Failed']),
      note: z.string().max(1_000).optional(),
    })
    .strict(),
  z.object({ type: z.literal('resolve'), note: z.string().max(1_000).optional() }).strict(),
])

// Chuyển body bước xử lý vi phạm sang ViolationStep
function step(body: z.infer<typeof violationStepBody>): ViolationStep {
  switch (body.type) {
    case 'requestResponse':
      return { ...body, dueAt: body.dueAt ? new Date(body.dueAt) : undefined }
    case 'addActions':
      return {
        ...body,
        actions: body.actions.map((item) => ({ ...item, dueAt: new Date(item.dueAt) })),
      }
    default:
      return body
  }
}

// Mount các route ICPDP quản lý vi phạm của CLB
export function violationRoutes(deps: ViolationRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // ICPDP liệt kê các vi phạm
  router.get('/admin/violations', read, async (req, res) => {
    const query = parse(violationListQuery, req.query, 'violation list query')
    ok(res, await listViolations(deps.repo, deps.authRepo, actor(res), query))
  })
  // Lấy các nguồn dữ liệu có thể dẫn tới vi phạm của CLB
  router.get('/admin/violations/sources/:clubId', read, async (req, res) => {
    ok(
      res,
      await getViolationSources(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.clubId, 'violation request'),
      ),
    )
  })
  // Xem chi tiết một vi phạm
  router.get('/admin/violations/:id', read, async (req, res) => {
    ok(
      res,
      await getViolation(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'violation request'),
        new Date(),
      ),
    )
  })
  // Mở hồ sơ vi phạm mới
  router.post('/admin/violations', write, async (req, res) => {
    ok(
      res,
      await openViolation(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(violationOpenBody, req.body, 'violation request'),
        new Date(),
      ),
      201,
    )
  })
  // Áp dụng một bước xử lý cho hồ sơ vi phạm
  router.post('/admin/violations/:id/steps', write, async (req, res) => {
    ok(
      res,
      await applyViolationCaseStep(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'violation request'),
        step(parse(violationStepBody, req.body, 'violation request')),
        new Date(),
      ),
    )
  })

  return router
}
