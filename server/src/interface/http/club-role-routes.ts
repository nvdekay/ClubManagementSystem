import { Router, type Response } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubRoleRepository } from "../../domain/club-role.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  assignClubRole,
  createClubRole,
  deactivateClubRole,
  getClubRoleDirectory,
  getClubRoles,
  revokeClubRole,
  updateClubRole,
} from "../../usecase/club-role.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface ClubRoleRouteDeps {
  repo: ClubRoleRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const clubRoleBody = z.object({
  name: z.string().max(120), unit: z.string().max(120).optional(),
  isSingleHolder: z.boolean(), permissionCodes: z.array(z.string().max(64)).max(32),
  reason: z.string().max(500).optional(),
}).strict();
export const clubRoleAssignmentBody = z.object({
  membershipId: z.string().max(24),
  effectiveFrom: z.string().datetime().optional(), effectiveTo: z.string().datetime().optional(),
}).strict();

function assignment(input: z.infer<typeof clubRoleAssignmentBody>) {
  return { membershipId: input.membershipId,
    ...(input.effectiveFrom ? { effectiveFrom: new Date(input.effectiveFrom) } : {}),
    ...(input.effectiveTo ? { effectiveTo: new Date(input.effectiveTo) } : {}) };
}

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid club role request", "validation", result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function clubRoleRoutes(deps: ClubRoleRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/clubs/:clubId/role-directory", authGuard(guard, false), async (req, res) => {
    ok(res, await getClubRoleDirectory(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId)));
  });
  router.get("/clubs/:clubId/roles", authGuard(guard, false), async (req, res) => {
    ok(res, await getClubRoles(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId)));
  });
  router.post("/clubs/:clubId/roles", authGuard(guard), async (req, res) => {
    ok(res, await createClubRole(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId),
      parsed(clubRoleBody, req.body), new Date()), 201);
  });
  router.patch("/clubs/:clubId/roles/:roleId", authGuard(guard), async (req, res) => {
    ok(res, await updateClubRole(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId),
      parsed(id, req.params.roleId), parsed(clubRoleBody, req.body), new Date()));
  });
  router.delete("/clubs/:clubId/roles/:roleId", authGuard(guard), async (req, res) => {
    ok(res, await deactivateClubRole(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId),
      parsed(id, req.params.roleId), new Date()));
  });
  router.post("/clubs/:clubId/roles/:roleId/assignments", authGuard(guard), async (req, res) => {
    ok(res, await assignClubRole(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId),
      parsed(id, req.params.roleId), assignment(parsed(clubRoleAssignmentBody, req.body)), new Date()), 201);
  });
  router.delete("/clubs/:clubId/roles/:roleId/assignments/:assignmentId", authGuard(guard), async (req, res) => {
    ok(res, await revokeClubRole(deps.repo, deps.accessRepo, actor(res), parsed(id, req.params.clubId),
      parsed(id, req.params.roleId), parsed(id, req.params.assignmentId), new Date()));
  });

  return router;
}
