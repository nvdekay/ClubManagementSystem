import { Router } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubPeriodicReportRepository } from "../../domain/club-periodic-report.js";
import { DomainError } from "../../domain/errors.js";
import { CUSTOM_FIELD_TYPES } from "../../domain/periodic-report.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { changeClubPeriodicReport, createClubPeriodicReport, listClubPeriodicReports } from "../../usecase/club-periodic-report.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const clubPeriodicCreateBody = z.object({ periodCode: z.string().trim().min(1).max(100) }).strict();
export const clubPeriodicVersionBody = z.object({ revision: z.number().int().nonnegative() }).strict();

const memberEntryBody = z.object({
  userId: z.string().max(100).optional(),
  fullName: z.string().max(200),
  studentCode: z.string().max(100),
  email: z.string().max(320),
  activityScore: z.number().min(0).max(10),
  source: z.enum(["SYSTEM", "MANUAL"]).optional(),
}).strict();

const eventEntryBody = z.object({
  eventId: z.string().max(100).optional(),
  title: z.string().max(300),
  description: z.string().max(5_000),
  heldAt: z.string().max(100),
  participantCount: z.number().int().nonnegative(),
  evidenceUrl: z.string().max(1_500_000).optional(),
  evidenceNote: z.string().max(1_000).optional(),
  source: z.enum(["SYSTEM", "MANUAL"]).optional(),
}).strict();

const achievementEntryBody = z.object({
  title: z.string().max(300),
  description: z.string().max(5_000),
  evidenceUrl: z.string().max(1_500_000).optional(),
  evidenceNote: z.string().max(1_000).optional(),
}).strict();

const customAnswerBody = z.object({
  fieldId: z.string().max(100),
  label: z.string().max(200).optional(),
  type: z.enum(CUSTOM_FIELD_TYPES).optional(),
  textValue: z.string().max(10_000).optional(),
  numberValue: z.number().optional(),
  evidenceUrl: z.string().max(1_500_000).optional(),
}).strict();

export const clubPeriodicDraftBody = clubPeriodicVersionBody.extend({
  narrative: z.string().max(20_000).optional(),
  nextPlan: z.string().max(20_000).optional(),
  evidence: z.array(z.object({
    note: z.string().max(2_000).optional(),
    url: z.string().max(1_500_000).optional(),
  }).strict()).max(50).optional(),
  members: z.array(memberEntryBody).max(500).optional(),
  events: z.array(eventEntryBody).max(200).optional(),
  achievements: z.array(achievementEntryBody).max(100).optional(),
  customAnswers: z.array(customAnswerBody).max(50).optional(),
}).strict();

const path = z.object({ clubId: id, id: id.optional() });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DomainError("invalid periodic report request", "validation", result.error.issues);
  return result.data;
}

export function clubPeriodicReportRoutes(deps: {
  repo: ClubPeriodicReportRepository;
  policy: PolicyRepository;
  access: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/clubs/:clubId/periodic-reports", authGuard(guard, false), async (req, res) => {
    const { clubId } = parse(path, req.params);
    ok(res, await listClubPeriodicReports(deps.repo, deps.policy, deps.access, res.locals.actor as AccessActor, clubId, new Date()));
  });
  router.post("/clubs/:clubId/periodic-reports", authGuard(guard), async (req, res) => {
    const { clubId } = parse(path, req.params);
    ok(res, await createClubPeriodicReport(deps.repo, deps.policy, deps.access, res.locals.actor as AccessActor,
      clubId, parse(clubPeriodicCreateBody, req.body).periodCode, new Date()), 201);
  });
  router.put("/clubs/:clubId/periodic-reports/:id", authGuard(guard), async (req, res) => {
    const { clubId, id } = parse(path, req.params);
    const { revision, ...input } = parse(clubPeriodicDraftBody, req.body);
    ok(res, await changeClubPeriodicReport(deps.repo, deps.access, res.locals.actor as AccessActor,
      clubId, id!, revision, input, new Date()));
  });
  router.post("/clubs/:clubId/periodic-reports/:id/submit", authGuard(guard), async (req, res) => {
    const { clubId, id } = parse(path, req.params);
    ok(res, await changeClubPeriodicReport(deps.repo, deps.access, res.locals.actor as AccessActor,
      clubId, id!, parse(clubPeriodicVersionBody, req.body).revision, null, new Date()));
  });
  return router;
}
