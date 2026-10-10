import { z } from "zod";
import { createDocument } from "zod-openapi";
import { policyCreateBody, policySettingsBody } from "./policy-routes.js";
import { applicationDraftBody } from "./club-application-routes.js";
import { applicationReviewDecisionBody } from "./club-application-review-routes.js";
import { eventReviewDecisionBody } from "./event-proposal-review-routes.js";
import { budgetFlowBody } from "./budget-disbursement-routes.js";
import { clubDepartmentBody, clubProfileBody } from "./club-profile-routes.js";
import { clubFieldBody } from "./club-field-routes.js";
import { propertyActivationBody, propertyCreateBody, propertyDetailsBody } from "./property-routes.js";
import { evaluationSchemeCreateBody, evaluationSchemeSettingsBody } from "./evaluation-scheme-routes.js";
import { exportBody, exportPreviewBody } from "./export-routes.js";
import { lifecycleReasonBody, suspendBody } from "./club-lifecycle-routes.js";
import { boardNominationBody, boardNominationDecisionBody } from "./board-nomination-routes.js";
import { transitionDecisionBody } from "./leadership-transition-routes.js";
import { eventRegistrationBody } from "./event-registration-routes.js";
import { eventCheckInBody } from "./event-checkin-routes.js";
import { eventFeedbackBody } from "./event-feedback-routes.js";
import { studentFeedbackBody } from "./student-feedback-routes.js";
import { recruitmentCampaignBody } from "./recruitment-campaign-routes.js";
import { createRecruitmentApplicationBody, updateRecruitmentApplicationBody } from "./recruitment-application-routes.js";
import type { ClubMembershipRecord, MembershipWithdrawalRequest } from "../../domain/membership.js";

const ApiError = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  timestamp: z.string(),
  path: z.string(),
});
const Health = z.object({ ok: z.boolean() });
const Me = z.object({
  user: z.object({
    id: z.string(), email: z.string().email(), displayName: z.string(),
    avatarUrl: z.string().optional(), accountState: z.enum(["Active", "Locked"]),
    lockReason: z.string().optional(),
  }),
  csrfToken: z.string(),
  systemRoles: z.array(z.string()),
  workspaces: z.array(z.object({
    kind: z.enum(["student", "icpdp", "club"]),
    clubId: z.string().optional(), clubName: z.string().optional(),
    role: z.enum(["leader", "member", "founder"]).optional(),
    permissions: z.array(z.string()),
  })),
});
const AdminUsers = z.object({
  items: z.array(z.object({
    user: Me.shape.user, systemRoles: z.array(z.string()),
  })),
  total: z.number().int(),
});
const Changed = z.object({ changed: z.literal(true) });
const Dashboard = z.object({
  kind: z.enum(["student", "club", "icpdp"]),
  clubId: z.string().optional(),
  generatedAt: z.string().datetime(),
  panels: z.array(z.discriminatedUnion("status", [
    z.object({ key: z.string(), status: z.literal("ready"), count: z.number().int().nonnegative() }),
    z.object({ key: z.string(), status: z.literal("error") }),
  ])),
});
const Reason = z.object({ reason: z.string().min(1).max(1000) });
const RoleChange = z.object({ roleCode: z.string(), reason: z.string().optional() });
const UserIdPath = z.object({ id: z.string() });
const RolePath = z.object({ id: z.string(), roleCode: z.string() });
const PolicyVersion = policySettingsBody.extend({
  id: z.string(), effectiveFrom: z.string().datetime(),
  createdBy: z.string(), createdAt: z.string().datetime(),
});
const ApplicationDocument = z.object({
  id: z.string(), documentType: z.enum(["PROPOSAL", "LOGO"]), fileName: z.string(),
  mimeType: z.string(), bytes: z.number(), publicUrl: z.string().optional(), uploadedAt: z.string(),
});
const ApplicationDraft = applicationDraftBody.extend({
  field: z.string(), documents: z.array(ApplicationDocument),
});
const FoundingRequirements = z.object({
  policyVersionId: z.string(), minFoundingMembers: z.number(),
  required: policySettingsBody.shape.formRequirements.shape.clubFounding,
});
const Property = propertyCreateBody.extend({ id: z.string(), code: z.string(), isActive: z.boolean() });
const EvaluationScheme = evaluationSchemeSettingsBody.extend({
  id: z.string(), periodCode: z.string(), version: z.number(),
  state: z.enum(["Draft", "Active", "Superseded"]), totalWeight: z.number(),
  activatedAt: z.string().optional(), createdAt: z.string(),
});
const ClubLifecycleSummary = z.object({
  id: z.string(), code: z.string(), name: z.string(), field: z.string(), state: z.string(), activeMembers: z.number(),
  logoUrl: z.string().optional(), contactEmail: z.string().optional(),
  suspension: z.object({ reason: z.string(), suspendedAt: z.string(), suspendedBy: z.string(),
    until: z.string().nullable(), reminderSentAt: z.string().optional() }).optional(),
  dissolution: z.object({ decidedAt: z.string(), decidedBy: z.string(), reason: z.string(),
    effectiveSemester: z.string(), effectiveFrom: z.string(), effectiveTo: z.string() }).optional(),
});
const CascadeResult = z.object({ cancelledEvents: z.number(), cancelledRegistrations: z.number(),
  cancelledBookings: z.number() });
const ClubField = clubFieldBody.extend({ id: z.string(), isActive: z.boolean() });
const ClubFieldUsage = ClubField.extend({ clubCount: z.number(), applicationCount: z.number() });
const FoundingIssue = z.enum(["clubName", "field", "summary", "objectives", "fanpageUrl",
  "contactEmail", "proposal", "logo", "foundersTooFew", "applicantNotFounder", "duplicateFounder",
  "leaderCount", "viceLeaderCount", "fieldUnavailable", "leaderHoldsAnotherClub"]);
const ApplicationRecord = z.object({
  id: z.string(), founderUserId: z.string(), state: z.string(),
  currentVersionNo: z.number(), draftRevision: z.number(), draft: ApplicationDraft,
  submittedAt: z.string().optional(), revisionDeadlineAt: z.string().optional(), createdAt: z.string(),
});
const ApplicantDecisionFeedback = z.object({
  outcome: z.enum(["Approve", "Request revision", "Reject"]), reason: z.string().optional(),
  sections: z.array(z.string()), decidedAt: z.string(),
});
const ApplicationVersion = z.object({
  id: z.string(), applicationId: z.string(), versionNo: z.number(),
  policyVersionId: z.string(), snapshot: ApplicationDraft, submittedAt: z.string(),
});
const ApplicationDocumentPath = z.object({ id: z.string(), documentId: z.string() });
const ApplicationReviewTask = z.object({
  id: z.string(), applicationId: z.string(), title: z.string(),
  state: z.enum(["Open", "Decided", "Closed"]), assigneeId: z.string().optional(),
  openedAt: z.string(), slaDueAt: z.string().optional(),
});
const ApplicationReviewDecision = z.object({
  id: z.string(), taskId: z.string(),
  outcome: z.enum(["Request revision", "Approve", "Reject"]),
  reason: z.string().optional(), sections: z.array(z.string()),
  reviewNote: z.string().optional(), actorId: z.string(), at: z.string(),
  policyVersionId: z.string().optional(),
});
const ApplicationReviewQueueItem = z.object({
  task: ApplicationReviewTask, application: ApplicationRecord,
});
const FounderProfile = z.object({ id: z.string(), displayName: z.string(), email: z.string() });
const ApplicationReviewDetail = ApplicationReviewQueueItem.extend({
  versions: z.array(ApplicationVersion), decisions: z.array(ApplicationReviewDecision),
  founders: z.array(FounderProfile),
});
const EventProposalTask = z.object({
  id: z.string(), eventId: z.string(), title: z.string(), state: z.enum(["Open", "Decided", "Closed"]),
  assigneeId: z.string().optional(), openedAt: z.string(), slaDueAt: z.string().optional(),
});
const EventProposalSummary = z.object({
  id: z.string(), clubId: z.string(), clubName: z.string(), title: z.string(), objective: z.string().optional(),
  startAt: z.string(), endAt: z.string(), semesterCode: z.string(), venueText: z.string().optional(),
  property: z.object({ id: z.string(), code: z.string(), name: z.string() }).optional(),
  audienceScope: z.string(), capacity: z.number(), riskCategory: z.string().optional(), state: z.string(),
  conflictResult: z.string().optional(), conflictDetail: z.unknown().optional(),
  approvalConditions: z.array(z.string()), currentRevisionNo: z.number(),
  revisionDeadlineAt: z.string().optional(), requestedBudgetTotal: z.number(),
});
const EventBudgetSummary = z.object({
  id: z.string(), eventId: z.string(), eventTitle: z.string().optional(), state: z.string(),
  requestedTotal: z.number(), approvedTotal: z.number(), lines: z.array(z.object({
    category: z.string(), requestedAmount: z.number(), approvedAmount: z.number(), reason: z.string().optional(),
  })),
});
const BudgetSummary = z.object({
  id: z.string(), eventId: z.string(), eventTitle: z.string(), eventState: z.string(), eventStartAt: z.string(),
  eventEndAt: z.string(), clubId: z.string(), clubName: z.string(), state: z.string(), periodCode: z.string().optional(),
  requestedTotal: z.number(), approvedTotal: z.number(), disbursedTotal: z.number(), refundedTotal: z.number(),
  settlementDueAt: z.string().optional(), settlementBalance: z.number().optional(),
  recoveryAmount: z.number().optional(), recoveryDueAt: z.string().optional(), createdAt: z.string(),
});
const BudgetDetail = BudgetSummary.extend({
  lines: z.array(z.object({ category: z.string(), requestedAmount: z.number(), approvedAmount: z.number(),
    reason: z.string().optional() })),
  flows: z.array(z.object({ id: z.string(), kind: z.enum(["Advance", "TopUp", "Refund"]), amount: z.number(),
    disbursedAt: z.string(), paymentReference: z.string().optional(), note: z.string().optional(),
    recordedBy: z.string(), recordedByName: z.string().optional() })),
  allowed: z.object({ kind: z.enum(["Advance", "TopUp", "Refund"]), max: z.number(),
    exact: z.number().optional() }).optional(),
});
const EventProposalQueueItem = z.object({ task: EventProposalTask, event: EventProposalSummary });
const EventProposalDetail = EventProposalQueueItem.extend({
  versions: z.array(z.object({
    id: z.string(), revisionNo: z.number(), payload: z.record(z.string(), z.unknown()),
    budgetLines: z.array(z.object({ category: z.string(), amount: z.number(), purpose: z.string(),
      plannedItems: z.string().optional() })),
    requestedBudgetTotal: z.number(), conflictResult: z.string().optional(), submittedBy: z.string(),
    submittedByName: z.string().optional(), submittedAt: z.string(),
  })),
  decisions: z.array(z.object({
    id: z.string(), taskId: z.string(), outcome: z.enum(["Request revision", "Approve", "Reject"]),
    reason: z.string().optional(), sections: z.array(z.string()), conditions: z.array(z.string()),
    reviewNote: z.string().optional(), actorId: z.string(), at: z.string(),
  })),
  club: z.object({ id: z.string(), name: z.string(), state: z.string(),
    obligations: z.array(z.enum(["overdueSettlement", "overdueRefund", "overdueReport"])) }),
  bookings: z.array(z.object({ id: z.string(), propertyCode: z.string().optional(),
    propertyName: z.string().optional(), startAt: z.string(), endAt: z.string(), state: z.string() })),
  semesterBudgets: z.array(EventBudgetSummary), budget: EventBudgetSummary.optional(),
});
const ClubProfile = clubProfileBody.extend({
  id: z.string(), code: z.string(), name: z.string(), field: z.string(), state: z.string(),
  institutionalFields: z.unknown().optional(), updatedAt: z.string().optional(),
});
const ClubDepartment = clubDepartmentBody.extend({
  id: z.string(), clubId: z.string(), isActive: z.boolean(),
  createdAt: z.string(), updatedAt: z.string().optional(),
});
const ClubSettings = z.object({ profile: ClubProfile, departments: z.array(ClubDepartment),
  requiredProfileFields: policySettingsBody.shape.formRequirements.shape.clubProfile });
const RecruitmentCampaign = z.object({
  id: z.string(), clubId: z.string(), title: z.string(), positions: z.array(z.string()),
  criteria: z.string().optional(), windowStart: z.string().datetime(), windowEnd: z.string().datetime(),
  capacity: z.number(), selectionSteps: z.array(z.unknown()), formSchema: z.array(z.unknown()),
  rubric: z.array(z.unknown()), state: z.string(), publishedBy: z.string().optional(),
  publishedAt: z.string().datetime().optional(), createdAt: z.string().datetime(),
});
const CampaignOverlap = z.object({ id: z.string(), title: z.string(), positions: z.array(z.string()),
  windowStart: z.string().datetime(), windowEnd: z.string().datetime(), state: z.string() });
const CampaignWithOverlaps = z.object({ campaign: RecruitmentCampaign,
  overlaps: z.array(CampaignOverlap) });
const RecruitmentAttachment = z.object({ id: z.string(), fieldKey: z.string(), fileName: z.string(),
  mimeType: z.string(), bytes: z.number(), uploadedAt: z.string().datetime() });
const RecruitmentApplication = z.object({
  id: z.string(), campaignId: z.string(), clubId: z.string(), userId: z.string(),
  campaignTitle: z.string().optional(), clubName: z.string().optional(), applicantName: z.string().optional(),
  position: z.string(), answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  attachments: z.array(RecruitmentAttachment), state: z.string(),
  decisionOutcome: z.string().optional(), decisionReason: z.string().optional(),
  submittedAt: z.string().datetime().optional(), withdrawnAt: z.string().datetime().optional(),
});
const Membership = z.object({
  id: z.string(), clubId: z.string(), clubName: z.string().optional(), userId: z.string(),
  displayName: z.string().optional(), state: z.enum(["Active", "Inactive", "Left", "Banned"]),
  joinedAt: z.string().datetime(), leftAt: z.string().datetime().optional(),
  departmentId: z.string().optional(), defaultRole: z.string().optional(),
  sourceApplicationId: z.string().optional(), banReason: z.string().optional(),
  statusHistory: z.array(z.object({ fromState: z.enum(["Active", "Inactive", "Left", "Banned"]), toState: z.enum(["Active", "Inactive", "Left", "Banned"]),
    effectiveDate: z.string().datetime(), reason: z.string().optional(), actorId: z.string(), at: z.string().datetime() })),
  pendingWithdrawal: z.unknown().optional(),
}) satisfies z.ZodType<Omit<ClubMembershipRecord, "joinedAt" | "leftAt" | "statusHistory" | "pendingWithdrawal"> & {
  joinedAt: string; leftAt?: string; statusHistory: Array<Omit<ClubMembershipRecord["statusHistory"][number], "at" | "effectiveDate"> & { at: string; effectiveDate: string }>;
}>;
const MembershipWithdrawal = z.object({
  id: z.string(), membershipId: z.string(), clubId: z.string(), clubName: z.string().optional(),
  userId: z.string(), memberName: z.string().optional(), reason: z.string(),
  requestedEffectiveDate: z.string().datetime(), state: z.enum(["Pending", "Held", "Executed", "Cancelled"]),
  createdAt: z.string().datetime(), executedBy: z.string().optional(), executedAt: z.string().datetime().optional(),
}) satisfies z.ZodType<Omit<MembershipWithdrawalRequest, "requestedEffectiveDate" | "createdAt" | "executedAt"> & {
  requestedEffectiveDate: string; createdAt: string; executedAt?: string;
}>;
const BoardTerm = z.object({ id: z.string(), name: z.string(), startAt: z.string(), endAt: z.string(), state: z.string() });
const BoardPosition = z.object({ id: z.string(), code: z.string(), name: z.string(),
  unit: z.string().optional(), isLeaderRole: z.boolean() });
const BoardCandidate = z.object({ membershipId: z.string(), userId: z.string(),
  displayName: z.string(), state: z.string() });
const BoardSeat = z.object({ id: z.string(), positionId: z.string(), positionCode: z.string(),
  positionName: z.string(), isLeaderRole: z.boolean(), membershipId: z.string(), userId: z.string(),
  displayName: z.string(), state: z.enum(["Pending Confirmation", "Confirmed", "Returned"]),
  reason: z.string().optional() });
const BoardTask = z.object({ id: z.string(), state: z.string(), assigneeId: z.string().optional(),
  openedAt: z.string() });
const BoardDecision = z.object({ id: z.string(), taskId: z.string(),
  outcome: z.enum(["Approve", "Reject"]), reason: z.string().optional(),
  confirmedSeatIds: z.array(z.string()), returnedSeatIds: z.array(z.string()),
  actorId: z.string(), at: z.string() });
const BoardNomination = z.object({ id: z.string(), clubId: z.string(), clubName: z.string(),
  clubState: z.string(), term: BoardTerm, state: z.string(), submittedBy: z.string(),
  submittedAt: z.string(), task: BoardTask, seats: z.array(BoardSeat),
  decisions: z.array(BoardDecision) });
const BoardNominationContext = z.object({ clubId: z.string(), clubName: z.string(),
  clubState: z.string(), term: BoardTerm.nullable(), positions: z.array(BoardPosition),
  candidates: z.array(BoardCandidate), occupiedPositionIds: z.array(z.string()),
  pendingPositionIds: z.array(z.string()), presidentConflictMembershipIds: z.array(z.string()) });
const TransitionObligation = z.object({ id: z.string(), type: z.string(), entityId: z.string().optional(),
  description: z.string(), assigneeMembershipId: z.string() });
const LeadershipTransition = z.object({
  id: z.string(), clubId: z.string(), clubName: z.string(), clubState: z.string(),
  fromTerm: BoardTerm, toTerm: BoardTerm,
  candidates: z.array(z.object({ positionCode: z.string(), positionName: z.string(),
    membershipId: z.string(), userId: z.string(), displayName: z.string() })),
  outstandingObligations: z.array(TransitionObligation),
  handover: z.object({ items: z.array(z.object({ id: z.string(), description: z.string() })),
    proposedBoardRoles: z.array(z.object({ code: z.string(), name: z.string(), unit: z.string().optional(),
      isLeaderRole: z.boolean(), isSingleHolder: z.boolean(), permissionCodes: z.array(z.string()) })).optional() }),
  state: z.string(), submittedBy: z.string(), submittedAt: z.string(),
  followUpConditions: z.array(TransitionObligation), task: BoardTask,
  decisions: z.array(z.object({ id: z.string(), outcome: z.enum(["Approve", "Request revision"]),
    reason: z.string().optional(), followUpObligationIds: z.array(z.string()),
    actorId: z.string(), at: z.string() })),
});
const EventRegistration = z.object({ id: z.string(), eventId: z.string(), studentId: z.string(),
  clubId: z.string(), clubName: z.string(), eventTitle: z.string(), eventStartAt: z.string(), checkInOpensAt: z.string(), checkInClosesAt: z.string(),
  eventEndAt: z.string(), state: z.enum(["Confirmed", "Waitlisted", "Cancelled"]),
  waitlistPosition: z.number().int().optional(),
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  createdAt: z.string(), cancelledAt: z.string().optional() });
const EventRegistrationContext = z.object({ event: z.object({ id: z.string(), clubId: z.string(),
  clubName: z.string(), title: z.string(), state: z.string(), audienceScope: z.string(),
  startAt: z.string(), endAt: z.string(), registrationOpenAt: z.string().optional(),
  registrationCloseAt: z.string().optional(), capacity: z.number().int(),
  confirmedRegistrationCount: z.number().int(), waitlistEnabled: z.boolean() }),
formSchema: z.array(z.object({ key: z.string(), label: z.string(),
  type: z.enum(["text", "textarea", "select", "radio", "checkbox"]), required: z.boolean(),
  options: z.array(z.string()).optional() })), isActiveClubMember: z.boolean(),
registration: EventRegistration.nullable(), registrationOpen: z.boolean() });
const Attendance = z.object({ id: z.string(), eventId: z.string(), eventTitle: z.string(),
  clubId: z.string(), clubName: z.string(), eventStartAt: z.string(), eventEndAt: z.string(),
  checkedInAt: z.string(), method: z.enum(["self", "manual", "walk-in"]), abnormalFlags: z.array(z.string()),
  feedbackOpensAt: z.string(), feedbackClosesAt: z.string().nullable() });
const MyEventFeedback = z.object({ id: z.string(), eventId: z.string(), eventTitle: z.string(),
  clubName: z.string(), rating: z.number().int().min(1).max(5), comment: z.string(), isAnonymous: z.boolean(),
  submittedAt: z.string() });
const EventFeedbackContext = z.object({ attended: z.boolean(), canSubmit: z.boolean(),
  opensAt: z.string().nullable(), closesAt: z.string().nullable(), feedback: MyEventFeedback.nullable() });
const SentFeedback = z.object({ id: z.string(), recipient: z.enum(["CLUB", "ICPDP"]),
  clubId: z.string().optional(), clubName: z.string().optional(), eventId: z.string().optional(),
  eventTitle: z.string().optional(), category: z.enum(["suggestion", "praise", "issue"]), message: z.string(),
  isAnonymous: z.boolean(), submittedAt: z.string() });
const ReceivedFeedback = SentFeedback.extend({
  sender: z.object({ displayName: z.string(), email: z.string() }).optional() });
const MemberSpace = z.object({
  club: z.object({ id: z.string(), name: z.string(), logoUrl: z.string().optional(), state: z.string() }),
  membership: z.object({ id: z.string(), state: z.string(), joinedAt: z.string(), positions: z.array(z.string()),
    pendingWithdrawal: MembershipWithdrawal.optional() }),
  members: z.array(z.object({ displayName: z.string(), state: z.string(), positions: z.array(z.string()) })),
  board: z.array(z.object({ positionName: z.string(), memberName: z.string() })),
  upcomingEvents: z.array(z.object({ id: z.string(), title: z.string(), startAt: z.string(), endAt: z.string(),
    venueText: z.string().optional(), registrationState: z.enum(["Confirmed", "Waitlisted", "Cancelled"]).nullable() })),
  attendance: z.array(z.object({ eventId: z.string(), eventTitle: z.string(), checkedInAt: z.string(),
    eventEndAt: z.string(), feedbackSubmitted: z.boolean() })),
  feedbackToSend: z.array(z.object({ eventId: z.string(), eventTitle: z.string(), closesAt: z.string().nullable() })),
  otherClubs: z.array(z.object({ clubId: z.string(), clubName: z.string(), state: z.string() })),
});
const PublicClub = z.object({
  id: z.string(), code: z.string(), name: z.string(), field: z.string(),
  state: z.enum(["Active", "Suspended"]), description: z.string().optional(),
  contactEmail: z.string().optional(), contactPhone: z.string().optional(),
  operatingScope: z.string().optional(), logoUrl: z.string().url().optional(),
  openCampaignId: z.string().optional(),
});
const PublicCampaign = z.object({
  id: z.string(), title: z.string(), state: z.string(),
  windowStart: z.string(), windowEnd: z.string(), capacity: z.number(),
});
const PublicCampaignDetail = PublicCampaign.extend({
  clubId: z.string(), positions: z.array(z.string()), criteria: z.string().optional(),
  selectionSteps: z.array(z.unknown()), formSchema: z.array(z.unknown()), rubric: z.array(z.unknown()),
  clubSuspended: z.boolean().optional(),
});
const PublicEvent = z.object({
  id: z.string(), clubId: z.string(), clubName: z.string(), title: z.string(),
  startAt: z.string(), endAt: z.string(), venueText: z.string().optional(),
  objective: z.string().optional(), coverImageUrl: z.string().url().optional(),
  capacity: z.number(), state: z.string(), audienceScope: z.string(),
  publishedAt: z.string().optional(), status: z.enum(["ongoing", "upcoming", "ended"]),
});
const PublicPage = z.object({
  items: z.array(PublicClub), total: z.number(), page: z.number(), pageSize: z.number(),
});
const EventPage = z.object({
  items: z.array(PublicEvent), total: z.number(), page: z.number(), pageSize: z.number(),
});
const IdPath = z.object({ id: z.string() });

// Success envelope every 2xx response is wrapped in — see interface/http/response.ts.
function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    statusCode: z.number(),
    message: z.string(),
    data,
    timestamp: z.string(),
  });
}

export const openApiDocument = createDocument({
  openapi: "3.1.0",
  info: { title: "UCMS API", version: "1.0.0" },
  servers: [{ url: "/api/v1" }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: Health } },
          },
          "503": {
            description: "Database unreachable",
            content: { "application/json": { schema: Health } },
          },
        },
      },
    },
    "/public/clubs": {
      get: {
        summary: "Find public clubs (Guest allowed)",
        requestParams: { query: z.object({
          search: z.string().optional(), field: z.string().optional(), page: z.coerce.number().optional(),
        }) },
        responses: {
          "200": { description: "Active and suspended clubs",
            content: { "application/json": { schema: envelope(PublicPage.extend({
              fields: z.array(z.string()),
            })) } } },
          "400": { description: "Invalid query", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/public/clubs/{id}": {
      get: {
        summary: "Public club profile, current board, campaigns and activities",
        requestParams: { path: IdPath },
        responses: {
          "200": { description: "Public club profile",
            content: { "application/json": { schema: envelope(z.object({
              club: PublicClub,
              board: z.array(z.object({
                memberName: z.string(), positionName: z.string(), termName: z.string(),
              })),
              campaigns: z.array(PublicCampaign),
              upcomingEvents: z.array(PublicEvent),
              history: z.array(PublicEvent),
            })) } } },
          "404": { description: "Club not public or not found",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/public/campaigns/{id}": {
      get: { summary: "Read an open recruitment campaign and its public application form",
        requestParams: { path: IdPath },
        responses: {
          "200": { description: "Open recruitment campaign",
            content: { "application/json": { schema: envelope(PublicCampaignDetail) } } },
          "404": { description: "Campaign not open or not found",
            content: { "application/json": { schema: ApiError } } },
        } },
    },
    "/public/events": {
      get: {
        summary: "Published public events, filterable by status and text",
        requestParams: { query: z.object({ page: z.coerce.number().optional(),
          status: z.enum(["all", "ongoing", "upcoming", "ended"]).optional(),
          search: z.string().optional() }) },
        responses: {
          "200": { description: "Public events (8 per page)",
            content: { "application/json": { schema: envelope(EventPage) } } },
          "400": { description: "Invalid query", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/public/events/{id}": {
      get: {
        summary: "Published public event detail (upcoming, ongoing or ended)",
        requestParams: { path: IdPath },
        responses: {
          "200": { description: "Public event",
            content: { "application/json": { schema: envelope(z.object({
              event: PublicEvent, club: z.object({ id: z.string(), name: z.string() }),
            })) } } },
          "404": { description: "Event not public or not found",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/auth/login": {
      get: {
        summary: "Start Google OAuth login",
        responses: {
          "302": { description: "Redirect to Google authorization endpoint" },
        },
      },
    },
    "/auth/callback": {
      get: {
        summary: "Complete Google OAuth login",
        responses: {
          "302": { description: "Redirect to client after login or error" },
        },
      },
    },
    "/auth/error": {
      get: {
        summary: "Read and clear the latest signed login error",
        responses: {
          "200": { description: "Login error reason, when available",
            content: { "application/json": { schema: envelope(z.object({
              reason: z.string().nullable(),
            })) } } },
        },
      },
    },
    "/auth/me": {
      get: {
        summary: "Get current user and CSRF token",
        responses: {
          "200": {
            description: "Current account and contexts",
            content: { "application/json": { schema: envelope(Me) } },
          },
          "401": {
            description: "Session missing or expired",
            content: { "application/json": { schema: ApiError } },
          },
          "423": {
            description: "Account locked",
            content: { "application/json": { schema: ApiError } },
          },
        },
      },
    },
    "/auth/logout": {
      post: {
        summary: "Revoke current session (requires X-CSRF-Token)",
        responses: {
          "200": {
            description: "Logged out",
            content: { "application/json": { schema: envelope(z.object({ loggedOut: z.literal(true) })) } },
          },
          "401": {
            description: "Session missing or expired",
            content: { "application/json": { schema: ApiError } },
          },
          "403": {
            description: "CSRF token missing or invalid",
            content: { "application/json": { schema: ApiError } },
          },
        },
      },
    },
    "/dashboard": {
      get: {
        summary: "Read the current Student, club or ICPDP dashboard",
        requestParams: { query: z.object({
          workspace: z.enum(["student", "icpdp", "club"]),
          clubId: z.string().regex(/^[0-9a-f]{24}$/i).optional(),
        }) },
        responses: {
          "200": { description: "Role-scoped dashboard with independently resolved panels",
            content: { "application/json": { schema: envelope(Dashboard) } } },
          "400": { description: "Invalid dashboard context",
            content: { "application/json": { schema: ApiError } } },
          "401": { description: "Authentication required",
            content: { "application/json": { schema: ApiError } } },
          "403": { description: "Workspace access denied",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/users": {
      get: {
        summary: "Search users (ICPDP only)",
        responses: {
          "200": { description: "Users and current system roles",
            content: { "application/json": { schema: envelope(AdminUsers) } } },
          "403": { description: "Account administration denied",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/club-fields": {
      get: {
        summary: "List the club field catalog with how many clubs and applications use each field",
        responses: {
          "200": { description: "Club field catalog",
            content: { "application/json": { schema: envelope(z.array(ClubFieldUsage)) } } },
          "403": { description: "ICPDP officer role required",
            content: { "application/json": { schema: ApiError } } },
        },
      },
      post: {
        summary: "Add a club field (re-adding a hidden field's name restores it)",
        requestBody: { content: { "application/json": { schema: clubFieldBody } } },
        responses: {
          "201": { description: "Club field created",
            content: { "application/json": { schema: envelope(ClubField) } } },
          "409": { description: "A field with this name already exists",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/clubs": {
      get: {
        summary: "List clubs with their lifecycle state and the suspensions ending soon (UC15)",
        responses: { "200": { description: "Clubs", content: { "application/json": { schema: envelope(z.object({
          clubs: z.array(ClubLifecycleSummary), expiringSuspensions: z.array(ClubLifecycleSummary),
        })) } } } },
      },
    },
    "/admin/clubs/{id}": {
      get: {
        summary: "Club lifecycle detail: obligations, history and the semester a dissolution would take effect",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Club detail", content: { "application/json": { schema: envelope(z.object({
          club: ClubLifecycleSummary.extend({ openCampaigns: z.array(z.unknown()), upcomingEvents: z.array(z.unknown()),
            activeTerm: z.unknown().optional(), history: z.array(z.unknown()) }),
          nextSemester: z.object({ code: z.string(), startAt: z.string(), endAt: z.string() }).nullable(),
        })) } } } },
      },
    },
    "/admin/clubs/{id}/suspend": {
      post: {
        summary: "Suspend an active club until a date or indefinitely; cancels upcoming events and bookings",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: suspendBody } } },
        responses: {
          "200": { description: "What the cascade cancelled", content: { "application/json": { schema: envelope(CascadeResult) } } },
          "409": { description: "The club is not active", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/clubs/{id}/reactivate": {
      post: {
        summary: "Reactivate a suspended club",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: lifecycleReasonBody } } },
        responses: { "200": { description: "Reactivated",
          content: { "application/json": { schema: envelope(z.object({ reactivated: z.literal(true) })) } } } },
      },
    },
    "/admin/clubs/{id}/dissolve": {
      post: {
        summary: "Schedule dissolution from the next semester; cancels what would end after it (BR45)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: lifecycleReasonBody } } },
        responses: { "200": { description: "Dissolution scheduled",
          content: { "application/json": { schema: envelope(CascadeResult.extend({ effectiveSemester: z.string() })) } } } },
      },
    },
    "/admin/exports/options": {
      get: {
        summary: "Export catalogue: data types with their status filters, formats, semesters and clubs (UC55)",
        responses: { "200": { description: "Export options", content: { "application/json": { schema: envelope(z.object({
          types: z.array(z.object({ type: z.string(), title: z.string(), statuses: z.array(z.string()) })),
          formats: z.array(z.string()),
          periods: z.array(z.object({ code: z.string(), startAt: z.string(), endAt: z.string() })),
          clubs: z.array(z.object({ id: z.string(), name: z.string() })),
        })) } } } },
      },
    },
    "/admin/exports/preview": {
      post: {
        summary: "Count the rows an export would contain (requires CSRF token)",
        requestBody: { content: { "application/json": { schema: exportPreviewBody } } },
        responses: { "200": { description: "Row count",
          content: { "application/json": { schema: envelope(z.object({ rowCount: z.number() })) } } } },
      },
    },
    "/admin/exports": {
      post: {
        summary: "Download the data as xlsx, csv or pdf; audited (requires CSRF token)",
        requestBody: { content: { "application/json": { schema: exportBody } } },
        responses: {
          "200": { description: "The file, sent as an attachment" },
          "404": { description: "No data matches the filter; no file is produced",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/evaluation-schemes": {
      get: {
        summary: "List evaluation schemes with the evaluation periods and the D1–D8 catalogue (UC41)",
        responses: { "200": { description: "Schemes", content: { "application/json": { schema: envelope(z.object({
          schemes: z.array(EvaluationScheme),
          periods: z.array(z.object({ code: z.string(), startAt: z.string(), endAt: z.string() })),
          dimensions: z.array(z.object({ code: z.string(), name: z.string(), core: z.boolean(), measures: z.string() })),
        })) } } } },
      },
      post: {
        summary: "Create a draft scheme for a semester from the defaults or a copy (requires CSRF token)",
        requestBody: { content: { "application/json": { schema: evaluationSchemeCreateBody } } },
        responses: {
          "201": { description: "Draft created", content: { "application/json": { schema: envelope(EvaluationScheme) } } },
          "400": { description: "Period not in the academic calendar", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/evaluation-schemes/{id}": {
      patch: {
        summary: "Edit a draft's dimensions, weights and thresholds",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: evaluationSchemeSettingsBody } } },
        responses: {
          "200": { description: "Draft updated", content: { "application/json": { schema: envelope(EvaluationScheme) } } },
          "409": { description: "Only drafts can change", content: { "application/json": { schema: ApiError } } },
        },
      },
      delete: {
        summary: "Delete a draft scheme",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Draft deleted",
          content: { "application/json": { schema: envelope(z.object({ deleted: z.literal(true) })) } } } },
      },
    },
    "/admin/evaluation-schemes/{id}/activate": {
      post: {
        summary: "Activate a draft (weights total 100, D1–D3 above 0); supersedes the period's active scheme",
        requestParams: { path: IdPath },
        responses: {
          "200": { description: "Scheme active", content: { "application/json": { schema: envelope(EvaluationScheme) } } },
          "400": { description: "details.issues lists totalWeight / coreWeight", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/properties": {
      get: {
        summary: "List the facility catalogue (UC44)",
        responses: {
          "200": { description: "Properties", content: { "application/json": { schema: envelope(z.array(Property)) } } },
          "403": { description: "ICPDP officer role required", content: { "application/json": { schema: ApiError } } },
        },
      },
      post: {
        summary: "Add a room, hall or equipment; the code is generated from the type (requires CSRF token)",
        requestBody: { content: { "application/json": { schema: propertyCreateBody } } },
        responses: {
          "201": { description: "Property created", content: { "application/json": { schema: envelope(Property) } } },
          "400": { description: "Invalid property values", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/properties/{id}": {
      patch: {
        summary: "Edit a property's details, bookable hours and blackouts; the type cannot change",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: propertyDetailsBody } } },
        responses: {
          "200": { description: "Property updated", content: { "application/json": { schema: envelope(Property) } } },
          "404": { description: "Property not found", content: { "application/json": { schema: ApiError } } },
        },
      },
      delete: {
        summary: "Delete a property that was never booked (BR41: otherwise deactivate it)",
        requestParams: { path: IdPath },
        responses: {
          "200": { description: "Property deleted",
            content: { "application/json": { schema: envelope(z.object({ deleted: z.literal(true) })) } } },
          "409": { description: "The property has bookings", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/properties/{id}/activation": {
      post: {
        summary: "Deactivate or reactivate a property; existing approved bookings are kept",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: propertyActivationBody } } },
        responses: {
          "200": { description: "Property updated", content: { "application/json": { schema: envelope(Property) } } },
        },
      },
    },
    "/admin/club-fields/{id}": {
      patch: {
        summary: "Rename or reorder a club field; clubs and applications using it follow the new name",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: clubFieldBody } } },
        responses: {
          "200": { description: "Club field updated",
            content: { "application/json": { schema: envelope(ClubField) } } },
          "404": { description: "Club field not found",
            content: { "application/json": { schema: ApiError } } },
          "409": { description: "A field with this name already exists",
            content: { "application/json": { schema: ApiError } } },
        },
      },
      delete: {
        summary: "Delete an unused club field, or hide one that clubs or applications still use",
        requestParams: { path: IdPath },
        responses: {
          "200": { description: "Removal result",
            content: { "application/json": { schema: envelope(z.object({
              result: z.enum(["deleted", "deactivated"]) })) } } },
          "404": { description: "Club field not found",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/policies": {
      get: {
        summary: "List current and recent school policy versions (ICPDP only)",
        responses: {
          "200": { description: "Current policy and recent versions",
            content: { "application/json": { schema: envelope(z.object({
              current: PolicyVersion.nullable(), versions: z.array(PolicyVersion),
            })) } } },
          "401": { description: "Authentication required",
            content: { "application/json": { schema: ApiError } } },
          "403": { description: "ICPDP role required",
            content: { "application/json": { schema: ApiError } } },
        },
      },
      post: {
        summary: "Create a school policy version (ICPDP only; requires CSRF token)",
        requestBody: { content: { "application/json": { schema: policyCreateBody } } },
        responses: {
          "201": { description: "Policy version created",
            content: { "application/json": { schema: envelope(PolicyVersion) } } },
          "400": { description: "Policy values are invalid",
            content: { "application/json": { schema: ApiError } } },
          "409": { description: "Policy would invalidate issued decisions; details lists affected records",
            content: { "application/json": { schema: ApiError } } },
          "401": { description: "Authentication required",
            content: { "application/json": { schema: ApiError } } },
          "403": { description: "ICPDP role or CSRF token required",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/applications/config": {
      get: {
        summary: "Read the founding form requirements, club field catalog and fixed founding positions",
        responses: { "200": { description: "Application configuration",
          content: { "application/json": { schema: envelope(z.object({
            requirements: FoundingRequirements, fields: z.array(ClubField),
            positions: z.array(z.object({ code: z.string(), name: z.string(),
              founderRole: z.enum(["LEADER", "VICE_LEADER", "MEMBER"]) })),
            maxViceLeaders: z.number(),
          })) } } } },
      },
    },
    "/applications/mine": {
      get: {
        summary: "List the signed-in student's club applications",
        responses: { "200": { description: "Applications",
          content: { "application/json": { schema: envelope(z.array(ApplicationRecord)) } } } },
      },
    },
    "/applications/recruitment/mine": {
      get: { summary: "List the signed-in student's recruitment applications",
        responses: { "200": { description: "Recruitment applications", content: {
          "application/json": { schema: envelope(z.array(RecruitmentApplication)) },
        } } } },
    },
    "/applications/recruitment/by-campaign/{campaignId}": {
      get: { summary: "Find the signed-in student's application for a campaign",
        requestParams: { path: z.object({ campaignId: z.string() }) },
        responses: { "200": { description: "Application or null", content: {
          "application/json": { schema: envelope(RecruitmentApplication.nullable()) },
        } } } },
    },
    "/applications/recruitment": {
      post: { summary: "Create one application draft for a campaign",
        requestBody: { content: { "application/json": { schema: createRecruitmentApplicationBody } } },
        responses: { "201": { description: "Application draft", content: {
          "application/json": { schema: envelope(RecruitmentApplication) },
        } } } },
    },
    "/applications/recruitment/{id}": {
      get: { summary: "Read an owned recruitment application",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Recruitment application", content: {
          "application/json": { schema: envelope(RecruitmentApplication) },
        } } } },
    },
    "/applications/recruitment/{id}/draft": {
      patch: { summary: "Update an owned application draft",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: updateRecruitmentApplicationBody } } },
        responses: { "200": { description: "Saved draft", content: {
          "application/json": { schema: envelope(RecruitmentApplication) },
        } } } },
    },
    "/applications/recruitment/{id}/attachments": {
      post: { summary: "Upload a private file answer to an application draft",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/octet-stream": { schema: z.string() } } },
        responses: { "201": { description: "Draft with attachment", content: {
          "application/json": { schema: envelope(RecruitmentApplication) },
        } } } },
    },
    "/applications/recruitment/{id}/attachments/{attachmentId}/access": {
      get: { summary: "Create a short-lived private download URL for an owned attachment",
        requestParams: { path: z.object({ id: z.string(), attachmentId: z.string() }) },
        responses: { "200": { description: "Short-lived access URL", content: {
          "application/json": { schema: envelope(z.object({ url: z.string(), fileName: z.string() })) },
        } } } },
    },
    "/applications/recruitment/{id}/submit": {
      post: { summary: "Validate and submit an application before the campaign closes",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Submitted application", content: {
          "application/json": { schema: envelope(RecruitmentApplication) },
        } } } },
    },
    "/applications/recruitment/{id}/withdraw": {
      post: { summary: "Withdraw an undecided recruitment application",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Withdrawn application", content: {
          "application/json": { schema: envelope(RecruitmentApplication) },
        } } } },
    },
    "/applications": {
      post: {
        summary: "Create a club application draft (requires CSRF token)",
        requestBody: { content: { "application/json": { schema: applicationDraftBody } } },
        responses: { "201": { description: "Draft created",
          content: { "application/json": { schema: envelope(ApplicationRecord) } } } },
      },
    },
    "/applications/founder-lookup": {
      get: {
        summary: "Find an active account by exact email to add it as a founding member",
        requestParams: { query: z.object({ email: z.string() }) },
        responses: { "200": { description: "Matching account", content: {
          "application/json": { schema: envelope(FounderProfile) },
        } }, "404": { description: "No active account uses this email" } },
      },
    },
    "/applications/{id}": {
      get: {
        summary: "Read an owned application, its submitted versions and ICPDP decision feedback",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Application, history and decisions (without internal review notes)",
          content: { "application/json": { schema: envelope(z.object({
            application: ApplicationRecord, versions: z.array(ApplicationVersion),
            decisions: z.array(ApplicantDecisionFeedback), founders: z.array(FounderProfile),
          })) } } } },
      },
    },
    "/applications/{id}/preview": {
      get: {
        summary: "Preview what still blocks submission and any active-name conflict",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Submission preview",
          content: { "application/json": { schema: envelope(z.object({
            requirements: FoundingRequirements, issues: z.array(FoundingIssue),
            activeNameConflict: z.boolean(),
          })) } } } },
      },
    },
    "/applications/{id}/draft": {
      patch: {
        summary: "Save an editable application draft (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: applicationDraftBody.extend({
          draftRevision: z.number().int().nonnegative(),
        }).strict() } } },
        responses: { "200": { description: "Draft saved",
          content: { "application/json": { schema: envelope(ApplicationRecord) } } } },
      },
    },
    "/applications/{id}/submit": {
      post: {
        summary: "Submit a new immutable application version and review task (requires CSRF token)",
        requestParams: { path: IdPath },
        responses: { "201": { description: "Application submitted",
          content: { "application/json": { schema: envelope(z.object({
            version: ApplicationVersion, activeNameConflict: z.boolean(),
          })) } } } },
      },
    },
    "/applications/{id}/withdraw": {
      post: {
        summary: "Withdraw an undecided application (requires CSRF token)",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Application withdrawn",
          content: { "application/json": { schema: envelope(ApplicationRecord) } } } },
      },
    },
    "/applications/{id}/documents": {
      post: {
        summary: "Upload the founding proposal (X-Document-Type: PROPOSAL, PDF/DOCX ≤ 10MB) or the "
          + "proposed logo (LOGO, PNG/JPEG ≤ 2MB); replaces the previous file of that type "
          + "(requires CSRF token)",
        requestParams: { path: IdPath },
        responses: { "201": { description: "Document uploaded",
          content: { "application/json": { schema: envelope(ApplicationDocument) } } } },
      },
    },
    "/applications/{id}/documents/{documentId}": {
      delete: {
        summary: "Remove a document from the editable draft (requires CSRF token)",
        requestParams: { path: ApplicationDocumentPath },
        responses: { "200": { description: "Draft updated",
          content: { "application/json": { schema: envelope(ApplicationRecord) } } } },
      },
    },
    "/applications/{id}/documents/{documentId}/access": {
      get: {
        summary: "Get a short-lived Cloudinary access URL for an owned document",
        requestParams: { path: ApplicationDocumentPath },
        responses: { "200": { description: "Temporary access URL",
          content: { "application/json": { schema: envelope(z.object({
            fileName: z.string(), url: z.string().url(),
          })) } } } },
      },
    },
    "/admin/application-reviews": {
      get: {
        summary: "List open club application review tasks (ICPDP Officer only)",
        responses: {
          "200": { description: "Review queue", content: { "application/json": {
            schema: envelope(z.array(ApplicationReviewQueueItem)),
          } } },
          "403": { description: "ICPDP Officer role required",
            content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/application-reviews/{id}": {
      get: {
        summary: "Read a club application review snapshot and history",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Review detail", content: { "application/json": {
          schema: envelope(ApplicationReviewDetail),
        } } } },
      },
    },
    "/admin/application-reviews/{id}/claim": {
      post: {
        summary: "Claim an open application review and start review (requires CSRF token)",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Claimed review", content: { "application/json": {
          schema: envelope(ApplicationReviewDetail),
        } } } },
      },
    },
    "/admin/application-reviews/{id}/decision": {
      post: {
        summary: "Record the single decision for an application review (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: applicationReviewDecisionBody } } },
        responses: { "200": { description: "Decided review", content: { "application/json": {
          schema: envelope(ApplicationReviewDetail),
        } } } },
      },
    },
    "/admin/application-reviews/{id}/documents/{documentId}/access": {
      get: {
        summary: "Get a short-lived document URL for ICPDP application review",
        requestParams: { path: ApplicationDocumentPath },
        responses: { "200": { description: "Temporary access URL", content: {
          "application/json": { schema: envelope(z.object({
            fileName: z.string(), url: z.string().url(),
          })) },
        } } },
      },
    },
    "/admin/event-proposals": {
      get: {
        summary: "List open event proposal review tasks (UC26, ICPDP Officer only)",
        responses: {
          "200": { description: "Event proposal queue", content: { "application/json": {
            schema: envelope(z.array(EventProposalQueueItem)) } } },
          "403": { description: "ICPDP Officer role required", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/event-proposals/{id}": {
      get: {
        summary: "Event proposal with its revisions, budget lines, club obligations, bookings and semester budgets",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Event proposal detail", content: { "application/json": {
          schema: envelope(EventProposalDetail) } } } },
      },
    },
    "/admin/event-proposals/{id}/claim": {
      post: {
        summary: "Claim an event proposal and move it to Under Review (requires CSRF token)",
        requestParams: { path: IdPath },
        responses: {
          "200": { description: "Claimed proposal", content: { "application/json": { schema: envelope(EventProposalDetail) } } },
          "409": { description: "Already claimed or no longer reviewable", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/event-proposals/{id}/decision": {
      post: {
        summary: "Request revision, approve (with conditions and per-line approved budget) or reject (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: eventReviewDecisionBody } } },
        responses: {
          "200": { description: "Decided proposal", content: { "application/json": { schema: envelope(EventProposalDetail) } } },
          "400": { description: "Missing reason, sections, deadline or approved amounts", content: { "application/json": { schema: ApiError } } },
          "409": { description: "Proposal already decided or not claimed by this officer", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/budgets": {
      get: {
        summary: "List approved event budgets with what has been disbursed (UC35, ICPDP Officer only)",
        responses: {
          "200": { description: "Budgets", content: { "application/json": { schema: envelope(z.array(BudgetSummary)) } } },
          "403": { description: "ICPDP Officer role required", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/budgets/{id}": {
      get: {
        summary: "Budget with its approved lines, recorded money flows and the flow it accepts now",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Budget detail", content: { "application/json": {
          schema: envelope(BudgetDetail) } } } },
      },
    },
    "/admin/budgets/{id}/flows": {
      post: {
        summary: "Record an advance, top-up or club refund (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: budgetFlowBody } } },
        responses: {
          "200": { description: "Updated budget", content: { "application/json": { schema: envelope(BudgetDetail) } } },
          "400": { description: "Amount over the approved total, not the exact top-up, or over what is owed", content: { "application/json": { schema: ApiError } } },
          "409": { description: "The budget does not accept this kind of flow now", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/board-nominations": {
      get: { summary: "List open board nomination tasks (ICPDP Officer only)",
        responses: { "200": { description: "Board nomination queue", content: {
          "application/json": { schema: envelope(z.array(BoardNomination)) },
        } } } },
    },
    "/admin/board-nominations/{id}": {
      get: { summary: "Read board nomination and eligibility details",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Board nomination detail", content: {
          "application/json": { schema: envelope(BoardNomination) },
        } } } },
    },
    "/admin/board-nominations/{id}/claim": {
      post: { summary: "Claim an open board nomination task (requires CSRF token)",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Claimed task", content: {
          "application/json": { schema: envelope(BoardNomination) },
        } } } },
    },
    "/admin/board-nominations/{id}/decision": {
      post: { summary: "Record one full or partial board confirmation decision",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: boardNominationDecisionBody } } },
        responses: { "200": { description: "Decided board nomination", content: {
          "application/json": { schema: envelope(BoardNomination) },
        } } } },
    },
    "/admin/leadership-transitions": {
      get: { summary: "List open leadership transition tasks (ICPDP Officer only)",
        responses: { "200": { description: "Leadership transition queue", content: {
          "application/json": { schema: envelope(z.array(LeadershipTransition)) },
        } } } },
    },
    "/admin/leadership-transitions/{id}": {
      get: { summary: "Read a leadership transition plan and its carried obligations",
        requestParams: { path: IdPath }, responses: { "200": { description: "Transition detail",
          content: { "application/json": { schema: envelope(LeadershipTransition) } } } } },
    },
    "/admin/leadership-transitions/{id}/claim": {
      post: { summary: "Claim an open leadership transition task (requires CSRF token)",
        requestParams: { path: IdPath }, responses: { "200": { description: "Claimed task",
          content: { "application/json": { schema: envelope(LeadershipTransition) } } } } },
    },
    "/admin/leadership-transitions/{id}/decision": {
      post: { summary: "Approve or return a leadership transition (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: transitionDecisionBody } } },
        responses: { "200": { description: "Decided transition", content: {
          "application/json": { schema: envelope(LeadershipTransition) },
        } }, "409": { description: "Transition held while club is suspended or source data changed",
          content: { "application/json": { schema: ApiError } } } } },
    },
    "/events/{id}/registration": {
      get: { summary: "Read the authenticated student's event registration context",
        requestParams: { path: IdPath }, responses: { "200": { description: "Registration context",
          content: { "application/json": { schema: envelope(EventRegistrationContext) } } } } },
    },
    "/events/{id}/registrations": {
      post: { summary: "Register the authenticated student for an event (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: eventRegistrationBody } } },
        responses: { "201": { description: "Confirmed or waitlisted registration", content: {
          "application/json": { schema: envelope(EventRegistration) },
        } }, "409": { description: "Registration closed, duplicate, or capacity reached",
          content: { "application/json": { schema: ApiError } } } } },
    },
    "/events/{id}/check-in": {
      post: { summary: "Check the authenticated student in to an event with its check-in code (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: eventCheckInBody } } },
        responses: { "200": { description: "The single attendance record (existing one when already checked in)",
          content: { "application/json": { schema: envelope(Attendance.extend({ alreadyCheckedIn: z.boolean() })) } } },
        "400": { description: "Invalid check-in code", content: { "application/json": { schema: ApiError } } },
        "403": { description: "No confirmed registration or members-only event", content: { "application/json": { schema: ApiError } } },
        "409": { description: "Event not open for check-in or outside the check-in window",
          content: { "application/json": { schema: ApiError } } } } },
    },
    "/events/{id}/feedback": {
      get: { summary: "Read whether the authenticated student may give feedback, and their own submission",
        requestParams: { path: IdPath }, responses: { "200": { description: "Feedback context", content: {
          "application/json": { schema: envelope(EventFeedbackContext) } } } } },
      post: { summary: "Submit the student's single, immutable event feedback (requires CSRF token)",
        requestParams: { path: IdPath },
        requestBody: { content: { "application/json": { schema: eventFeedbackBody } } },
        responses: { "201": { description: "Submitted feedback (visible with identity only to its author)", content: {
          "application/json": { schema: envelope(MyEventFeedback) } } },
        "400": { description: "Rating outside 1–5 or empty/oversized comment", content: { "application/json": { schema: ApiError } } },
        "403": { description: "Caller did not check in to the event", content: { "application/json": { schema: ApiError } } },
        "409": { description: "Feedback already submitted or window closed", content: { "application/json": { schema: ApiError } } } } },
    },
    "/event-feedbacks/mine": {
      get: { summary: "List the authenticated student's own event feedback",
        responses: { "200": { description: "Own feedback", content: {
          "application/json": { schema: envelope(z.array(MyEventFeedback)) } } } } },
    },
    "/student-feedback": {
      post: { summary: "Send one-way feedback to a club or to ICPDP, optionally anonymous (requires CSRF token)",
        requestBody: { content: { "application/json": { schema: studentFeedbackBody } } },
        responses: { "201": { description: "Sent feedback", content: { "application/json": { schema: envelope(SentFeedback) } } },
          "400": { description: "Missing club, unrelated event or invalid message", content: { "application/json": { schema: ApiError } } },
          "404": { description: "Club not found or dissolved", content: { "application/json": { schema: ApiError } } } } },
    },
    "/student-feedback/mine": {
      get: { summary: "List the feedback the authenticated student has sent",
        responses: { "200": { description: "Sent feedback", content: {
          "application/json": { schema: envelope(z.array(SentFeedback)) } } } } },
    },
    "/clubs/{clubId}/student-feedback": {
      get: { summary: "Read feedback students sent to this club (requires club.feedback.view)",
        requestParams: { path: z.object({ clubId: z.string() }) },
        responses: { "200": { description: "Club feedback inbox; anonymous senders are omitted", content: {
          "application/json": { schema: envelope(z.array(ReceivedFeedback)) } } },
        "403": { description: "Missing club.feedback.view", content: { "application/json": { schema: ApiError } } } } },
    },
    "/admin/student-feedback": {
      get: { summary: "Read feedback students sent to ICPDP (ICPDP officer only)",
        responses: { "200": { description: "ICPDP feedback inbox; anonymous senders are omitted", content: {
          "application/json": { schema: envelope(z.array(ReceivedFeedback)) } } },
        "403": { description: "ICPDP officer role required", content: { "application/json": { schema: ApiError } } } } },
    },
    "/attendances/mine": {
      get: { summary: "List the authenticated student's check-ins with their feedback windows",
        responses: { "200": { description: "Attendance history", content: {
          "application/json": { schema: envelope(z.array(Attendance)) } } } } },
    },
    "/event-registrations/mine": {
      get: { summary: "List the authenticated student's event registrations",
        responses: { "200": { description: "Owned event registrations", content: {
          "application/json": { schema: envelope(z.array(EventRegistration)) },
        } } } },
    },
    "/event-registrations/{id}/cancel": {
      post: { summary: "Cancel an owned event registration before event start (requires CSRF token)",
        requestParams: { path: IdPath }, responses: { "200": { description: "Cancelled registration",
          content: { "application/json": { schema: envelope(EventRegistration) } } } } },
    },
    "/clubs/{clubId}/board-nomination-context": {
      get: { summary: "Read current board seats and active club members for nomination",
        requestParams: { path: z.object({ clubId: z.string() }) },
        responses: { "200": { description: "Nomination context", content: {
          "application/json": { schema: envelope(BoardNominationContext) },
        } } } },
    },
    "/clubs/{clubId}/board-nominations": {
      post: { summary: "Submit one board nomination and create one ICPDP task",
        requestParams: { path: z.object({ clubId: z.string() }) },
        requestBody: { content: { "application/json": { schema: boardNominationBody } } },
        responses: { "201": { description: "Submitted nomination", content: {
          "application/json": { schema: envelope(BoardNomination) },
      } } } },
    },
    "/clubs/{clubId}/member-space": {
      get: { summary: "Read-only member space of a club for its Active or Inactive members (UC24)",
        requestParams: { path: z.object({ clubId: z.string() }) },
        responses: { "200": { description: "Membership, roster, board, events, attendance and owed feedback",
          content: { "application/json": { schema: envelope(MemberSpace) } } },
        "403": { description: "Not a current member (Left, Banned or never joined)",
          content: { "application/json": { schema: ApiError } } } } },
    },
    "/memberships/mine": {
      get: { summary: "List the authenticated student's current club memberships",
        responses: { "200": { description: "Memberships", content: {
          "application/json": { schema: envelope(z.array(Membership)) },
        } } } },
    },
    "/memberships/withdrawal-requests/mine": {
      get: { summary: "List the authenticated student's withdrawal requests",
        responses: { "200": { description: "Withdrawal requests", content: {
          "application/json": { schema: envelope(z.array(MembershipWithdrawal)) },
        } } } },
    },
    "/memberships/{membershipId}/withdrawal-requests": {
      post: { summary: "Request to leave a club without changing membership state immediately",
        requestParams: { path: z.object({ membershipId: z.string() }) },
        requestBody: { content: { "application/json": { schema: z.object({
          reason: z.string().min(1).max(2000), requestedEffectiveDate: z.string().datetime(),
        }) } } },
        responses: { "201": { description: "Withdrawal request", content: {
          "application/json": { schema: envelope(MembershipWithdrawal) },
        } } } },
    },
    "/clubs/{clubId}/memberships": {
      get: { summary: "List current members for a club manager",
        requestParams: { path: z.object({ clubId: z.string() }) },
        responses: { "200": { description: "Membership roster", content: {
          "application/json": { schema: envelope(z.array(Membership)) },
        } } } },
    },
    "/clubs/{clubId}/memberships/{membershipId}/state": {
      patch: { summary: "Activate, deactivate or ban a membership",
        requestParams: { path: z.object({ clubId: z.string(), membershipId: z.string() }) },
        requestBody: { content: { "application/json": { schema: z.object({
          state: z.enum(["Active", "Inactive", "Banned"]), effectiveDate: z.string().datetime(),
          reason: z.string().max(2000).optional(),
        }) } } },
        responses: { "200": { description: "Updated membership", content: {
          "application/json": { schema: envelope(Membership) },
        } } } },
    },
    "/clubs/{clubId}/membership-withdrawals": {
      get: { summary: "List club membership withdrawal requests",
        requestParams: { path: z.object({ clubId: z.string() }) },
        responses: { "200": { description: "Withdrawal requests", content: {
          "application/json": { schema: envelope(z.array(MembershipWithdrawal)) },
        } } } },
    },
    "/clubs/{clubId}/membership-withdrawals/{requestId}/execute": {
      post: { summary: "Execute a withdrawal after board-seat and effective-date checks",
        requestParams: { path: z.object({ clubId: z.string(), requestId: z.string() }) },
        responses: { "200": { description: "Membership marked as Left", content: {
          "application/json": { schema: envelope(Membership) },
        } } } },
    },
    "/clubs/{clubId}/recruitment/campaigns": {
      get: { summary: "List recruitment campaigns for a club with recruitment-management permission",
        requestParams: { path: z.object({ clubId: z.string() }) },
        responses: { "200": { description: "Recruitment campaigns", content: {
          "application/json": { schema: envelope(z.array(RecruitmentCampaign)) },
        } } } },
      post: { summary: "Create a recruitment campaign draft",
        requestParams: { path: z.object({ clubId: z.string() }) },
        requestBody: { content: { "application/json": { schema: recruitmentCampaignBody } } },
        responses: { "201": { description: "Draft and overlap warning", content: {
          "application/json": { schema: envelope(CampaignWithOverlaps) },
        } } } },
    },
    "/clubs/{clubId}/recruitment/campaigns/{campaignId}": {
      get: { summary: "Read a recruitment campaign",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string() }) },
        responses: { "200": { description: "Recruitment campaign", content: {
          "application/json": { schema: envelope(RecruitmentCampaign) },
        } } } },
      patch: { summary: "Update a draft recruitment campaign",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string() }) },
        requestBody: { content: { "application/json": { schema: recruitmentCampaignBody } } },
        responses: { "200": { description: "Draft and overlap warning", content: {
          "application/json": { schema: envelope(CampaignWithOverlaps) },
        } } } },
    },
    "/clubs/{clubId}/recruitment/campaigns/{campaignId}/publish": {
      post: { summary: "Publish a draft after academic-calendar and overlap validation",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string() }) },
        requestBody: { content: { "application/json": { schema: z.object({ confirmOverlap: z.boolean() }) } } },
        responses: {
          "200": { description: "Published campaign", content: {
            "application/json": { schema: envelope(CampaignWithOverlaps) },
          } },
          "409": { description: "Overlapping campaign requires explicit confirmation",
            content: { "application/json": { schema: ApiError } } },
        } },
    },
    "/clubs/{clubId}/recruitment/campaigns/{campaignId}/cancel": {
      post: { summary: "Cancel a campaign and notify its applicants",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string() }) },
        responses: { "200": { description: "Cancelled campaign", content: {
          "application/json": { schema: envelope(RecruitmentCampaign) },
      } } } },
    },
    "/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications": {
      get: { summary: "List recruitment applications for an authorized club reviewer",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string() }),
          query: z.object({ state: z.string().optional() }) },
        responses: { "200": { description: "Applications for review", content: {
          "application/json": { schema: envelope(z.array(RecruitmentApplication)) },
        } } } },
    },
    "/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/review": {
      post: { summary: "Screen applications or record campaign decisions",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string() }) },
        requestBody: { content: { "application/json": { schema: z.object({
          action: z.enum(["screen", "shortlist", "decide", "promote", "close-withdrawn"]),
          applicationIds: z.array(z.string()),
          outcome: z.enum(["Shortlisted", "Accepted", "Rejected", "Waitlisted"]).optional(),
          reason: z.string().optional(),
        }) } } },
        responses: { "200": { description: "Updated applications", content: {
          "application/json": { schema: envelope(z.array(RecruitmentApplication)) },
      } } } },
    },
    "/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/{applicationId}/onboard": {
      post: { summary: "Create an Active membership for an accepted recruitment candidate",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string(), applicationId: z.string() }) },
        requestBody: { content: { "application/json": { schema: z.object({
          joinedAt: z.string().datetime().optional(), departmentId: z.string().optional(),
        }) } } },
        responses: { "200": { description: "Onboarded application", content: {
          "application/json": { schema: envelope(RecruitmentApplication) },
        } } } },
    },
    "/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/{applicationId}/attachments/{attachmentId}/access": {
      get: { summary: "Create a short-lived private download URL for a reviewer (club.application.review)",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string(),
          applicationId: z.string(), attachmentId: z.string() }) },
        responses: { "200": { description: "Short-lived access URL", content: {
          "application/json": { schema: envelope(z.object({ url: z.string(), fileName: z.string() })) },
        } } } },
    },
    "/clubs/{clubId}/recruitment/campaigns/{campaignId}/applications/{applicationId}/decline": {
      post: { summary: "Record a candidate declining an accepted offer",
        requestParams: { path: z.object({ clubId: z.string(), campaignId: z.string(), applicationId: z.string() }) },
        requestBody: { content: { "application/json": { schema: z.object({ reason: z.string().optional() }) } } },
        responses: { "200": { description: "Declined application", content: {
          "application/json": { schema: envelope(RecruitmentApplication) },
        } } } },
    },
    "/clubs/{clubId}/settings": {
      get: {
        summary: "Read editable club profile and internal departments",
        requestParams: { path: z.object({ clubId: z.string() }) },
        responses: { "200": { description: "Club settings", content: {
          "application/json": { schema: envelope(ClubSettings) },
        } } },
      },
    },
    "/clubs/{clubId}/profile": {
      patch: {
        summary: "Update club-owned profile fields (requires club.profile.manage and CSRF)",
        requestParams: { path: z.object({ clubId: z.string() }) },
        requestBody: { content: { "application/json": { schema: clubProfileBody } } },
        responses: { "200": { description: "Updated club profile", content: {
          "application/json": { schema: envelope(ClubProfile) },
        } } },
      },
    },
    "/clubs/{clubId}/departments/template": {
      post: {
        summary: "Apply the default department template to an empty club structure",
        requestParams: { path: z.object({ clubId: z.string() }) },
        responses: { "200": { description: "Current departments", content: {
          "application/json": { schema: envelope(z.array(ClubDepartment)) },
        } } },
      },
    },
    "/clubs/{clubId}/departments": {
      post: {
        summary: "Create an internal club department",
        requestParams: { path: z.object({ clubId: z.string() }) },
        requestBody: { content: { "application/json": { schema: clubDepartmentBody } } },
        responses: { "201": { description: "Department created", content: {
          "application/json": { schema: envelope(ClubDepartment) },
        } } },
      },
    },
    "/clubs/{clubId}/departments/{departmentId}": {
      patch: {
        summary: "Update an internal club department",
        requestParams: { path: z.object({ clubId: z.string(), departmentId: z.string() }) },
        requestBody: { content: { "application/json": { schema: clubDepartmentBody } } },
        responses: { "200": { description: "Department updated", content: {
          "application/json": { schema: envelope(ClubDepartment) },
        } } },
      },
      delete: {
        summary: "Deactivate an unused internal club department",
        requestParams: { path: z.object({ clubId: z.string(), departmentId: z.string() }) },
        responses: { "200": { description: "Department deactivated", content: {
          "application/json": { schema: envelope(ClubDepartment) },
        } } },
      },
    },
    "/admin/users/{id}/roles": {
      post: {
        summary: "Grant a system role (ICPDP only)",
        requestParams: { path: UserIdPath },
        requestBody: { content: { "application/json": { schema: RoleChange } } },
        responses: {
          "200": { description: "Role granted",
            content: { "application/json": { schema: envelope(Changed) } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/users/{id}/roles/{roleCode}": {
      delete: {
        summary: "Revoke a system role with reason (ICPDP only)",
        requestParams: { path: RolePath },
        requestBody: { content: { "application/json": { schema: Reason } } },
        responses: {
          "200": { description: "Role revoked",
            content: { "application/json": { schema: envelope(Changed) } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/users/{id}/lock": {
      post: {
        summary: "Lock account with reason (ICPDP only)",
        requestParams: { path: UserIdPath },
        requestBody: { content: { "application/json": { schema: Reason } } },
        responses: {
          "200": { description: "Account locked",
            content: { "application/json": { schema: envelope(Changed) } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/admin/users/{id}/unlock": {
      post: {
        summary: "Unlock account with reason (ICPDP only)",
        requestParams: { path: UserIdPath },
        requestBody: { content: { "application/json": { schema: Reason } } },
        responses: {
          "200": { description: "Account unlocked",
            content: { "application/json": { schema: envelope(Changed) } } },
          "403": { description: "Forbidden", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
  },
});
