import { Router } from "express";
import type { AuthRepository } from "../../domain/auth.js";
import type { NotificationRepository } from "../../domain/notification.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  markAllNotificationsRead, markNotificationRead, myNotifications, myUnreadNotificationCount,
} from "../../usecase/notification.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export function notificationRoutes(deps: { repo: NotificationRepository; authRepo: AuthRepository; sessions: SessionService }): Router {
  const r = Router(); const guard = { repo: deps.authRepo, sessions: deps.sessions };
  r.get("/notifications/mine", authGuard(guard, false), async (req, res) => {
    ok(res, await myNotifications(deps.repo, res.locals.actor as AccessActor, req.query));
  });
  r.get("/notifications/mine/unread-count", authGuard(guard, false), async (_req, res) => {
    ok(res, await myUnreadNotificationCount(deps.repo, res.locals.actor as AccessActor));
  });
  r.post("/notifications/mine/read-all", authGuard(guard), async (_req, res) => {
    ok(res, await markAllNotificationsRead(deps.repo, res.locals.actor as AccessActor, new Date()));
  });
  r.post("/notifications/:id/read", authGuard(guard), async (req, res) => {
    ok(res, await markNotificationRead(deps.repo, res.locals.actor as AccessActor, String(req.params.id), new Date()));
  });
  return r;
}
