import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubLifecycleRepository } from "../../domain/club-lifecycle.js";
import { DomainError } from "../../domain/errors.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  dissolveClub, getClubLifecycle, listClubLifecycles, reactivateClub, suspendClub,
} from "../../usecase/club-lifecycle.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface ClubLifecycleRouteDeps {
  repo: ClubLifecycleRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const lifecycleReasonBody = z.object({ reason: z.string().max(2_000) }).strict();
export const suspendBody = lifecycleReasonBody.extend({
  until: z.string().datetime({ offset: true }).optional(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid club lifecycle request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function clubLifecycleRoutes(deps: ClubLifecycleRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/clubs", authGuard(guard, false), async (_req, res) => {
    ok(res, await listClubLifecycles(deps.repo, deps.authRepo, actor(res), new Date()));
  });
  router.get("/admin/clubs/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getClubLifecycle(deps.repo, deps.policy, deps.authRepo, actor(res), parsed(id, req.params.id),
      new Date()));
  });
  router.post("/admin/clubs/:id/suspend", authGuard(guard), async (req, res) => {
    const body = parsed(suspendBody, req.body);
    ok(res, await suspendClub(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      { reason: body.reason, ...(body.until ? { until: new Date(body.until) } : {}) }, new Date()));
  });
  router.post("/admin/clubs/:id/reactivate", authGuard(guard), async (req, res) => {
    ok(res, await reactivateClub(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(lifecycleReasonBody, req.body), new Date()));
  });
  router.post("/admin/clubs/:id/dissolve", authGuard(guard), async (req, res) => {
    ok(res, await dissolveClub(deps.repo, deps.policy, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(lifecycleReasonBody, req.body), new Date()));
  });

  return router;
}
