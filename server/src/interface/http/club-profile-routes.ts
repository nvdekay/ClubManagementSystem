import { Router, type Response } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubProfileRepository } from "../../domain/club-profile.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  applyClubDepartmentTemplate,
  createClubDepartment,
  deactivateClubDepartment,
  getClubSettings,
  updateClubDepartment,
  updateClubProfile,
} from "../../usecase/club-profile.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface ClubProfileRouteDeps {
  repo: ClubProfileRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
const channelBody = z.object({
  label: z.string().max(100), url: z.string().max(2_000),
}).strict();
export const clubProfileBody = z.object({
  description: z.string().max(10_000).optional(),
  contactEmail: z.string().max(320).optional(),
  contactPhone: z.string().max(50).optional(),
  charterUrl: z.string().max(2_000).optional(),
  channels: z.array(channelBody).max(20),
  operatingScope: z.string().max(2_000).optional(),
}).strict();
export const clubDepartmentBody = z.object({
  name: z.string().max(120), description: z.string().max(2_000).optional(),
  sortOrder: z.number().int().min(0).max(10_000),
}).strict();

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid club settings request", "validation",
    result.error.issues);
  return result.data;
}

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function clubProfileRoutes(deps: ClubProfileRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/clubs/:clubId/settings", authGuard(guard, false), async (req, res) => {
    ok(res, await getClubSettings(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId)));
  });
  router.patch("/clubs/:clubId/profile", authGuard(guard), async (req, res) => {
    ok(res, await updateClubProfile(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId), parsed(clubProfileBody, req.body), new Date()));
  });
  router.post("/clubs/:clubId/departments/template", authGuard(guard), async (req, res) => {
    ok(res, await applyClubDepartmentTemplate(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId), new Date()));
  });
  router.post("/clubs/:clubId/departments", authGuard(guard), async (req, res) => {
    ok(res, await createClubDepartment(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId), parsed(clubDepartmentBody, req.body), new Date()), 201);
  });
  router.patch("/clubs/:clubId/departments/:departmentId", authGuard(guard), async (req, res) => {
    ok(res, await updateClubDepartment(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId), parsed(id, req.params.departmentId),
      parsed(clubDepartmentBody, req.body), new Date()));
  });
  router.delete("/clubs/:clubId/departments/:departmentId", authGuard(guard), async (req, res) => {
    ok(res, await deactivateClubDepartment(deps.repo, deps.accessRepo, actor(res),
      parsed(id, req.params.clubId), parsed(id, req.params.departmentId), new Date()));
  });

  return router;
}
