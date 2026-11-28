import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import type { ClubTransitionPlanRepository } from '../../domain/club-transition-plan.js'
import { clubTransitionContext, writeClubTransition } from '../../usecase/club-transition-plan.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { objectId as id, parse as parseInput, actor } from './request.js'
export const transitionPlanBody = z
  .object({
    toTerm: z
      .object({
        name: z.string().max(200),
        startAt: z.string().datetime(),
        endAt: z.string().datetime(),
      })
      .strict(),
    candidates: z
      .array(z.object({ positionCode: z.string().min(1).max(100), membershipId: id }).strict())
      .max(30),
    handoverItems: z
      .array(
        z.object({ id: z.string().min(1).max(100), description: z.string().max(2000) }).strict(),
      )
      .max(100),
    assignees: z.record(z.string().max(100), id),
    earlyReason: z.string().max(2000).optional(),
  })
  .strict()
export const transitionRevisionBody = z
  .object({ revision: z.number().int().nonnegative() })
  .strict()
export const transitionPlanSaveBody = transitionPlanBody
  .extend({ revision: z.number().int().nonnegative() })
  .strict()
// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  return parseInput(schema, value, 'transition plan request')
}
// Mount các route kế hoạch chuyển giao của CLB
export function clubTransitionPlanRoutes(
  deps: SessionDeps & {
    repo: ClubTransitionPlanRepository
    access: ClubAccessRepository
  },
): Router {
  const r = Router()
  const { read, write } = guards(deps)
  // Lấy ngữ cảnh và các kế hoạch chuyển giao của CLB
  r.get('/clubs/:clubId/transition-plans', read, async (req, res) => {
    ok(
      res,
      await clubTransitionContext(
        deps.repo,
        deps.access,
        actor(res),
        parse(id, req.params.clubId),
        new Date(),
      ),
    )
  })
  // Tạo kế hoạch chuyển giao mới
  r.post('/clubs/:clubId/transition-plans', write, async (req, res) => {
    const b = parse(transitionPlanBody, req.body)
    ok(
      res,
      await writeClubTransition(
        deps.repo,
        deps.access,
        actor(res),
        parse(id, req.params.clubId),
        {
          input: {
            ...b,
            toTerm: {
              ...b.toTerm,
              startAt: new Date(b.toTerm.startAt),
              endAt: new Date(b.toTerm.endAt),
            },
          },
        },
        new Date(),
      ),
      201,
    )
  })
  // Cập nhật kế hoạch chuyển giao
  r.put('/clubs/:clubId/transition-plans/:id', write, async (req, res) => {
    const { revision, ...b } = parse(transitionPlanSaveBody, req.body)
    ok(
      res,
      await writeClubTransition(
        deps.repo,
        deps.access,
        actor(res),
        parse(id, req.params.clubId),
        {
          id: parse(id, req.params.id),
          revision,
          input: {
            ...b,
            toTerm: {
              ...b.toTerm,
              startAt: new Date(b.toTerm.startAt),
              endAt: new Date(b.toTerm.endAt),
            },
          },
        },
        new Date(),
      ),
    )
  })
  // Nộp kế hoạch chuyển giao
  r.post('/clubs/:clubId/transition-plans/:id/submit', write, async (req, res) => {
    ok(
      res,
      await writeClubTransition(
        deps.repo,
        deps.access,
        actor(res),
        parse(id, req.params.clubId),
        {
          id: parse(id, req.params.id),
          revision: parse(transitionRevisionBody, req.body).revision,
        },
        new Date(),
      ),
    )
  })
  return r
}
