import { describe, expect, it } from "vitest";
import { createOAuthFlowService } from "../../src/infra/auth/oauth-flow-service.js";

describe("OAuth state cookie", () => {
  const now = new Date("2026-10-03T10:00:00Z");
  const flow = {
    state: "s".repeat(43), nonce: "n".repeat(43),
    codeVerifier: "v".repeat(43), returnTo: "/clubs",
  };

  it("round-trips signed state, nonce, verifier and return path", () => {
    const service = createOAuthFlowService("secret".repeat(8));
    expect(service.unseal(service.seal(flow, now), now)).toEqual(flow);
  });

  it("rejects tampering, a different secret and expiry", () => {
    const service = createOAuthFlowService("secret".repeat(8));
    const sealed = service.seal(flow, now);
    expect(service.unseal(`${sealed}x`, now)).toBeNull();
    expect(createOAuthFlowService("other".repeat(8)).unseal(sealed, now)).toBeNull();
    expect(service.unseal(sealed, new Date(now.getTime() + 10 * 60 * 1000 + 1))).toBeNull();
  });

  it("rejects a signed protocol-relative redirect", () => {
    const service = createOAuthFlowService("secret".repeat(8));
    expect(service.unseal(service.seal({ ...flow, returnTo: "//evil.test" }, now), now)).toBeNull();
  });

  it("returns a short-lived signed lock reason without exposing it in a redirect URL", () => {
    const service = createOAuthFlowService("secret".repeat(8));
    const sealed = service.sealError("Account review pending", now);
    expect(service.unsealError(sealed, now)).toBe("Account review pending");
    expect(service.unsealError(`${sealed}x`, now)).toBeNull();
  });
});
