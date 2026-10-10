import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import { RETURN_SECTIONS, type PeriodicReportRepository } from "../../domain/periodic-report.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import { VIOLATION_SEVERITIES } from "../../domain/violation.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  decidePeriodicReport, getPeriodicReport, periodicReportOverview, recordMissingPeriodicReport, type PeriodicReportDeps,
} from "../../usecase/periodic-report.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface PeriodicReportRouteDeps {
  repo: PeriodicReportRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const periodicOverviewQuery = z.object({ period: z.string().max(50).optional() }).strict();
export const periodicDecisionBody = z.object({
  outcome: z.enum(["Accept", "Return"]),
  observation: z.string().max(2_000).optional(),
  reason: z.string().max(5_000).optional(),
  sections: z.array(z.enum(RETURN_SECTIONS)).max(RETURN_SECTIONS.length).optional(),
}).strict();
export const periodicMissingBody = z.object({
  clubId: id,
  periodCode: z.string().min(1).max(50),
  severity: z.enum(VIOLATION_SEVERITIES),
  note: z.string().max(2_000).optional(),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid periodic report request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function periodicReportRoutes(deps: PeriodicReportRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  const usecase: PeriodicReportDeps = { repo: deps.repo, policy: deps.policy, auth: deps.authRepo };

  router.get("/admin/periodic-reports", authGuard(guard, false), async (req, res) => {
    ok(res, await periodicReportOverview(usecase, actor(res), parsed(periodicOverviewQuery, req.query).period, new Date()));
  });
  router.post("/admin/periodic-reports/missing", authGuard(guard), async (req, res) => {
    ok(res, await recordMissingPeriodicReport(usecase, actor(res), parsed(periodicMissingBody, req.body), new Date()), 201);
  });
  router.get("/admin/periodic-reports/:id", authGuard(guard, false), async (req, res) => {
    ok(res, await getPeriodicReport(usecase, actor(res), parsed(id, req.params.id)));
  });
  router.post("/admin/periodic-reports/:id/decision", authGuard(guard), async (req, res) => {
    ok(res, await decidePeriodicReport(usecase, actor(res), parsed(id, req.params.id),
      parsed(periodicDecisionBody, req.body), new Date()));
  });

  return router;
}
