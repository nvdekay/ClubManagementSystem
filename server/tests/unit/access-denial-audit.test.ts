import type { AddressInfo } from "node:net";
import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accessDenialTarget, type AccessDenial } from "../../src/domain/access-denial.js";
import type { ClubAccessSnapshot } from "../../src/domain/access.js";
import type { AuthUser } from "../../src/domain/auth.js";
import type { FacilityBookingRepository } from "../../src/domain/facility-booking.js";
import type { SessionService } from "../../src/domain/session.js";
import { facilityBookingRoutes } from "../../src/interface/http/facility-booking-routes.js";
import { accessDenialAuditor, errorHandler } from "../../src/interface/http/middleware.js";
import { recordAccessDenial } from "../../src/usecase/access-denial.js";

const user: AuthUser = { id: "0123456789abcdef01234567", email: "student@fpt.edu.vn", displayName: "Student", accountState: "Active" };
const bookingId = "aaaaaaaaaaaaaaaaaaaaaaaa";
const clubA = "bbbbbbbbbbbbbbbbbbbbbbbb";
const clubB = "cccccccccccccccccccccccc";

describe("access denial target", () => {
  it("targets the last ObjectId parameter and keeps the club scope", () => {
    expect(accessDenialTarget("/api/v1/admin/bookings/:id/decision", { id: bookingId }, user.id))
      .toEqual({ entityType: "BOOKINGS", entityId: bookingId });
    expect(accessDenialTarget("/api/v1/clubs/:clubId/property-bookings/:id", { clubId: clubA, id: bookingId }, user.id))
      .toEqual({ entityType: "PROPERTY_BOOKINGS", entityId: bookingId, clubId: clubA });
    expect(accessDenialTarget("/api/v1/clubs/:clubId/room-allocations", { clubId: clubA }, user.id))
      .toEqual({ entityType: "CLUBS", entityId: clubA, clubId: clubA });
    expect(accessDenialTarget("/api/v1/admin/accounts", {}, user.id)).toEqual({ entityType: "USER", entityId: user.id });
    expect(accessDenialTarget("/api/v1/admin/bookings/:id", { id: "not-an-id" }, user.id)).toEqual({ entityType: "USER", entityId: user.id });
  });

  it("ignores malformed input and keeps only a known required permission", async () => {
    const record = vi.fn(async (_denial: AccessDenial) => undefined);
    const base = { actorId: user.id, method: "post", route: "/api/v1/clubs/:clubId/x", params: { clubId: clubA },
      reason: "club access denied", correlationId: "c", at: new Date() };
    expect(await recordAccessDenial({ record }, { ...base, actorId: "bad" })).toBe(false);
    expect(await recordAccessDenial({ record }, { ...base, method: "TRACE" })).toBe(false);
    expect(await recordAccessDenial({ record }, { ...base, details: { requiredPermission: "evil" } })).toBe(true);
    expect(record.mock.calls[0]![0]).not.toHaveProperty("requiredPermission");
    await recordAccessDenial({ record }, { ...base, details: { requiredPermission: "club.room.view" } });
    expect(record.mock.calls[1]![0]).toMatchObject({ method: "POST", requiredPermission: "club.room.view", clubId: clubA });
  });
});

// AC17 over real HTTP: Express routes, authGuard, the auditor and errorHandler.
describe("AC17 forbidden attempts are audited", () => {
  let close: (() => void) | undefined;
  afterEach(() => close?.());

  async function start(options: { roles?: string[]; session?: boolean; snapshot?: ClubAccessSnapshot | null } = {}) {
    const denials: AccessDenial[] = [];
    const sessions: SessionService = { issue: vi.fn(), revoke: vi.fn(), revokeUser: vi.fn(),
      resolve: vi.fn(async () => options.session === false ? null : { csrfToken: "csrf-token", session: { id: "s", userId: user.id,
        tokenHash: "h", csrfHash: "c", expiresAt: new Date("2030-01-01"), revokedAt: null } }) };
    const repo = { decide: vi.fn(), claim: vi.fn(), find: vi.fn(), list: vi.fn(async () => []) } as unknown as FacilityBookingRepository;
    const app = express();
    app.use(express.json());
    app.use("/api/v1", facilityBookingRoutes({ repo, sessions,
      authRepo: { findUserById: async () => user, systemRoleCodes: async () => options.roles ?? [] } as never,
      auth: { systemRoleCodes: async () => options.roles ?? [] },
      access: { findSnapshot: async () => options.snapshot ?? null },
      policy: { findEffective: async () => null }, properties: {} as never }));
    app.use(accessDenialAuditor({ record: async (denial) => { denials.push(denial); } }));
    app.use(errorHandler);
    const server = app.listen(0);
    close = () => server.close();
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
    function call(path: string, init: RequestInit = {}) {
      return fetch(`${base}${path}`, { ...init, headers: { "content-type": "application/json", "x-csrf-token": "csrf-token",
        cookie: "ucms_session=secret-cookie", ...(init.headers ?? {}) } });
    }
    return { denials, repo, call };
  }

  it("rejects a non-officer booking decision with 403, leaves the booking alone and writes one denial", async () => {
    const { denials, repo, call } = await start();
    const res = await call(`/admin/bookings/${bookingId}/decision`, { method: "POST",
      body: JSON.stringify({ outcome: "Approve", reason: "ok" }) });
    expect(res.status).toBe(403);
    expect(repo.decide).not.toHaveBeenCalled();
    expect(denials).toHaveLength(1);
    expect(denials[0]).toMatchObject({ actorId: user.id, method: "POST", route: "/api/v1/admin/bookings/:id/decision",
      entityType: "BOOKINGS", entityId: bookingId, reason: "ICPDP officer role required" });
    expect(JSON.stringify(denials[0])).not.toMatch(/secret-cookie|csrf-token|Approve/);
  });

  it("does not audit an officer, an anonymous caller or a bad CSRF token", async () => {
    const officer = await start({ roles: ["ICPDP_OFFICER"] });
    await officer.call(`/admin/bookings/${bookingId}/decision`, { method: "POST", body: JSON.stringify({ outcome: "Approve", reason: "ok" }) });
    expect(officer.denials).toEqual([]);
    close?.();
    const anonymous = await start({ session: false });
    const res = await anonymous.call(`/admin/bookings/${bookingId}/decision`, { method: "POST", body: "{}" });
    expect(res.status).toBe(401);
    expect(anonymous.denials).toEqual([]);
    close?.();
    const csrf = await start();
    const bad = await csrf.call(`/admin/bookings/${bookingId}/decision`, { method: "POST", body: "{}", headers: { "x-csrf-token": "wrong" } });
    expect(bad.status).toBe(403);
    expect(csrf.denials).toEqual([]);
  });

  it("records the club scope and missing permission for a member of another club", async () => {
    const snapshot: ClubAccessSnapshot = { clubId: clubB, clubName: "B", clubState: "Active", isApprovedFounder: false,
      membership: { id: "m", clubId: clubA, state: "Active" }, terms: [], positions: [], assignments: [] };
    const { denials, call } = await start({ snapshot });
    const res = await call(`/clubs/${clubB}/bookings`);
    expect(res.status).toBe(403);
    expect(denials).toEqual([expect.objectContaining({ clubId: clubB, requiredPermission: "club.booking.manage", method: "GET" })]);
  });
});
