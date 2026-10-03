import mongoose from "mongoose";
import { buildApp } from "./interface/http/server.js";
import { loadConfig, optionalAuthConfig } from "./infra/config/index.js";
import { ensureUcmsDatabase } from "./infra/db/ucms-models.js";
import { ensureAuthSessionIndexes, mongoSessionRepository } from "./infra/db/mongo-auth-session-repository.js";
import { mongoAuthRepository } from "./infra/db/mongo-auth-repository.js";
import { mongoAccessRepository } from "./infra/db/mongo-access-repository.js";
import { mongoAccountAdminRepository } from "./infra/db/mongo-account-admin-repository.js";
import { googleIdentityProvider } from "./infra/auth/google-oidc.js";
import { createSessionService } from "./infra/auth/session-service.js";
import { createOAuthFlowService } from "./infra/auth/oauth-flow-service.js";
import { ensureAuthBootstrap } from "./infra/db/bootstrap-auth.js";
import { mongoPublicDiscoveryRepository } from "./infra/db/mongo-public-discovery-repository.js";

const config = loadConfig(); // first thing — exits if env is invalid
const authConfig = optionalAuthConfig(config);

try {
  await mongoose.connect(config.MONGO_URI);
  await ensureUcmsDatabase();
  if (authConfig) {
    await ensureAuthSessionIndexes();
    await ensureAuthBootstrap(authConfig);
  }
} catch (err) {
  console.error("❌ mongo connection failed:", err instanceof Error ? err.message : err);
  process.exit(1); // fail fast — never serve without a database
}
console.log("mongo connected");

const commonDeps = {
  publicRepo: mongoPublicDiscoveryRepository(),
  dbReady: () => mongoose.connection.readyState === 1,
};
const app = authConfig ? buildApp({
  ...commonDeps,
  adminRepo: mongoAccountAdminRepository(),
  auth: {
    repo: mongoAuthRepository(authConfig.ALLOWED_DOMAIN),
    accessRepo: mongoAccessRepository(),
    sessions: createSessionService(mongoSessionRepository(), authConfig.SESSION_SECRET),
    google: googleIdentityProvider({
      clientId: authConfig.GOOGLE_CLIENT_ID,
      clientSecret: authConfig.GOOGLE_CLIENT_SECRET,
      redirectUri: new URL("/api/v1/auth/callback", authConfig.APP_BASE_URL).toString(),
    }),
    oauthFlow: createOAuthFlowService(authConfig.SESSION_SECRET),
    clientBaseUrl: authConfig.CLIENT_BASE_URL,
    secureCookies: config.NODE_ENV === "production",
  },
}) : buildApp(commonDeps);
const server = app.listen(config.PORT, () => {
  console.log(`server listening on :${config.PORT} (${config.NODE_ENV})`);
});

let shuttingDown = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (shuttingDown) process.exit(1); // second signal = stop waiting, exit now
    shuttingDown = true;
    // Drain deadline — a hung in-flight request must not block SIGTERM until the platform SIGKILLs.
    setTimeout(() => {
      console.error("shutdown deadline hit — forcing exit");
      process.exit(1);
    }, 10_000);
    server.close(() => {
      mongoose.disconnect().finally(() => process.exit(0));
    });
    server.closeIdleConnections();
  });
}
