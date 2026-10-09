import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AuthUser, LoginAudit } from "../../src/domain/auth.js";
import type { SessionService } from "../../src/domain/session.js";
import { authGuard, authRoutes, type AuthRouteDeps } from "../../src/interface/http/auth-routes.js";
import { errorHandler } from "../../src/interface/http/middleware.js";

const user: AuthUser = {
  id: "0123456789abcdef01234567",
  email: "student@fpt.edu.vn",
  displayName: "Student",
  accountState: "Active",
};

function fixture() {
  const audits: LoginAudit[] = [];
  const complete = vi.fn(async () => ({
    subject: "google-subject",
    email: user.email,
    emailVerified: true,
    displayName: user.displayName,
  }));
  const issue = vi.fn(async () => ({
    cookieValue: "signed-session",
    csrfToken: "csrf-token",
    expiresAt: new Date("2027-01-01"),
  }));
  const resolve = vi.fn<SessionService["resolve"]>(async () => ({
    session: {
      id: "session-id", userId: user.id, tokenHash: "hash", csrfHash: "csrf-hash",
      expiresAt: new Date("2027-01-01"), revokedAt: null,
    },
    csrfToken: "csrf-token",
  }));
  const deps: AuthRouteDeps = {
    repo: {
      allowedDomains: async () => ["fpt.edu.vn"],
      findOrCreateGoogleUser: async () => user,
      findUserById: async () => user,
      systemRoleCodes: async () => [],
      clubIds: async () => [],
      auditLogin: async (attempt) => { audits.push(attempt); },
    },
    accessRepo: { findSnapshot: async () => null },
    sessions: {
      issue, resolve,
      revoke: async () => undefined,
      revokeUser: async () => undefined,
    },
    google: {
      begin: async () => ({
        state: "expected-state", nonce: "nonce", codeVerifier: "verifier",
        url: "https://accounts.google.com/",
      }),
      complete,
    },
    oauthFlow: {
      seal: () => "sealed-flow",
      unseal: () => ({
        state: "expected-state", nonce: "nonce",
        codeVerifier: "verifier", returnTo: "/clubs",
      }),
      sealError: () => "sealed-error",
      unsealError: () => null,
    },
    clientBaseUrl: "http://localhost:5173",
    secureCookies: false,
  };
  return { deps, audits, complete, issue, resolve };
}

function request(cookie: string | undefined, csrf: string | undefined): Request {
  return {
    headers: { cookie },
    header: (name: string) => name === "X-CSRF-Token" ? csrf : undefined,
    originalUrl: "/api/v1/admin/users",
  } as unknown as Request;
}

function response() {
  const status = vi.fn();
  const json = vi.fn();
  const res = {
    locals: {},
    status,
    json,
    headersSent: false,
    clearCookie: vi.fn(),
    cookie: vi.fn(),
    redirect: vi.fn(),
  } as unknown as Response;
  status.mockReturnValue(res);
  return { res, status, json };
}

async function guarded(
  deps: AuthRouteDeps,
  req: Request,
  res: Response,
  csrfRequired = true,
) {
  const next = vi.fn();
  await authGuard(deps, csrfRequired)(req, res, next);
  return next;
}

interface RouteLayer {
  route?: { path: string; stack: Array<{
    handle: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  }> };
}

function routeHandler(deps: AuthRouteDeps, path: string) {
  const router = authRoutes(deps) as unknown as { stack: RouteLayer[] };
  const layer = router.stack.find((entry) => entry.route?.path === path);
  const handler = layer?.route?.stack[0]?.handle;
  if (!handler) throw new Error(`route missing: ${path}`);
  return handler;
}

async function callback(deps: AuthRouteDeps, query: unknown, cookie = "ucms_oauth=sealed-flow") {
  const handler = routeHandler(deps, "/auth/callback");
  const req = { ...request(cookie, undefined), query } as Request;
  const { res } = response();
  await handler(req, res, vi.fn());
  return res;
}

describe("auth HTTP boundary", () => {
  it("audits a failed Google authorization start and returns to the login error page", async () => {
    const { deps, audits } = fixture();
    deps.google.begin = async () => { throw new Error("Google unavailable"); };
    const { res } = response();
    await routeHandler(deps, "/auth/login")(
      { ...request(undefined, undefined), query: { returnTo: "/clubs" } } as unknown as Request,
      res,
      vi.fn(),
    );
    expect(audits).toEqual([{
      action: "LOGIN_FAILED_GOOGLE", reason: "authorization request failed",
    }]);
    expect(res.cookie).not.toHaveBeenCalled();
    expect(res.redirect).toHaveBeenCalledWith(302, "http://localhost:5173/login?error=oauth");
  });

  it("discards an external return URL before sealing the OAuth flow", async () => {
    const { deps } = fixture();
    const seal = vi.fn(deps.oauthFlow.seal);
    deps.oauthFlow.seal = seal;
    const { res } = response();
    await routeHandler(deps, "/auth/login")(
      { ...request(undefined, undefined), query: { returnTo: "//evil.test/path" } } as unknown as Request,
      res,
      vi.fn(),
    );
    expect(seal).toHaveBeenCalledWith(expect.objectContaining({ returnTo: "/" }), expect.any(Date));
    expect(res.redirect).toHaveBeenCalledWith(302, "https://accounts.google.com/");
  });

  it("returns 401 without a session and 423 for a locked account", async () => {
    const { deps, resolve } = fixture();
    resolve.mockResolvedValueOnce(null);
    const missing = response();
    const missingReq = request(undefined, undefined);
    const nextMissing = await guarded(deps, missingReq, missing.res);
    errorHandler(nextMissing.mock.calls[0]?.[0], missingReq, missing.res, vi.fn());
    expect(missing.status).toHaveBeenCalledWith(401);
    expect(missing.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 401, error: "unauthorized",
    }));

    const lockedDeps = {
      ...deps,
      repo: { ...deps.repo, findUserById: async () => ({
        ...user, accountState: "Locked" as const, lockReason: "review pending",
      }) },
    };
    const locked = response();
    const lockedReq = request("ucms_session=signed-session", "csrf-token");
    const nextLocked = await guarded(lockedDeps, lockedReq, locked.res);
    errorHandler(nextLocked.mock.calls[0]?.[0], lockedReq, locked.res, vi.fn());
    expect(locked.status).toHaveBeenCalledWith(423);
    expect(locked.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 423, message: "review pending",
    }));
  });

  it("rejects missing or wrong CSRF before calling a mutation", async () => {
    const { deps } = fixture();
    for (const csrf of [undefined, "wrong-token"]) {
      const { res, status } = response();
      const req = request("ucms_session=signed-session", csrf);
      const next = await guarded(deps, req, res);
      expect(next).toHaveBeenCalledOnce();
      errorHandler(next.mock.calls[0]?.[0], req, res, vi.fn());
      expect(status).toHaveBeenCalledWith(403);
      expect(res.locals.actor).toBeUndefined();
    }
    const { res } = response();
    const next = await guarded(deps, request("ucms_session=signed-session", "csrf-token"), res);
    expect(next).toHaveBeenCalledWith();
    expect(res.locals.actor).toEqual(user);
  });

  it("rejects an invalid OAuth state without exchanging a code or issuing a session", async () => {
    const { deps, audits, complete, issue } = fixture();
    const res = await callback(deps, { code: "code", state: "wrong-state" });
    expect(complete).not.toHaveBeenCalled();
    expect(issue).not.toHaveBeenCalled();
    expect(audits).toEqual([{ action: "LOGIN_FAILED_GOOGLE", reason: "invalid OAuth callback" }]);
    expect(res.clearCookie).toHaveBeenCalledWith("ucms_oauth", expect.objectContaining({
      httpOnly: true, sameSite: "lax", path: "/api/v1/auth/callback",
    }));
    expect(res.redirect).toHaveBeenCalledWith(302, "http://localhost:5173/login?error=oauth");
  });

  it("sets a scoped secure session cookie only after a valid callback", async () => {
    const { deps, audits, complete, issue } = fixture();
    deps.secureCookies = true;
    const res = await callback(deps, { code: "code", state: "expected-state" });
    expect(complete).toHaveBeenCalledWith("code", "verifier", "nonce");
    expect(issue).toHaveBeenCalledWith(user.id, expect.any(Date));
    expect(audits).toEqual([{ action: "LOGIN_SUCCESS", userId: user.id }]);
    expect(res.cookie).toHaveBeenCalledWith("ucms_session", "signed-session", expect.objectContaining({
      httpOnly: true, sameSite: "lax", secure: true, path: "/api/v1",
      expires: new Date("2027-01-01"),
    }));
    expect(res.redirect).toHaveBeenCalledWith(302, "http://localhost:5173/clubs");
  });
});
