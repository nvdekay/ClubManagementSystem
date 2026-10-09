import { z } from "zod";
import { createDocument } from "zod-openapi";
import { policyCreateBody, policySettingsBody } from "./policy-routes.js";
import { applicationDraftBody } from "./club-application-routes.js";
import { applicationReviewDecisionBody } from "./club-application-review-routes.js";
import { clubDepartmentBody, clubProfileBody } from "./club-profile-routes.js";
import { boardNominationBody, boardNominationDecisionBody } from "./board-nomination-routes.js";
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
  id: z.string(), documentType: z.string(), fileName: z.string(),
  mimeType: z.string(), bytes: z.number(), uploadedAt: z.string(),
});
const ApplicationDraft = applicationDraftBody.extend({ documents: z.array(ApplicationDocument) });
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
const ClubProfile = clubProfileBody.extend({
  id: z.string(), code: z.string(), name: z.string(), field: z.string(), state: z.string(),
  institutionalFields: z.unknown().optional(), updatedAt: z.string().optional(),
});
const ClubDepartment = clubDepartmentBody.extend({
  id: z.string(), clubId: z.string(), isActive: z.boolean(),
  createdAt: z.string(), updatedAt: z.string().optional(),
});
const ClubSettings = z.object({ profile: ClubProfile, departments: z.array(ClubDepartment) });
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
const PublicClub = z.object({
  id: z.string(), code: z.string(), name: z.string(), field: z.string(),
  state: z.enum(["Active", "Suspended"]), description: z.string().optional(),
  contactEmail: z.string().optional(), contactPhone: z.string().optional(),
  operatingScope: z.string().optional(), logoUrl: z.string().url().optional(),
});
const PublicCampaign = z.object({
  id: z.string(), title: z.string(), state: z.string(),
  windowStart: z.string(), windowEnd: z.string(), capacity: z.number(),
});
const PublicCampaignDetail = PublicCampaign.extend({
  clubId: z.string(), positions: z.array(z.string()), criteria: z.string().optional(),
  selectionSteps: z.array(z.unknown()), formSchema: z.array(z.unknown()), rubric: z.array(z.unknown()),
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
        summary: "Read the current founding policy and grantable club permissions",
        responses: { "200": { description: "Application configuration",
          content: { "application/json": { schema: envelope(z.object({
            requirements: z.object({ policyVersionId: z.string(),
              minFoundingMembers: z.number(), mandatoryApplicationDocuments: z.array(z.string()) }),
            grantablePermissions: z.array(z.string()),
            defaultRoles: z.array(applicationDraftBody.shape.proposedRoles.element),
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
        summary: "Preview the current founding requirements and active-name conflict",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Submission preview",
          content: { "application/json": { schema: envelope(z.object({
            requirements: z.object({ policyVersionId: z.string(),
              minFoundingMembers: z.number(), mandatoryApplicationDocuments: z.array(z.string()) }),
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
        summary: "Upload a PDF, PNG, JPEG or DOCX to an editable application (requires CSRF token)",
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
