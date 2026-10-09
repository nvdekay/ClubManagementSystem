import express from "express";
import { authRoutes, type AuthRouteDeps } from "./auth-routes.js";
import { accountAdminRoutes } from "./account-admin-routes.js";
import type { AccountAdminRepository } from "../../domain/account-admin.js";
import type { PublicDiscoveryRepository } from "../../domain/public-discovery.js";
import type { PolicyManagementRepository } from "../../domain/policy.js";
import type { ApplicationFileStorage, ClubApplicationRepository } from "../../domain/club-application.js";
import type { ClubApplicationReviewRepository } from "../../domain/club-application-review.js";
import type { ClubProfileRepository } from "../../domain/club-profile.js";
import type { BoardNominationRepository } from "../../domain/board-nomination.js";
import type { RecruitmentCampaignRepository } from "../../domain/recruitment-campaign.js";
import type { MembershipRepository } from "../../domain/membership.js";
import type { RecruitmentApplicationRepository, RecruitmentAttachmentStorage } from "../../domain/recruitment-application.js";
import type { DashboardRepository } from "../../domain/dashboard.js";
import type { LeadershipTransitionRepository } from "../../domain/leadership-transition.js";
import type { EventRegistrationRepository } from "../../domain/event-registration.js";
import type { EventCheckInRepository } from "../../domain/event-checkin.js";
import { errorHandler, requestLogger } from "./middleware.js";
import { openApiDocument } from "./openapi.js";
import { fail } from "./response.js";
import { publicDiscoveryRoutes } from "./public-discovery-routes.js";
import { policyRoutes } from "./policy-routes.js";
import { clubApplicationRoutes } from "./club-application-routes.js";
import { clubApplicationReviewRoutes } from "./club-application-review-routes.js";
import { clubProfileRoutes } from "./club-profile-routes.js";
import { boardNominationRoutes } from "./board-nomination-routes.js";
import { recruitmentCampaignRoutes } from "./recruitment-campaign-routes.js";
import { recruitmentApplicationRoutes } from "./recruitment-application-routes.js";
import { membershipRoutes } from "./membership-routes.js";
import { dashboardRoutes } from "./dashboard-routes.js";
import { leadershipTransitionRoutes } from "./leadership-transition-routes.js";
import { eventRegistrationRoutes } from "./event-registration-routes.js";
import { eventCheckInRoutes } from "./event-checkin-routes.js";

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
  applicationReviewRepo?: ClubApplicationReviewRepository;
  clubProfileRepo?: ClubProfileRepository;
  boardNominationRepo?: BoardNominationRepository;
  recruitmentCampaignRepo?: RecruitmentCampaignRepository;
  recruitmentApplicationRepo?: RecruitmentApplicationRepository;
  membershipRepo?: MembershipRepository;
  dashboardRepo?: DashboardRepository;
  leadershipTransitionRepo?: LeadershipTransitionRepository;
  eventRegistrationRepo?: EventRegistrationRepository;
  eventCheckInRepo?: EventCheckInRepository;
  recruitmentAttachmentStorage?: RecruitmentAttachmentStorage | null;
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
    if (deps.clubProfileRepo) {
      app.use("/api/v1", clubProfileRoutes({
        repo: deps.clubProfileRepo, accessRepo: deps.auth.accessRepo,
        authRepo: deps.auth.repo, sessions: deps.auth.sessions,
      }));
    }
    if (deps.boardNominationRepo) {
      app.use("/api/v1", boardNominationRoutes({
        repo: deps.boardNominationRepo, accessRepo: deps.auth.accessRepo,
        authRepo: deps.auth.repo, sessions: deps.auth.sessions,
      }));
    }
    if (deps.leadershipTransitionRepo) {
      app.use("/api/v1", leadershipTransitionRoutes({
        repo: deps.leadershipTransitionRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions,
      }));
    }
    if (deps.recruitmentCampaignRepo && deps.policyRepo) {
      app.use("/api/v1", recruitmentCampaignRoutes({
        repo: deps.recruitmentCampaignRepo, accessRepo: deps.auth.accessRepo,
        policy: deps.policyRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions,
      }));
    }
    if (deps.recruitmentApplicationRepo) {
      app.use("/api/v1", recruitmentApplicationRoutes({
        repo: deps.recruitmentApplicationRepo,
        files: deps.recruitmentAttachmentStorage ?? null,
        authRepo: deps.auth.repo, sessions: deps.auth.sessions, accessRepo: deps.auth.accessRepo,
      }));
    }
    if (deps.membershipRepo) {
      app.use("/api/v1", membershipRoutes({ repo: deps.membershipRepo,
        accessRepo: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.dashboardRepo) {
      app.use("/api/v1", dashboardRoutes({ repo: deps.dashboardRepo,
        accessRepo: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.eventRegistrationRepo && deps.policyRepo) {
      app.use("/api/v1", eventRegistrationRoutes({ repo: deps.eventRegistrationRepo,
        policy: deps.policyRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.eventCheckInRepo && deps.policyRepo) {
      app.use("/api/v1", eventCheckInRoutes({ repo: deps.eventCheckInRepo,
        policy: deps.policyRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
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
        if (deps.applicationReviewRepo) {
          app.use("/api/v1", clubApplicationReviewRoutes({
            repo: deps.applicationReviewRepo,
            authRepo: deps.auth.repo, sessions: deps.auth.sessions,
            files: deps.applicationFiles ?? null,
          }));
        }
      }
    }
  }
  const hasAdmin = Boolean(deps.auth && deps.adminRepo);
  const hasPolicy = Boolean(hasAdmin && deps.policyRepo);
  const hasApplications = Boolean(hasPolicy && deps.applicationRepo);
  const hasApplicationReviews = Boolean(hasApplications && deps.applicationReviewRepo);
  const hasClubProfiles = Boolean(hasAdmin && deps.clubProfileRepo);
  const hasBoardNominations = Boolean(hasAdmin && deps.boardNominationRepo);
  const hasRecruitmentCampaigns = Boolean(hasAdmin && deps.recruitmentCampaignRepo && deps.policyRepo);
  const hasRecruitmentApplications = Boolean(hasAdmin && deps.recruitmentApplicationRepo);
  const hasDashboard = Boolean(hasAdmin && deps.dashboardRepo);
  const hasLeadershipTransitions = Boolean(hasAdmin && deps.leadershipTransitionRepo);
  const hasEventRegistrations = Boolean(hasPolicy && deps.eventRegistrationRepo);
  const hasEventCheckIns = Boolean(hasPolicy && deps.eventCheckInRepo);
  const availablePaths = Object.fromEntries(Object.entries(openApiDocument.paths ?? {})
    .filter(([path]) => {
      if (path.startsWith("/auth/")) return hasAdmin;
      if (path.startsWith("/admin/policies")) return hasPolicy;
      if (path.startsWith("/admin/application-reviews")) return hasApplicationReviews;
      if (path.startsWith("/admin/board-nominations")) return hasBoardNominations;
      if (path.startsWith("/admin/leadership-transitions")) return hasLeadershipTransitions;
      if (path.startsWith("/admin/")) return hasAdmin;
      if (path.startsWith("/applications/recruitment")) return hasRecruitmentApplications;
      if (path.startsWith("/dashboard")) return hasDashboard;
      if (path.startsWith("/events/{id}/registration")
        || path.startsWith("/event-registrations")) return hasEventRegistrations;
      if (path.startsWith("/events/{id}/check-in")
        || path.startsWith("/attendances")) return hasEventCheckIns;
      if (path.startsWith("/applications")) return hasApplications;
      if (path.startsWith("/clubs/{clubId}/settings")
        || path.startsWith("/clubs/{clubId}/profile")
        || path.startsWith("/clubs/{clubId}/departments")) return hasClubProfiles;
      if (path.startsWith("/clubs/{clubId}/board-nomination")) return hasBoardNominations;
      if (path.startsWith("/clubs/{clubId}/recruitment/campaigns")) return hasRecruitmentCampaigns;
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
