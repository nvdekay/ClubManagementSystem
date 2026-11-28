import { Router } from 'express'
import { z } from 'zod'
import type { ClubAccessRepository } from '../../domain/access.js'
import {
  EVIDENCE_TYPES,
  type EventFinanceRepository,
  type FinanceAction,
} from '../../domain/event-finance.js'
import {
  actOnEventFinance,
  getEventFinance,
  listEventFinances,
} from '../../usecase/event-finance.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId } from './request.js'
export const financePath = z.object({
  clubId: objectId,
  id: objectId,
})
const revision = z.number().int().nonnegative()
export const financeActionBody = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('expense'),
      revision,
      expenseId: objectId.optional(),
      input: z
        .object({
          category: z.string().min(1).max(100),
          amount: z.number().int().positive(),
          spentAt: z.string().datetime(),
          description: z.string().max(2000).optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('evidence'),
      revision,
      expenseId: objectId,
      input: z
        .object({
          type: z.enum(EVIDENCE_TYPES),
          externalLink: z.string().url().max(2000),
        })
        .strict(),
    })
    .strict(),
  z.object({ kind: z.literal('submit'), revision }).strict(),
  z.object({ kind: z.literal('claim'), revision }).strict(),
  z
    .object({
      kind: z.literal('return'),
      revision,
      reason: z.string().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      kind: z.literal('finalize'),
      revision,
      overdue: z.boolean().optional(),
      reviews: z.array(
        z
          .object({
            expenseId: objectId,
            outcome: z.enum(['Accepted', 'Rejected']),
            reason: z.string().min(1).max(2000),
          })
          .strict(),
      ),
    })
    .strict(),
])
// Mount các route tài chính sự kiện của CLB và ICPDP
export function eventFinanceRoutes(
  deps: SessionDeps & {
    repo: EventFinanceRepository
    access: ClubAccessRepository
  },
) {
  const router = Router()
  const { read, write } = guards(deps)
  const usecaseDeps = {
    repo: deps.repo,
    access: deps.access,
    auth: deps.authRepo,
  }
  // Liệt kê tài chính các sự kiện của CLB
  router.get('/clubs/:clubId/budgets', read, async (req, res) => {
    ok(
      res,
      await listEventFinances(
        usecaseDeps,
        actor(res),
        parse(financePath.shape.clubId, req.params.clubId, 'finance request'),
        new Date(),
      ),
    )
  })
  for (const base of ['/clubs/:clubId/budgets/:id', '/admin/budgets/:id/reconciliation']) {
    // Xem chi tiết tài chính một sự kiện
    router.get(base, read, async (req, res) => {
      ok(
        res,
        await getEventFinance(
          usecaseDeps,
          actor(res),
          parse(financePath.shape.id, req.params.id, 'finance request'),
          req.params.clubId
            ? parse(financePath.shape.clubId, req.params.clubId, 'finance request')
            : undefined,
          new Date(),
        ),
      )
    })
    // Thực hiện hành động trên tài chính sự kiện (vd ghi chi tiêu)
    router.post(`${base}/actions`, write, async (req, res) => {
      const body = parse(financeActionBody, req.body, 'finance request')
      const action: FinanceAction =
        body.kind === 'expense'
          ? {
              ...body,
              input: { ...body.input, spentAt: new Date(body.input.spentAt) },
            }
          : body
      ok(
        res,
        await actOnEventFinance(
          usecaseDeps,
          actor(res),
          parse(financePath.shape.id, req.params.id, 'finance request'),
          req.params.clubId
            ? parse(financePath.shape.clubId, req.params.clubId, 'finance request')
            : undefined,
          action,
          new Date(),
        ),
      )
    })
  }
  return router
}
