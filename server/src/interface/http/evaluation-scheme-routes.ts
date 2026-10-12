import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { EvaluationSchemeRepository } from "../../domain/evaluation-scheme.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  activateEvaluationScheme, createEvaluationScheme, deleteEvaluationScheme, listEvaluationSchemes,
  updateEvaluationScheme,
} from "../../usecase/evaluation-scheme.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface EvaluationSchemeRouteDeps {
  repo: EvaluationSchemeRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const evaluationSchemeCreateBody = z.object({
  periodCode: z.string().min(1).max(50), copyFromId: id.optional(),
}).strict();
export const evaluationSchemeSettingsBody = z.object({
  dimensions: z.array(z.object({
    code: z.enum(["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"]),
    weight: z.number(), allowsManual: z.boolean(),
  }).strict()).max(8),
  thresholds: z.object({ excellent: z.number(), good: z.number(), fair: z.number() }).strict(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid evaluation scheme request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function evaluationSchemeRoutes(deps: EvaluationSchemeRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/evaluation-schemes", authGuard(guard, false), async (_req, res) => {
    ok(res, await listEvaluationSchemes(deps.repo, deps.policy, deps.authRepo, actor(res), new Date()));
  });
  router.post("/admin/evaluation-schemes", authGuard(guard), async (req, res) => {
    ok(res, await createEvaluationScheme(deps.repo, deps.policy, deps.authRepo, actor(res),
      parsed(evaluationSchemeCreateBody, req.body), new Date()), 201);
  });
  router.patch("/admin/evaluation-schemes/:id", authGuard(guard), async (req, res) => {
    ok(res, await updateEvaluationScheme(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(evaluationSchemeSettingsBody, req.body), new Date()));
  });
  router.post("/admin/evaluation-schemes/:id/activate", authGuard(guard), async (req, res) => {
    ok(res, await activateEvaluationScheme(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      new Date()));
  });
  router.delete("/admin/evaluation-schemes/:id", authGuard(guard), async (req, res) => {
    ok(res, await deleteEvaluationScheme(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      new Date()));
  });

  return router;
}
