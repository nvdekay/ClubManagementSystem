import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { ClubViolationRepository } from '../../domain/club-violation.js'
import { listClubViolations, respondClubViolation } from '../../usecase/club-violation.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { objectId as id, parse as parseInput, actor } from './request.js'
export const clubViolationResponseBody = z.object({ text: z.string().min(1).max(5000) }).strict()
export const correctiveSubmissionBody = z
  .object({
    note: z.string().min(1).max(5000),
    evidence: z
      .array(z.object({ note: z.string().max(1000), url: z.string().max(500).optional() }).strict())
      .max(20),
  })
  .strict()
// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  return parseInput(schema, value, 'compliance request')
}
// Mount các route CLB xem và phản hồi vi phạm
export function clubViolationRoutes(
  deps: SessionDeps & {
    repo: ClubViolationRepository
    access: ClubAccessRepository
  },
): Router {
  const r = Router()
  const { read, write } = guards(deps)
  // Liệt kê vi phạm của CLB
  r.get('/clubs/:clubId/violations', read, async (req, res) => {
    ok(
      res,
      await listClubViolations(
        deps.repo,
        deps.access,
        actor(res),
        parse(id, req.params.clubId),
        new Date(),
      ),
    )
  })
  // CLB gửi phản hồi cho một vi phạm
  r.post('/clubs/:clubId/violations/:id/response', write, async (req, res) => {
    await respondClubViolation(
      deps.repo,
      deps.access,
      actor(res),
      parse(id, req.params.clubId),
      parse(id, req.params.id),
      parse(clubViolationResponseBody, req.body),
      new Date(),
    )
    ok(res, { submitted: true })
  })
  // CLB nộp minh chứng cho một hành động khắc phục
  r.post('/clubs/:clubId/violations/:id/actions/:actionId/submission', write, async (req, res) => {
    await respondClubViolation(
      deps.repo,
      deps.access,
      actor(res),
      parse(id, req.params.clubId),
      parse(id, req.params.id),
      { ...parse(correctiveSubmissionBody, req.body), actionId: parse(id, req.params.actionId) },
      new Date(),
    )
    ok(res, { submitted: true })
  })
  return r
}
