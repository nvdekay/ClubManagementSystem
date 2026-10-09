import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { OAuthFlow, OAuthFlowService } from "../../domain/oauth-flow.js";

const FLOW_LIFETIME_MS = 10 * 60 * 1000;
const flowSchema = z.object({
  state: z.string().min(32),
  nonce: z.string().min(32),
  codeVerifier: z.string().min(32),
  returnTo: z.string().startsWith("/").max(2000),
  issuedAt: z.number().int(),
});
const errorSchema = z.object({ reason: z.string().min(1).max(1000), issuedAt: z.number().int() });

export function createOAuthFlowService(secret: string): OAuthFlowService {
  function signature(purpose: string, payload: string): Buffer {
    return createHmac("sha256", secret).update(`${purpose}:${payload}`).digest();
  }

  function decode(cookieValue: string | undefined, now: Date, purpose: string): unknown | null {
    if (!cookieValue || cookieValue.length > 4000) return null;
    const [payload, mac, extra] = cookieValue.split(".");
    if (!payload || !mac || extra !== undefined) return null;
    try {
      const received = Buffer.from(mac, "base64url");
      const expected = signature(purpose, payload);
      if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
      const value: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
      if (typeof value !== "object" || value === null || !("issuedAt" in value)
        || typeof value.issuedAt !== "number" || value.issuedAt > now.getTime()
        || now.getTime() - value.issuedAt > FLOW_LIFETIME_MS) return null;
      return value;
    } catch {
      return null;
    }
  }

  return {
    seal(flow: OAuthFlow, now: Date): string {
      const payload = Buffer.from(JSON.stringify({ ...flow, issuedAt: now.getTime() })).toString("base64url");
      return `${payload}.${signature("oauth", payload).toString("base64url")}`;
    },
    unseal(cookieValue, now): OAuthFlow | null {
      const parsed = flowSchema.safeParse(decode(cookieValue, now, "oauth"));
      if (!parsed.success || parsed.data.returnTo.startsWith("//")
        || parsed.data.returnTo.includes("\\")) return null;
      const { state, nonce, codeVerifier, returnTo } = parsed.data;
      return { state, nonce, codeVerifier, returnTo };
    },
    sealError(reason, now): string {
      const payload = Buffer.from(JSON.stringify({ reason, issuedAt: now.getTime() })).toString("base64url");
      return `${payload}.${signature("oauth-error", payload).toString("base64url")}`;
    },
    unsealError(cookieValue, now): string | null {
      const parsed = errorSchema.safeParse(decode(cookieValue, now, "oauth-error"));
      return parsed.success ? parsed.data.reason : null;
    },
  };
}
