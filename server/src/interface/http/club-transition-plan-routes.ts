import { Router } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubTransitionPlanRepository } from "../../domain/club-transition-plan.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { clubTransitionContext, writeClubTransition } from "../../usecase/club-transition-plan.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";
const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const transitionPlanBody = z.object({ toTerm: z.object({ name: z.string().max(200), startAt: z.string().datetime(), endAt: z.string().datetime() }).strict(),
  candidates: z.array(z.object({ positionCode: z.string().min(1).max(100), membershipId: id }).strict()).max(30),
  handoverItems: z.array(z.object({ id: z.string().min(1).max(100), description: z.string().max(2000) }).strict()).max(100),
  assignees: z.record(z.string().max(100), id), earlyReason: z.string().max(2000).optional() }).strict();
export const transitionRevisionBody = z.object({ revision: z.number().int().nonnegative() }).strict();
export const transitionPlanSaveBody = transitionPlanBody.extend({ revision: z.number().int().nonnegative() }).strict();
function parse<T>(schema: z.ZodType<T>, value: unknown): T { const r = schema.safeParse(value); if (!r.success) throw new DomainError("invalid transition plan request", "validation", r.error.issues); return r.data; }
export function clubTransitionPlanRoutes(deps: { repo: ClubTransitionPlanRepository; access: ClubAccessRepository; authRepo: AuthRepository; sessions: SessionService }): Router {
  const r = Router(); const guard = { repo: deps.authRepo, sessions: deps.sessions };
  r.get("/clubs/:clubId/transition-plans", authGuard(guard, false), async (req, res) => {
    ok(res, await clubTransitionContext(deps.repo, deps.access, res.locals.actor as AccessActor, parse(id, req.params.clubId), new Date()));
  });
  r.post("/clubs/:clubId/transition-plans", authGuard(guard), async (req, res) => {
    const b = parse(transitionPlanBody, req.body);
    ok(res, await writeClubTransition(deps.repo, deps.access, res.locals.actor as AccessActor, parse(id, req.params.clubId),
      { input: { ...b, toTerm: { ...b.toTerm, startAt: new Date(b.toTerm.startAt), endAt: new Date(b.toTerm.endAt) } } }, new Date()), 201);
  });
  r.put("/clubs/:clubId/transition-plans/:id", authGuard(guard), async (req, res) => {
    const { revision, ...b } = parse(transitionPlanSaveBody, req.body);
    ok(res, await writeClubTransition(deps.repo, deps.access, res.locals.actor as AccessActor, parse(id, req.params.clubId),
      { id: parse(id, req.params.id), revision, input: { ...b, toTerm: { ...b.toTerm, startAt: new Date(b.toTerm.startAt), endAt: new Date(b.toTerm.endAt) } } }, new Date()));
  });
  r.post("/clubs/:clubId/transition-plans/:id/submit", authGuard(guard), async (req, res) => {
    ok(res, await writeClubTransition(deps.repo, deps.access, res.locals.actor as AccessActor, parse(id, req.params.clubId),
      { id: parse(id, req.params.id), revision: parse(transitionRevisionBody, req.body).revision }, new Date()));
  });
  return r;
}
