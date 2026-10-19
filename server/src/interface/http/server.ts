import type { ClubEvaluationRepository } from "../../domain/club-evaluation.js";
import { clubEvaluationRoutes } from "./club-evaluation-routes.js";
import type { ClubViolationRepository } from "../../domain/club-violation.js";
import { clubViolationRoutes } from "./club-violation-routes.js";
import type { MembershipReconfirmationRepository } from "../../domain/membership-reconfirmation.js";
import { membershipReconfirmationRoutes } from "./membership-reconfirmation-routes.js";
import type { SuspensionRequestRepository } from "../../domain/suspension-request.js";
import { suspensionRequestRoutes } from "./suspension-request-routes.js";
import type { ClubTransitionPlanRepository } from "../../domain/club-transition-plan.js";
import { clubTransitionPlanRoutes } from "./club-transition-plan-routes.js";
import type { ClubPeriodicReportRepository } from "../../domain/club-periodic-report.js";
import { clubPeriodicReportRoutes } from "./club-periodic-report-routes.js";
import type { ClubInvitationRepository } from "../../domain/club-invitation.js";
import { clubInvitationRoutes } from "./club-invitation-routes.js";
import type { EventFinanceRepository } from "../../domain/event-finance.js";
import type { PostEventReportRepository } from "../../domain/post-event-report.js";
import { eventFinanceRoutes } from "./event-finance-routes.js";
import { postEventReportRoutes } from "./post-event-report-routes.js";
import type { ClubEventRepository } from "../../domain/club-event.js";
import { clubEventRoutes } from "./club-event-routes.js";
import type { FacilityBookingRepository } from "../../domain/facility-booking.js";
import { facilityBookingRoutes } from "./facility-booking-routes.js";
import type { RoomAllocationRepository } from "../../domain/room-allocation.js";
import { roomAllocationRoutes } from "./room-allocation-routes.js";
import express from "express";
import { authRoutes, type AuthRouteDeps } from "./auth-routes.js";
import { accountAdminRoutes } from "./account-admin-routes.js";
import type { AccountAdminRepository } from "../../domain/account-admin.js";
import type { PublicDiscoveryRepository } from "../../domain/public-discovery.js";
import type { PolicyManagementRepository } from "../../domain/policy.js";
import type { ClubFieldRepository } from "../../domain/club-field.js";
import type { PropertyRepository } from "../../domain/property.js";
import type { EvaluationSchemeRepository } from "../../domain/evaluation-scheme.js";
import type { ExportFileWriter, ExportRepository } from "../../domain/data-export.js";
import type { ClubLifecycleRepository } from "../../domain/club-lifecycle.js";
import type { ApplicationFileStorage, ClubApplicationRepository } from "../../domain/club-application.js";
import type { ClubApplicationReviewRepository } from "../../domain/club-application-review.js";
import type { EventProposalReviewRepository } from "../../domain/event-proposal-review.js";
import type { BudgetDisbursementRepository } from "../../domain/budget-disbursement.js";
import type { ViolationRepository } from "../../domain/violation.js";
import type { PeriodicReportRepository } from "../../domain/periodic-report.js";
import type { SchoolEventRepository } from "../../domain/school-event.js";
import type { EvaluationRepository } from "../../domain/evaluation.js";
import type { ClubProfileRepository } from "../../domain/club-profile.js";
import type { BoardNominationRepository } from "../../domain/board-nomination.js";
import type { RecruitmentCampaignRepository } from "../../domain/recruitment-campaign.js";
import type { MembershipRepository } from "../../domain/membership.js";
import type { RecruitmentApplicationRepository, RecruitmentAttachmentStorage } from "../../domain/recruitment-application.js";
import type { CandidateEvaluationRepository } from "../../domain/candidate-evaluation.js";
import type { DashboardRepository } from "../../domain/dashboard.js";
import type { LeadershipTransitionRepository } from "../../domain/leadership-transition.js";
import type { EventRegistrationRepository } from "../../domain/event-registration.js";
import type { EventCheckInRepository } from "../../domain/event-checkin.js";
import type { EventFeedbackRepository } from "../../domain/event-feedback.js";
import type { StudentFeedbackRepository } from "../../domain/student-feedback.js";
import type { MemberSpaceRepository } from "../../domain/member-space.js";
import { errorHandler, requestLogger } from "./middleware.js";
import { openApiDocument } from "./openapi.js";
import { fail } from "./response.js";
import { publicDiscoveryRoutes } from "./public-discovery-routes.js";
import { policyRoutes } from "./policy-routes.js";
import { clubApplicationRoutes } from "./club-application-routes.js";
import { clubApplicationReviewRoutes } from "./club-application-review-routes.js";
import { eventProposalReviewRoutes } from "./event-proposal-review-routes.js";
import { budgetDisbursementRoutes } from "./budget-disbursement-routes.js";
import { violationRoutes } from "./violation-routes.js";
import { periodicReportRoutes } from "./periodic-report-routes.js";
import { schoolEventRoutes } from "./school-event-routes.js";
import { evaluationRoutes } from "./evaluation-routes.js";
import { clubProfileRoutes } from "./club-profile-routes.js";
import { clubFieldRoutes } from "./club-field-routes.js";
import { propertyRoutes } from "./property-routes.js";
import { evaluationSchemeRoutes } from "./evaluation-scheme-routes.js";
import { exportRoutes } from "./export-routes.js";
import { clubLifecycleRoutes } from "./club-lifecycle-routes.js";
import { boardNominationRoutes } from "./board-nomination-routes.js";
import { recruitmentCampaignRoutes } from "./recruitment-campaign-routes.js";
import { recruitmentApplicationRoutes } from "./recruitment-application-routes.js";
import { candidateEvaluationRoutes } from "./candidate-evaluation-routes.js";
import { membershipRoutes } from "./membership-routes.js";
import { dashboardRoutes } from "./dashboard-routes.js";
import { leadershipTransitionRoutes } from "./leadership-transition-routes.js";
import { eventRegistrationRoutes } from "./event-registration-routes.js";
import { eventCheckInRoutes } from "./event-checkin-routes.js";
import { eventFeedbackRoutes } from "./event-feedback-routes.js";
import { studentFeedbackRoutes } from "./student-feedback-routes.js";
import { memberSpaceRoutes } from "./member-space-routes.js";
import type { NotificationRepository } from "../../domain/notification.js";
import { notificationRoutes } from "./notification-routes.js";

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
  clubFieldRepo?: ClubFieldRepository;
  propertyRepo?: PropertyRepository;
  facilityBookingRepo?: FacilityBookingRepository;
  roomAllocationRepo?: RoomAllocationRepository;
  evaluationSchemeRepo?: EvaluationSchemeRepository;
  exportRepo?: ExportRepository;
  exportWriter?: ExportFileWriter;
  clubLifecycleRepo?: ClubLifecycleRepository;
  applicationReviewRepo?: ClubApplicationReviewRepository;
  eventProposalReviewRepo?: EventProposalReviewRepository;
  budgetDisbursementRepo?: BudgetDisbursementRepository;
  eventFinanceRepo?: EventFinanceRepository;
  postEventReportRepo?: PostEventReportRepository;
  violationRepo?: ViolationRepository;
  periodicReportRepo?: PeriodicReportRepository;
  clubPeriodicReportRepo?: ClubPeriodicReportRepository;
  schoolEventRepo?: SchoolEventRepository;
  clubInvitationRepo?: ClubInvitationRepository;
  clubEventRepo?: ClubEventRepository;
  evaluationRepo?: EvaluationRepository;
  clubProfileRepo?: ClubProfileRepository;
  boardNominationRepo?: BoardNominationRepository;
  recruitmentCampaignRepo?: RecruitmentCampaignRepository;
  recruitmentApplicationRepo?: RecruitmentApplicationRepository;
  candidateEvaluationRepo?: CandidateEvaluationRepository;
  membershipRepo?: MembershipRepository;
  dashboardRepo?: DashboardRepository;
  leadershipTransitionRepo?: LeadershipTransitionRepository;
  eventRegistrationRepo?: EventRegistrationRepository;
  eventCheckInRepo?: EventCheckInRepository;
  eventFeedbackRepo?: EventFeedbackRepository;
  studentFeedbackRepo?: StudentFeedbackRepository;
  memberSpaceRepo?: MemberSpaceRepository;
  notificationRepo?: NotificationRepository;
  recruitmentAttachmentStorage?: RecruitmentAttachmentStorage | null;
  applicationFiles?: ApplicationFileStorage | null;
  clubTransitionPlanRepo?: ClubTransitionPlanRepository;
  suspensionRequestRepo?: SuspensionRequestRepository;
  membershipReconfirmationRepo?: MembershipReconfirmationRepository;
  clubViolationRepo?: ClubViolationRepository;
  clubEvaluationRepo?: ClubEvaluationRepository;
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
    if (deps.clubTransitionPlanRepo) app.use("/api/v1", clubTransitionPlanRoutes({ repo: deps.clubTransitionPlanRepo, access: deps.auth.accessRepo,
      authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    if (deps.suspensionRequestRepo) app.use("/api/v1", suspensionRequestRoutes({ repo: deps.suspensionRequestRepo, access: deps.auth.accessRepo,
      authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    if (deps.membershipReconfirmationRepo) app.use("/api/v1", membershipReconfirmationRoutes({ repo: deps.membershipReconfirmationRepo,
      authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    if (deps.clubViolationRepo) app.use("/api/v1", clubViolationRoutes({ repo: deps.clubViolationRepo, access: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    if (deps.clubEvaluationRepo) app.use("/api/v1", clubEvaluationRoutes({ repo: deps.clubEvaluationRepo, access: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    if (deps.clubInvitationRepo) {
      app.use("/api/v1", clubInvitationRoutes({ repo: deps.clubInvitationRepo, access: deps.auth.accessRepo,
        authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.clubProfileRepo && deps.policyRepo) {
      app.use("/api/v1", clubProfileRoutes({
        repo: deps.clubProfileRepo, accessRepo: deps.auth.accessRepo, policy: deps.policyRepo,
        authRepo: deps.auth.repo, sessions: deps.auth.sessions,
      }));
    }
    if (deps.facilityBookingRepo && deps.propertyRepo && deps.policyRepo) {
      app.use("/api/v1", facilityBookingRoutes({ repo: deps.facilityBookingRepo,
        properties: deps.propertyRepo, policy: deps.policyRepo, access: deps.auth.accessRepo,
        auth: deps.auth.repo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.roomAllocationRepo && deps.propertyRepo && deps.policyRepo) {
      app.use("/api/v1", roomAllocationRoutes({ repo: deps.roomAllocationRepo, properties: deps.propertyRepo,
        policy: deps.policyRepo, access: deps.auth.accessRepo, auth: deps.auth.repo, authRepo: deps.auth.repo,
        sessions: deps.auth.sessions }));
    }
    if (deps.propertyRepo) {
      app.use("/api/v1", propertyRoutes({
        repo: deps.propertyRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions,
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
    if (deps.candidateEvaluationRepo) {
      app.use("/api/v1", candidateEvaluationRoutes({ repo: deps.candidateEvaluationRepo,
        accessRepo: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
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
    if (deps.memberSpaceRepo && deps.policyRepo) {
      app.use("/api/v1", memberSpaceRoutes({ repo: deps.memberSpaceRepo, policy: deps.policyRepo,
        authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.notificationRepo) {
      app.use("/api/v1", notificationRoutes({ repo: deps.notificationRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.studentFeedbackRepo) {
      app.use("/api/v1", studentFeedbackRoutes({ repo: deps.studentFeedbackRepo,
        accessRepo: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.eventFeedbackRepo && deps.policyRepo) {
      app.use("/api/v1", eventFeedbackRoutes({ repo: deps.eventFeedbackRepo,
        policy: deps.policyRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
    }
    if (deps.policyRepo) {
      app.use("/api/v1", policyRoutes({
        repo: deps.policyRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions,
      }));
      if (deps.eventProposalReviewRepo) {
        app.use("/api/v1", eventProposalReviewRoutes({ repo: deps.eventProposalReviewRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.eventFinanceRepo) app.use("/api/v1", eventFinanceRoutes({ repo: deps.eventFinanceRepo,
        access: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      if (deps.postEventReportRepo) app.use("/api/v1", postEventReportRoutes({ repo: deps.postEventReportRepo,
        access: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      if (deps.budgetDisbursementRepo) {
        app.use("/api/v1", budgetDisbursementRoutes({ repo: deps.budgetDisbursementRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.violationRepo) {
        app.use("/api/v1", violationRoutes({ repo: deps.violationRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.clubPeriodicReportRepo) app.use("/api/v1", clubPeriodicReportRoutes({ repo: deps.clubPeriodicReportRepo,
        policy: deps.policyRepo, access: deps.auth.accessRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      if (deps.periodicReportRepo) {
        app.use("/api/v1", periodicReportRoutes({ repo: deps.periodicReportRepo, policy: deps.policyRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.clubEventRepo) {
        app.use("/api/v1", clubEventRoutes({ repo: deps.clubEventRepo, access: deps.auth.accessRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.schoolEventRepo) {
        app.use("/api/v1", schoolEventRoutes({ repo: deps.schoolEventRepo, policy: deps.policyRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.clubLifecycleRepo) {
        app.use("/api/v1", clubLifecycleRoutes({ repo: deps.clubLifecycleRepo, policy: deps.policyRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.exportRepo && deps.exportWriter) {
        app.use("/api/v1", exportRoutes({ repo: deps.exportRepo, writer: deps.exportWriter, policy: deps.policyRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.evaluationSchemeRepo) {
        app.use("/api/v1", evaluationSchemeRoutes({ repo: deps.evaluationSchemeRepo, policy: deps.policyRepo,
          authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.evaluationRepo && deps.evaluationSchemeRepo) {
        app.use("/api/v1", evaluationRoutes({ repo: deps.evaluationRepo, schemes: deps.evaluationSchemeRepo,
          policy: deps.policyRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions }));
      }
      if (deps.clubFieldRepo) {
        app.use("/api/v1", clubFieldRoutes({
          repo: deps.clubFieldRepo, authRepo: deps.auth.repo, sessions: deps.auth.sessions,
        }));
      }
      if (deps.applicationRepo && deps.clubFieldRepo) {
        app.use("/api/v1", clubApplicationRoutes({
          repo: deps.applicationRepo, policy: deps.policyRepo, fields: deps.clubFieldRepo,
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
  const hasClubFields = Boolean(hasPolicy && deps.clubFieldRepo);
  const hasApplications = Boolean(hasClubFields && deps.applicationRepo);
  const hasApplicationReviews = Boolean(hasApplications && deps.applicationReviewRepo);
  const hasClubProfiles = Boolean(hasPolicy && deps.clubProfileRepo);
  const hasBoardNominations = Boolean(hasAdmin && deps.boardNominationRepo);
  const hasBookings = Boolean(deps.auth && deps.facilityBookingRepo && deps.propertyRepo && deps.policyRepo);
  const hasProperties = Boolean(hasAdmin && deps.propertyRepo);
  const hasRoomAllocations = Boolean(deps.auth && deps.roomAllocationRepo && deps.propertyRepo && deps.policyRepo);
  const hasEvaluationSchemes = Boolean(hasPolicy && deps.evaluationSchemeRepo);
  const hasExports = Boolean(hasPolicy && deps.exportRepo && deps.exportWriter);
  const hasClubLifecycle = Boolean(hasPolicy && deps.clubLifecycleRepo);
  const hasEventProposalReviews = Boolean(hasPolicy && deps.eventProposalReviewRepo);
  const hasBudgets = Boolean(hasPolicy && deps.budgetDisbursementRepo);
  const hasViolations = Boolean(hasPolicy && deps.violationRepo);
  const hasPeriodicReports = Boolean(hasPolicy && deps.periodicReportRepo);
  const hasSchoolEvents = Boolean(hasPolicy && deps.schoolEventRepo);
  const hasEvaluations = Boolean(hasEvaluationSchemes && deps.evaluationRepo);
  const hasRecruitmentCampaigns = Boolean(hasAdmin && deps.recruitmentCampaignRepo && deps.policyRepo);
  const hasRecruitmentApplications = Boolean(hasAdmin && deps.recruitmentApplicationRepo);
  const hasCandidateEvaluations = Boolean(hasAdmin && deps.candidateEvaluationRepo);
  const hasDashboard = Boolean(hasAdmin && deps.dashboardRepo);
  const hasLeadershipTransitions = Boolean(hasAdmin && deps.leadershipTransitionRepo);
  const hasEventRegistrations = Boolean(hasPolicy && deps.eventRegistrationRepo);
  const hasEventCheckIns = Boolean(hasPolicy && deps.eventCheckInRepo);
  const hasEventFeedback = Boolean(hasPolicy && deps.eventFeedbackRepo);
  const hasStudentFeedback = Boolean(hasAdmin && deps.studentFeedbackRepo);
  const hasMemberSpace = Boolean(hasPolicy && deps.memberSpaceRepo);
  const availablePaths = Object.fromEntries(Object.entries(openApiDocument.paths ?? {})
    .filter(([path]) => {
      if (path.startsWith("/clubs/{clubId}/transition-plans")) return Boolean(hasAdmin && deps.clubTransitionPlanRepo);
      if (path.startsWith("/clubs/{clubId}/suspension-requests") || path.startsWith("/admin/suspension-requests")) return Boolean(hasAdmin && deps.suspensionRequestRepo);
      if (path.startsWith("/memberships/reconfirmations")) return Boolean(hasAdmin && deps.membershipReconfirmationRepo);
      if (path.startsWith("/clubs/{clubId}/violations")) return Boolean(hasAdmin && deps.clubViolationRepo);
      if (path.startsWith("/clubs/{clubId}/evaluations")) return Boolean(hasAdmin && deps.clubEvaluationRepo);
      if (path.startsWith("/clubs/{clubId}/invitations")) return Boolean(hasAdmin && deps.clubInvitationRepo);
      if (path.startsWith("/clubs/{clubId}/periodic-reports")) return Boolean(hasPolicy && deps.clubPeriodicReportRepo);
      if (path.startsWith("/auth/")) return hasAdmin;
      if (path.startsWith("/admin/policies")) return hasPolicy;
      if (path.startsWith("/admin/club-fields")) return hasClubFields;
      if (path === "/booking-slots" || path.startsWith("/admin/bookings") || path.includes("/booking-properties")
        || path.includes("/booking-events")
        || path.startsWith("/clubs/{clubId}/bookings") || path.endsWith("/booking-conflicts")) return hasBookings;
      if (path.startsWith("/admin/properties")) return hasProperties;
      if (path.includes("/room-allocations")) return hasRoomAllocations;
      if (path.startsWith("/admin/evaluation-schemes")) return hasEvaluationSchemes;
      if (path.startsWith("/admin/evaluations")) return hasEvaluations;
      if (path.startsWith("/admin/exports")) return hasExports;
      if (path.startsWith("/admin/clubs")) return hasClubLifecycle;
      if (path.startsWith("/admin/application-reviews")) return hasApplicationReviews;
      if (path.startsWith("/admin/event-proposals")) return hasEventProposalReviews;
      if (path.includes("/event-reports")) return Boolean(hasPolicy && deps.postEventReportRepo);
      if (path.startsWith("/clubs/{clubId}/budgets") || path.includes("/reconciliation")) return Boolean(hasPolicy && deps.eventFinanceRepo);
      if (path.startsWith("/admin/budgets")) return hasBudgets;
      if (path.startsWith("/admin/violations")) return hasViolations;
      if (path.startsWith("/admin/periodic-reports")) return hasPeriodicReports;
      if (path.startsWith("/admin/school-events")) return hasSchoolEvents;
      if (path.startsWith("/admin/board-nominations")) return hasBoardNominations;
      if (path.startsWith("/admin/leadership-transitions")) return hasLeadershipTransitions;
      if (path.startsWith("/admin/student-feedback")) return hasStudentFeedback;
      if (path.startsWith("/admin/")) return hasAdmin;
      if (path.startsWith("/applications/recruitment")) return hasRecruitmentApplications;
      if (path.startsWith("/dashboard")) return hasDashboard;
      if (path.startsWith("/notifications")) return Boolean(hasAdmin && deps.notificationRepo);
      if (path.startsWith("/events/{id}/registration")
        || path.startsWith("/event-registrations")) return hasEventRegistrations;
      if (path.startsWith("/events/{id}/check-in")
        || path.startsWith("/attendances")) return hasEventCheckIns;
      if (path.startsWith("/events/{id}/feedback")
        || path.startsWith("/event-feedbacks")) return hasEventFeedback;
      if (path.startsWith("/student-feedback")
        || path.startsWith("/clubs/{clubId}/student-feedback")) return hasStudentFeedback;
      if (path.startsWith("/clubs/{clubId}/events")) return Boolean(hasPolicy && deps.clubEventRepo);
      if (path.startsWith("/clubs/{clubId}/member-space")) return hasMemberSpace;
      if (path.startsWith("/applications")) return hasApplications;
      if (path.startsWith("/clubs/{clubId}/settings")
        || path.startsWith("/clubs/{clubId}/profile")
        || path.startsWith("/clubs/{clubId}/departments")) return hasClubProfiles;
      if (path.startsWith("/clubs/{clubId}/board-nomination")) return hasBoardNominations;
      if (/\/evaluations?$/.test(path)) return hasCandidateEvaluations;
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
