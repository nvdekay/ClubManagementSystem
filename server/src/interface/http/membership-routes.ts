import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { MembershipRepository } from "../../domain/membership.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { changeMembershipState, executeMembershipWithdrawal, listClubMemberships,
  listClubMembershipWithdrawalRequests, listMyMemberships,
  listMyMembershipWithdrawalRequests, requestMembershipWithdrawal } from "../../usecase/membership.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface MembershipRouteDeps {
  repo: MembershipRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);

function parsed<T>(schema: { safeParse(input: unknown):
  | { success: true; data: T }
  | { success: false; error: { issues: unknown } } }, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid membership request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function membershipRoutes(deps: MembershipRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/memberships/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyMemberships(deps.repo, actor(res)));
  });
  router.get("/memberships/withdrawal-requests/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyMembershipWithdrawalRequests(deps.repo, actor(res)));
  });
  router.post("/memberships/:membershipId/withdrawal-requests", authGuard(guard), async (req, res) => {
    const body = parsed(z.object({ reason: z.string().min(1).max(2000),
      requestedEffectiveDate: z.string().datetime() }).strict(), req.body);
    ok(res, await requestMembershipWithdrawal(deps.repo, actor(res), {
      membershipId: parsed(id, req.params.membershipId), reason: body.reason,
      requestedEffectiveDate: new Date(body.requestedEffectiveDate),
    }), 201);
  });
  router.get("/clubs/:clubId/memberships", authGuard(guard, false), async (req, res) => {
    ok(res, await listClubMemberships(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId)));
  });
  router.patch("/clubs/:clubId/memberships/:membershipId/state", authGuard(guard), async (req, res) => {
    const body = parsed(z.object({ state: z.enum(["Active", "Inactive", "Banned"]),
      effectiveDate: z.string().datetime(), reason: z.string().max(2000).optional() }).strict(), req.body);
    ok(res, await changeMembershipState(deps.repo, deps.accessRepo, actor(res), {
      clubId: parsed(id, req.params.clubId), membershipId: parsed(id, req.params.membershipId),
      state: body.state, effectiveDate: new Date(body.effectiveDate),
      ...(body.reason ? { reason: body.reason } : {}),
    }));
  });
  router.get("/clubs/:clubId/membership-withdrawals", authGuard(guard, false), async (req, res) => {
    ok(res, await listClubMembershipWithdrawalRequests(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId)));
  });
  router.post("/clubs/:clubId/membership-withdrawals/:requestId/execute", authGuard(guard), async (req, res) => {
    ok(res, await executeMembershipWithdrawal(deps.repo, deps.accessRepo, actor(res), {
      clubId: parsed(id, req.params.clubId), requestId: parsed(id, req.params.requestId),
    }));
  });
  return router;
}
