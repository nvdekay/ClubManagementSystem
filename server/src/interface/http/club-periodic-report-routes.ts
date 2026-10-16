import { Router } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubPeriodicReportRepository } from "../../domain/club-periodic-report.js";
import { DomainError } from "../../domain/errors.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { changeClubPeriodicReport, createClubPeriodicReport, listClubPeriodicReports } from "../../usecase/club-periodic-report.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const clubPeriodicCreateBody = z.object({ periodCode: z.string().trim().min(1).max(100) }).strict();
export const clubPeriodicVersionBody = z.object({ revision: z.number().int().nonnegative() }).strict();
export const clubPeriodicDraftBody = clubPeriodicVersionBody.extend({ narrative: z.string().max(20_000),
  nextPlan: z.string().max(20_000), evidence: z.array(z.object({ note: z.string().max(2_000).optional(),
    url: z.string().max(2_000).optional() }).strict()).max(50) }).strict();
const path = z.object({ clubId: id, id: id.optional() });
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new DomainError("invalid periodic report request", "validation", result.error.issues);
  return result.data;
}
export function clubPeriodicReportRoutes(deps: { repo: ClubPeriodicReportRepository; policy: PolicyRepository;
  access: ClubAccessRepository; authRepo: AuthRepository; sessions: SessionService }): Router {
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
