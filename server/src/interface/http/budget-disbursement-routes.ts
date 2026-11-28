import { Router } from 'express'
import { z } from 'zod'
import type { AuthRepository } from '../../domain/auth.js'
import {
  BUDGET_FILTERS,
  type BudgetDisbursementRepository,
} from '../../domain/budget-disbursement.js'
import type { SessionService } from '../../domain/session.js'
import { getBudget, listBudgets } from '../../usecase/budget-disbursement.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'
import { actor, pageQuery, parse } from './request.js'

export interface BudgetDisbursementRouteDeps {
  repo: BudgetDisbursementRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const id = z.string().regex(/^[0-9a-f]{24}$/i)
export const budgetListQuery = pageQuery
  .extend({ filter: z.enum(BUDGET_FILTERS).default('all'), clubId: id.optional() })
  .strict()

// Mount các route ngân sách và giải ngân của ICPDP
export function budgetDisbursementRoutes(deps: BudgetDisbursementRouteDeps): Router {
  const router = Router()
  const guard = { repo: deps.authRepo, sessions: deps.sessions }

  // Liệt kê ngân sách
  router.get('/admin/budgets', authGuard(guard, false), async (req, res) => {
    const query = parse(budgetListQuery, req.query, 'budget list query')
    ok(res, await listBudgets(deps.repo, deps.authRepo, actor(res), query))
  })
  // Xem chi tiết một ngân sách
  router.get('/admin/budgets/:id', authGuard(guard, false), async (req, res) => {
    ok(
      res,
      await getBudget(
        deps.repo,
        deps.authRepo,
        actor(res),
        parse(id, req.params.id, 'budget request'),
      ),
    )
  })

  return router
}
