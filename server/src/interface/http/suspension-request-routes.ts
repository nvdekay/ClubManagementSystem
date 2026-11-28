import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { SuspensionRequestRepository } from '../../domain/suspension-request.js'
import {
  reviewSuspensions,
  submitSuspension,
  suspensionContext,
} from '../../usecase/suspension-request.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { pageQuery, objectId as id, parse as parseInput, actor } from './request.js'
import { ok } from './response.js'
export const suspensionRequestBody = z
  .object({
    reason: z.string().max(2000),
    until: z.string().datetime(),
    obligationsPlan: z.string().max(5000),
    recoveryPlan: z.string().max(5000),
    acknowledgedImpactIds: z.array(z.string().max(100)).max(1000),
  })
  .strict()
export const suspensionListQuery = pageQuery.strict()
export const suspensionDecisionBody = z
  .object({ outcome: z.enum(['Approve', 'Reject']), reason: z.string().min(1).max(2000) })
  .strict()
// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  return parseInput(schema, value, 'suspension request')
}
// Mount các route yêu cầu tạm ngưng hoạt động CLB
export function suspensionRequestRoutes(
  deps: SessionDeps & {
    repo: SuspensionRequestRepository
    access: ClubAccessRepository
  },
): Router {
  const r = Router()
  const { read, write } = guards(deps)
  // Lấy ngữ cảnh và các yêu cầu tạm ngưng của CLB
  r.get('/clubs/:clubId/suspension-requests', read, async (req, res) => {
    ok(
      res,
      await suspensionContext(
        deps.repo,
        deps.access,
        actor(res),
        parse(id, req.params.clubId),
        new Date(),
      ),
    )
  })
  // CLB gửi yêu cầu tạm ngưng hoạt động
  r.post('/clubs/:clubId/suspension-requests', write, async (req, res) => {
    const b = parse(suspensionRequestBody, req.body)
    ok(
      res,
      await submitSuspension(
        deps.repo,
        deps.access,
        actor(res),
        parse(id, req.params.clubId),
        { ...b, until: new Date(b.until) },
        new Date(),
      ),
      201,
    )
  })
  // ICPDP liệt kê yêu cầu tạm ngưng cần xét
  r.get('/admin/suspension-requests', read, async (req, res) => {
    ok(
      res,
      await reviewSuspensions(
        deps.repo,
        deps.authRepo,
        actor(res),
        undefined,
        new Date(),
        parse(suspensionListQuery, req.query),
      ),
    )
  })
  // ICPDP ghi quyết định yêu cầu tạm ngưng
  r.post('/admin/suspension-requests/:id/decision', write, async (req, res) => {
    ok(
      res,
      await reviewSuspensions(deps.repo, deps.authRepo, actor(res), {
        id: parse(id, req.params.id),
        ...parse(suspensionDecisionBody, req.body),
      }),
    )
  })
  return r
}
