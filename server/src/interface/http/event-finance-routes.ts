import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import {
  EVIDENCE_TYPES,
  type EventFinanceRepository,
  type FinanceAction,
} from "../../domain/event-finance.js";
import type { SessionService } from "../../domain/session.js";
import { DomainError } from "../../domain/errors.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  actOnEventFinance,
  getEventFinance,
  listEventFinances,
} from "../../usecase/event-finance.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";
export const financePath = z.object({
  clubId: z.string().regex(/^[0-9a-f]{24}$/i),
  id: z.string().regex(/^[0-9a-f]{24}$/i),
});
const revision = z.number().int().nonnegative();
export const financeActionBody = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("expense"),
      revision,
      expenseId: z
        .string()
        .regex(/^[0-9a-f]{24}$/i)
        .optional(),
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
      kind: z.literal("evidence"),
      revision,
      expenseId: z.string().regex(/^[0-9a-f]{24}$/i),
      input: z
        .object({
          type: z.enum(EVIDENCE_TYPES),
          externalLink: z.string().url().max(2000),
        })
        .strict(),
    })
    .strict(),
  z.object({ kind: z.literal("submit"), revision }).strict(),
  z.object({ kind: z.literal("claim"), revision }).strict(),
  z
    .object({
      kind: z.literal("return"),
      revision,
      reason: z.string().min(1).max(2000),
    })
    .strict(),
  z
    .object({
      kind: z.literal("finalize"),
      revision,
      overdue: z.boolean().optional(),
      reviews: z.array(
        z
          .object({
            expenseId: z.string().regex(/^[0-9a-f]{24}$/i),
            outcome: z.enum(["Accepted", "Rejected"]),
            reason: z.string().min(1).max(2000),
          })
          .strict(),
      ),
    })
    .strict(),
]);
function parsed<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new DomainError(
      "invalid finance request",
      "validation",
      result.error.issues,
    );
  return result.data;
}
function actor(res: Response) {
  return res.locals.actor as AccessActor;
}
export function eventFinanceRoutes(deps: {
  repo: EventFinanceRepository;
  access: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}) {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  const usecaseDeps = {
    repo: deps.repo,
    access: deps.access,
    auth: deps.authRepo,
  };
  router.get(
    "/clubs/:clubId/budgets",
    authGuard(guard, false),
    async (req, res) => {
      ok(
        res,
        await listEventFinances(
          usecaseDeps,
          actor(res),
          parsed(financePath.shape.clubId, req.params.clubId),
          new Date(),
        ),
      );
    },
  );
  for (const base of [
    "/clubs/:clubId/budgets/:id",
    "/admin/budgets/:id/reconciliation",
  ]) {
    router.get(base, authGuard(guard, false), async (req, res) => {
      ok(
        res,
        await getEventFinance(
          usecaseDeps,
          actor(res),
          parsed(financePath.shape.id, req.params.id),
          req.params.clubId
            ? parsed(financePath.shape.clubId, req.params.clubId)
            : undefined,
          new Date(),
        ),
      );
    });
    router.post(`${base}/actions`, authGuard(guard), async (req, res) => {
      const body = parsed(financeActionBody, req.body);
      const action: FinanceAction =
        body.kind === "expense"
          ? {
              ...body,
              input: { ...body.input, spentAt: new Date(body.input.spentAt) },
            }
          : body;
      ok(
        res,
        await actOnEventFinance(
          usecaseDeps,
          actor(res),
          parsed(financePath.shape.id, req.params.id),
          req.params.clubId
            ? parsed(financePath.shape.clubId, req.params.clubId)
            : undefined,
          action,
          new Date(),
        ),
      );
    });
  }
  return router;
}
