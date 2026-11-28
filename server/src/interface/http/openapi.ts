import { clubCompletionOpenApiPaths } from './openapi-club-completion.js'
import { notificationOpenApiPaths } from './openapi-notifications.js'
import {
  clubPeriodicCreateBody,
  clubPeriodicDraftBody,
  clubPeriodicVersionBody,
} from './club-periodic-report-routes.js'
import { invitationResponseBody } from './club-invitation-routes.js'
import { accountabilityOpenApiPaths } from './openapi-accountability.js'
import { clubEventOpenApiPaths } from './openapi-club-events.js'
import { eventDefenseOpenApiPaths, EventDefenseSessionSchema } from './openapi-event-defense.js'
import {
  roomAllocationBody,
  roomAllocationQuery,
  roomAllocationRevokeBody,
  roomOccupancyQuery,
} from './room-allocation-routes.js'
import {
  bookingBody,
  bookingSaveBody,
  bookingVersionBody,
  bookingReasonBody,
  bookingDecisionBody,
  bookingAvailabilityQuery,
} from './facility-booking-routes.js'
import { z } from 'zod'
import { createDocument } from 'zod-openapi'
import { apiError, jsonBody, jsonOk } from './openapi-shared.js'
import { objectId } from './request.js'
import { policyCreateBody, policySettingsBody } from './policy-routes.js'
import { applicationDraftBody } from './club-application-routes.js'
import { applicationReviewDecisionBody } from './club-application-review-routes.js'
import {
  eventCancellationDecisionBody,
  eventReviewDecisionBody,
} from './event-proposal-review-routes.js'
import { sponsoredItemOpenApiPaths } from './openapi-sponsored-items.js'
import { budgetListQuery } from './budget-disbursement-routes.js'
import {
  periodicCampaignBody,
  periodicDecisionBody,
  periodicMissingBody,
  periodicOverviewQuery,
} from './periodic-report-routes.js'
import { violationListQuery, violationOpenBody, violationStepBody } from './violation-routes.js'
import {
  schoolEventBody,
  schoolEventConflictQuery,
  schoolEventInviteBody,
} from './school-event-routes.js'
import {
  evaluationManualBody,
  evaluationOverviewQuery,
  evaluationPeriodBody,
} from './evaluation-routes.js'
import { clubDepartmentBody, clubProfileBody } from './club-profile-routes.js'
import { clubFieldBody } from './club-field-routes.js'
import {
  propertyActivationBody,
  propertyCreateBody,
  propertyDetailsBody,
} from './property-routes.js'
import {
  evaluationSchemeCreateBody,
  evaluationSchemeSettingsBody,
} from './evaluation-scheme-routes.js'
import {
  annualExportBody,
  annualPreviewBody,
  exportBody,
  exportPreviewBody,
} from './export-routes.js'
import { lifecycleReasonBody, suspendBody } from './club-lifecycle-routes.js'
import { boardNominationBody, boardNominationDecisionBody } from './board-nomination-routes.js'
import { lockBody } from './account-admin-routes.js'
import { transitionDecisionBody } from './leadership-transition-routes.js'
import { eventRegistrationBody } from './event-registration-routes.js'
import { eventCheckInBody } from './event-checkin-routes.js'
import { eventFeedbackBody } from './event-feedback-routes.js'
import {
  complaintBody,
  complaintCloseBody,
  complaintLinkBody,
  complaintEscalateBody,
  complaintQuery,
  complaintResponseBody,
  complaintTriageBody,
} from './complaint-routes.js'
import { COMPLAINT_STATES } from '../../domain/complaint.js'
import { VIOLATION_FILTERS } from '../../domain/violation.js'
import { BUDGET_FILTERS } from '../../domain/budget-disbursement.js'
import { routingRulesBody, routingSimulationQuery } from './approval-routing-routes.js'
import { recruitmentCampaignBody } from './recruitment-campaign-routes.js'
import {
  createRecruitmentApplicationBody,
  updateRecruitmentApplicationBody,
} from './recruitment-application-routes.js'
import { candidateEvaluationBody } from './candidate-evaluation-routes.js'
import type { ClubMembershipRecord, MembershipWithdrawalRequest } from '../../domain/membership.js'

const Health = z.object({ ok: z.boolean() })
const Me = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    displayName: z.string(),
    avatarUrl: z.string().optional(),
    accountState: z.enum(['Active', 'Locked']),
    lockReason: z.string().optional(),
  }),
  csrfToken: z.string(),
  systemRoles: z.array(z.string()),
  workspaces: z.array(
    z.object({
      kind: z.enum(['student', 'icpdp', 'club']),
      clubId: z.string().optional(),
      clubName: z.string().optional(),
      role: z.enum(['leader', 'member', 'founder']).optional(),
      permissions: z.array(z.string()),
    }),
  ),
})
const AdminUsers = z.object({
  items: z.array(
    z.object({
      user: Me.shape.user,
      systemRoles: z.array(z.string()),
      clubs: z.array(
        z.object({
          clubId: z.string(),
          clubName: z.string(),
          membershipState: z.string(),
          positions: z.array(z.string()),
        }),
      ),
      lockCase: z
        .object({ violationId: z.string(), title: z.string(), clubName: z.string() })
        .optional(),
    }),
  ),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
})
const adminUsersQuery = z.object({
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(50).optional(),
})
const Changed = z.object({ changed: z.literal(true) })
const Dashboard = z.object({
  kind: z.enum(['student', 'club', 'icpdp']),
  clubId: z.string().optional(),
  generatedAt: z.string().datetime(),
  panels: z.array(
    z.discriminatedUnion('status', [
      z.object({
        key: z.string(),
        status: z.literal('ready'),
        count: z.number().int().nonnegative(),
      }),
      z.object({ key: z.string(), status: z.literal('error') }),
    ]),
  ),
  icpdpCharts: z
    .object({
      queues: z.array(
        z.object({ entityType: z.string(), onTime: z.number().int(), overdue: z.number().int() }),
      ),
      eventsByMonth: z.array(z.object({ month: z.string(), count: z.number().int() })),
      clubsByField: z.array(z.object({ field: z.string(), count: z.number().int() })),
      clubsByState: z.array(z.object({ state: z.string(), count: z.number().int() })),
      budget: z.object({
        periodCode: z.string().optional(),
        approved: z.number(),
        disbursed: z.number(),
      }),
    })
    .optional(),
  clubCharts: z
    .object({
      membersByMonth: z.array(z.object({ month: z.string(), count: z.number().int() })),
      eventTurnout: z.array(
        z.object({
          eventId: z.string(),
          title: z.string(),
          startAt: z.string().datetime(),
          registered: z.number().int(),
          attended: z.number().int(),
        }),
      ),
      recruitment: z
        .object({
          campaignId: z.string(),
          title: z.string(),
          submitted: z.number().int(),
          shortlisted: z.number().int(),
          accepted: z.number().int(),
          onboarded: z.number().int(),
        })
        .optional(),
      feedback: z.object({
        respondents: z.number().int(),
        average: z.number().optional(),
        distribution: z.array(z.number().int()),
      }),
    })
    .optional(),
})
const Reason = z.object({ reason: z.string().min(1).max(1000) })
const RoleChange = z.object({ roleCode: z.string(), reason: z.string().optional() })
const IdPath = z.object({ id: z.string() })
const ClubPath = z.object({ clubId: z.string() })
const ClubIdPath = ClubPath.extend({ id: z.string() })
const CampaignPath = ClubPath.extend({ campaignId: z.string() })
const ApplicationPath = CampaignPath.extend({ applicationId: z.string() })
const RolePath = z.object({ id: z.string(), roleCode: z.string() })
const PolicyVersion = policySettingsBody.extend({
  id: z.string(),
  effectiveFrom: z.string().datetime(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
})
const ApplicationDocument = z.object({
  id: z.string(),
  documentType: z.enum(['PROPOSAL', 'LOGO']),
  fileName: z.string(),
  mimeType: z.string(),
  bytes: z.number(),
  publicUrl: z.string().optional(),
  uploadedAt: z.string(),
})
const ApplicationDraft = applicationDraftBody.extend({
  field: z.string(),
  documents: z.array(ApplicationDocument),
})
const FoundingRequirements = z.object({
  policyVersionId: z.string(),
  minFoundingMembers: z.number(),
  required: policySettingsBody.shape.formRequirements.shape.clubFounding,
})
const Property = propertyCreateBody.extend({
  id: z.string(),
  code: z.string(),
  isActive: z.boolean(),
})
const EvaluationScheme = evaluationSchemeSettingsBody.extend({
  id: z.string(),
  periodCode: z.string(),
  version: z.number(),
  state: z.enum(['Draft', 'Active', 'Superseded']),
  totalWeight: z.number(),
  activatedAt: z.string().optional(),
  createdAt: z.string(),
})
const ClubLifecycleSummary = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  field: z.string(),
  state: z.string(),
  activeMembers: z.number(),
  logoUrl: z.string().optional(),
  contactEmail: z.string().optional(),
  suspension: z
    .object({
      reason: z.string(),
      suspendedAt: z.string(),
      suspendedBy: z.string(),
      until: z.string().nullable(),
      reminderSentAt: z.string().optional(),
    })
    .optional(),
  dissolution: z
    .object({
      decidedAt: z.string(),
      decidedBy: z.string(),
      reason: z.string(),
      effectiveSemester: z.string(),
      effectiveFrom: z.string(),
      effectiveTo: z.string(),
      archivedAt: z.string().optional(),
      outstanding: z
        .object({
          periodicReports: z.array(z.string()),
          postEventReports: z.array(z.object({ eventId: z.string(), title: z.string() })),
          budgets: z.array(z.object({ id: z.string(), eventTitle: z.string(), state: z.string() })),
        })
        .optional()
        .describe('UC15 step 6: obligations still open when the club was archived'),
    })
    .optional(),
})
const CascadeResult = z.object({
  cancelledEvents: z.number(),
  cancelledRegistrations: z.number(),
  cancelledBookings: z.number(),
})
const ClubField = clubFieldBody.extend({ id: z.string(), isActive: z.boolean() })
const ClubFieldUsage = ClubField.extend({ clubCount: z.number(), applicationCount: z.number() })
const FoundingIssue = z.enum([
  'clubName',
  'field',
  'summary',
  'objectives',
  'fanpageUrl',
  'contactEmail',
  'proposal',
  'logo',
  'foundersTooFew',
  'applicantNotFounder',
  'duplicateFounder',
  'leaderCount',
  'viceLeaderCount',
  'fieldUnavailable',
  'leaderHoldsAnotherClub',
])
const ApplicationRecord = z.object({
  id: z.string(),
  founderUserId: z.string(),
  state: z.string(),
  currentVersionNo: z.number(),
  draftRevision: z.number(),
  draft: ApplicationDraft,
  submittedAt: z.string().optional(),
  revisionDeadlineAt: z.string().optional(),
  createdAt: z.string(),
})
const ApplicantDecisionFeedback = z.object({
  outcome: z.enum(['Approve', 'Request revision', 'Reject']),
  reason: z.string().optional(),
  sections: z.array(z.string()),
  decidedAt: z.string(),
})
const ApplicationVersion = z.object({
  id: z.string(),
  applicationId: z.string(),
  versionNo: z.number(),
  policyVersionId: z.string(),
  snapshot: ApplicationDraft,
  submittedAt: z.string(),
})
const ApplicationDocumentPath = z.object({ id: z.string(), documentId: z.string() })
const ApplicationReviewTask = z.object({
  id: z.string(),
  applicationId: z.string(),
  title: z.string(),
  state: z.enum(['Open', 'Decided', 'Closed']),
  assigneeId: z.string().optional(),
  openedAt: z.string(),
  slaDueAt: z.string().optional(),
})
const ApplicationReviewDecision = z.object({
  id: z.string(),
  taskId: z.string(),
  outcome: z.enum(['Request revision', 'Approve', 'Reject']),
  reason: z.string().optional(),
  sections: z.array(z.string()),
  reviewNote: z.string().optional(),
  actorId: z.string(),
  at: z.string(),
  policyVersionId: z.string().optional(),
})
const ApplicationReviewQueueItem = z.object({
  task: ApplicationReviewTask,
  application: ApplicationRecord,
})
const FounderProfile = z.object({ id: z.string(), displayName: z.string(), email: z.string() })
/** Gợi ý CLB tương tự chỉ mang tính tham khảo (UC07/UC08): không bao giờ chặn việc nộp hay bất kỳ kết quả duyệt nào. */
const SimilarClubHint = z.object({
  kind: z.enum(['CLUB', 'APPLICATION']),
  id: z.string(),
  name: z.string(),
  field: z.string(),
  state: z.string(),
  score: z.number().int().min(35).max(100),
  level: z.enum(['HIGH', 'MEDIUM']),
  reasons: z.object({
    name: z.number().min(0).max(1),
    content: z
      .number()
      .min(0)
      .max(1)
      .nullable()
      .describe('Null when one side has no descriptive text; content then counts as 0'),
    field: z.number().min(0).max(1),
    sharedWords: z.array(z.string()).max(10),
  }),
})
const ApplicationReviewDetail = ApplicationReviewQueueItem.extend({
  versions: z.array(ApplicationVersion),
  decisions: z.array(ApplicationReviewDecision),
  founders: z.array(FounderProfile),
  nameConflicts: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
  similarClubs: z
    .array(SimilarClubHint)
    .max(5)
    .describe('Clubs in any state and other pending applications that look similar'),
})
const EventProposalTask = z.object({
  id: z.string(),
  eventId: z.string(),
  title: z.string(),
  state: z.enum(['Open', 'Decided', 'Closed']),
  assigneeId: z.string().optional(),
  openedAt: z.string(),
  slaDueAt: z.string().optional(),
})
const EventProposalSummary = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  title: z.string(),
  objective: z.string().optional(),
  startAt: z.string(),
  endAt: z.string(),
  semesterCode: z.string(),
  venueText: z.string().optional(),
  property: z.object({ id: z.string(), code: z.string(), name: z.string() }).optional(),
  audienceScope: z.string(),
  capacity: z.number(),
  state: z.string(),
  conflictResult: z.string().optional(),
  conflictDetail: z.unknown().optional(),
  approvalConditions: z.array(z.string()),
  currentRevisionNo: z.number(),
  revisionDeadlineAt: z.string().optional(),
  requestedBudgetTotal: z.number(),
})
const EventBudgetSummary = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string().optional(),
  state: z.string(),
  requestedTotal: z.number(),
  approvedTotal: z.number(),
  lines: z.array(
    z.object({
      category: z.string(),
      requestedAmount: z.number(),
      approvedAmount: z.number(),
      reason: z.string().optional(),
    }),
  ),
})
const BudgetSummary = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  eventState: z.string(),
  eventStartAt: z.string(),
  eventEndAt: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  state: z.string(),
  periodCode: z.string().optional(),
  requestedTotal: z.number(),
  approvedTotal: z.number(),
  disbursedTotal: z.number(),
  refundedTotal: z.number(),
  settlementDueAt: z.string().optional(),
  settlementBalance: z.number().optional(),
  recoveryAmount: z.number().optional(),
  recoveryDueAt: z.string().optional(),
  createdAt: z.string(),
})
const BudgetDetail = BudgetSummary.extend({
  lines: z.array(
    z.object({
      category: z.string(),
      requestedAmount: z.number(),
      approvedAmount: z.number(),
      reason: z.string().optional(),
    }),
  ),
  flows: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(['Advance', 'TopUp', 'Refund']),
      amount: z.number(),
      disbursedAt: z.string(),
      paymentReference: z.string().optional(),
      note: z.string().optional(),
      recordedBy: z.string(),
      recordedByName: z.string().optional(),
    }),
  ),
})
const PeriodFigures = z.object({
  events: z
    .object({ completed: z.number().optional(), cancelled: z.number().optional() })
    .optional(),
  members: z.object({ active: z.number().optional() }).optional(),
  attendance: z.object({ total: z.number().optional() }).optional(),
  finance: z
    .object({
      budgets: z.number().optional(),
      approvedTotal: z.number().optional(),
      disbursedTotal: z.number().optional(),
    })
    .optional(),
  capturedAt: z.string().optional(),
})
const PeriodicCampaign = z.object({
  periodCode: z.string(),
  isOpen: z.boolean(),
  dueAt: z.string(),
  announcement: z.string().optional(),
  customFields: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string().optional(),
      type: z.enum(['text', 'number', 'evidence']),
      required: z.boolean(),
    }),
  ),
  updatedAt: z.string().optional(),
})
const PeriodicOverview = z.object({
  periods: z.array(z.object({ code: z.string(), startAt: z.string(), endAt: z.string() })),
  periodCode: z.string().optional(),
  dueAt: z.string().optional(),
  campaign: PeriodicCampaign.optional(),
  rows: z.array(
    z.object({
      clubId: z.string(),
      clubName: z.string(),
      clubState: z.string(),
      dueAt: z.string(),
      reportId: z.string().optional(),
      state: z.string().optional(),
      versionNo: z.number().optional(),
      lateFlag: z.boolean().optional(),
      submittedAt: z.string().optional(),
      overdue: z.boolean(),
      violationId: z.string().optional(),
    }),
  ),
})
const PeriodicReportDetail = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  periodCode: z.string(),
  periodType: z.string(),
  state: z.string(),
  versionNo: z.number(),
  lateFlag: z.boolean(),
  dueAt: z.string(),
  submittedAt: z.string().optional(),
  narrative: z.string().optional(),
  nextPlan: z.string().optional(),
  evidence: z.array(z.object({ note: z.string().optional(), url: z.string().optional() })),
  preloadedFigures: PeriodFigures,
  live: PeriodFigures,
  decision: z
    .object({
      outcome: z.enum(['Accept', 'Return']),
      observation: z.string().optional(),
      reason: z.string().optional(),
      sections: z.array(z.string()),
      decidedByName: z.string().optional(),
      decidedAt: z.string(),
    })
    .optional(),
  history: z.array(
    z.object({
      action: z.string(),
      at: z.string(),
      actorName: z.string().optional(),
      reason: z.string().optional(),
    }),
  ),
})
const ViolationEvidence = z.object({
  note: z.string(),
  url: z.string().optional(),
  addedBy: z.string(),
  addedAt: z.string(),
})
const ViolationSummary = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  originType: z.string(),
  severity: z.string(),
  title: z.string(),
  state: z.string(),
  openedAt: z.string(),
  responseDueAt: z.string().optional(),
  responseOverdue: z.boolean(),
  pendingActions: z.number(),
})
// Hình dạng một trang của danh sách phân trang phía server (items, total, page, pageSize)
function pageOf<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  })
}
const BudgetPage = pageOf(BudgetSummary).extend({
  counts: z.record(z.enum(BUDGET_FILTERS), z.number().int()),
  clubs: z.array(z.object({ id: z.string(), name: z.string() })),
})
const ViolationPage = pageOf(ViolationSummary).extend({
  counts: z.record(z.enum(VIOLATION_FILTERS), z.number().int()),
})
const ViolationDetail = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  clubState: z.string(),
  originType: z.string(),
  originRefId: z.string().optional(),
  severity: z.string(),
  title: z.string(),
  description: z.string().optional(),
  evidence: z.array(ViolationEvidence),
  state: z.string(),
  clubResponse: z
    .object({
      requestMessage: z.string(),
      requestedBy: z.string(),
      requestedAt: z.string(),
      dueAt: z.string(),
      source: z.enum(['CLUB', 'RECORDED_BY_ICPDP', 'NO_RESPONSE']).optional(),
      text: z.string().optional(),
      respondedBy: z.string().optional(),
      respondedAt: z.string().optional(),
      recordedBy: z.string().optional(),
    })
    .optional(),
  decisionReason: z.string().optional(),
  decisionEvidence: z.array(ViolationEvidence),
  openedBy: z.string(),
  openedAt: z.string(),
  decidedBy: z.string().optional(),
  decidedAt: z.string().optional(),
  responseDueAt: z.string().optional(),
  resolvedAt: z.string().optional(),
  actions: z.array(
    z.object({
      id: z.string(),
      description: z.string(),
      dueAt: z.string(),
      state: z.enum(['Pending', 'Verified', 'Failed']),
      linkedLifecycleAction: z.enum(['SUSPEND', 'DISSOLVE']).optional(),
      verifiedBy: z.string().optional(),
      verifiedAt: z.string().optional(),
    }),
  ),
  source: z
    .object({ kind: z.enum(['event', 'budget']), id: z.string(), label: z.string() })
    .optional(),
  names: z.record(z.string(), z.string()),
  history: z.array(
    z.object({
      action: z.string(),
      at: z.string(),
      actorName: z.string().optional(),
      reason: z.string().optional(),
    }),
  ),
})
const ScheduleConflict = z.object({
  kind: z.enum(['event', 'booking']),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
})
const SchoolEventSummary = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  venueText: z.string().optional(),
  property: z.object({ id: z.string(), code: z.string(), name: z.string() }).optional(),
  capacity: z.number(),
  state: z.string(),
  semesterCode: z.string(),
  publishedAt: z.string().optional(),
  confirmedRegistrationCount: z.number(),
  counts: z.object({
    invited: z.number(),
    pending: z.number(),
    accepted: z.number(),
    declined: z.number(),
    expired: z.number(),
    withdrawn: z.number(),
  }),
})
const SchoolEventDetail = SchoolEventSummary.extend({
  objective: z.string().optional(),
  coordination: z.string().optional(),
  conflictResult: z.enum(['No Conflict', 'Warning']),
  conflicts: z.array(ScheduleConflict),
  checkInCode: z.string().optional(),
  registrationCloseAt: z.string().optional(),
  invitations: z.array(
    z.object({
      id: z.string(),
      clubId: z.string(),
      clubName: z.string(),
      status: z.enum(['Pending', 'Accepted', 'Declined', 'Expired', 'Withdrawn']),
      deadline: z.string(),
      invitedAt: z.string(),
      respondedAt: z.string().optional(),
      responseNote: z.string().optional(),
      responseDetails: z.unknown().optional(),
    }),
  ),
})
const InvitationOutcome = z.object({
  invited: z.array(z.string()),
  skipped: z.array(
    z.object({ clubId: z.string(), reason: z.enum(['notActive', 'alreadyInvited']) }),
  ),
})
const EvaluationClassification = z.enum(['EXCELLENT', 'GOOD', 'FAIR', 'NEEDS_IMPROVEMENT'])
const Season = z.enum(['SPRING', 'SUMMER', 'FALL'])
const AnnualTerms = z.array(
  z.object({
    season: Season,
    periodCodes: z
      .array(z.string())
      .describe('Period codes parsed into this term; two spellings of one term are merged'),
    published: z.boolean(),
  }),
)
const ClubRef = z.object({ clubId: z.string(), clubName: z.string() })
// Tạo schema gồm ba mùa SPRING, SUMMER, FALL cùng kiểu phần tử
function BySeason<T extends z.ZodTypeAny>(item: T) {
  return z.object({ SPRING: item, SUMMER: item, FALL: item })
}
const AnnualReport = z.object({
  year: z.number(),
  provisional: z.boolean().describe('Fewer than three terms have Published evaluations'),
  terms: AnnualTerms,
  missingTerms: z.array(Season),
  thresholds: z
    .object({ excellent: z.number(), good: z.number(), fair: z.number() })
    .describe('Scheme thresholds of the latest term with Published evaluations'),
  overview: z.object({
    clubsByState: z.record(z.string(), z.number()),
    clubsCreated: z.number(),
    activeMembers: z.number(),
    completedEvents: z.number(),
    participations: z.number(),
  }),
  evaluation: z.object({
    evaluatedClubs: z.number(),
    byClassification: z.record(EvaluationClassification, z.number()),
    averageYearScore: z.number().nullable(),
    averageByTerm: BySeason(z.number().nullable()),
    rows: z.array(
      z.object({
        clubId: z.string(),
        clubName: z.string(),
        field: z.string().nullable(),
        state: z.string(),
        terms: BySeason(
          z.object({ score: z.number(), classification: EvaluationClassification }).nullable(),
        ),
        evaluatedTerms: z.number().describe('0 = no evaluation this year; such rows come last'),
        yearScore: z.number().nullable(),
        yearClassification: EvaluationClassification.nullable(),
        trend: z.enum(['UP', 'DOWN', 'STABLE']).nullable(),
        dimensions: z.record(z.string(), z.number().nullable()),
      }),
    ),
    top: z.array(ClubRef.extend({ yearScore: z.number() })),
  }),
  dimensions: z.object({
    averages: z.array(
      z.object({ code: z.string(), name: z.string(), average: z.number().nullable() }),
    ),
    highest: z.string().nullable(),
    lowest: z.string().nullable(),
  }),
  finance: z.object({
    hasData: z.boolean(),
    approvedTotal: z.number(),
    disbursedTotal: z.number(),
    disbursementRate: z.number().nullable(),
    clubsWithoutAcceptedReport: z.number(),
  }),
  compliance: z.object({
    openViolations: z.number(),
    needsImprovement: z.array(ClubRef),
    declining: z.array(ClubRef),
    suspendedOrDissolving: z.array(ClubRef.extend({ state: z.string() })),
  }),
  achievements: z.array(
    z.object({
      key: z.string().describe('Pass back in achievementKeys to print it'),
      clubName: z.string(),
      title: z.string(),
      description: z.string(),
      periodCode: z.string(),
      season: Season,
    }),
  ),
})
const EvaluationOverview = z.object({
  periods: z.array(
    z.object({
      code: z.string(),
      startAt: z.string(),
      endAt: z.string(),
      hasActiveScheme: z.boolean(),
    }),
  ),
  periodCode: z.string().optional(),
  scheme: z.object({ id: z.string(), version: z.number() }).optional(),
  rows: z.array(
    z.object({
      evaluationId: z.string().optional(),
      clubId: z.string(),
      clubName: z.string(),
      clubState: z.string(),
      state: z.string().optional(),
      revisionNo: z.number().optional(),
      totalScore: z.number().optional(),
      classification: EvaluationClassification.optional(),
      insufficientCount: z.number(),
      manualCount: z.number(),
    }),
  ),
  canPublish: z.boolean(),
})
const EvaluationDetail = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  periodCode: z.string(),
  schemeId: z.string(),
  schemeVersion: z.number(),
  state: z.string(),
  revisionNo: z.number(),
  totalScore: z.number().optional(),
  classification: EvaluationClassification.optional(),
  generatedAt: z.string().optional(),
  finalizedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  dimensions: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      weight: z.number(),
      allowsManual: z.boolean(),
      score: z.number().optional(),
      computedScore: z.number().optional(),
      insufficientData: z.boolean(),
      isManual: z.boolean(),
      justification: z.string().optional(),
      evidence: z.array(
        z.object({
          metric: z.string(),
          sourceEntity: z.string(),
          sourceIds: z.array(z.string()),
          sourcePeriod: z.string(),
          value: z.number(),
        }),
      ),
    }),
  ),
  revisions: z.array(
    z.object({
      id: z.string(),
      revisionNo: z.number(),
      state: z.string(),
      totalScore: z.number().optional(),
      publishedAt: z.string().optional(),
    }),
  ),
  trend: z.array(
    z.object({
      periodCode: z.string(),
      totalScore: z.number().optional(),
      classification: EvaluationClassification.optional(),
    }),
  ),
  thresholds: z.object({ excellent: z.number(), good: z.number(), fair: z.number() }),
})
const EventProposalQueueItem = z.object({ task: EventProposalTask, event: EventProposalSummary })
const EventProposalDetail = EventProposalQueueItem.extend({
  versions: z.array(
    z.object({
      id: z.string(),
      revisionNo: z.number(),
      payload: z.record(z.string(), z.unknown()),
      budgetLines: z.array(
        z.object({
          category: z.string(),
          amount: z.number(),
          purpose: z.string(),
          plannedItems: z.string().optional(),
        }),
      ),
      requestedBudgetTotal: z.number(),
      conflictResult: z.string().optional(),
      submittedBy: z.string(),
      submittedByName: z.string().optional(),
      submittedAt: z.string(),
    }),
  ),
  decisions: z.array(
    z.object({
      id: z.string(),
      taskId: z.string(),
      outcome: z.enum(['Request revision', 'Approve', 'Reject', 'Re-defense']),
      reason: z.string().optional(),
      sections: z.array(z.string()),
      conditions: z.array(z.string()),
      reviewNote: z.string().optional(),
      actorId: z.string(),
      at: z.string(),
    }),
  ),
  club: z.object({
    id: z.string(),
    name: z.string(),
    state: z.string(),
    obligations: z.array(z.enum(['overdueSettlement', 'overdueRefund', 'overdueReport'])),
  }),
  bookings: z.array(
    z.object({
      id: z.string(),
      propertyCode: z.string().optional(),
      propertyName: z.string().optional(),
      startAt: z.string(),
      endAt: z.string(),
      state: z.string(),
    }),
  ),
  semesterBudgets: z.array(EventBudgetSummary),
  budget: EventBudgetSummary.optional(),
  activeDefenseSession: EventDefenseSessionSchema.optional(),
  defenseHistory: z.array(EventDefenseSessionSchema).optional(),
})
const ClubProfile = clubProfileBody.extend({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  field: z.string(),
  state: z.string(),
  institutionalFields: z.unknown().optional(),
  updatedAt: z.string().optional(),
})
const ClubDepartment = clubDepartmentBody.extend({
  id: z.string(),
  clubId: z.string(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
})
const ClubSettings = z.object({
  profile: ClubProfile,
  departments: z.array(ClubDepartment),
  requiredProfileFields: policySettingsBody.shape.formRequirements.shape.clubProfile,
})
const RecruitmentCampaign = z.object({
  id: z.string(),
  clubId: z.string(),
  title: z.string(),
  positions: z.array(z.string()),
  criteria: z.string().optional(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  capacity: z.number(),
  selectionSteps: z.array(z.unknown()),
  formSchema: z.array(z.unknown()),
  rubric: z.array(z.unknown()),
  state: z.string(),
  publishedBy: z.string().optional(),
  publishedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
})
const CampaignOverlap = z.object({
  id: z.string(),
  title: z.string(),
  positions: z.array(z.string()),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  state: z.string(),
})
const CampaignWithOverlaps = z.object({
  campaign: RecruitmentCampaign,
  overlaps: z.array(CampaignOverlap),
})
const RecruitmentAttachment = z.object({
  id: z.string(),
  fieldKey: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  bytes: z.number(),
  uploadedAt: z.string().datetime(),
})
const RecruitmentApplication = z.object({
  id: z.string(),
  campaignId: z.string(),
  clubId: z.string(),
  userId: z.string(),
  campaignTitle: z.string().optional(),
  clubName: z.string().optional(),
  applicantName: z.string().optional(),
  position: z.string(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  attachments: z.array(RecruitmentAttachment),
  state: z.string(),
  decisionOutcome: z.string().optional(),
  decisionReason: z.string().optional(),
  submittedAt: z.string().datetime().optional(),
  withdrawnAt: z.string().datetime().optional(),
})
const CandidateEvaluation = z.object({
  id: z.string(),
  applicationId: z.string(),
  reviewerId: z.string(),
  reviewerName: z.string().optional(),
  scores: z.record(z.string(), z.number()),
  totalScore: z.number().optional(),
  comment: z.string().optional(),
  createdAt: z.string().datetime(),
})
const CandidateEvaluationGroup = z.object({
  applicationId: z.string(),
  evaluations: z.array(CandidateEvaluation),
  summary: z.object({
    count: z.number(),
    scoredCount: z.number(),
    maxTotal: z.number(),
    mean: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    stdDev: z.number().optional(),
  }),
})
const Membership = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string().optional(),
  userId: z.string(),
  displayName: z.string().optional(),
  state: z.enum(['Active', 'Inactive', 'Left', 'Banned']),
  joinedAt: z.string().datetime(),
  leftAt: z.string().datetime().optional(),
  departmentId: z.string().optional(),
  defaultRole: z.string().optional(),
  sourceApplicationId: z.string().optional(),
  banReason: z.string().optional(),
  statusHistory: z.array(
    z.object({
      fromState: z.enum(['Active', 'Inactive', 'Left', 'Banned']),
      toState: z.enum(['Active', 'Inactive', 'Left', 'Banned']),
      effectiveDate: z.string().datetime(),
      reason: z.string().optional(),
      actorId: z.string().nullable(),
      actorRole: z.literal('SYSTEM').optional(),
      at: z.string().datetime(),
    }),
  ),
  pendingWithdrawal: z.unknown().optional(),
}) satisfies z.ZodType<
  Omit<ClubMembershipRecord, 'joinedAt' | 'leftAt' | 'statusHistory' | 'pendingWithdrawal'> & {
    joinedAt: string
    leftAt?: string
    statusHistory: Array<
      Omit<ClubMembershipRecord['statusHistory'][number], 'at' | 'effectiveDate'> & {
        at: string
        effectiveDate: string
      }
    >
  }
>
const ClubRosterMember = Membership.extend({ email: z.string(), positions: z.array(z.string()) })
const MembershipWithdrawal = z.object({
  id: z.string(),
  membershipId: z.string(),
  clubId: z.string(),
  clubName: z.string().optional(),
  userId: z.string(),
  memberName: z.string().optional(),
  reason: z.string(),
  requestedEffectiveDate: z.string().datetime(),
  state: z.enum(['Pending', 'Held', 'Executed', 'Cancelled']),
  createdAt: z.string().datetime(),
  executedBy: z.string().optional(),
  executedAt: z.string().datetime().optional(),
}) satisfies z.ZodType<
  Omit<MembershipWithdrawalRequest, 'requestedEffectiveDate' | 'createdAt' | 'executedAt'> & {
    requestedEffectiveDate: string
    createdAt: string
    executedAt?: string
  }
>
const BoardTerm = z.object({
  id: z.string(),
  name: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  state: z.string(),
})
const BoardPosition = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  unit: z.string().optional(),
  isLeaderRole: z.boolean(),
  isSingleHolder: z.boolean(),
})
const BoardCandidate = z.object({
  membershipId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  state: z.string(),
})
const BoardSeat = z.object({
  id: z.string(),
  positionId: z.string(),
  positionCode: z.string(),
  positionName: z.string(),
  isLeaderRole: z.boolean(),
  membershipId: z.string(),
  userId: z.string(),
  displayName: z.string(),
  state: z.enum(['Pending Confirmation', 'Confirmed', 'Returned']),
  reason: z.string().optional(),
})
const BoardTask = z.object({
  id: z.string(),
  state: z.string(),
  assigneeId: z.string().optional(),
  openedAt: z.string(),
})
const BoardDecision = z.object({
  id: z.string(),
  taskId: z.string(),
  outcome: z.enum(['Approve', 'Reject']),
  reason: z.string().optional(),
  confirmedSeatIds: z.array(z.string()),
  returnedSeatIds: z.array(z.string()),
  actorId: z.string(),
  at: z.string(),
})
const BoardNomination = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  clubState: z.string(),
  term: BoardTerm,
  state: z.string(),
  submittedBy: z.string(),
  submittedAt: z.string(),
  task: BoardTask,
  seats: z.array(BoardSeat),
  decisions: z.array(BoardDecision),
})
const BoardNominationContext = z.object({
  clubId: z.string(),
  clubName: z.string(),
  clubState: z.string(),
  term: BoardTerm.nullable(),
  positions: z.array(BoardPosition),
  candidates: z.array(BoardCandidate),
  occupiedPositionIds: z.array(z.string()),
  pendingPositionIds: z.array(z.string()),
  seatedMembershipIds: z.array(z.string()),
  presidentConflictMembershipIds: z.array(z.string()),
})
const TransitionObligation = z.object({
  id: z.string(),
  type: z.string(),
  entityId: z.string().optional(),
  description: z.string(),
  assigneeMembershipId: z.string(),
})
const LeadershipTransition = z.object({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  clubState: z.string(),
  fromTerm: BoardTerm,
  toTerm: BoardTerm,
  candidates: z.array(
    z.object({
      positionCode: z.string(),
      positionName: z.string(),
      membershipId: z.string(),
      userId: z.string(),
      displayName: z.string(),
    }),
  ),
  outstandingObligations: z.array(TransitionObligation),
  handover: z.object({
    items: z.array(z.object({ id: z.string(), description: z.string() })),
    proposedBoardRoles: z
      .array(
        z.object({
          code: z.string(),
          name: z.string(),
          unit: z.string().optional(),
          isLeaderRole: z.boolean(),
          isSingleHolder: z.boolean(),
          permissionCodes: z.array(z.string()),
        }),
      )
      .optional(),
  }),
  state: z.string(),
  submittedBy: z.string(),
  submittedAt: z.string(),
  followUpConditions: z.array(TransitionObligation),
  task: BoardTask,
  decisions: z.array(
    z.object({
      id: z.string(),
      outcome: z.enum(['Approve', 'Request revision']),
      reason: z.string().optional(),
      followUpObligationIds: z.array(z.string()),
      actorId: z.string(),
      at: z.string(),
    }),
  ),
})
const EventRegistration = z.object({
  id: z.string(),
  eventId: z.string(),
  studentId: z.string(),
  clubId: z.string().optional(),
  clubName: z.string(),
  eventTitle: z.string(),
  eventStartAt: z.string(),
  checkInOpensAt: z.string(),
  checkInClosesAt: z.string(),
  eventEndAt: z.string(),
  state: z.enum(['Confirmed', 'Waitlisted', 'Cancelled']),
  waitlistPosition: z.number().int().optional(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  createdAt: z.string(),
  cancelledAt: z.string().optional(),
})
const EventRegistrationContext = z.object({
  event: z.object({
    id: z.string(),
    clubId: z.string().optional(),
    clubName: z.string(),
    title: z.string(),
    state: z.string(),
    audienceScope: z.string(),
    startAt: z.string(),
    endAt: z.string(),
    registrationOpenAt: z.string().optional(),
    registrationCloseAt: z.string().optional(),
    capacity: z.number().int(),
    confirmedRegistrationCount: z.number().int(),
    waitlistEnabled: z.boolean(),
  }),
  formSchema: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(['text', 'textarea', 'select', 'radio', 'checkbox']),
      required: z.boolean(),
      options: z.array(z.string()).optional(),
    }),
  ),
  isActiveClubMember: z.boolean(),
  registration: EventRegistration.nullable(),
  registrationOpen: z.boolean(),
})
const Attendance = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  clubId: z.string().optional(),
  clubName: z.string(),
  eventStartAt: z.string(),
  eventEndAt: z.string(),
  checkedInAt: z.string(),
  method: z.enum(['self', 'manual', 'walk-in']),
  abnormalFlags: z.array(z.string()),
  feedbackOpensAt: z.string(),
  feedbackClosesAt: z.string().nullable(),
})
const MyEventFeedback = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  clubName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  isAnonymous: z.boolean(),
  submittedAt: z.string(),
})
const EventFeedbackContext = z.object({
  attended: z.boolean(),
  canSubmit: z.boolean(),
  opensAt: z.string().nullable(),
  closesAt: z.string().nullable(),
  feedback: MyEventFeedback.nullable(),
})
const RoutingRuleSet = z.object({
  id: z.string(),
  versionNo: z.number().int(),
  state: z.enum(['Draft', 'Active', 'Superseded']),
  rules: routingRulesBody.shape.rules,
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  activatedBy: z.string().optional(),
  activatedAt: z.string().optional(),
  supersededAt: z.string().optional(),
})
const RoutingSimulation = z.object({
  total: z.number().int(),
  matched: z.number().int(),
  items: z.array(
    z.object({
      entityType: z.string(),
      entityId: z.string(),
      title: z.string(),
      decidedAt: z.string(),
      ruleId: z.string().optional(),
      slaHours: z.number().int().optional(),
    }),
  ),
})
const ComplaintEvidence = z.object({ label: z.string(), url: z.string() })
const ComplaintResponse = z.object({
  text: z.string(),
  action: z.string(),
  evidence: z.array(ComplaintEvidence),
  at: z.string(),
})
const Complaint = z.object({
  id: z.string(),
  clubId: z.string().optional(),
  clubName: z.string().optional(),
  clubState: z.string().optional(),
  eventId: z.string().optional(),
  eventTitle: z.string().optional(),
  type: z.string(),
  description: z.string(),
  evidence: z.array(ComplaintEvidence),
  state: z.enum(COMPLAINT_STATES),
  triage: z
    .object({
      severity: z.string(),
      validity: z.string(),
      outcome: z.string(),
      reason: z.string(),
      actorId: z.string(),
      at: z.string(),
    })
    .optional(),
  clubResponse: ComplaintResponse.optional(),
  closure: z.object({ reason: z.string(), at: z.string() }).optional(),
  forwardedAt: z.string().optional(),
  respondedAt: z.string().optional(),
  responseDueAt: z.string().optional(),
  violationId: z.string().optional(),
  linkedComplaintId: z.string().optional(),
  submittedAt: z.string(),
  withdrawnAt: z.string().optional(),
  closedAt: z.string().optional(),
})
const ComplaintForIcpdp = Complaint.extend({
  complainant: z.object({ id: z.string(), displayName: z.string(), email: z.string() }),
  linkedComplaintIds: z.array(z.string()),
})
const ComplaintQueuePage = pageOf(
  ComplaintForIcpdp.extend({
    linkCandidates: z.array(z.object({ id: z.string(), description: z.string() })),
  }),
)
// D5: những gì CLB nhận được không có trường người khiếu nại.
const ComplaintForClub = z.object({
  id: z.string(),
  clubId: z.string(),
  eventTitle: z.string().optional(),
  type: z.string(),
  description: z.string(),
  evidence: z.array(ComplaintEvidence),
  state: z.enum(['Forwarded', 'Club Responded', 'Closed', 'Escalated']),
  forwardNote: z.string(),
  forwardedAt: z.string(),
  responseDueAt: z.string().optional(),
  clubResponse: ComplaintResponse.optional(),
})
const MemberSpace = z.object({
  club: z.object({
    id: z.string(),
    name: z.string(),
    logoUrl: z.string().optional(),
    state: z.string(),
  }),
  membership: z.object({
    id: z.string(),
    state: z.string(),
    joinedAt: z.string(),
    positions: z.array(z.string()),
    pendingWithdrawal: MembershipWithdrawal.optional(),
  }),
  members: z.array(
    z.object({ displayName: z.string(), state: z.string(), positions: z.array(z.string()) }),
  ),
  board: z.array(z.object({ positionName: z.string(), memberName: z.string() })),
  upcomingEvents: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      startAt: z.string(),
      endAt: z.string(),
      venueText: z.string().optional(),
      registrationState: z.enum(['Confirmed', 'Waitlisted', 'Cancelled']).nullable(),
    }),
  ),
  attendance: z.array(
    z.object({
      eventId: z.string(),
      eventTitle: z.string(),
      checkedInAt: z.string(),
      eventEndAt: z.string(),
      feedbackSubmitted: z.boolean(),
    }),
  ),
  feedbackToSend: z.array(
    z.object({ eventId: z.string(), eventTitle: z.string(), closesAt: z.string().nullable() }),
  ),
  otherClubs: z.array(z.object({ clubId: z.string(), clubName: z.string(), state: z.string() })),
})
const PublicClub = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  field: z.string(),
  state: z.enum(['Active', 'Suspended']),
  description: z.string().optional(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  operatingScope: z.string().optional(),
  logoUrl: z.string().url().optional(),
  openCampaignId: z.string().optional(),
})
const PublicCampaign = z.object({
  id: z.string(),
  title: z.string(),
  state: z.string(),
  windowStart: z.string(),
  windowEnd: z.string(),
  capacity: z.number(),
})
const PublicCampaignDetail = PublicCampaign.extend({
  clubId: z.string(),
  positions: z.array(z.string()),
  criteria: z.string().optional(),
  selectionSteps: z.array(z.unknown()),
  formSchema: z.array(z.unknown()),
  rubric: z.array(z.unknown()),
  clubSuspended: z.boolean().optional(),
})
const PublicEvent = z.object({
  id: z.string(),
  clubId: z.string().optional(),
  clubName: z.string(),
  title: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  venueText: z.string().optional(),
  objective: z.string().optional(),
  coverImageUrl: z.string().url().optional(),
  capacity: z.number(),
  state: z.string(),
  audienceScope: z.string(),
  publishedAt: z.string().optional(),
  status: z.enum(['ongoing', 'upcoming', 'ended']),
})
const PublicPage = z.object({
  items: z.array(PublicClub),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})
const EventPage = z.object({
  items: z.array(PublicEvent),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
})

// Bộ lỗi chung của các endpoint đặt phòng
const bookingErrors = {
  '400': apiError('Invalid booking input'),
  '401': apiError('Authentication required'),
  '403': apiError('Club permission or ICPDP role required'),
  '404': apiError('Booking or property not found'),
  '409': apiError('State, version or slot conflict'),
}
const FacilityBooking = bookingBody.extend({
  id: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  semesterCode: z.string(),
  state: z.string(),
  currentVersionNo: z.number().int(),
  isLateCancellation: z.boolean(),
  conflictResult: z.string().optional(),
  decisionReason: z.string().optional(),
  cancelReason: z.string().optional(),
})
const BookingCheck = z.object({
  conflicts: z.array(
    z.object({
      id: z.string(),
      startAt: z.string(),
      endAt: z.string(),
      source: z.enum(['booking', 'event']),
    }),
  ),
  capacityWarning: z.boolean(),
  conflictResult: z.string(),
})
const RoomAllocation = z.object({
  id: z.string(),
  semesterCode: z.string(),
  clubId: z.string(),
  clubName: z.string(),
  propertyId: z.string(),
  propertyName: z.string(),
  location: z.string(),
  weekday: z.number().int().min(1).max(7),
  slot: z.number().int().min(1).max(4),
  note: z.string().optional(),
  allocatedBy: z.string(),
  allocatedByName: z.string().optional(),
  allocatedAt: z.string(),
  revokedAt: z.string().optional(),
  revokeReason: z.string().optional(),
  occurrences: z.array(
    z.object({ bookingId: z.string(), startAt: z.string(), endAt: z.string(), state: z.string() }),
  ),
})
const roomAllocationPaths = {
  '/admin/room-allocations/options': {
    get: {
      summary:
        'UC58 form options: semesters not yet ended, clubs that may receive rooms, active rooms',
      responses: {
        '200': jsonOk(
          'Options',
          z.object({
            semesters: z.array(
              z.object({ code: z.string(), startAt: z.string(), endAt: z.string() }),
            ),
            clubs: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                state: z.string(),
                dissolutionSemester: z.string().optional(),
                dissolutionEffectiveTo: z.string().optional(),
              }),
            ),
            rooms: z.array(Property),
          }),
        ),
        '403': { description: 'ICPDP officer required' },
      },
    },
  },
  '/admin/room-allocations/occupancy': {
    get: {
      summary:
        'UC58 A3 weekly grid cells of a room blocked by approved events or bookings this semester',
      requestParams: { query: roomOccupancyQuery },
      responses: {
        '200': jsonOk(
          'Blocked cells',
          z.array(
            z.object({
              weekday: z.number().int().min(1).max(7),
              slot: z.number().int().min(1).max(4),
              items: z.array(
                z.object({
                  startAt: z.string(),
                  endAt: z.string(),
                  source: z.enum(['booking', 'event']),
                  title: z.string(),
                  clubName: z.string().optional(),
                }),
              ),
            }),
          ),
        ),
        '400': { description: 'Unknown semester or invalid room id' },
        '403': { description: 'ICPDP officer required' },
      },
    },
  },
  '/admin/room-allocations': {
    get: {
      summary: 'UC58 room allocations, optionally for one semester',
      requestParams: { query: roomAllocationQuery },
      responses: {
        '200': jsonOk('Allocations with their occurrences', z.array(RoomAllocation)),
        '403': { description: 'ICPDP officer required' },
      },
    },
    post: {
      summary:
        'UC58 allocate a room to a club for one weekday and slot of every week in a semester; CSRF required',
      requestBody: jsonBody(roomAllocationBody),
      responses: {
        '201': jsonOk('Approved occurrences generated (blackout dates skipped)', RoomAllocation),
        '400': { description: 'Invalid input, outside bookable hours or no upcoming dates' },
        '403': { description: 'ICPDP officer required' },
        '404': { description: 'Room or club not found' },
        '409': {
          description:
            'Room already allocated or booked on some dates (details list them), club or room unavailable, semester ended',
        },
      },
    },
  },
  '/admin/room-allocations/{id}/revoke': {
    post: {
      summary:
        'UC58 revoke an allocation; future occurrences are released, past ones kept; CSRF required',
      requestParams: { path: IdPath },
      requestBody: jsonBody(roomAllocationRevokeBody),
      responses: {
        '200': jsonOk('Revoked allocation', RoomAllocation),
        '403': { description: 'ICPDP officer required' },
        '404': { description: 'Allocation not found' },
        '409': { description: 'Already revoked' },
      },
    },
  },
  '/clubs/{clubId}/room-allocations': {
    get: {
      summary:
        'Rooms ICPDP allocated to the club with their remaining dates (read-only, club.room.view: every Active member)',
      requestParams: { path: ClubPath },
      responses: {
        '200': jsonOk('Active allocations', z.array(RoomAllocation)),
        '403': { description: 'Active club membership required (club.room.view)' },
      },
    },
  },
} as const
const FacilityBookingDetail = z.object({
  booking: FacilityBooking,
  property: Property.nullable(),
  club: z
    .object({
      id: z.string(),
      name: z.string(),
      state: z.string(),
      dissolutionSemester: z.string().optional(),
      dissolutionEffectiveTo: z.string().optional(),
    })
    .nullable(),
  task: z
    .object({
      id: z.string(),
      state: z.string(),
      assigneeId: z.string().optional(),
      openedAt: z.string(),
    })
    .nullable(),
  versions: z.array(
    z.object({
      versionNo: z.number().int(),
      payload: bookingBody,
      submittedBy: z.string(),
      submittedAt: z.string(),
    }),
  ),
  decisions: z.array(
    bookingDecisionBody.extend({
      id: z.string(),
      taskId: z.string(),
      actorId: z.string(),
      at: z.string(),
    }),
  ),
  check: BookingCheck.nullable(),
  obligations: z.array(z.string()),
})

export const openApiDocument = createDocument({
  openapi: '3.1.0',
  info: { title: 'UCMS API', version: '1.0.0' },
  servers: [{ url: '/api/v1' }],
  paths: {
    ...sponsoredItemOpenApiPaths,
    ...clubCompletionOpenApiPaths,
    ...notificationOpenApiPaths,
    '/clubs/{clubId}/periodic-reports': {
      get: {
        summary: "UC38 reporting periods and this club's reports with immutable versions",
        requestParams: { path: ClubPath },
        responses: {
          '200': { description: 'Periods and reports' },
          '403': { description: 'Club Leader required' },
        },
      },
      post: {
        summary: 'UC38 create a periodic report draft (CSRF required)',
        requestParams: { path: ClubPath },
        requestBody: jsonBody(clubPeriodicCreateBody, true),
        responses: {
          '201': { description: 'Draft created' },
          '409': { description: 'Report already exists' },
        },
      },
    },
    '/clubs/{clubId}/periodic-reports/evidence-images': {
      post: {
        summary:
          'UC38 upload a private PNG/JPEG/WebP evidence image (max 5 MB, CSRF required); store the returned reference in the report',
        requestParams: { path: ClubPath },
        requestBody: {
          required: true,
          content: {
            'image/png': { schema: z.string() },
            'image/jpeg': { schema: z.string() },
            'image/webp': { schema: z.string() },
          },
        },
        responses: {
          '201': jsonOk(
            'Evidence reference and a short-lived signed preview URL',
            z.object({
              reference: z.string(),
              url: z.string(),
              mimeType: z.string(),
              bytes: z.number().int(),
            }),
          ),
          '400': { description: 'Unsupported type, content mismatch or empty file' },
          '403': { description: 'Periodic report permission required' },
          '413': { description: 'Image larger than 5 MB' },
          '503': { description: 'File storage is not configured' },
        },
      },
    },
    '/clubs/{clubId}/periodic-reports/{id}': {
      put: {
        summary: 'UC38 save draft/correction using revision for concurrency (CSRF required)',
        requestParams: { path: ClubIdPath },
        requestBody: jsonBody(clubPeriodicDraftBody, true),
        responses: {
          '200': { description: 'Draft saved' },
          '409': { description: 'Report changed or locked' },
        },
      },
    },
    '/clubs/{clubId}/periodic-reports/{id}/submit': {
      post: {
        summary: 'UC38 freeze a submission version and open UC39 review (CSRF required)',
        requestParams: { path: ClubIdPath },
        requestBody: jsonBody(clubPeriodicVersionBody, true),
        responses: {
          '200': { description: 'Report submitted' },
          '409': { description: 'Report changed or locked' },
        },
      },
    },
    '/clubs/{clubId}/invitations': {
      get: {
        summary: "List this club's school event invitations (UC54, Club Leader)",
        requestParams: { path: ClubPath },
        responses: {
          '200': { description: 'Invitations with event coordination details' },
          '403': { description: 'Club Leader required' },
        },
      },
    },
    '/clubs/{clubId}/invitations/{id}/response': {
      post: {
        summary: 'Accept or decline a pending invitation before its deadline (UC54, CSRF required)',
        requestParams: { path: ClubIdPath },
        requestBody: jsonBody(invitationResponseBody, true),
        responses: {
          '200': { description: 'Response saved' },
          '409': { description: 'Invitation no longer answerable' },
          '403': { description: 'Club Leader required' },
        },
      },
    },
    ...accountabilityOpenApiPaths,
    ...clubEventOpenApiPaths,
    ...eventDefenseOpenApiPaths,
    ...roomAllocationPaths,
    '/booking-slots': {
      get: {
        summary: 'Four fixed campus booking slots (Vietnam time)',
        responses: {
          '200': jsonOk(
            'Campus slots',
            z.array(
              z.object({
                number: z.number().int().min(1).max(4),
                start: z.string(),
                end: z.string(),
              }),
            ),
          ),
          '401': apiError('Authentication required'),
        },
      },
    },
    '/clubs/{clubId}/booking-events': {
      get: {
        summary: 'Club events available to attach to a booking (UC45, club.booking.manage)',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk(
            'Club events',
            z.array(z.object({ id: z.string(), title: z.string(), startAt: z.string() })),
          ),
          '403': apiError('Club permission required'),
        },
      },
    },
    '/clubs/{clubId}/booking-properties': {
      get: {
        summary: 'Active properties (UC45, club.booking.manage)',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Booking result', z.array(Property)),
          ...bookingErrors,
        },
      },
    },
    '/clubs/{clubId}/booking-properties/{id}/availability': {
      get: {
        summary: 'Campus slot availability (UC45)',
        requestParams: {
          path: ClubIdPath,
          query: bookingAvailabilityQuery,
        },
        responses: {
          '200': jsonOk('Booking result', BookingCheck),
          ...bookingErrors,
        },
      },
    },
    '/clubs/{clubId}/bookings': {
      get: {
        summary: 'Club booking history (UC47)',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Booking result', z.array(FacilityBooking)),
          ...bookingErrors,
        },
      },
      post: {
        summary:
          'Create a facility request draft for a hall, outdoor area, stage or equipment; rooms are allocated by ICPDP (UC45/UC58, CSRF required)',
        requestParams: { path: ClubPath },
        requestBody: jsonBody(bookingBody),
        responses: {
          '201': jsonOk('Booking result', FacilityBookingDetail),
          ...bookingErrors,
        },
      },
    },
    '/clubs/{clubId}/bookings/{id}': {
      get: {
        summary: 'Booking versions and decisions (UC45/47)',
        requestParams: { path: ClubIdPath },
        responses: {
          '200': jsonOk('Booking result', FacilityBookingDetail),
          ...bookingErrors,
        },
      },
      patch: {
        summary: 'Edit draft or revision (UC45, CSRF required)',
        requestParams: { path: ClubIdPath },
        requestBody: jsonBody(bookingSaveBody),
        responses: {
          '200': jsonOk('Booking result', FacilityBookingDetail),
          ...bookingErrors,
        },
      },
    },
    '/clubs/{clubId}/bookings/{id}/submit': {
      post: {
        summary: 'Submit a new immutable version (UC45, CSRF required)',
        requestParams: { path: ClubIdPath },
        requestBody: jsonBody(bookingVersionBody),
        responses: {
          '200': jsonOk('Booking result', FacilityBookingDetail),
          ...bookingErrors,
        },
      },
    },
    '/clubs/{clubId}/bookings/{id}/cancel': {
      post: {
        summary: 'Cancel and free a booking slot (UC47, CSRF required)',
        requestParams: { path: ClubIdPath },
        requestBody: jsonBody(bookingReasonBody),
        responses: {
          '200': jsonOk('Booking result', FacilityBookingDetail),
          ...bookingErrors,
        },
      },
    },
    '/admin/bookings': {
      get: {
        summary: 'Bookings for ICPDP review (UC46)',
        responses: {
          '200': jsonOk('Booking result', z.array(FacilityBooking)),
          ...bookingErrors,
        },
      },
    },
    '/admin/bookings/{id}': {
      get: {
        summary: 'Booking with conflicts and obligations (UC46)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Booking result', FacilityBookingDetail),
          ...bookingErrors,
        },
      },
    },
    '/admin/bookings/{id}/claim': {
      post: {
        summary: 'Claim booking review exclusively (UC46, CSRF required)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Booking result', FacilityBookingDetail),
          ...bookingErrors,
        },
      },
    },
    '/admin/bookings/{id}/decision': {
      post: {
        summary: 'Decide booking; recheck slot atomically (UC46, CSRF required)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(bookingDecisionBody),
        responses: {
          '200': jsonOk('Booking result', FacilityBookingDetail),
          ...bookingErrors,
        },
      },
    },
    '/admin/properties/{id}/booking-conflicts': {
      get: {
        summary:
          'Pending requests, approved bookings and room-allocation sessions overlapping property blackouts (UC44 A2)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Booking result', z.array(FacilityBooking)),
          ...bookingErrors,
        },
      },
    },

    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: Health } },
          },
          '503': {
            description: 'Database unreachable',
            content: { 'application/json': { schema: Health } },
          },
        },
      },
    },
    '/public/clubs': {
      get: {
        summary: 'Find public clubs (Guest allowed)',
        requestParams: {
          query: z.object({
            search: z.string().optional(),
            field: z.string().optional(),
            page: z.coerce.number().optional(),
          }),
        },
        responses: {
          '200': jsonOk(
            'Active and suspended clubs; a filtered search with no match adds the newest Active clubs (UC06 E1)',
            PublicPage.extend({
              fields: z.array(z.string()),
              suggestions: z.array(PublicClub).optional(),
            }),
          ),
          '400': apiError('Invalid query'),
        },
      },
    },
    '/public/clubs/{id}': {
      get: {
        summary: 'Public club profile, current board, campaigns and activities',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk(
            'Public club profile',
            z.object({
              club: PublicClub,
              board: z.array(
                z.object({
                  memberName: z.string(),
                  positionName: z.string(),
                  termName: z.string(),
                }),
              ),
              campaigns: z.array(PublicCampaign),
              upcomingEvents: z.array(PublicEvent),
              history: z.array(PublicEvent),
            }),
          ),
          '404': apiError('Club not public or not found'),
        },
      },
    },
    '/public/campaigns/{id}': {
      get: {
        summary: 'Read an open recruitment campaign and its public application form',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Open recruitment campaign', PublicCampaignDetail),
          '404': apiError('Campaign not open or not found'),
        },
      },
    },
    '/public/events': {
      get: {
        summary: 'Published public events, filterable by status and text',
        requestParams: {
          query: z.object({
            page: z.coerce.number().optional(),
            status: z.enum(['all', 'ongoing', 'upcoming', 'ended']).optional(),
            search: z.string().optional(),
          }),
        },
        responses: {
          '200': jsonOk('Public events (8 per page)', EventPage),
          '400': apiError('Invalid query'),
        },
      },
    },
    '/public/events/{id}': {
      get: {
        summary: 'Published public event detail (upcoming, ongoing or ended)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk(
            'Public event',
            z.object({
              event: PublicEvent,
              club: z.object({ id: z.string(), name: z.string() }).nullable(),
            }),
          ),
          '404': apiError('Event not public or not found'),
        },
      },
    },
    '/auth/login': {
      get: {
        summary: 'Start Google OAuth login',
        responses: {
          '302': { description: 'Redirect to Google authorization endpoint' },
        },
      },
    },
    '/auth/callback': {
      get: {
        summary: 'Complete Google OAuth login',
        responses: {
          '302': { description: 'Redirect to client after login or error' },
        },
      },
    },
    '/auth/error': {
      get: {
        summary: 'Read and clear the latest signed login error',
        responses: {
          '200': jsonOk(
            'Login error reason, when available',
            z.object({
              reason: z.string().nullable(),
            }),
          ),
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Get current user and CSRF token',
        responses: {
          '200': jsonOk('Current account and contexts', Me),
          '401': apiError('Session missing or expired'),
          '423': apiError('Account locked'),
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Revoke current session (requires X-CSRF-Token)',
        responses: {
          '200': jsonOk('Logged out', z.object({ loggedOut: z.literal(true) })),
          '401': apiError('Session missing or expired'),
          '403': apiError('CSRF token missing or invalid'),
        },
      },
    },
    '/dashboard': {
      get: {
        summary: 'Read the current Student, club or ICPDP dashboard',
        requestParams: {
          query: z.object({
            workspace: z.enum(['student', 'icpdp', 'club']),
            clubId: objectId.optional(),
          }),
        },
        responses: {
          '200': jsonOk('Role-scoped dashboard with independently resolved panels', Dashboard),
          '400': apiError('Invalid dashboard context'),
          '401': apiError('Authentication required'),
          '403': apiError('Workspace access denied'),
        },
      },
    },
    '/dashboard/clubs/{clubId}/board-history': {
      get: {
        summary:
          "UC02 role-structure versions and board seats by term (BR56); ICPDP or the club's Club Leader",
        requestParams: { path: ClubPath },
        responses: {
          '200': { description: 'Structure versions and terms, newest first' },
          '403': apiError("Not ICPDP and not this club's Club Leader"),
          '404': apiError('Club not found'),
        },
      },
    },
    '/admin/users': {
      get: {
        summary: 'Search users (ICPDP only), one page at a time sorted by email',
        requestParams: { query: adminUsersQuery },
        responses: {
          '200': jsonOk('Users and current system roles', AdminUsers),
          '403': apiError('Account administration denied'),
        },
      },
    },
    '/admin/club-fields': {
      get: {
        summary: 'List the club field catalog with how many clubs and applications use each field',
        responses: {
          '200': jsonOk('Club field catalog', z.array(ClubFieldUsage)),
          '403': apiError('ICPDP officer role required'),
        },
      },
      post: {
        summary: "Add a club field (re-adding a hidden field's name restores it)",
        requestBody: jsonBody(clubFieldBody),
        responses: {
          '201': jsonOk('Club field created', ClubField),
          '409': apiError('A field with this name already exists'),
        },
      },
    },
    '/admin/clubs': {
      get: {
        summary: 'List clubs with their lifecycle state and the suspensions ending soon (UC15)',
        responses: {
          '200': jsonOk(
            'Clubs',
            z.object({
              clubs: z.array(ClubLifecycleSummary),
              expiringSuspensions: z.array(ClubLifecycleSummary),
            }),
          ),
        },
      },
    },
    '/admin/clubs/{id}': {
      get: {
        summary:
          'Club lifecycle detail: obligations, history and the semester a dissolution would take effect',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk(
            'Club detail',
            z.object({
              club: ClubLifecycleSummary.extend({
                openCampaigns: z.array(z.unknown()),
                upcomingEvents: z.array(z.unknown()),
                activeTerm: z.unknown().optional(),
                history: z.array(z.unknown()),
                unreconciledBudgets: z
                  .array(z.object({ id: z.string(), eventTitle: z.string(), state: z.string() }))
                  .describe('UC15 E1: budgets to reconcile before the Dissolving semester ends'),
              }),
              nextSemester: z
                .object({ code: z.string(), startAt: z.string(), endAt: z.string() })
                .nullable(),
            }),
          ),
        },
      },
    },
    '/admin/clubs/{id}/suspend': {
      post: {
        summary:
          'Suspend an active club until a date or indefinitely; cancels upcoming events and bookings',
        requestParams: { path: IdPath },
        requestBody: jsonBody(suspendBody),
        responses: {
          '200': jsonOk('What the cascade cancelled', CascadeResult),
          '409': apiError('The club is not active'),
        },
      },
    },
    '/admin/clubs/{id}/reactivate': {
      post: {
        summary: 'Reactivate a suspended club',
        requestParams: { path: IdPath },
        requestBody: jsonBody(lifecycleReasonBody),
        responses: {
          '200': jsonOk('Reactivated', z.object({ reactivated: z.literal(true) })),
        },
      },
    },
    '/admin/clubs/{id}/dissolve': {
      post: {
        summary:
          'Schedule dissolution from the next semester; cancels what would end after it (BR45)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(lifecycleReasonBody),
        responses: {
          '200': jsonOk(
            'Dissolution scheduled',
            CascadeResult.extend({
              effectiveSemester: z.string(),
              unreconciledBudgets: z
                .number()
                .describe('UC15 E1: budgets the club must still reconcile'),
            }),
          ),
        },
      },
    },
    '/admin/exports/options': {
      get: {
        summary:
          'Export catalogue: data types with their status filters, formats, semesters and clubs (UC55)',
        responses: {
          '200': jsonOk(
            'Export options',
            z.object({
              types: z.array(
                z.object({
                  type: z.string(),
                  title: z.string(),
                  statuses: z.array(z.string()),
                }),
              ),
              formats: z.array(z.string()),
              periods: z.array(
                z.object({ code: z.string(), startAt: z.string(), endAt: z.string() }),
              ),
              clubs: z.array(z.object({ id: z.string(), name: z.string() })),
              annualYears: z
                .array(z.object({ year: z.number(), terms: AnnualTerms }))
                .describe(
                  'Academic years with at least one Published evaluation, newest first (UC55 A2)',
                ),
            }),
          ),
        },
      },
    },
    '/admin/exports/annual-report/preview': {
      post: {
        summary:
          'Annual club evaluation report of an academic year, as JSON; not audited (UC55 A2, requires CSRF token)',
        requestBody: jsonBody(annualPreviewBody),
        responses: {
          '200': jsonOk('The six report sections and the selectable achievements', AnnualReport),
          '404': apiError('The year has no Published evaluation'),
        },
      },
    },
    '/admin/exports/annual-report': {
      post: {
        summary:
          'Download the annual report as pdf or xlsx; audited as ANNUAL_REPORT (UC55 A2, requires CSRF token)',
        requestBody: jsonBody(annualExportBody),
        responses: {
          '200': { description: 'bao-cao-danh-gia-clb-{year}.{pdf|xlsx}, sent as an attachment' },
          '404': apiError('The year has no Published evaluation; no file is produced'),
        },
      },
    },
    '/admin/exports/preview': {
      post: {
        summary: 'Count the rows an export would contain, per selected type (requires CSRF token)',
        requestBody: jsonBody(exportPreviewBody),
        responses: {
          '200': jsonOk(
            'Total row count and the count of each selected type',
            z.object({
              rowCount: z.number(),
              types: z.array(z.object({ type: z.string(), rowCount: z.number() })),
            }),
          ),
        },
      },
    },
    '/admin/exports': {
      post: {
        summary:
          'Download the data as xlsx, csv or pdf; several types go in one xlsx; one audit record per type (requires CSRF token)',
        requestBody: jsonBody(exportBody),
        responses: {
          '200': {
            description:
              'One type: ucms-{type}-{date}.{xlsx|csv|pdf}. Several: bao-cao-tong-hop-{date}.xlsx with a ' +
              '"Thông tin" sheet then one sheet per type; an empty type keeps its headers. Sent as an attachment',
          },
          '400': apiError(
            'Invalid filter, duplicate types, or csv/pdf/status filter with more than one type',
          ),
          '404': apiError('No selected type has data for the filter; no file is produced'),
        },
      },
    },
    '/admin/evaluation-schemes': {
      get: {
        summary:
          'List evaluation schemes with the evaluation periods and the D1–D8 catalogue (UC41)',
        responses: {
          '200': jsonOk(
            'Schemes',
            z.object({
              schemes: z.array(EvaluationScheme),
              periods: z.array(
                z.object({
                  code: z.string(),
                  startAt: z.string(),
                  endAt: z.string(),
                  evaluated: z
                    .boolean()
                    .describe(
                      'The period already has evaluations, so its scheme version is pinned (BR51, BR60)',
                    ),
                }),
              ),
              dimensions: z.array(
                z.object({
                  code: z.string(),
                  name: z.string(),
                  core: z.boolean(),
                  measures: z.string(),
                }),
              ),
            }),
          ),
        },
      },
      post: {
        summary:
          'Create a draft scheme for a semester from the defaults or a copy (requires CSRF token)',
        requestBody: jsonBody(evaluationSchemeCreateBody),
        responses: {
          '201': jsonOk('Draft created', EvaluationScheme),
          '400': apiError('Period not in the academic calendar'),
        },
      },
    },
    '/admin/evaluation-schemes/{id}': {
      patch: {
        summary: "Edit a draft's dimensions, weights and thresholds",
        requestParams: { path: IdPath },
        requestBody: jsonBody(evaluationSchemeSettingsBody),
        responses: {
          '200': jsonOk('Draft updated', EvaluationScheme),
          '409': apiError('Only drafts can change'),
        },
      },
      delete: {
        summary: 'Delete a draft scheme',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Draft deleted', z.object({ deleted: z.literal(true) })),
        },
      },
    },
    '/admin/evaluation-schemes/{id}/activate': {
      post: {
        summary:
          "Activate a draft (weights total 100, D1–D3 above 0); supersedes the period's active scheme",
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Scheme active', EvaluationScheme),
          '400': apiError('details.issues lists totalWeight / coreWeight'),
          '409': apiError(
            'The period already has evaluations; it keeps their scheme version (BR51, BR60)',
          ),
        },
      },
    },
    '/admin/properties': {
      get: {
        summary: 'List the facility catalogue (UC44)',
        responses: {
          '200': jsonOk('Properties', z.array(Property)),
          '403': apiError('ICPDP officer role required'),
        },
      },
      post: {
        summary:
          'Add a room, hall or equipment; the code is generated from the type (requires CSRF token)',
        requestBody: jsonBody(propertyCreateBody),
        responses: {
          '201': jsonOk('Property created', Property),
          '400': apiError('Invalid property values'),
        },
      },
    },
    '/admin/properties/{id}': {
      patch: {
        summary: "Edit a property's details, bookable hours and blackouts; the type cannot change",
        requestParams: { path: IdPath },
        requestBody: jsonBody(propertyDetailsBody),
        responses: {
          '200': jsonOk('Property updated', Property),
          '404': apiError('Property not found'),
        },
      },
      delete: {
        summary: 'Delete a property that was never booked (BR41: otherwise deactivate it)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Property deleted', z.object({ deleted: z.literal(true) })),
          '409': apiError('The property has bookings'),
        },
      },
    },
    '/admin/properties/{id}/activation': {
      post: {
        summary: 'Deactivate or reactivate a property; existing approved bookings are kept',
        requestParams: { path: IdPath },
        requestBody: jsonBody(propertyActivationBody),
        responses: {
          '200': jsonOk('Property updated', Property),
        },
      },
    },
    '/admin/club-fields/{id}': {
      patch: {
        summary:
          'Rename or reorder a club field; clubs and applications using it follow the new name',
        requestParams: { path: IdPath },
        requestBody: jsonBody(clubFieldBody),
        responses: {
          '200': jsonOk('Club field updated', ClubField),
          '404': apiError('Club field not found'),
          '409': apiError('A field with this name already exists'),
        },
      },
      delete: {
        summary: 'Delete an unused club field, or hide one that clubs or applications still use',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk(
            'Removal result',
            z.object({
              result: z.enum(['deleted', 'deactivated']),
            }),
          ),
          '404': apiError('Club field not found'),
        },
      },
    },
    '/admin/policies': {
      get: {
        summary: 'List current and recent school policy versions (ICPDP only)',
        responses: {
          '200': jsonOk(
            'Current policy and recent versions',
            z.object({
              current: PolicyVersion.nullable(),
              versions: z.array(PolicyVersion),
            }),
          ),
          '401': apiError('Authentication required'),
          '403': apiError('ICPDP role required'),
        },
      },
      post: {
        summary: 'Create a school policy version (ICPDP only; requires CSRF token)',
        requestBody: jsonBody(policyCreateBody),
        responses: {
          '201': jsonOk('Policy version created', PolicyVersion),
          '400': apiError('Policy values are invalid'),
          '409': apiError(
            'Policy would invalidate issued decisions; details lists affected records',
          ),
          '401': apiError('Authentication required'),
          '403': apiError('ICPDP role or CSRF token required'),
        },
      },
    },
    '/applications/config': {
      get: {
        summary:
          'Read the founding form requirements, club field catalog and fixed founding positions',
        responses: {
          '200': jsonOk(
            'Application configuration',
            z.object({
              requirements: FoundingRequirements,
              fields: z.array(ClubField),
              positions: z.array(
                z.object({
                  code: z.string(),
                  name: z.string(),
                  founderRole: z.enum(['LEADER', 'VICE_LEADER', 'MEMBER']),
                }),
              ),
              maxViceLeaders: z.number(),
            }),
          ),
        },
      },
    },
    '/applications/mine': {
      get: {
        summary: "List the signed-in student's club applications",
        responses: {
          '200': jsonOk('Applications', z.array(ApplicationRecord)),
        },
      },
    },
    '/applications/recruitment/mine': {
      get: {
        summary: "List the signed-in student's recruitment applications",
        responses: {
          '200': jsonOk('Recruitment applications', z.array(RecruitmentApplication)),
        },
      },
    },
    '/applications/recruitment/by-campaign/{campaignId}': {
      get: {
        summary: "Find the signed-in student's application for a campaign",
        requestParams: { path: z.object({ campaignId: z.string() }) },
        responses: {
          '200': jsonOk('Application or null', RecruitmentApplication.nullable()),
        },
      },
    },
    '/applications/recruitment': {
      post: {
        summary: 'Create one application draft for a campaign',
        requestBody: jsonBody(createRecruitmentApplicationBody),
        responses: {
          '201': jsonOk('Application draft', RecruitmentApplication),
        },
      },
    },
    '/applications/recruitment/{id}': {
      get: {
        summary: 'Read an owned recruitment application',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Recruitment application', RecruitmentApplication),
        },
      },
    },
    '/applications/recruitment/{id}/draft': {
      patch: {
        summary: 'Update an owned application draft',
        requestParams: { path: IdPath },
        requestBody: jsonBody(updateRecruitmentApplicationBody),
        responses: {
          '200': jsonOk('Saved draft', RecruitmentApplication),
        },
      },
    },
    '/applications/recruitment/{id}/attachments': {
      post: {
        summary: 'Upload a private file answer to an application draft',
        requestParams: { path: IdPath },
        requestBody: { content: { 'application/octet-stream': { schema: z.string() } } },
        responses: {
          '201': jsonOk('Draft with attachment', RecruitmentApplication),
        },
      },
    },
    '/applications/recruitment/{id}/attachments/{attachmentId}/access': {
      get: {
        summary: 'Create a short-lived private download URL for an owned attachment',
        requestParams: { path: z.object({ id: z.string(), attachmentId: z.string() }) },
        responses: {
          '200': jsonOk(
            'Short-lived access URL',
            z.object({ url: z.string(), fileName: z.string() }),
          ),
        },
      },
    },
    '/applications/recruitment/{id}/submit': {
      post: {
        summary: 'Validate and submit an application before the campaign closes',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Submitted application', RecruitmentApplication),
        },
      },
    },
    '/applications/recruitment/{id}/withdraw': {
      post: {
        summary: 'Withdraw an undecided recruitment application',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Withdrawn application', RecruitmentApplication),
        },
      },
    },
    '/applications': {
      post: {
        summary: 'Create a club application draft (requires CSRF token)',
        requestBody: jsonBody(applicationDraftBody),
        responses: {
          '201': jsonOk('Draft created', ApplicationRecord),
        },
      },
    },
    '/applications/founder-lookup': {
      get: {
        summary: 'Find an active account by exact email to add it as a founding member',
        requestParams: { query: z.object({ email: z.string() }) },
        responses: {
          '200': jsonOk('Matching account', FounderProfile),
          '404': { description: 'No active account uses this email' },
        },
      },
    },
    '/applications/{id}': {
      get: {
        summary: 'Read an owned application, its submitted versions and ICPDP decision feedback',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk(
            'Application, history and decisions (without internal review notes)',
            z.object({
              application: ApplicationRecord,
              versions: z.array(ApplicationVersion),
              decisions: z.array(ApplicantDecisionFeedback),
              founders: z.array(FounderProfile),
            }),
          ),
        },
      },
    },
    '/applications/{id}/preview': {
      get: {
        summary: 'Preview what still blocks submission and any active-name conflict',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk(
            'Submission preview',
            z.object({
              requirements: FoundingRequirements,
              issues: z.array(FoundingIssue),
              activeNameConflict: z.boolean(),
              similarClubs: z
                .array(SimilarClubHint)
                .max(5)
                .describe(
                  'Public clubs (Active, Suspended, Dissolving, Dissolved) that look similar',
                ),
            }),
          ),
        },
      },
    },
    '/applications/{id}/draft': {
      patch: {
        summary: 'Save an editable application draft (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(
          applicationDraftBody
            .extend({
              draftRevision: z.number().int().nonnegative(),
            })
            .strict(),
        ),
        responses: {
          '200': jsonOk('Draft saved', ApplicationRecord),
        },
      },
    },
    '/applications/{id}/submit': {
      post: {
        summary: 'Submit a new immutable application version and review task (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '201': jsonOk(
            'Application submitted',
            z.object({
              version: ApplicationVersion,
              activeNameConflict: z.boolean(),
              similarClubs: z
                .array(SimilarClubHint)
                .max(5)
                .describe(
                  'Public clubs (Active, Suspended, Dissolving, Dissolved) that look similar',
                ),
            }),
          ),
        },
      },
    },
    '/applications/{id}/withdraw': {
      post: {
        summary: 'Withdraw an undecided application (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Application withdrawn', ApplicationRecord),
        },
      },
    },
    '/applications/{id}/documents': {
      post: {
        summary:
          'Upload the founding proposal (X-Document-Type: PROPOSAL, PDF/DOCX ≤ 10MB) or the ' +
          'proposed logo (LOGO, PNG/JPEG ≤ 2MB); replaces the previous file of that type ' +
          '(requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '201': jsonOk('Document uploaded', ApplicationDocument),
        },
      },
    },
    '/applications/{id}/documents/{documentId}': {
      delete: {
        summary: 'Remove a document from the editable draft (requires CSRF token)',
        requestParams: { path: ApplicationDocumentPath },
        responses: {
          '200': jsonOk('Draft updated', ApplicationRecord),
        },
      },
    },
    '/applications/{id}/documents/{documentId}/access': {
      get: {
        summary: 'Get a short-lived Cloudinary access URL for an owned document',
        requestParams: { path: ApplicationDocumentPath },
        responses: {
          '200': jsonOk(
            'Temporary access URL',
            z.object({
              fileName: z.string(),
              url: z.string().url(),
            }),
          ),
        },
      },
    },
    '/admin/application-reviews': {
      get: {
        summary: 'List open club application review tasks (ICPDP Officer only)',
        responses: {
          '200': jsonOk('Review queue', z.array(ApplicationReviewQueueItem)),
          '403': apiError('ICPDP Officer role required'),
        },
      },
    },
    '/admin/application-reviews/{id}': {
      get: {
        summary: 'Read a club application review snapshot and history',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Review detail', ApplicationReviewDetail),
        },
      },
    },
    '/admin/application-reviews/{id}/claim': {
      post: {
        summary: 'Claim an open application review and start review (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Claimed review', ApplicationReviewDetail),
        },
      },
    },
    '/admin/application-reviews/{id}/decision': {
      post: {
        summary: 'Record the single decision for an application review (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(applicationReviewDecisionBody),
        responses: {
          '200': jsonOk('Decided review', ApplicationReviewDetail),
        },
      },
    },
    '/admin/application-reviews/{id}/documents/{documentId}/access': {
      get: {
        summary: 'Get a short-lived document URL for ICPDP application review',
        requestParams: { path: ApplicationDocumentPath },
        responses: {
          '200': jsonOk(
            'Temporary access URL',
            z.object({
              fileName: z.string(),
              url: z.string().url(),
            }),
          ),
        },
      },
    },
    '/admin/event-proposals': {
      get: {
        summary:
          'List pending or approved event proposals, newest first (UC26, ICPDP Officer only)',
        requestParams: {
          query: z.object({ view: z.enum(['pending', 'approved']).default('pending') }),
        },
        responses: {
          '200': jsonOk('Event proposal queue', z.array(EventProposalQueueItem)),
          '403': apiError('ICPDP Officer role required'),
        },
      },
    },
    '/admin/event-proposals/{id}': {
      get: {
        summary:
          'Event proposal with its revisions, budget lines, club obligations, bookings and semester budgets',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Event proposal detail', EventProposalDetail),
        },
      },
    },
    '/admin/event-proposals/{id}/claim': {
      post: {
        summary: 'Claim an event proposal and move it to Under Review (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Claimed proposal', EventProposalDetail),
          '409': apiError('Already claimed or no longer reviewable'),
        },
      },
    },
    '/admin/event-proposals/{id}/decision': {
      post: {
        summary:
          'Request revision, approve (with conditions and per-line approved budget) or reject (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(eventReviewDecisionBody),
        responses: {
          '200': jsonOk('Decided proposal', EventProposalDetail),
          '400': apiError('Missing reason, sections, deadline or approved amounts'),
          '409': apiError('Proposal already decided or not claimed by this officer'),
        },
      },
    },
    '/admin/event-proposals/{id}/cancellation-decision': {
      post: {
        summary:
          "Approve or reject a club's request to cancel an approved event (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: jsonBody(eventCancellationDecisionBody),
        responses: {
          '200': jsonOk('Decided cancellation request', EventProposalDetail),
          '400': apiError('Invalid decision body'),
          '409': apiError('No pending cancellation request for this event'),
        },
      },
    },
    '/admin/budgets': {
      get: {
        summary:
          'One page of approved event budgets matching a tab and club, newest first, with per-tab counts and the clubs that have budgets (UC35, ICPDP Officer only)',
        requestParams: { query: budgetListQuery },
        responses: {
          '200': jsonOk('Budgets', BudgetPage),
          '403': apiError('ICPDP Officer role required'),
        },
      },
    },
    '/admin/budgets/{id}': {
      get: {
        summary:
          'Budget with its approved lines and the money flows recorded before sponsored items',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Budget detail', BudgetDetail),
        },
      },
    },
    '/admin/periodic-reports': {
      get: {
        summary: 'Periodic report status of every club for a semester (UC39, ICPDP Officer only)',
        requestParams: { query: periodicOverviewQuery },
        responses: {
          '200': jsonOk('Overview', PeriodicOverview),
          '403': apiError('ICPDP Officer role required'),
        },
      },
    },
    '/admin/periodic-reports/campaign': {
      put: {
        summary:
          'Open or update periodic report submission campaign, deadline and custom fields for a semester (requires CSRF token)',
        requestBody: jsonBody(periodicCampaignBody),
        responses: {
          '200': jsonOk('Saved campaign', PeriodicCampaign),
          '400': apiError('Invalid period, deadline or custom fields'),
          '403': apiError('ICPDP Officer role required'),
        },
      },
    },
    '/admin/periodic-reports/{id}': {
      get: {
        summary: "Report next to the system's own figures for the same club and semester",
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Report detail', PeriodicReportDetail),
        },
      },
    },
    '/admin/periodic-reports/{id}/decision': {
      post: {
        summary:
          'Accept (optionally with an observation for the evaluation) or return with structured comments (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(periodicDecisionBody),
        responses: {
          '200': jsonOk('Decided report', PeriodicReportDetail),
          '400': apiError('Missing reason or sections for a return'),
          '409': apiError('Not waiting for a decision'),
        },
      },
    },
    '/admin/periodic-reports/missing': {
      post: {
        summary:
          'Record that a club did not submit on time; opens an OVERDUE_REPORT case (requires CSRF token)',
        requestBody: jsonBody(periodicMissingBody),
        responses: {
          '201': jsonOk('Opened case', z.object({ violationId: z.string() })),
          '409': apiError('Not due, already submitted or already recorded'),
        },
      },
    },
    '/admin/violations': {
      get: {
        summary:
          'One page of compliance cases matching a tab filter, newest first, with per-tab counts (UC40, ICPDP Officer only)',
        requestParams: { query: violationListQuery },
        responses: {
          '200': jsonOk('Cases', ViolationPage),
          '403': apiError('ICPDP Officer role required'),
        },
      },
      post: {
        summary: 'Open a compliance case for a club (requires CSRF token)',
        requestBody: jsonBody(violationOpenBody),
        responses: {
          '201': jsonOk('Opened case', ViolationDetail),
          '400': apiError('Invalid origin, severity, title or source record'),
        },
      },
    },
    '/admin/violations/sources/{clubId}': {
      get: {
        summary: 'Events and budgets of a club a case can point to',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk(
            'Source records',
            z.object({
              events: z.array(
                z.object({
                  id: z.string(),
                  title: z.string(),
                  startAt: z.string(),
                  state: z.string(),
                }),
              ),
              budgets: z.array(
                z.object({ id: z.string(), eventTitle: z.string(), state: z.string() }),
              ),
            }),
          ),
        },
      },
    },
    '/admin/violations/{id}': {
      get: {
        summary:
          'Compliance case with evidence, club response, decision, corrective actions and history',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Case detail', ViolationDetail),
        },
      },
    },
    '/admin/violations/{id}/steps': {
      post: {
        summary:
          'Move a case forward: investigate, add evidence, ask or record the club response, decide, assign/verify corrective actions, resolve (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(violationStepBody),
        responses: {
          '200': jsonOk('Updated case', ViolationDetail),
          '400': apiError('Missing reason, evidence, message or deadline'),
          '409': apiError('The step is not allowed in the current state'),
        },
      },
    },
    '/admin/school-events': {
      get: {
        summary:
          'List school-wide events organised by ICPDP with invitation counts (UC53, ICPDP Officer only)',
        responses: {
          '200': jsonOk('School events', z.array(SchoolEventSummary)),
          '403': apiError('ICPDP Officer role required'),
        },
      },
      post: {
        summary:
          'Create a school-wide event (Approved) and optionally invite clubs (requires CSRF token)',
        requestBody: jsonBody(schoolEventBody),
        responses: {
          '201': jsonOk(
            'Created event and invitation outcome',
            z.object({ detail: SchoolEventDetail, outcome: InvitationOutcome }),
          ),
          '400': apiError('Invalid time, venue, capacity, semester or reply deadline'),
        },
      },
    },
    '/admin/school-events/conflicts': {
      get: {
        summary: 'Approved events and bookings overlapping a room and time (BR15 warning)',
        requestParams: { query: schoolEventConflictQuery },
        responses: {
          '200': jsonOk('Overlaps', z.array(ScheduleConflict)),
        },
      },
    },
    '/admin/school-events/{id}': {
      get: {
        summary: 'School event with conflicts, check-in code and every club invitation',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('School event', SchoolEventDetail),
        },
      },
    },
    '/admin/school-events/{id}/invitations': {
      post: {
        summary: 'Invite more clubs, or re-invite withdrawn/expired ones (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(schoolEventInviteBody),
        responses: {
          '200': jsonOk(
            'Updated event and invitation outcome',
            z.object({ detail: SchoolEventDetail, outcome: InvitationOutcome }),
          ),
          '409': apiError('The event already took place'),
        },
      },
    },
    '/admin/school-events/{id}/invitations/{invitationId}/withdraw': {
      post: {
        summary: 'Withdraw a pending invitation before its deadline (requires CSRF token)',
        requestParams: { path: z.object({ id: z.string(), invitationId: z.string() }) },
        responses: {
          '200': jsonOk('Updated event', SchoolEventDetail),
          '409': apiError('Not pending or past the deadline'),
        },
      },
    },
    '/admin/school-events/{id}/publish': {
      post: {
        summary:
          'Publish the event to students and open registration until it starts (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Published event', SchoolEventDetail),
          '409': apiError('Already published or already started'),
        },
      },
    },
    '/admin/evaluations': {
      get: {
        summary:
          'Evaluation overview of a period: every club in scope with its latest revision (UC42/UC43, ICPDP Officer only)',
        requestParams: { query: evaluationOverviewQuery },
        responses: {
          '200': jsonOk('Overview', EvaluationOverview),
          '403': apiError('ICPDP Officer role required'),
        },
      },
    },
    '/admin/evaluations/generate': {
      post: {
        summary:
          'Generate a Data Ready draft from operational data for every club without one (UC42, requires CSRF token)',
        requestBody: jsonBody(evaluationPeriodBody),
        responses: {
          '200': jsonOk('Overview', EvaluationOverview),
          '409': apiError('No active scheme for the period'),
        },
      },
    },
    '/admin/evaluations/publish': {
      post: {
        summary:
          'Publish the period once every club is finalized, and notify the clubs (UC43, requires CSRF token)',
        requestBody: jsonBody(evaluationPeriodBody),
        responses: {
          '200': jsonOk('Overview', EvaluationOverview),
          '409': apiError('Some club is not finalized'),
        },
      },
    },
    '/admin/evaluations/{id}': {
      get: {
        summary: 'Evaluation with dimension scores, data lineage, revisions and trend',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Evaluation', EvaluationDetail),
        },
      },
    },
    '/admin/evaluations/{id}/regenerate': {
      post: {
        summary:
          'Generate the draft again from current data, or start a new revision of a published result (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Evaluation', EvaluationDetail),
          '409': apiError('Not allowed in the current state'),
        },
      },
    },
    '/admin/evaluations/{id}/manual': {
      post: {
        summary:
          'Score a dimension by hand with a justification, or clear the manual score (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(evaluationManualBody),
        responses: {
          '200': jsonOk('Evaluation', EvaluationDetail),
          '409': apiError('Not allowed in the current state'),
        },
      },
    },
    '/admin/evaluations/{id}/finalize': {
      post: {
        summary: 'Finalize: compute the weighted total and classification (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Evaluation', EvaluationDetail),
          '409': apiError('Not allowed in the current state'),
        },
      },
    },
    '/admin/evaluations/{id}/reopen': {
      post: {
        summary: 'Reopen a finalized, unpublished evaluation for review (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Evaluation', EvaluationDetail),
          '409': apiError('Not allowed in the current state'),
        },
      },
    },
    '/admin/board-nominations': {
      get: {
        summary: 'List open board nomination tasks (ICPDP Officer only)',
        responses: {
          '200': jsonOk('Board nomination queue', z.array(BoardNomination)),
        },
      },
    },
    '/admin/board-nominations/{id}': {
      get: {
        summary: 'Read board nomination and eligibility details',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Board nomination detail', BoardNomination),
        },
      },
    },
    '/admin/board-nominations/{id}/claim': {
      post: {
        summary: 'Claim an open board nomination task (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Claimed task', BoardNomination),
        },
      },
    },
    '/admin/board-nominations/{id}/decision': {
      post: {
        summary: 'Record one full or partial board confirmation decision',
        requestParams: { path: IdPath },
        requestBody: jsonBody(boardNominationDecisionBody),
        responses: {
          '200': jsonOk('Decided board nomination', BoardNomination),
        },
      },
    },
    '/admin/leadership-transitions': {
      get: {
        summary: 'List open leadership transition tasks (ICPDP Officer only)',
        responses: {
          '200': jsonOk('Leadership transition queue', z.array(LeadershipTransition)),
        },
      },
    },
    '/admin/leadership-transitions/{id}': {
      get: {
        summary: 'Read a leadership transition plan and its carried obligations',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Transition detail', LeadershipTransition),
        },
      },
    },
    '/admin/leadership-transitions/{id}/claim': {
      post: {
        summary: 'Claim an open leadership transition task (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Claimed task', LeadershipTransition),
        },
      },
    },
    '/admin/leadership-transitions/{id}/decision': {
      post: {
        summary: 'Approve or return a leadership transition (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(transitionDecisionBody),
        responses: {
          '200': jsonOk('Decided transition', LeadershipTransition),
          '409': apiError('Transition held while club is suspended or source data changed'),
        },
      },
    },
    '/events/{id}/registration': {
      get: {
        summary: "Read the authenticated student's event registration context",
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Registration context', EventRegistrationContext),
        },
      },
    },
    '/events/{id}/registrations': {
      post: {
        summary: 'Register the authenticated student for an event (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(eventRegistrationBody),
        responses: {
          '201': jsonOk('Confirmed or waitlisted registration', EventRegistration),
          '409': apiError('Registration closed, duplicate, or capacity reached'),
        },
      },
    },
    '/events/{id}/check-in': {
      post: {
        summary:
          'Check the authenticated student in to an event with its check-in code (requires CSRF token)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(eventCheckInBody),
        responses: {
          '200': jsonOk(
            'The single attendance record (existing one when already checked in)',
            Attendance.extend({ alreadyCheckedIn: z.boolean() }),
          ),
          '400': apiError('Invalid check-in code'),
          '403': apiError('No confirmed registration or members-only event'),
          '409': apiError('Event not open for check-in or outside the check-in window'),
        },
      },
    },
    '/events/{id}/feedback': {
      get: {
        summary:
          'Read whether the authenticated student may give feedback, and their own submission',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Feedback context', EventFeedbackContext),
        },
      },
      post: {
        summary: "Submit the student's single, immutable event feedback (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: jsonBody(eventFeedbackBody),
        responses: {
          '201': jsonOk(
            'Submitted feedback (visible with identity only to its author)',
            MyEventFeedback,
          ),
          '400': apiError('Rating outside 1–5 or empty/oversized comment'),
          '403': apiError('Caller did not check in to the event'),
          '409': apiError('Feedback already submitted or window closed'),
        },
      },
    },
    '/event-feedbacks/mine': {
      get: {
        summary: "List the authenticated student's own event feedback",
        responses: {
          '200': jsonOk('Own feedback', z.array(MyEventFeedback)),
        },
      },
    },
    '/admin/routing-rules': {
      get: {
        summary: 'UC05: approval routing rule sets, newest first (ICPDP officers)',
        responses: {
          '200': jsonOk('Rule sets', z.array(RoutingRuleSet)),
          '403': apiError('ICPDP officer role required'),
        },
      },
      post: {
        summary:
          'UC05: create a draft rule set (ICPDP officer, CSRF); overlapping rules are refused',
        requestBody: jsonBody(routingRulesBody),
        responses: {
          '201': jsonOk('Draft', RoutingRuleSet),
          '400': apiError('Invalid or overlapping rules'),
          '403': apiError('ICPDP officer role required'),
        },
      },
    },
    '/admin/routing-rules/{id}': {
      put: {
        summary: 'UC05: replace the rules of a draft (ICPDP officer, CSRF)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(routingRulesBody),
        responses: {
          '200': jsonOk('Draft', RoutingRuleSet),
          '409': apiError('Not a draft'),
        },
      },
    },
    '/admin/routing-rules/{id}/activate': {
      post: {
        summary:
          'UC05: activate a draft; the previous set is superseded and only new requests use it (ICPDP officer, CSRF)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Active', RoutingRuleSet),
        },
      },
    },
    '/admin/routing-rules/{id}/simulation': {
      get: {
        summary:
          'UC05 A1: which rule of this set the last N decided requests would match, and their SLA (read only)',
        requestParams: { path: IdPath, query: routingSimulationQuery },
        responses: {
          '200': jsonOk('Simulation', RoutingSimulation),
        },
      },
    },
    '/complaints': {
      post: {
        summary:
          'UC50: complain about a club to ICPDP (BR38); creates an ICPDP task (requires CSRF token)',
        requestBody: jsonBody(complaintBody),
        responses: {
          '201': jsonOk('Submitted complaint', Complaint),
          '400': apiError('Invalid type, text, evidence or unrelated event'),
          '404': apiError('Club not found or dissolved'),
        },
      },
    },
    '/complaints/mine': {
      get: {
        summary: "UC50: the authenticated student's complaints with their progress",
        responses: {
          '200': jsonOk('Own complaints', z.array(Complaint)),
        },
      },
    },
    '/complaints/{id}/withdraw': {
      post: {
        summary: 'UC50 A1: withdraw an own complaint ICPDP has not decided (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Withdrawn complaint', Complaint),
          '409': apiError('Already decided or not yours'),
        },
      },
    },
    '/admin/complaints': {
      get: {
        summary:
          'UC51: one page of the ICPDP complaint queue, newest first, optionally by state (ICPDP officer only)',
        requestParams: { query: complaintQuery },
        responses: {
          '200': jsonOk(
            'Complaints with complainant and the complaints each can be linked to',
            ComplaintQueuePage,
          ),
          '403': apiError('ICPDP officer role required'),
        },
      },
    },
    '/admin/complaints/{id}': {
      get: {
        summary:
          'UC51: one complaint with its complainant and linked duplicates (ICPDP officer only)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Complaint', ComplaintForIcpdp),
        },
      },
    },
    '/admin/complaints/{id}/open': {
      post: {
        summary: 'UC51: open a submitted complaint for triage (Submitted → Under Triage)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Under triage', ComplaintForIcpdp),
          '409': apiError('No longer Submitted'),
        },
      },
    },
    '/admin/complaints/{id}/triage': {
      post: {
        summary:
          'UC51: Dismissed, Forwarded (to the club, with deadline) or Escalated (opens a UC40 case); reason required',
        requestParams: { path: IdPath },
        requestBody: jsonBody(complaintTriageBody),
        responses: {
          '200': jsonOk('Triaged', ComplaintForIcpdp),
          '409': apiError('Not under triage, or club dissolved'),
        },
      },
    },
    '/admin/complaints/{id}/link': {
      post: {
        summary:
          'UC50 E1: link an undecided complaint to another of the same student and club; it then follows that complaint',
        requestParams: { path: IdPath },
        requestBody: jsonBody(complaintLinkBody),
        responses: {
          '200': jsonOk('Linked', ComplaintForIcpdp),
          '409': apiError('Not undecided, already linked, or another student or club'),
        },
      },
    },
    '/admin/complaints/{id}/close': {
      post: {
        summary: 'UC51 A1: close a complaint after a satisfying club response',
        requestParams: { path: IdPath },
        requestBody: jsonBody(complaintCloseBody),
        responses: {
          '200': jsonOk('Closed', ComplaintForIcpdp),
        },
      },
    },
    '/admin/complaints/{id}/escalate': {
      post: {
        summary: 'UC51 A1: escalate a complaint after the club response into a UC40 violation case',
        requestParams: { path: IdPath },
        requestBody: jsonBody(complaintEscalateBody),
        responses: {
          '200': jsonOk('Escalated', ComplaintForIcpdp),
        },
      },
    },
    '/clubs/{clubId}/complaints': {
      get: {
        summary:
          'UC52: complaints ICPDP forwarded to this club, without the complainant (club.complaint.respond)',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Forwarded complaints', z.array(ComplaintForClub)),
          '403': apiError('Missing club.complaint.respond'),
        },
      },
    },
    '/clubs/{clubId}/complaints/{id}/response': {
      post: {
        summary:
          'UC52: answer a forwarded complaint once, with the concrete action taken (club.complaint.respond, CSRF)',
        requestParams: { path: ClubIdPath },
        requestBody: jsonBody(complaintResponseBody),
        responses: {
          '200': jsonOk('Club Responded', ComplaintForClub),
          '409': apiError('Not forwarded to this club or already answered'),
        },
      },
    },
    '/attendances/mine': {
      get: {
        summary: "List the authenticated student's check-ins with their feedback windows",
        responses: {
          '200': jsonOk('Attendance history', z.array(Attendance)),
        },
      },
    },
    '/event-registrations/mine': {
      get: {
        summary: "List the authenticated student's event registrations",
        responses: {
          '200': jsonOk('Owned event registrations', z.array(EventRegistration)),
        },
      },
    },
    '/event-registrations/{id}/cancel': {
      post: {
        summary: 'Cancel an owned event registration before event start (requires CSRF token)',
        requestParams: { path: IdPath },
        responses: {
          '200': jsonOk('Cancelled registration', EventRegistration),
        },
      },
    },
    '/clubs/{clubId}/board-nomination-context': {
      get: {
        summary: 'Read current board seats and active club members for nomination',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Nomination context', BoardNominationContext),
        },
      },
    },
    '/clubs/{clubId}/board-nominations': {
      get: {
        summary:
          "List the club's recent board nominations with seat states and return reasons (UC10)",
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Club board nominations, newest first', z.array(BoardNomination)),
        },
      },
      post: {
        summary: 'Submit one board nomination and create one ICPDP task',
        requestParams: { path: ClubPath },
        requestBody: jsonBody(boardNominationBody),
        responses: {
          '201': jsonOk('Submitted nomination', BoardNomination),
        },
      },
    },
    '/clubs/{clubId}/member-space': {
      get: {
        summary: 'Read-only member space of a club for its Active or Inactive members (UC24)',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk(
            'Membership, roster, board, events, attendance and owed feedback',
            MemberSpace,
          ),
          '403': apiError('Not a current member (Left, Banned or never joined)'),
        },
      },
    },
    '/memberships/mine': {
      get: {
        summary: "List the authenticated student's current club memberships",
        responses: {
          '200': jsonOk('Memberships', z.array(Membership)),
        },
      },
    },
    '/memberships/withdrawal-requests/mine': {
      get: {
        summary: "List the authenticated student's withdrawal requests",
        responses: {
          '200': jsonOk('Withdrawal requests', z.array(MembershipWithdrawal)),
        },
      },
    },
    '/memberships/{membershipId}/withdrawal-requests': {
      post: {
        summary: 'Request to leave a club without changing membership state immediately',
        requestParams: { path: z.object({ membershipId: z.string() }) },
        requestBody: jsonBody(
          z.object({
            reason: z.string().min(1).max(2000),
            requestedEffectiveDate: z.string().datetime(),
          }),
        ),
        responses: {
          '201': jsonOk('Withdrawal request', MembershipWithdrawal),
        },
      },
    },
    '/clubs/{clubId}/memberships': {
      get: {
        summary: 'List current members for a club manager',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk(
            'Membership roster with email and currently held club roles',
            z.array(ClubRosterMember),
          ),
        },
      },
      post: {
        summary: 'Onboard a student manually without a recruitment application (UC20 A1)',
        requestParams: { path: ClubPath },
        requestBody: jsonBody(
          z.object({
            email: z.string().max(320),
            reason: z.string().min(1).max(2000),
          }),
        ),
        responses: {
          '201': jsonOk('Created Active membership', Membership),
        },
      },
    },
    '/clubs/{clubId}/memberships/{membershipId}/state': {
      patch: {
        summary: 'Activate, deactivate or ban a membership',
        requestParams: { path: z.object({ clubId: z.string(), membershipId: z.string() }) },
        requestBody: jsonBody(
          z.object({
            state: z.enum(['Active', 'Inactive', 'Banned']),
            effectiveDate: z.string().datetime(),
            reason: z.string().max(2000).optional(),
          }),
        ),
        responses: {
          '200': jsonOk('Updated membership', Membership),
        },
      },
    },
    '/clubs/{clubId}/membership-withdrawals': {
      get: {
        summary: 'List club membership withdrawal requests',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Withdrawal requests', z.array(MembershipWithdrawal)),
        },
      },
    },
    '/clubs/{clubId}/membership-withdrawals/{requestId}/execute': {
      post: {
        summary: 'Execute a withdrawal after board-seat and effective-date checks',
        requestParams: { path: z.object({ clubId: z.string(), requestId: z.string() }) },
        responses: {
          '200': jsonOk('Membership marked as Left', Membership),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns': {
      get: {
        summary: 'List recruitment campaigns for a club with recruitment-management permission',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Recruitment campaigns', z.array(RecruitmentCampaign)),
        },
      },
      post: {
        summary: 'Create a recruitment campaign draft',
        requestParams: { path: ClubPath },
        requestBody: jsonBody(recruitmentCampaignBody),
        responses: {
          '201': jsonOk('Draft and overlap warning', CampaignWithOverlaps),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}': {
      get: {
        summary: 'Read a recruitment campaign',
        requestParams: { path: CampaignPath },
        responses: {
          '200': jsonOk('Recruitment campaign', RecruitmentCampaign),
        },
      },
      patch: {
        summary: 'Update a draft recruitment campaign',
        requestParams: { path: CampaignPath },
        requestBody: jsonBody(recruitmentCampaignBody),
        responses: {
          '200': jsonOk('Draft and overlap warning', CampaignWithOverlaps),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/publish': {
      post: {
        summary: 'Publish a draft after academic-calendar and overlap validation',
        requestParams: { path: CampaignPath },
        requestBody: jsonBody(z.object({ confirmOverlap: z.boolean() })),
        responses: {
          '200': jsonOk('Published campaign', CampaignWithOverlaps),
          '409': apiError('Overlapping campaign requires explicit confirmation'),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/cancel': {
      post: {
        summary: 'Cancel a campaign and notify its applicants',
        requestParams: { path: CampaignPath },
        responses: {
          '200': jsonOk('Cancelled campaign', RecruitmentCampaign),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications': {
      get: {
        summary: 'List recruitment applications for an authorized club reviewer',
        requestParams: {
          path: CampaignPath,
          query: z.object({ state: z.string().optional() }),
        },
        responses: {
          '200': jsonOk('Applications for review', z.array(RecruitmentApplication)),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/review': {
      post: {
        summary: 'Screen applications or record campaign decisions',
        requestParams: { path: CampaignPath },
        requestBody: jsonBody(
          z.object({
            action: z.enum(['screen', 'shortlist', 'decide', 'promote', 'close-withdrawn']),
            applicationIds: z.array(z.string()),
            outcome: z.enum(['Shortlisted', 'Accepted', 'Rejected', 'Waitlisted']).optional(),
            reason: z.string().optional(),
          }),
        ),
        responses: {
          '200': jsonOk('Updated applications', z.array(RecruitmentApplication)),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/{applicationId}/onboard': {
      post: {
        summary: 'Create an Active membership for an accepted recruitment candidate',
        requestParams: {
          path: ApplicationPath,
        },
        requestBody: jsonBody(
          z.object({
            joinedAt: z.string().datetime().optional(),
            departmentId: z.string().optional(),
          }),
        ),
        responses: {
          '200': jsonOk('Onboarded application', RecruitmentApplication),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/{applicationId}/attachments/{attachmentId}/access':
      {
        get: {
          summary:
            'Create a short-lived private download URL for a reviewer (club.application.review)',
          requestParams: {
            path: z.object({
              clubId: z.string(),
              campaignId: z.string(),
              applicationId: z.string(),
              attachmentId: z.string(),
            }),
          },
          responses: {
            '200': jsonOk(
              'Short-lived access URL',
              z.object({ url: z.string(), fileName: z.string() }),
            ),
          },
        },
      },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/{applicationId}/decline': {
      post: {
        summary: 'Record a candidate declining an accepted offer',
        requestParams: {
          path: ApplicationPath,
        },
        requestBody: jsonBody(z.object({ reason: z.string().optional() })),
        responses: {
          '200': jsonOk('Declined application', RecruitmentApplication),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/evaluations': {
      get: {
        summary:
          'List candidate evaluations per application with aggregate and dispersion (club.application.review)',
        requestParams: { path: CampaignPath },
        responses: {
          '200': jsonOk(
            'Evaluations grouped by application',
            z.object({
              rubric: z.array(
                z.object({ key: z.string(), label: z.string(), maxScore: z.number() }),
              ),
              applications: z.array(CandidateEvaluationGroup),
            }),
          ),
        },
      },
    },
    '/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/{applicationId}/evaluation': {
      put: {
        summary:
          "Create or update the caller's evaluation of a Shortlisted application (club.application.review)",
        requestParams: {
          path: ApplicationPath,
        },
        requestBody: jsonBody(candidateEvaluationBody),
        responses: {
          '200': jsonOk('Saved evaluation', CandidateEvaluation),
        },
      },
    },
    '/clubs/{clubId}/settings': {
      get: {
        summary: 'Read club settings (Club Leader, club.profile.manage)',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Club settings', ClubSettings),
        },
      },
    },
    '/clubs/{clubId}/profile': {
      patch: {
        summary: 'Update club-owned profile fields (requires club.profile.manage and CSRF)',
        requestParams: { path: ClubPath },
        requestBody: jsonBody(clubProfileBody),
        responses: {
          '200': jsonOk('Updated club profile', ClubProfile),
        },
      },
    },
    '/clubs/{clubId}/departments/template': {
      post: {
        summary: 'Apply the default department template to an empty club structure',
        requestParams: { path: ClubPath },
        responses: {
          '200': jsonOk('Current departments', z.array(ClubDepartment)),
        },
      },
    },
    '/clubs/{clubId}/departments': {
      post: {
        summary: 'Create an internal club department',
        requestParams: { path: ClubPath },
        requestBody: jsonBody(clubDepartmentBody),
        responses: {
          '201': jsonOk('Department created', ClubDepartment),
        },
      },
    },
    '/clubs/{clubId}/departments/{departmentId}': {
      patch: {
        summary: 'Update an internal club department',
        requestParams: { path: z.object({ clubId: z.string(), departmentId: z.string() }) },
        requestBody: jsonBody(clubDepartmentBody),
        responses: {
          '200': jsonOk('Department updated', ClubDepartment),
        },
      },
      delete: {
        summary: 'Deactivate an unused internal club department',
        requestParams: { path: z.object({ clubId: z.string(), departmentId: z.string() }) },
        responses: {
          '200': jsonOk('Department deactivated', ClubDepartment),
        },
      },
    },
    '/admin/users/{id}/roles': {
      post: {
        summary: 'Grant a system role (ICPDP only)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(RoleChange),
        responses: {
          '200': jsonOk('Role granted', Changed),
          '403': apiError('Forbidden'),
        },
      },
    },
    '/admin/users/{id}/roles/{roleCode}': {
      delete: {
        summary: 'Revoke a system role with reason (ICPDP only)',
        requestParams: { path: RolePath },
        requestBody: jsonBody(Reason),
        responses: {
          '200': jsonOk('Role revoked', Changed),
          '403': apiError('Forbidden'),
        },
      },
    },
    '/admin/users/{id}/lock': {
      post: {
        summary: 'Lock account with reason, optionally under an open UC40 case (ICPDP only)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(lockBody),
        responses: {
          '200': jsonOk('Account locked', Changed),
          '403': apiError('Forbidden'),
        },
      },
    },
    '/admin/users/{id}/unlock': {
      post: {
        summary: 'Unlock account with reason (ICPDP only)',
        requestParams: { path: IdPath },
        requestBody: jsonBody(Reason),
        responses: {
          '200': jsonOk('Account unlocked', Changed),
          '403': apiError('Forbidden'),
        },
      },
    },
  },
})
