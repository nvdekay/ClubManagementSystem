import { Router } from 'express'
import { z } from 'zod'
import {
  BUDGET_FILTERS,
  type BudgetDisbursementRepository,
} from '../../domain/budget-disbursement.js'
import { getBudget, listBudgets } from '../../usecase/budget-disbursement.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, pageQuery, parse, objectId as id } from './request.js'

export interface BudgetDisbursementRouteDeps extends SessionDeps {
  repo: BudgetDisbursementRepository
}

export const budgetListQuery = pageQuery
  .extend({ filter: z.enum(BUDGET_FILTERS).default('all'), clubId: id.optional() })
  .strict()

// Mount các route ngân sách và giải ngân của ICPDP
export function budgetDisbursementRoutes(deps: BudgetDisbursementRouteDeps): Router {
  const router = Router()
  const { read } = guards(deps)

  // Liệt kê ngân sách
  router.get('/admin/budgets', read, async (req, res) => {
    const query = parse(budgetListQuery, req.query, 'budget list query')
    ok(res, await listBudgets(deps.repo, deps.authRepo, actor(res), query))
  })
  // Xem chi tiết một ngân sách
  router.get('/admin/budgets/:id', read, async (req, res) => {
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
