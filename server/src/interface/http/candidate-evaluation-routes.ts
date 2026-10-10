import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { CandidateEvaluationRepository } from "../../domain/candidate-evaluation.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { listCandidateEvaluations, recordCandidateEvaluation } from "../../usecase/candidate-evaluation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface CandidateEvaluationRouteDeps {
  repo: CandidateEvaluationRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const candidateEvaluationBody = z.object({
  scores: z.record(z.string().max(50), z.number()),
  comment: z.string().max(2000).optional(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid candidate evaluation request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function candidateEvaluationRoutes(deps: CandidateEvaluationRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/clubs/:clubId/recruitment/campaigns/:campaignId/evaluations", authGuard(guard, false),
    async (req, res) => {
      ok(res, await listCandidateEvaluations(deps.repo, deps.accessRepo, actor(res),
        parsed(id, req.params.clubId), parsed(id, req.params.campaignId)));
    });
  router.put("/clubs/:clubId/recruitment/campaigns/:campaignId/applications/:applicationId/evaluation",
    authGuard(guard), async (req, res) => {
      const body = parsed(candidateEvaluationBody, req.body);
      ok(res, await recordCandidateEvaluation(deps.repo, deps.accessRepo, actor(res), {
        clubId: parsed(id, req.params.clubId), campaignId: parsed(id, req.params.campaignId),
        applicationId: parsed(id, req.params.applicationId), scores: body.scores,
        ...(body.comment !== undefined ? { comment: body.comment } : {}),
      }));
    });
  return router;
}
