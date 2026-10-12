import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { BUDGET_FLOW_KINDS, type BudgetDisbursementRepository } from "../../domain/budget-disbursement.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { getBudget, listBudgets, recordBudgetFlow } from "../../usecase/budget-disbursement.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface BudgetDisbursementRouteDeps {
  repo: BudgetDisbursementRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const budgetFlowBody = z.object({
  kind: z.enum(BUDGET_FLOW_KINDS),
  amount: z.number().int().positive(),
  disbursedAt: z.string().datetime().optional(),
  paymentReference: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid budget request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function budgetDisbursementRoutes(deps: BudgetDisbursementRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/budgets", authGuard(guard, false), async (_req, res) => {
    ok(res, await listBudgets(deps.repo, deps.authRepo, actor(res)));
  });
  router.get("/admin/budgets/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getBudget(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id)));
  });
  router.post("/admin/budgets/:id/flows", authGuard(guard), async (req, res) => {
    const body = parsed(budgetFlowBody, req.body);
    ok(res, await recordBudgetFlow(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), {
      ...body,
      disbursedAt: body.disbursedAt ? new Date(body.disbursedAt) : undefined,
    }, new Date()));
  });

  return router;
}
