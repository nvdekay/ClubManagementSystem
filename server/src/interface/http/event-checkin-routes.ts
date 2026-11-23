import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import { DomainError } from "../../domain/errors.js";
import type { EventCheckInRepository } from "../../domain/event-checkin.js";
import type { PolicyRepository } from "../../domain/policy.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import { checkInToEvent, listMyAttendances } from "../../usecase/event-checkin.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface EventCheckInRouteDeps {
  repo: EventCheckInRepository;
  policy: PolicyRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const eventCheckInBody = z.object({ code: z.string().trim().min(1).max(64) }).strict();

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid check-in request", "validation", result.error.issues);
  return result.data;
}

// Lấy actor đã xác thực từ res.locals, thiếu thì báo unauthorized
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

// Mount các route điểm danh sự kiện của sinh viên
export function eventCheckInRoutes(deps: EventCheckInRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };
  // Sinh viên điểm danh vào sự kiện
  router.post("/events/:id/check-in", authGuard(guard), async (req, res) => {
    const body = parsed(eventCheckInBody, req.body);
    ok(res, await checkInToEvent(deps.repo, deps.policy, actor(res), parsed(id, req.params.id),
      body.code, new Date()));
  });
  // Liệt kê lịch sử điểm danh của tôi
  router.get("/attendances/mine", authGuard(guard, false), async (_req, res) => {
    ok(res, await listMyAttendances(deps.repo, deps.policy, actor(res), new Date()));
  });
  return router;
}
