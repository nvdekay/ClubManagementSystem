import { Router, type Response } from "express";
import { z } from "zod";
import type { ClubAccessRepository } from "../../domain/access.js";
import type { AuthRepository, AuthUser } from "../../domain/auth.js";
import type { DashboardRepository } from "../../domain/dashboard.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import {
  getClubBoardHistory, getDashboard, type DashboardContext,
} from "../../usecase/dashboard.js";
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



// Lấy người dùng đã xác thực từ res.locals
function actor(res: Response): AuthUser {
  const value = res.locals.actor as AuthUser | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

// Mount các route dashboard và sự kiện nội bộ theo workspace
export function dashboardRoutes(deps: DashboardRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  // Lấy dữ liệu dashboard theo workspace của người dùng
  router.get("/dashboard", authGuard(guard, false), async (req, res) => {
    const query = dashboardQuery.safeParse(req.query);
    if (!query.success) {
      throw new DomainError("invalid dashboard context", "validation", query.error.issues);
    }
    ok(res, await getDashboard(
      deps.repo, deps.authRepo, deps.accessRepo, actor(res), query.data as DashboardContext,
    ));
  });
  // Liệt kê sự kiện nội bộ trên dashboard
  // Drill-down UC02: ICPDP mở một con số trên dashboard thành các bản ghi phía sau nó (FR-UC02-02/03).
  // Xem lịch sử ban chủ nhiệm của một CLB
  router.get("/dashboard/clubs/:clubId/board-history", authGuard(guard, false), async (req, res) => {
    ok(res, await getClubBoardHistory(deps.repo, deps.authRepo, deps.accessRepo, actor(res), String(req.params.clubId)));
  });
  return router;
}
