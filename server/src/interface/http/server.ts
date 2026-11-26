import type { ClubEvaluationRepository } from '../../domain/club-evaluation.js'
import { clubEvaluationRoutes } from './club-evaluation-routes.js'
import type { ClubViolationRepository } from '../../domain/club-violation.js'
import { clubViolationRoutes } from './club-violation-routes.js'
import type { MembershipReconfirmationRepository } from '../../domain/membership-reconfirmation.js'
import { membershipReconfirmationRoutes } from './membership-reconfirmation-routes.js'
import type { SuspensionRequestRepository } from '../../domain/suspension-request.js'
import { suspensionRequestRoutes } from './suspension-request-routes.js'
import type { ClubTransitionPlanRepository } from '../../domain/club-transition-plan.js'
import { clubTransitionPlanRoutes } from './club-transition-plan-routes.js'
import type { ClubPeriodicReportRepository } from '../../domain/club-periodic-report.js'
import { clubPeriodicReportRoutes } from './club-periodic-report-routes.js'
import type { ClubInvitationRepository } from '../../domain/club-invitation.js'
import { clubInvitationRoutes } from './club-invitation-routes.js'
import type { EventFinanceRepository } from '../../domain/event-finance.js'
import type { PostEventReportRepository } from '../../domain/post-event-report.js'
import { eventFinanceRoutes } from './event-finance-routes.js'
import { sponsoredItemRoutes } from './sponsored-item-routes.js'
import type { SponsoredItemRepository } from '../../domain/sponsored-item.js'
import { postEventReportRoutes } from './post-event-report-routes.js'
import type { ClubEventRepository, EventProposalFileStorage } from '../../domain/club-event.js'
import { clubEventRoutes } from './club-event-routes.js'
import type { FacilityBookingRepository } from '../../domain/facility-booking.js'
import { facilityBookingRoutes } from './facility-booking-routes.js'
import type { RoomAllocationRepository } from '../../domain/room-allocation.js'
import { roomAllocationRoutes } from './room-allocation-routes.js'
import express, { type Router } from 'express'
import { authRoutes, type AuthRouteDeps } from './auth-routes.js'
import { accountAdminRoutes } from './account-admin-routes.js'
import type { AccountAdminRepository } from '../../domain/account-admin.js'
import type { PublicDiscoveryRepository } from '../../domain/public-discovery.js'
import type { PolicyManagementRepository } from '../../domain/policy.js'
import type { ClubFieldRepository } from '../../domain/club-field.js'
import type { PropertyRepository } from '../../domain/property.js'
import type { EvaluationSchemeRepository } from '../../domain/evaluation-scheme.js'
import type { ExportFileWriter, ExportRepository } from '../../domain/data-export.js'
import type { ClubLifecycleRepository } from '../../domain/club-lifecycle.js'
import type {
  ApplicationFileStorage,
  ClubApplicationRepository,
} from '../../domain/club-application.js'
import type { ClubApplicationReviewRepository } from '../../domain/club-application-review.js'
import type { EventProposalReviewRepository } from '../../domain/event-proposal-review.js'
import type { EventDefenseRepository } from '../../domain/event-defense.js'
import type { BudgetDisbursementRepository } from '../../domain/budget-disbursement.js'
import type { ViolationRepository } from '../../domain/violation.js'
import type {
  PeriodicEvidenceStorage,
  PeriodicReportRepository,
} from '../../domain/periodic-report.js'
import type { SchoolEventRepository } from '../../domain/school-event.js'
import type { EvaluationRepository } from '../../domain/evaluation.js'
import type { ClubProfileRepository } from '../../domain/club-profile.js'
import type { BoardNominationRepository } from '../../domain/board-nomination.js'
import type { RecruitmentCampaignRepository } from '../../domain/recruitment-campaign.js'
import type { MembershipRepository } from '../../domain/membership.js'
import type {
  RecruitmentApplicationRepository,
  RecruitmentAttachmentStorage,
} from '../../domain/recruitment-application.js'
import type { CandidateEvaluationRepository } from '../../domain/candidate-evaluation.js'
import type { DashboardRepository } from '../../domain/dashboard.js'
import type { LeadershipTransitionRepository } from '../../domain/leadership-transition.js'
import type { EventRegistrationRepository } from '../../domain/event-registration.js'
import type { EventCheckInRepository } from '../../domain/event-checkin.js'
import type { EventFeedbackRepository } from '../../domain/event-feedback.js'
import type { ComplaintRepository } from '../../domain/complaint.js'
import type { MemberSpaceRepository } from '../../domain/member-space.js'
import { accessDenialAuditor, errorHandler, requestLogger } from './middleware.js'
import type { AccessDenialAuditRepository } from '../../domain/access-denial.js'
import { openApiDocument } from './openapi.js'
import { fail } from './response.js'
import { publicDiscoveryRoutes } from './public-discovery-routes.js'
import { policyRoutes } from './policy-routes.js'
import { clubApplicationRoutes } from './club-application-routes.js'
import { clubApplicationReviewRoutes } from './club-application-review-routes.js'
import { eventProposalReviewRoutes } from './event-proposal-review-routes.js'
import { eventDefenseRoutes } from './event-defense-routes.js'
import { budgetDisbursementRoutes } from './budget-disbursement-routes.js'
import { violationRoutes } from './violation-routes.js'
import { periodicReportRoutes } from './periodic-report-routes.js'
import { schoolEventRoutes } from './school-event-routes.js'
import { evaluationRoutes } from './evaluation-routes.js'
import { clubProfileRoutes } from './club-profile-routes.js'
import { clubFieldRoutes } from './club-field-routes.js'
import { propertyRoutes } from './property-routes.js'
import { evaluationSchemeRoutes } from './evaluation-scheme-routes.js'
import { exportRoutes } from './export-routes.js'
import { clubLifecycleRoutes } from './club-lifecycle-routes.js'
import { boardNominationRoutes } from './board-nomination-routes.js'
import { recruitmentCampaignRoutes } from './recruitment-campaign-routes.js'
import { recruitmentApplicationRoutes } from './recruitment-application-routes.js'
import { candidateEvaluationRoutes } from './candidate-evaluation-routes.js'
import { membershipRoutes } from './membership-routes.js'
import { dashboardRoutes } from './dashboard-routes.js'
import { leadershipTransitionRoutes } from './leadership-transition-routes.js'
import { eventRegistrationRoutes } from './event-registration-routes.js'
import { eventCheckInRoutes } from './event-checkin-routes.js'
import { eventFeedbackRoutes } from './event-feedback-routes.js'
import { complaintRoutes } from './complaint-routes.js'
import type { ApprovalRoutingRepository } from '../../domain/approval-routing.js'
import { approvalRoutingRoutes } from './approval-routing-routes.js'
import { memberSpaceRoutes } from './member-space-routes.js'
import { rateLimit, type RateLimitRule } from './rate-limit.js'
import type { NotificationRepository } from '../../domain/notification.js'
import { notificationRoutes } from './notification-routes.js'

// ponytail: Swagger UI từ CDN (ghim version + hash SRI, nên response CDN bị giả mạo sẽ không
// được thực thi) — nếu cần dev offline thì vendor swagger-ui-dist cục bộ.
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
</html>`

/** Route tự parse body JSON lớn hơn 100kb sau authGuard (xem từng file route). */
const LARGE_JSON_ROUTES: readonly { method: string; path: RegExp }[] = [
  // Lưu nháp báo cáo định kỳ: tới 500 thành viên và 200 sự kiện (2mb).
  { method: 'PUT', path: /^\/api\/v1\/clubs\/[^/]+\/periodic-reports\/[^/]+\/?$/i },
  // Lưu nháp đơn ứng tuyển: tới 30 câu trả lời x 10.000 ký tự (1mb).
  { method: 'PATCH', path: /^\/api\/v1\/applications\/recruitment\/[^/]+\/draft\/?$/i },
  // Ghi chú phiên bảo vệ: tới 50.000 ký tự (256kb).
  { method: 'PUT', path: /^\/api\/v1\/admin\/event-proposals\/[^/]+\/defense\/notes\/?$/i },
]

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']

/** Minimal view of an Express 5 router layer: enough to list the routes a router serves. */
interface RouterLayer {
  route?: { path: unknown; methods: Record<string, boolean> }
}

/**
 * The OpenAPI paths of the operations the mounted /api/v1 routers actually serve. Documentation
 * follows the mounts themselves, so a route is documented exactly when it is reachable and there
 * is no second, hand-kept list of conditions that can drift from the mount conditions.
 */
function servedPaths(routers: Router[]) {
  const served = new Set(['get /health'])
  for (const router of routers) {
    for (const layer of (router as unknown as { stack: RouterLayer[] }).stack) {
      if (layer.route && typeof layer.route.path === 'string') {
        const path = layer.route.path.replace(/:(\w+)/g, '{$1}')
        for (const method of Object.keys(layer.route.methods)) {
          served.add(`${method} ${path}`)
        }
      }
    }
  }
  return Object.fromEntries(
    Object.entries(openApiDocument.paths ?? {}).flatMap(([path, item]) => {
      const entries = Object.entries(item ?? {}).filter(
        ([key]) => !HTTP_METHODS.includes(key) || served.has(`${key} ${path}`),
      )
      return entries.some(([key]) => HTTP_METHODS.includes(key))
        ? [[path, Object.fromEntries(entries)]]
        : []
    }),
  )
}

// Dựng ứng dụng Express, chỉ mount route khi đủ dependency và lọc OpenAPI theo route đã mount
export function buildApp(deps: {
  auth?: AuthRouteDeps
  accessDenialAudit?: AccessDenialAuditRepository
  adminRepo?: AccountAdminRepository
  policyRepo?: PolicyManagementRepository
  applicationRepo?: ClubApplicationRepository
  clubFieldRepo?: ClubFieldRepository
  propertyRepo?: PropertyRepository
  facilityBookingRepo?: FacilityBookingRepository
  roomAllocationRepo?: RoomAllocationRepository
  evaluationSchemeRepo?: EvaluationSchemeRepository
  exportRepo?: ExportRepository
  exportWriter?: ExportFileWriter
  clubLifecycleRepo?: ClubLifecycleRepository
  applicationReviewRepo?: ClubApplicationReviewRepository
  eventProposalReviewRepo?: EventProposalReviewRepository
  budgetDisbursementRepo?: BudgetDisbursementRepository
  eventFinanceRepo?: EventFinanceRepository
  sponsoredItemRepo?: SponsoredItemRepository
  postEventReportRepo?: PostEventReportRepository
  violationRepo?: ViolationRepository
  periodicReportRepo?: PeriodicReportRepository
  clubPeriodicReportRepo?: ClubPeriodicReportRepository
  schoolEventRepo?: SchoolEventRepository
  clubInvitationRepo?: ClubInvitationRepository
  clubEventRepo?: ClubEventRepository
  evaluationRepo?: EvaluationRepository
  clubProfileRepo?: ClubProfileRepository
  boardNominationRepo?: BoardNominationRepository
  recruitmentCampaignRepo?: RecruitmentCampaignRepository
  recruitmentApplicationRepo?: RecruitmentApplicationRepository
  candidateEvaluationRepo?: CandidateEvaluationRepository
  membershipRepo?: MembershipRepository
  dashboardRepo?: DashboardRepository
  leadershipTransitionRepo?: LeadershipTransitionRepository
  eventRegistrationRepo?: EventRegistrationRepository
  eventCheckInRepo?: EventCheckInRepository
  eventFeedbackRepo?: EventFeedbackRepository
  complaintRepo?: ComplaintRepository
  approvalRoutingRepo?: ApprovalRoutingRepository
  memberSpaceRepo?: MemberSpaceRepository
  notificationRepo?: NotificationRepository
  recruitmentAttachmentStorage?: RecruitmentAttachmentStorage | null
  applicationFiles?: ApplicationFileStorage | null
  eventProposalFiles?: EventProposalFileStorage | null
  periodicEvidenceFiles?: PeriodicEvidenceStorage | null
  clubTransitionPlanRepo?: ClubTransitionPlanRepository
  suspensionRequestRepo?: SuspensionRequestRepository
  membershipReconfirmationRepo?: MembershipReconfirmationRepository
  clubViolationRepo?: ClubViolationRepository
  clubEvaluationRepo?: ClubEvaluationRepository
  eventDefenseRepo?: EventDefenseRepository
  publicRepo: PublicDiscoveryRepository
  dbReady: () => boolean
  /** Per-IP request limits; omitted (tests) means no limiting. */
  rateLimits?: { auth: RateLimitRule; api: RateLimitRule }
  /** Express `trust proxy` setting, so req.ip is the real client behind a reverse proxy. */
  trustProxy?: boolean | number
  /** Serve the Swagger UI and openapi.json (default true; main.ts turns it off in production). */
  apiDocs?: boolean
}) {
  const app = express()
  const apiRouters: Router[] = []
  // Mounts an /api/v1 router and records it for the served OpenAPI document.
  function mount(router: Router) {
    apiRouters.push(router)
    app.use('/api/v1', router)
  }
  app.disable('x-powered-by')
  app.set('trust proxy', deps.trustProxy ?? false)
  app.use((_req, res, next) => {
    // ponytail: baseline security header không cần dependency helmet — thêm CSP khi app có trang thật
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    next()
  })
  app.use(requestLogger) // đặt trước body parsing, để request bị parser từ chối vẫn có dòng log
  if (deps.rateLimits) {
    // Limit before parsing bodies; the stricter auth limit counts on top of the global one.
    app.use('/api/v1/auth', rateLimit(deps.rateLimits.auth))
    app.use('/api/v1', rateLimit(deps.rateLimits.api))
  }
  // Body JSON mặc định tối đa 100kb. Vài route cần body lớn hơn tự gắn express.json({ limit })
  // sau authGuard; parser chung bỏ qua chúng để không đọc body lớn trước khi xác thực.
  const jsonBody = express.json({ limit: '100kb' })
  app.use((req, res, next) => {
    if (
      LARGE_JSON_ROUTES.some((route) => route.method === req.method && route.path.test(req.path))
    ) {
      next()
      return
    }
    jsonBody(req, res, next)
  })
  // Endpoint health check, trả 503 khi database chưa sẵn sàng
  app.get('/api/v1/health', (_req, res) => {
    const ok = deps.dbReady() // 503 khi DB sập, để orchestrator ngừng định tuyến tới đây
    res.status(ok ? 200 : 503).json({ ok })
  })
  mount(publicDiscoveryRoutes(deps.publicRepo))
  if (deps.auth && deps.adminRepo) {
    mount(authRoutes(deps.auth))
    mount(
      accountAdminRoutes({
        adminRepo: deps.adminRepo,
        authRepo: deps.auth.repo,
        sessions: deps.auth.sessions,
      }),
    )
    if (deps.clubTransitionPlanRepo) {
      mount(
        clubTransitionPlanRoutes({
          repo: deps.clubTransitionPlanRepo,
          access: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.suspensionRequestRepo) {
      mount(
        suspensionRequestRoutes({
          repo: deps.suspensionRequestRepo,
          access: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.membershipReconfirmationRepo) {
      mount(
        membershipReconfirmationRoutes({
          repo: deps.membershipReconfirmationRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.clubViolationRepo) {
      mount(
        clubViolationRoutes({
          repo: deps.clubViolationRepo,
          access: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.clubEvaluationRepo) {
      mount(
        clubEvaluationRoutes({
          repo: deps.clubEvaluationRepo,
          access: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.clubInvitationRepo) {
      mount(
        clubInvitationRoutes({
          repo: deps.clubInvitationRepo,
          access: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.clubProfileRepo && deps.policyRepo) {
      mount(
        clubProfileRoutes({
          repo: deps.clubProfileRepo,
          accessRepo: deps.auth.accessRepo,
          policy: deps.policyRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.facilityBookingRepo && deps.propertyRepo && deps.policyRepo) {
      mount(
        facilityBookingRoutes({
          repo: deps.facilityBookingRepo,
          properties: deps.propertyRepo,
          policy: deps.policyRepo,
          access: deps.auth.accessRepo,
          auth: deps.auth.repo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.roomAllocationRepo && deps.propertyRepo && deps.policyRepo) {
      mount(
        roomAllocationRoutes({
          repo: deps.roomAllocationRepo,
          properties: deps.propertyRepo,
          policy: deps.policyRepo,
          access: deps.auth.accessRepo,
          auth: deps.auth.repo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.propertyRepo) {
      mount(
        propertyRoutes({
          repo: deps.propertyRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.boardNominationRepo) {
      mount(
        boardNominationRoutes({
          repo: deps.boardNominationRepo,
          accessRepo: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.leadershipTransitionRepo) {
      mount(
        leadershipTransitionRoutes({
          repo: deps.leadershipTransitionRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.recruitmentCampaignRepo && deps.policyRepo) {
      mount(
        recruitmentCampaignRoutes({
          repo: deps.recruitmentCampaignRepo,
          accessRepo: deps.auth.accessRepo,
          policy: deps.policyRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.recruitmentApplicationRepo) {
      mount(
        recruitmentApplicationRoutes({
          repo: deps.recruitmentApplicationRepo,
          files: deps.recruitmentAttachmentStorage ?? null,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
          accessRepo: deps.auth.accessRepo,
        }),
      )
    }
    if (deps.candidateEvaluationRepo) {
      mount(
        candidateEvaluationRoutes({
          repo: deps.candidateEvaluationRepo,
          accessRepo: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.membershipRepo) {
      mount(
        membershipRoutes({
          repo: deps.membershipRepo,
          accessRepo: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.dashboardRepo) {
      mount(
        dashboardRoutes({
          repo: deps.dashboardRepo,
          accessRepo: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.eventRegistrationRepo && deps.policyRepo) {
      mount(
        eventRegistrationRoutes({
          repo: deps.eventRegistrationRepo,
          policy: deps.policyRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.eventCheckInRepo && deps.policyRepo) {
      mount(
        eventCheckInRoutes({
          repo: deps.eventCheckInRepo,
          policy: deps.policyRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.memberSpaceRepo && deps.policyRepo) {
      mount(
        memberSpaceRoutes({
          repo: deps.memberSpaceRepo,
          policy: deps.policyRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.notificationRepo) {
      mount(
        notificationRoutes({
          repo: deps.notificationRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.approvalRoutingRepo) {
      mount(
        approvalRoutingRoutes({
          repo: deps.approvalRoutingRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.complaintRepo) {
      mount(
        complaintRoutes({
          repo: deps.complaintRepo,
          accessRepo: deps.auth.accessRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.eventFeedbackRepo && deps.policyRepo) {
      mount(
        eventFeedbackRoutes({
          repo: deps.eventFeedbackRepo,
          policy: deps.policyRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
    }
    if (deps.policyRepo) {
      mount(
        policyRoutes({
          repo: deps.policyRepo,
          authRepo: deps.auth.repo,
          sessions: deps.auth.sessions,
        }),
      )
      if (deps.eventProposalReviewRepo) {
        mount(
          eventProposalReviewRoutes({
            repo: deps.eventProposalReviewRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
        if (deps.eventDefenseRepo) {
          mount(
            eventDefenseRoutes({
              repo: deps.eventDefenseRepo,
              reviewRepo: deps.eventProposalReviewRepo,
              accessRepo: deps.auth.accessRepo,
              authRepo: deps.auth.repo,
              sessions: deps.auth.sessions,
            }),
          )
        }
      }
      if (deps.eventFinanceRepo) {
        mount(
          eventFinanceRoutes({
            repo: deps.eventFinanceRepo,
            access: deps.auth.accessRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.sponsoredItemRepo) {
        mount(
          sponsoredItemRoutes({
            repo: deps.sponsoredItemRepo,
            access: deps.auth.accessRepo,
            auth: deps.auth.repo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
            files: deps.applicationFiles ?? null,
            policy: deps.policyRepo,
          }),
        )
      }
      if (deps.postEventReportRepo) {
        mount(
          postEventReportRoutes({
            repo: deps.postEventReportRepo,
            access: deps.auth.accessRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.budgetDisbursementRepo) {
        mount(
          budgetDisbursementRoutes({
            repo: deps.budgetDisbursementRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.violationRepo) {
        mount(
          violationRoutes({
            repo: deps.violationRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.clubPeriodicReportRepo) {
        mount(
          clubPeriodicReportRoutes({
            repo: deps.clubPeriodicReportRepo,
            policy: deps.policyRepo,
            access: deps.auth.accessRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
            files: deps.periodicEvidenceFiles ?? null,
          }),
        )
      }
      if (deps.periodicReportRepo) {
        mount(
          periodicReportRoutes({
            repo: deps.periodicReportRepo,
            policy: deps.policyRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
            evaluationRepo: deps.evaluationRepo,
            evaluationSchemeRepo: deps.evaluationSchemeRepo,
            files: deps.periodicEvidenceFiles ?? null,
          }),
        )
      }
      if (deps.clubEventRepo) {
        mount(
          clubEventRoutes({
            repo: deps.clubEventRepo,
            access: deps.auth.accessRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
            files: deps.eventProposalFiles ?? null,
          }),
        )
      }
      if (deps.schoolEventRepo) {
        mount(
          schoolEventRoutes({
            repo: deps.schoolEventRepo,
            policy: deps.policyRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.clubLifecycleRepo) {
        mount(
          clubLifecycleRoutes({
            repo: deps.clubLifecycleRepo,
            policy: deps.policyRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.exportRepo && deps.exportWriter) {
        mount(
          exportRoutes({
            repo: deps.exportRepo,
            writer: deps.exportWriter,
            policy: deps.policyRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.evaluationSchemeRepo) {
        mount(
          evaluationSchemeRoutes({
            repo: deps.evaluationSchemeRepo,
            policy: deps.policyRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.evaluationRepo && deps.evaluationSchemeRepo) {
        mount(
          evaluationRoutes({
            repo: deps.evaluationRepo,
            schemes: deps.evaluationSchemeRepo,
            policy: deps.policyRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.clubFieldRepo) {
        mount(
          clubFieldRoutes({
            repo: deps.clubFieldRepo,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
      }
      if (deps.applicationRepo && deps.clubFieldRepo) {
        mount(
          clubApplicationRoutes({
            repo: deps.applicationRepo,
            policy: deps.policyRepo,
            fields: deps.clubFieldRepo,
            files: deps.applicationFiles ?? null,
            authRepo: deps.auth.repo,
            sessions: deps.auth.sessions,
          }),
        )
        if (deps.applicationReviewRepo) {
          mount(
            clubApplicationReviewRoutes({
              repo: deps.applicationReviewRepo,
              authRepo: deps.auth.repo,
              sessions: deps.auth.sessions,
              files: deps.applicationFiles ?? null,
            }),
          )
        }
      }
    }
  }
  if (deps.apiDocs ?? true) {
    const availableDocumentJson = JSON.stringify({
      ...openApiDocument,
      paths: servedPaths(apiRouters),
    })
    // Phục vụ tài liệu OpenAPI JSON của các route đang mount
    app.get('/docs/openapi.json', (_req, res) => {
      res.type('json').send(availableDocumentJson)
    })
    // Phục vụ trang tài liệu API /docs
    app.get('/docs', (_req, res) => {
      res.type('html').send(docsHtml)
    })
  }
  app.use((req, res) => {
    fail(res, req, 404, 'not_found', 'not found') // giữ đúng hợp đồng error envelope cho đường dẫn không tồn tại
  })
  if (deps.accessDenialAudit) {
    app.use(accessDenialAuditor(deps.accessDenialAudit))
  }
  app.use(errorHandler)
  return app
}
