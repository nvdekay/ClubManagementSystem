import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { googleIdentityProvider } from "../../src/infra/auth/google-oidc.js";

const issuer = "https://accounts.google.com";
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });

function token(claims: Record<string, unknown>, key = privateKey): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${payload}`), key).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

function fakeGoogle(idToken: () => string) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.endsWith("/.well-known/openid-configuration")) {
      return Response.json({
        issuer,
        authorization_endpoint: `${issuer}/o/oauth2/v2/auth`,
        token_endpoint: "https://oauth2.googleapis.com/token",
        jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
      });
    }
    if (url === "https://oauth2.googleapis.com/token") return Response.json({ id_token: idToken() });
    if (url === "https://www.googleapis.com/oauth2/v3/certs") {
      return Response.json({ keys: [{ ...jwk, kid: "test-key" }] });
    }
    throw new Error("unexpected Google URL");
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe("Google OIDC adapter", () => {
  const options = {
    clientId: "client-id", clientSecret: "client-secret",
    redirectUri: "http://localhost:3000/api/v1/auth/callback",
  };

  it("uses PKCE and validates a signed ID token with audience and nonce", async () => {
    let idToken = "";
    fakeGoogle(() => idToken);
    const provider = googleIdentityProvider(options);
    const request = await provider.begin();
    const url = new URL(request.url);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("state")).toBe(request.state);
    idToken = token({
      iss: issuer, aud: options.clientId, exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000), nonce: request.nonce,
      sub: "google-user", email: "student@fpt.edu.vn", email_verified: true,
      name: "Student",
    });
    expect(await provider.complete("authorization-code", request.codeVerifier, request.nonce))
      .toMatchObject({ subject: "google-user", email: "student@fpt.edu.vn", emailVerified: true });
  });

  it("rejects a valid signature with the wrong audience or nonce", async () => {
    let idToken = "";
    fakeGoogle(() => idToken);
    const provider = googleIdentityProvider(options);
    const request = await provider.begin();
    const base = {
      iss: issuer, exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000), sub: "google-user",
      email: "student@fpt.edu.vn", email_verified: true,
    };
    idToken = token({ ...base, aud: "another-client", nonce: request.nonce });
    await expect(provider.complete("code", request.codeVerifier, request.nonce))
      .rejects.toMatchObject({ kind: "unauthorized" });
    idToken = token({ ...base, aud: options.clientId, nonce: "wrong" });
    await expect(provider.complete("code", request.codeVerifier, request.nonce))
      .rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("rejects a token with a bad signature", async () => {
    let idToken = "";
    fakeGoogle(() => idToken);
    const provider = googleIdentityProvider(options);
    const request = await provider.begin();
    const attacker = generateKeyPairSync("rsa", { modulusLength: 2048 });
    idToken = token({
      iss: issuer, aud: options.clientId, exp: Math.floor(Date.now() / 1000) + 300,
      iat: Math.floor(Date.now() / 1000), nonce: request.nonce,
      sub: "google-user", email: "student@fpt.edu.vn", email_verified: true,
    }, attacker.privateKey);
    await expect(provider.complete("code", request.codeVerifier, request.nonce))
      .rejects.toMatchObject({ kind: "unauthorized" });
  });
});
