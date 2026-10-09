import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import type { PolicyManagementRepository } from "../../src/domain/policy.js";
import type { SessionService } from "../../src/domain/session.js";
import { policyRoutes } from "../../src/interface/http/policy-routes.js";

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{
    handle: (req: Request, res: Response, next: NextFunction) => Promise<void>;
  }> };
}

function handlers() {
  const append = vi.fn(async () => {
    throw new Error("storage should not be called for invalid input");
  });
  const repo: PolicyManagementRepository = {
    findEffective: async () => null,
    listRecent: async () => [],
    findDecisionImpacts: async () => [],
    append,
  };
  const authRepo: AuthRepository = {
    allowedDomains: async () => [],
    findOrCreateGoogleUser: async () => { throw new Error("unused"); },
    findUserById: async () => null,
    systemRoleCodes: async () => ["ICPDP_OFFICER"],
    clubIds: async () => [],
    auditLogin: async () => undefined,
  };
  const sessions: SessionService = {
    issue: async () => { throw new Error("unused"); },
    resolve: async () => null,
    revoke: async () => undefined,
    revokeUser: async () => undefined,
  };
  const router = policyRoutes({ repo, authRepo, sessions }) as unknown as { stack: RouteLayer[] };
  const post = router.stack.find((layer) => layer.route?.path === "/admin/policies"
    && layer.route.methods.post)?.route?.stack[1]?.handle;
  const get = router.stack.find((layer) => layer.route?.path === "/admin/policies"
    && layer.route.methods.get)?.route?.stack[1]?.handle;
  if (!post || !get) throw new Error("policy routes missing");
  return { post, get, append };
}

describe("policy HTTP boundary", () => {
  it("rejects unknown fields and operator objects before storage", async () => {
    const { post, append } = handlers();
    const res = { locals: { actor: { id: "000000000000000000000001", accountState: "Active" } } } as unknown as Response;
    for (const body of [
      { formRequirements: { $ne: [] } },
      { formRequirements: { clubFounding: { logo: { $gt: "" } } } },
      { minFoundingMembers: 3, unexpected: "value" },
      { academicCalendar: [{ code: "FA26", startAt: { $gt: "" } }] },
    ]) {
      await expect(post({ body } as Request, res, vi.fn()))
        .rejects.toMatchObject({ kind: "validation" });
    }
    expect(append).not.toHaveBeenCalled();
  });

  it("returns an empty policy list in the standard response envelope", async () => {
    const { get } = handlers();
    const json = vi.fn();
    const res = { locals: { actor: { id: "000000000000000000000001", accountState: "Active" } },
      status: vi.fn().mockReturnThis(), json } as unknown as Response;
    await get({} as Request, res, vi.fn());
    expect(json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 200, data: { current: null, versions: [] },
    }));
  });
});
