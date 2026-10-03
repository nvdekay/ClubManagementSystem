import { Router, type Response } from "express";
import { z } from "zod";
import type { AccountAdminRepository } from "../../domain/account-admin.js";
import { DomainError } from "../../domain/errors.js";
import type { SessionService } from "../../domain/session.js";
import type { AuthRepository } from "../../domain/auth.js";
import { changeSystemRole, searchAdminUsers, setAccountLock } from "../../usecase/account-admin.js";
import type { AccessActor } from "../../usecase/access.js";
import { authGuard } from "./auth-routes.js";
import { ok } from "./response.js";

export interface AccountAdminRouteDeps {
  adminRepo: AccountAdminRepository;
  authRepo: AuthRepository;
  sessions: SessionService;
}

const roleBody = z.object({ roleCode: z.string(), reason: z.string().optional() }).strict();
const reasonBody = z.object({ reason: z.string() }).strict();

function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined;
  if (!value) throw new DomainError("authentication required", "unauthorized");
  return value;
}

function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new DomainError("invalid request body", "validation", result.error.issues);
  return result.data;
}

function param(value: unknown): string {
  return parsed(z.string(), value);
}

export function accountAdminRoutes(deps: AccountAdminRouteDeps): Router {
  const router = Router();
  const guardDeps = { repo: deps.authRepo, sessions: deps.sessions };

  router.get("/admin/users", authGuard(guardDeps, false), async (req, res) => {
    ok(res, await searchAdminUsers(deps.adminRepo, actor(res), req.query.search));
  });

  router.post("/admin/users/:id/roles", authGuard(guardDeps), async (req, res) => {
    const body = parsed(roleBody, req.body);
    await changeSystemRole(deps.adminRepo, deps.sessions, actor(res), param(req.params.id),
      body.roleCode, "grant", body.reason, new Date());
    ok(res, { changed: true });
  });

  router.delete("/admin/users/:id/roles/:roleCode", authGuard(guardDeps), async (req, res) => {
    const body = parsed(reasonBody, req.body);
    await changeSystemRole(deps.adminRepo, deps.sessions, actor(res), param(req.params.id),
      param(req.params.roleCode), "revoke", body.reason, new Date());
    ok(res, { changed: true });
  });

  router.post("/admin/users/:id/lock", authGuard(guardDeps), async (req, res) => {
    const body = parsed(reasonBody, req.body);
    await setAccountLock(deps.adminRepo, deps.sessions, actor(res), param(req.params.id),
      true, body.reason, new Date());
    ok(res, { changed: true });
  });

  router.post("/admin/users/:id/unlock", authGuard(guardDeps), async (req, res) => {
    const body = parsed(reasonBody, req.body);
    await setAccountLock(deps.adminRepo, deps.sessions, actor(res), param(req.params.id),
      false, body.reason, new Date());
    ok(res, { changed: true });
  });

  return router;
}
