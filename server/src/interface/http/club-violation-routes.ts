import { Router } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubViolationRepository } from "../../domain/club-violation.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { listClubViolations, respondClubViolation } from "../../usecase/club-violation.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";
const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const clubViolationResponseBody = z.object({ text: z.string().min(1).max(5000) }).strict();
export const correctiveSubmissionBody = z.object({ note: z.string().min(1).max(5000), evidence: z.array(z.object({ note: z.string().max(1000), url: z.string().max(500).optional() }).strict()).max(20) }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const r = schema.safeParse(value); if (!r.success) throw new DomainError("invalid compliance request", "validation", r.error.issues); return r.data; }
export function clubViolationRoutes(deps: { repo: ClubViolationRepository; access: ClubAccessRepository; authRepo: AuthRepository; sessions: SessionService }): Router {
  const r = Router(); const guard = { repo: deps.authRepo, sessions: deps.sessions };
  r.get("/clubs/:clubId/violations", authGuard(guard, false), async (req, res) => { ok(res, await listClubViolations(deps.repo, deps.access, res.locals.actor as AccessActor, parse(id, req.params.clubId), new Date())); });
  r.post("/clubs/:clubId/violations/:id/response", authGuard(guard), async (req, res) => { await respondClubViolation(deps.repo, deps.access, res.locals.actor as AccessActor, parse(id, req.params.clubId), parse(id, req.params.id), parse(clubViolationResponseBody, req.body), new Date()); ok(res, { submitted: true }); });
  r.post("/clubs/:clubId/violations/:id/actions/:actionId/submission", authGuard(guard), async (req, res) => { await respondClubViolation(deps.repo, deps.access, res.locals.actor as AccessActor, parse(id, req.params.clubId), parse(id, req.params.id), { ...parse(correctiveSubmissionBody, req.body), actionId: parse(id, req.params.actionId) }, new Date()); ok(res, { submitted: true }); });
  return r;
}
