import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { PostEventReportRepository } from "../../domain/post-event-report.js";
import type { SessionService } from "../../domain/session.js";
import { VIOLATION_SEVERITIES } from "../../domain/violation.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  decidePostEventReport, getPostEventReport, postEventReportQueue, recordMissingPostEventReport, type PostEventReportDeps,
} from "../../usecase/post-event-report.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface PostEventReportRouteDeps {
  repo: PostEventReportRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const postEventDecisionBody = z.object({
  outcome: z.enum(["Accept", "Return", "AcceptWithFinding"]),
  reason: z.string().max(5_000).optional(),
  finding: z.object({ severity: z.enum(VIOLATION_SEVERITIES), title: z.string().max(200),
    description: z.string().max(5_000).optional() }).strict().optional(),
}).strict();
export const missingReportBody = z.object({
  severity: z.enum(VIOLATION_SEVERITIES),
  note: z.string().max(2_000).optional(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid post-event report request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function postEventReportRoutes(deps: PostEventReportRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  const usecase: PostEventReportDeps = { repo: deps.repo, policy: deps.policy, auth: deps.authRepo };

  router.get("/admin/event-reports", authGuard(guard, false), async (_req, res) => {
    ok(res, await postEventReportQueue(usecase, actor(res), new Date()));
  });
  router.post("/admin/event-reports/missing/:eventId", authGuard(guard), async (req, res) => {
    ok(res, await recordMissingPostEventReport(usecase, actor(res), parsed(id, req.params.eventId),
      parsed(missingReportBody, req.body), new Date()), 201);
  });
  router.get("/admin/event-reports/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getPostEventReport(usecase, actor(res), parsed(id, req.params.id), new Date()));
  });
  router.post("/admin/event-reports/:id/decision", authGuard(guard), async (req, res) => {
    ok(res, await decidePostEventReport(usecase, actor(res), parsed(id, req.params.id),
      parsed(postEventDecisionBody, req.body), new Date()));
  });

  return router;
}
