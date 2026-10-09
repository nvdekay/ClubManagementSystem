import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { LeadershipTransitionRepository } from "../../domain/leadership-transition.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  claimLeadershipTransition,
  decideLeadershipTransition,
  getLeadershipTransition,
  listLeadershipTransitions,
} from "../../usecase/leadership-transition.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface LeadershipTransitionRouteDeps {
  repo: LeadershipTransitionRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const transitionDecisionBody = z.object({
  outcome: z.enum(["Approve", "Request revision"]),
  reason: z.string().trim().max(5_000).optional(),
  followUpObligationIds: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid transition plan request", "validation",
    result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function leadershipTransitionRoutes(deps: LeadershipTransitionRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/admin/leadership-transitions", authGuard(guard, false), async (_req, res) => {
    ok(res, await listLeadershipTransitions(deps.repo, deps.authRepo, actor(res)));
  });
  router.get("/admin/leadership-transitions/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getLeadershipTransition(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id)));
  });
  router.post("/admin/leadership-transitions/:id/claim", authGuard(guard), async (req, res) => {
    ok(res, await claimLeadershipTransition(deps.repo, deps.authRepo, actor(res),
      parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/leadership-transitions/:id/decision", authGuard(guard), async (req, res) => {
    const body = parsed(transitionDecisionBody, req.body);
    ok(res, await decideLeadershipTransition(deps.repo, deps.authRepo, actor(res),
      parsed(id, req.params.id), { ...body, followUpObligationIds: body.followUpObligationIds ?? [] }, new Date()));
  });
  return router;
}
