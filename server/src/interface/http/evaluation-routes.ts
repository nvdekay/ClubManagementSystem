import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { EvaluationRepository } from "../../domain/evaluation.js";
import { EVALUATION_DIMENSIONS, type DimensionCode, type EvaluationSchemeRepository } from "../../domain/evaluation-scheme.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  evaluationOverview, finalizeEvaluation, generateEvaluations, getEvaluation, publishEvaluations, regenerateEvaluation,
  reopenEvaluation, setManualScore, type EvaluationDeps,
} from "../../usecase/evaluation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface EvaluationRouteDeps {
  repo: EvaluationRepository;
  schemes: EvaluationSchemeRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const periodCode = z.string().min(1).max(50);
const codes = EVALUATION_DIMENSIONS.map((dimension) => dimension.code) as [DimensionCode, ...DimensionCode[]];

export const evaluationOverviewQuery = z.object({ period: periodCode.optional() }).strict();
export const evaluationPeriodBody = z.object({ periodCode }).strict();
export const evaluationManualBody = z.object({
  dimensionCode: z.enum(codes),
  /** `null` clears the manual score and goes back to the computed one. */
  manual: z.object({ score: z.number().min(0).max(100), justification: z.string().max(2_000) }).strict().nullable(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid evaluation request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function evaluationRoutes(deps: EvaluationRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  const use: EvaluationDeps = { repo: deps.repo, schemes: deps.schemes, policy: deps.policy, auth: deps.authRepo };

  router.get("/admin/evaluations", authGuard(guard, false), async (req, res) => {
    ok(res, await evaluationOverview(use, actor(res), parsed(evaluationOverviewQuery, req.query).period, new Date()));
  });
  router.post("/admin/evaluations/generate", authGuard(guard), async (req, res) => {
    ok(res, await generateEvaluations(use, actor(res), parsed(evaluationPeriodBody, req.body).periodCode, new Date()));
  });
  router.post("/admin/evaluations/publish", authGuard(guard), async (req, res) => {
    ok(res, await publishEvaluations(use, actor(res), parsed(evaluationPeriodBody, req.body).periodCode, new Date()));
  });
  router.get("/admin/evaluations/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getEvaluation(use, actor(res), parsed(id, req.params.id)));
  });
  router.post("/admin/evaluations/:id/regenerate", authGuard(guard), async (req, res) => {
    ok(res, await regenerateEvaluation(use, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/evaluations/:id/manual", authGuard(guard), async (req, res) => {
    const body = parsed(evaluationManualBody, req.body);
    ok(res, await setManualScore(use, actor(res), parsed(id, req.params.id), body.dimensionCode, body.manual, new Date()));
  });
  router.post("/admin/evaluations/:id/finalize", authGuard(guard), async (req, res) => {
    ok(res, await finalizeEvaluation(use, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/evaluations/:id/reopen", authGuard(guard), async (req, res) => {
    ok(res, await reopenEvaluation(use, actor(res), parsed(id, req.params.id), new Date()));
  });

  return router;
}
