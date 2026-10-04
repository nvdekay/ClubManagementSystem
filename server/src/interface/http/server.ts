import express from "express";
import { authRoutes, type AuthRouteDeps } from "./auth-routes.js";
import { accountAdminRoutes } from "./account-admin-routes.js";
import type { AccountAdminRepository } from "../../domain/account-admin.js";
import type { PublicDiscoveryRepository } from "../../domain/public-discovery.js";
import type { PolicyManagementRepository } from "../../domain/policy.js";
import type { ApplicationFileStorage, ClubApplicationRepository } from "../../domain/club-application.js";
import { errorHandler, requestLogger } from "./middleware.js";
import { openApiDocument } from "./openapi.js";
import { fail } from "./response.js";
import { publicDiscoveryRoutes } from "./public-discovery-routes.js";
import { policyRoutes } from "./policy-routes.js";
import { clubApplicationRoutes } from "./club-application-routes.js";

// ponytail: Swagger UI from CDN (version + SRI hash pinned, so a tampered CDN response won't
// execute) — vendor swagger-ui-dist locally if offline dev matters.
const docsHtml = `<!doctype html>
<html>
<head>
  <title>${openApiDocument.info.title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css"
    integrity="sha384-wxLW6kwyHktdDGr6Pv1zgm/VGJh99lfUbzSn6HNHBENZlCN7W602k9VkGdxuFvPn"
    crossorigin="anonymous" />
</head>
<body>
  <div id="swagger"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"
    integrity="sha384-wmyclcVGX/WhUkdkATwhaK1X1JtiNrr2EoYJ+diV3vj4v6OC5yCeSu+yW13SYJep"
    crossorigin="anonymous"></script>
  <script>SwaggerUIBundle({ url: "/docs/openapi.json", dom_id: "#swagger" });</script>
</body>
</html>`;

export function buildApp(deps: {
  auth?: AuthRouteDeps;
  adminRepo?: AccountAdminRepository;
  policyRepo?: PolicyManagementRepository;
  applicationRepo?: ClubApplicationRepository;
  applicationFiles?: ApplicationFileStorage | null;
  publicRepo: PublicDiscoveryRepository;
  dbReady: () => boolean;
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((_req, res, next) => {
    // ponytail: security-header baseline without a helmet dep — add CSP when the app grows real pages
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  app.use(requestLogger); // before body parsing, so requests the parser rejects still get a log line
  app.use(express.json());
  app.get("/api/v1/health", (_req, res) => {
    const ok = deps.dbReady(); // 503 when the DB is down, so orchestrators stop routing here
    res.status(ok ? 200 : 503).json({ ok });
  });
  app.use("/api/v1", publicDiscoveryRoutes(deps.publicRepo));
  if (deps.auth && deps.adminRepo) {
    app.use("/api/v1", authRoutes(deps.auth));
    app.use("/api/v1", accountAdminRoutes({
      adminRepo: deps.adminRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions,
    }));
    if (deps.policyRepo) {
      app.use("/api/v1", policyRoutes({
        repo: deps.policyRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions,
      }));
      if (deps.applicationRepo) {
        app.use("/api/v1", clubApplicationRoutes({
          repo: deps.applicationRepo, policy: deps.policyRepo,
          files: deps.applicationFiles ?? null,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions,
        }));
      }
    }
  }
  const hasAdmin = Boolean(deps.auth && deps.adminRepo);
  const hasPolicy = Boolean(hasAdmin && deps.policyRepo);
  const hasApplications = Boolean(hasPolicy && deps.applicationRepo);
  const availablePaths = Object.fromEntries(Object.entries(openApiDocument.paths ?? {})
    .filter(([path]) => {
      if (path.startsWith("/auth/")) return hasAdmin;
      if (path.startsWith("/admin/policies")) return hasPolicy;
      if (path.startsWith("/admin/")) return hasAdmin;
      if (path.startsWith("/applications")) return hasApplications;
      return true;
    }));
  const availableDocumentJson = JSON.stringify({ ...openApiDocument, paths: availablePaths });
  app.get("/docs/openapi.json", (_req, res) => {
    res.type("json").send(availableDocumentJson);
  });
  app.get("/docs", (_req, res) => {
    res.type("html").send(docsHtml);
  });
  app.use((req, res) => {
    fail(res, req, 404, "not_found", "not found"); // keep the error envelope contract on unknown paths
  });
  app.use(errorHandler);
  return app;
}
