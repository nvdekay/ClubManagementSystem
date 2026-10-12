import { Router, type Response } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository, AuthUser } from "../../domain/auth.js";
import type { DashboardRepository } from "../../domain/dashboard.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import { getDashboard, type DashboardContext } from "../../usecase/dashboard.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface DashboardRouteDeps {
  repo: DashboardRepository;
  accessRepo: ClubAccessRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

export const dashboardQuery = z.discriminatedUnion("workspace", [
  z.object({ workspace: z.literal("student") }).strict(),
  z.object({ workspace: z.literal("icpdp") }).strict(),
  z.object({
    workspace: z.literal("club"),
    clubId: z.string().regex(/^[0-9a-f]{24}$/i),
  }).strict(),
]);

function actor(res: Response): AuthUser {
  const value = res.locals.actor as AuthUser | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

export function dashboardRoutes(deps: DashboardRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  router.get("/dashboard", authGuard(guard, false), async (req, res) => {
    const query = dashboardQuery.safeParse(req.query);
    if (!query.success) {
      throw new DomainError("invalid dashboard context", "validation", query.error.issues);
    }
    ok(res, await getDashboard(
      deps.repo, deps.authRepo, deps.accessRepo, actor(res), query.data as DashboardContext,
    ));
  });
  return router;
}
