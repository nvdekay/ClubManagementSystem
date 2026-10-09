import { createHash, createPublicKey, randomBytes, verify } from "node:crypto";
import { z } from "zod";
import type { GoogleAuthRequest, GoogleIdentity, GoogleIdentityProvider } from "../../domain/google-identity.js";
import { DomainError } from "../../domain/errors.js";

const issuer = "https://accounts.google.com";
const metadataSchema = z.object({
  issuer: z.literal(issuer),
  authorization_endpoint: z.string().url().startsWith("https://"),
  token_endpoint: z.string().url().startsWith("https://"),
  jwks_uri: z.string().url().startsWith("https://"),
});
const tokenSchema = z.object({ id_token: z.string().min(1) });
const headerSchema = z.object({ alg: z.literal("RS256"), kid: z.string().min(1) });
const claimsSchema = z.object({
  iss: z.union([z.literal(issuer), z.literal("accounts.google.com")]),
  aud: z.union([z.string(), z.array(z.string())]),
  azp: z.string().optional(),
  exp: z.number(),
  iat: z.number(),
  nonce: z.string(),
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.boolean(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
});
const jwksSchema = z.object({ keys: z.array(z.object({
  kty: z.literal("RSA"), kid: z.string(), n: z.string(), e: z.string(),
})) });

async function getJson(url: string, init?: RequestInit): Promise<unknown> {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`Google returned ${response.status}`);
    return await response.json();
  } catch {
    throw new DomainError("Google authentication unavailable", "unavailable");
  }
}

function parseJwtPart(part: string): unknown {
  try {
    return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
  } catch {
    throw new DomainError("invalid Google identity token", "unauthorized");
  }
}

export function googleIdentityProvider(input: {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): GoogleIdentityProvider {
  let metadata: z.infer<typeof metadataSchema> | null = null;

  async function discover(): Promise<z.infer<typeof metadataSchema>> {
    if (metadata) return metadata;
    const result = metadataSchema.safeParse(await getJson(`${issuer}/.well-known/openid-configuration`));
    if (!result.success) throw new DomainError("invalid Google discovery document", "unavailable");
    metadata = result.data;
    return metadata;
  }

  return {
    async begin(): Promise<GoogleAuthRequest> {
      const server = await discover();
      const state = randomBytes(32).toString("base64url");
      const nonce = randomBytes(32).toString("base64url");
      const codeVerifier = randomBytes(32).toString("base64url");
      const challenge = createHash("sha256").update(codeVerifier).digest("base64url");
      const url = new URL(server.authorization_endpoint);
      url.search = new URLSearchParams({
        client_id: input.clientId,
        redirect_uri: input.redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        nonce,
        code_challenge: challenge,
        code_challenge_method: "S256",
      }).toString();
      return { url: url.toString(), state, nonce, codeVerifier };
    },
    async complete(code, codeVerifier, nonce): Promise<GoogleIdentity> {
      const server = await discover();
      const tokenResult = tokenSchema.safeParse(await getJson(server.token_endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: input.clientId, client_secret: input.clientSecret,
          code, code_verifier: codeVerifier, redirect_uri: input.redirectUri,
          grant_type: "authorization_code",
        }),
      }));
      if (!tokenResult.success) throw new DomainError("invalid Google token response", "unauthorized");
      const parts = tokenResult.data.id_token.split(".");
      if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
        throw new DomainError("invalid Google identity token", "unauthorized");
      }
      const header = headerSchema.safeParse(parseJwtPart(parts[0]));
      const claims = claimsSchema.safeParse(parseJwtPart(parts[1]));
      if (!header.success || !claims.success) {
        throw new DomainError("invalid Google identity token", "unauthorized");
      }
      const keys = jwksSchema.safeParse(await getJson(server.jwks_uri));
      const key = keys.success ? keys.data.keys.find((item) => item.kid === header.data.kid) : null;
      if (!key || !verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`),
        createPublicKey({ key, format: "jwk" }), Buffer.from(parts[2], "base64url"))) {
        throw new DomainError("invalid Google identity token", "unauthorized");
      }
      const data = claims.data;
      const now = Math.floor(Date.now() / 1000);
      const audienceOk = Array.isArray(data.aud)
        ? data.aud.includes(input.clientId) && data.azp === input.clientId
        : data.aud === input.clientId;
      if (!audienceOk || data.nonce !== nonce || data.exp <= now || data.iat > now + 60) {
        throw new DomainError("invalid Google identity token", "unauthorized");
      }
      return {
        subject: data.sub, email: data.email, emailVerified: data.email_verified,
        displayName: data.name ?? data.email, avatarUrl: data.picture,
      };
    },
  };
}
