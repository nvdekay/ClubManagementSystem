import { timingSafeEqual } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import type { AuthRepository } from "../../domain/auth.js";
import type { ClubAccessRepository } from "../../domain/access.js";
import { DomainError } from "../../domain/errors.js";
import type { GoogleIdentityProvider } from "../../domain/google-identity.js";
import type { OAuthFlowService } from "../../domain/oauth-flow.js";
import type { SessionService } from "../../domain/session.js";
import { completeGoogleLogin, currentUser } from "../../usecase/auth.js";
import { ok } from "./response.js";

export interface AuthRouteDeps {
  repo: AuthRepository;
  accessRepo: ClubAccessRepository;
  sessions: SessionService;
  google: GoogleIdentityProvider;
  oauthFlow: OAuthFlowService;
  clientBaseUrl: string;
  secureCookies: boolean;
}

const callbackQuery = z.object({
  code: z.string().min(1), state: z.string().min(1),
});

function cookie(req: Request, name: string): string | undefined {
  const raw = req.headers.cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!raw) return undefined;
  try { return decodeURIComponent(raw.slice(name.length + 1)); }
  catch { return undefined; }
}

function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")
    || value.includes("\\") || value.length > 2000) return "/";
  return value;
}

function sameToken(left: string | undefined, right: string): boolean {
  if (!left) return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authGuard(deps: Pick<AuthRouteDeps, "repo" | "sessions">, csrfRequired = true) {
  return async function requireAuth(req: Request, _res: Response, next: NextFunction) {
    try {
      const resolved = await deps.sessions.resolve(cookie(req, "ucms_session"), new Date());
      if (!resolved) throw new DomainError("authentication required", "unauthorized");
      const user = await deps.repo.findUserById(resolved.session.userId);
      if (!user) throw new DomainError("authentication required", "unauthorized");
      if (user.accountState === "Locked") {
        throw new DomainError(user.lockReason || "account locked", "locked");
      }
      if (csrfRequired && !sameToken(req.header("X-CSRF-Token"), resolved.csrfToken)) {
        throw new DomainError("invalid CSRF token", "forbidden");
      }
      _res.locals.actor = user;
      next();
    } catch (error) { next(error); }
  };
}

export function authRoutes(deps: AuthRouteDeps): Router {
  const router = Router();
  const sessionCookie = {
    httpOnly: true, sameSite: "lax" as const, secure: deps.secureCookies, path: "/api/v1",
  };
  const oauthCookie = {
    httpOnly: true, sameSite: "lax" as const, secure: deps.secureCookies,
    path: "/api/v1/auth/callback",
  };
  const errorCookie = {
    httpOnly: true, sameSite: "lax" as const, secure: deps.secureCookies,
    path: "/api/v1/auth/error",
  };

  router.get("/auth/login", async (req, res) => {
    try {
      const request = await deps.google.begin();
      const flow = deps.oauthFlow.seal({
        state: request.state, nonce: request.nonce,
        codeVerifier: request.codeVerifier, returnTo: safeReturnTo(req.query.returnTo),
      }, new Date());
      res.cookie("ucms_oauth", flow, { ...oauthCookie, maxAge: 10 * 60 * 1000 });
      res.redirect(302, request.url);
    } catch {
      await deps.repo.auditLogin({
        action: "LOGIN_FAILED_GOOGLE", reason: "authorization request failed",
      }, new Date());
      res.redirect(302, new URL("/login?error=oauth", deps.clientBaseUrl).toString());
    }
  });

  router.get("/auth/callback", async (req, res) => {
    const flow = deps.oauthFlow.unseal(cookie(req, "ucms_oauth"), new Date());
    res.clearCookie("ucms_oauth", oauthCookie);
    const query = callbackQuery.safeParse(req.query);
    if (!flow || !query.success || !sameToken(query.data.state, flow.state)) {
      await deps.repo.auditLogin({ action: "LOGIN_FAILED_GOOGLE", reason: "invalid OAuth callback" }, new Date());
      const target = new URL("/login?error=oauth", deps.clientBaseUrl);
      res.redirect(302, target.toString());
      return;
    }
    try {
      const identity = await deps.google.complete(query.data.code, flow.codeVerifier, flow.nonce);
      const session = await completeGoogleLogin(deps.repo, deps.sessions, identity, new Date());
      res.cookie("ucms_session", session.cookieValue, {
        ...sessionCookie, expires: session.expiresAt,
      });
      res.redirect(302, new URL(flow.returnTo, deps.clientBaseUrl).toString());
    } catch (error) {
      if (!(error instanceof DomainError) || (error.kind !== "forbidden" && error.kind !== "locked")) {
        await deps.repo.auditLogin({ action: "LOGIN_FAILED_GOOGLE", reason: "callback failed" }, new Date());
      }
      const code = error instanceof DomainError && error.kind === "locked" ? "locked"
        : error instanceof DomainError && error.kind === "forbidden" ? "domain" : "oauth";
      if (code === "locked" && error instanceof DomainError) {
        res.cookie("ucms_auth_error", deps.oauthFlow.sealError(error.message, new Date()), {
          ...errorCookie, maxAge: 10 * 60 * 1000,
        });
      }
      res.redirect(302, new URL(`/login?error=${code}`, deps.clientBaseUrl).toString());
    }
  });

  router.get("/auth/error", (req, res) => {
    const reason = deps.oauthFlow.unsealError(cookie(req, "ucms_auth_error"), new Date());
    res.clearCookie("ucms_auth_error", errorCookie);
    ok(res, { reason });
  });

  router.get("/auth/me", async (req, res) => {
    ok(res, await currentUser(deps.repo, deps.accessRepo, deps.sessions,
      cookie(req, "ucms_session"), new Date()));
  });

  router.post("/auth/logout", authGuard(deps), async (req, res) => {
    const value = cookie(req, "ucms_session");
    await deps.sessions.revoke(value, new Date());
    res.clearCookie("ucms_session", sessionCookie);
    ok(res, { loggedOut: true });
  });

  return router;
}
