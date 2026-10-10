import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { BudgetReconciliationRepository } from "../../domain/budget-reconciliation.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import { VIOLATION_SEVERITIES } from "../../domain/violation.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  getReconciliation, openRecoveryCase, reconcileBudget, requestSettlementEvidence,
} from "../../usecase/budget-reconciliation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface BudgetReconciliationRouteDeps {
  repo: BudgetReconciliationRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const reconcileBody = z.object({
  reviews: z.array(z.object({ expenseId: id, outcome: z.enum(["Accepted", "Rejected"]),
    reason: z.string().max(1_000).optional() }).strict()).max(500),
}).strict();
export const evidenceRequestBody = z.object({ message: z.string().max(2_000) }).strict();
export const recoveryCaseBody = z.object({ severity: z.enum(VIOLATION_SEVERITIES) }).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid reconciliation request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function budgetReconciliationRoutes(deps: BudgetReconciliationRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/reconciliations/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getReconciliation(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/reconciliations/:id", authGuard(guard), async (req, res) => {
    ok(res, await reconcileBudget(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(reconcileBody, req.body).reviews, new Date()));
  });
  router.post("/admin/reconciliations/:id/evidence-request", authGuard(guard), async (req, res) => {
    ok(res, await requestSettlementEvidence(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(evidenceRequestBody, req.body).message, new Date()));
  });
  router.post("/admin/reconciliations/:id/case", authGuard(guard), async (req, res) => {
    ok(res, await openRecoveryCase(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(recoveryCaseBody, req.body).severity, new Date()), 201);
  });

  return router;
}
