import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { PolicyManagementRepository, PolicySettings } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import { createPolicyVersion, listPolicyVersions } from "../../usecase/policy.js";
import type { AccessActor } from "../../usecase/access.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface PolicyRouteDeps {
  repo: PolicyManagementRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const deadlineBody = z.object({
  reportType: z.string().min(1).max(100),
  dueDaysAfterPeriodEnd: z.number().int().nonnegative(),
  remindBeforeDays: z.number().int().nonnegative(),
  overdueAfterDays: z.number().int().nonnegative(),
  escalateAfterDays: z.number().int().nonnegative(),
}).strict();
const semesterBody = z.object({
  code: z.string().min(1).max(50),
  startAt: z.string().datetime({ offset: true }),
  endAt: z.string().datetime({ offset: true }),
}).strict();
export const policySettingsBody = z.object({
  allowedEmailDomains: z.array(z.string().min(1).max(255)).min(1),
  minFoundingMembers: z.number().int().positive(),
  mandatoryApplicationDocuments: z.array(z.string().min(1).max(100)),
  reportDeadlines: z.array(deadlineBody).min(1),
  conflictThresholdMinutes: z.number().int().nonnegative(),
  feedbackWindowHours: z.number().int().positive(),
  feedbackMinRespondents: z.number().int().min(2),
  allowOverbooking: z.boolean(),
  enforceOverdueReportBlock: z.boolean(),
  academicCalendar: z.array(semesterBody).min(1),
}).strict();
export const policyCreateBody = policySettingsBody.extend({
  effectiveFrom: z.string().datetime({ offset: true }).optional(),
  reason: z.string().max(1000).optional(),
}).strict();

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function policyRoutes(deps: PolicyRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/policies", authGuard(guard, false), async (_req, res) => {
    ok(res, await listPolicyVersions(deps.repo, deps.authRepo, actor(res), new Date()));
  });

  router.post("/admin/policies", authGuard(guard), async (req, res) => {
    const parsed = policyCreateBody.safeParse(req.body);
    if (!parsed.success) {
      throw new DomainError("invalid policy request", "validation", parsed.error.issues);
    }
    const { effectiveFrom, reason, academicCalendar, ...fields } = parsed.data;
    const settings: PolicySettings = {
      ...fields,
      academicCalendar: academicCalendar.map((semester) => ({
        ...semester, startAt: new Date(semester.startAt), endAt: new Date(semester.endAt),
      })),
    };
    ok(res, await createPolicyVersion(deps.repo, deps.authRepo, actor(res), settings,
      effectiveFrom ? new Date(effectiveFrom) : undefined, reason, new Date()), 201);
  });

  return router;
}
