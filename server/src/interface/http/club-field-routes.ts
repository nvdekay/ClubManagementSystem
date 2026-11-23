import { Router, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubFieldRepository } from "../../domain/club-field.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AccessActor } from "../../usecase/access.js";
import {
  createClubField, listClubFieldCatalog, removeClubField, updateClubField,
} from "../../usecase/club-field.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface ClubFieldRouteDeps {
  repo: ClubFieldRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const id = z.string().regex(/^[0-9a-f]{24}$/i);
export const clubFieldBody = z.object({
  name: z.string().max(100), sortOrder: z.number().int().min(0).max(10_000),
}).strict();

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid club field request", "validation", result.error.issues);
  return result.data;
}

// Lấy actor đã xác thực từ res.locals, thiếu thì báo unauthorized
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

// Mount các route danh mục lĩnh vực CLB của ICPDP
export function clubFieldRoutes(deps: ClubFieldRouteDeps): Router {
  const router = Router();
  const guard = { repo: deps.authRepo, sessions: deps.sessions };

  // Liệt kê danh mục lĩnh vực CLB
  router.get("/admin/club-fields", authGuard(guard, false), async (_req, res) => {
    ok(res, await listClubFieldCatalog(deps.repo, deps.authRepo, actor(res)));
  });
  // Tạo lĩnh vực CLB mới
  router.post("/admin/club-fields", authGuard(guard), async (req, res) => {
    ok(res, await createClubField(deps.repo, deps.authRepo, actor(res),
      parsed(clubFieldBody, req.body), new Date()), 201);
  });
  // Cập nhật lĩnh vực CLB
  router.patch("/admin/club-fields/:id", authGuard(guard), async (req, res) => {
    ok(res, await updateClubField(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      parsed(clubFieldBody, req.body), new Date()));
  });
  // Xoá lĩnh vực CLB
  router.delete("/admin/club-fields/:id", authGuard(guard), async (req, res) => {
    ok(res, await removeClubField(deps.repo, deps.authRepo, actor(res), parsed(id, req.params.id),
      new Date()));
  });

  return router;
}
