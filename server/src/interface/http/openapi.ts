import { z } from "zod";
import { createDocument } from "zod-openapi";
import { policyCreateBody, policySettingsBody } from "./policy-routes.js";
import { applicationDraftBody } from "./club-application-routes.js";
import { applicationReviewDecisionBody } from "./club-application-review-routes.js";
import { clubDepartmentBody, clubProfileBody } from "./club-profile-routes.js";

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
  submittedAt: z.string().optional(), createdAt: z.string(),
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
});
const ApplicationReviewQueueItem = z.object({
  task: ApplicationReviewTask, application: ApplicationRecord,
});
const ApplicationReviewDetail = ApplicationReviewQueueItem.extend({
  versions: z.array(ApplicationVersion), decisions: z.array(ApplicationReviewDecision),
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
const PublicClub = z.object({
  id: z.string(), code: z.string(), name: z.string(), field: z.string(),
  state: z.enum(["Active", "Suspended"]), description: z.string().optional(),
  contactEmail: z.string().optional(), contactPhone: z.string().optional(),
  operatingScope: z.string().optional(),
});
const PublicCampaign = z.object({
  id: z.string(), title: z.string(), state: z.string(),
  windowStart: z.string(), windowEnd: z.string(), capacity: z.number(),
});
const PublicEvent = z.object({
  id: z.string(), clubId: z.string(), clubName: z.string(), title: z.string(),
  startAt: z.string(), endAt: z.string(), venueText: z.string().optional(),
  capacity: z.number(), state: z.string(), audienceScope: z.string(),
  publishedAt: z.string().optional(),
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
    "/public/events": {
      get: {
        summary: "Upcoming published public events",
        requestParams: { query: z.object({ page: z.coerce.number().optional() }) },
        responses: {
          "200": { description: "Upcoming events",
            content: { "application/json": { schema: envelope(EventPage) } } },
          "400": { description: "Invalid query", content: { "application/json": { schema: ApiError } } },
        },
      },
    },
    "/public/events/{id}": {
      get: {
        summary: "Upcoming published public event detail",
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
    "/applications": {
      post: {
        summary: "Create a club application draft (requires CSRF token)",
        requestBody: { content: { "application/json": { schema: applicationDraftBody } } },
        responses: { "201": { description: "Draft created",
          content: { "application/json": { schema: envelope(ApplicationRecord) } } } },
      },
    },
    "/applications/{id}": {
      get: {
        summary: "Read an owned application and its submitted versions",
        requestParams: { path: IdPath },
        responses: { "200": { description: "Application and history",
          content: { "application/json": { schema: envelope(z.object({
            application: ApplicationRecord, versions: z.array(ApplicationVersion),
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
