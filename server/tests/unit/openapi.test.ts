import { describe, expect, it, vi } from "vitest";
import type { AuthRouteDeps } from "../../src/interface/http/auth-routes.js";
import type { PublicDiscoveryRepository } from "../../src/domain/public-discovery.js";
import type { ClubApplicationRepository } from "../../src/domain/club-application.js";
import type { ClubApplicationReviewRepository } from "../../src/domain/club-application-review.js";
import type { ClubFieldRepository } from "../../src/domain/club-field.js";
import type { PropertyRepository } from "../../src/domain/property.js";
import type { EvaluationSchemeRepository } from "../../src/domain/evaluation-scheme.js";
import type { ExportFileWriter, ExportRepository } from "../../src/domain/data-export.js";
import type { ClubLifecycleRepository } from "../../src/domain/club-lifecycle.js";
import type { EventProposalReviewRepository } from "../../src/domain/event-proposal-review.js";
import type { ClubProfileRepository } from "../../src/domain/club-profile.js";
import type { BoardNominationRepository } from "../../src/domain/board-nomination.js";
import type { RecruitmentCampaignRepository } from "../../src/domain/recruitment-campaign.js";
import type { RecruitmentApplicationRepository } from "../../src/domain/recruitment-application.js";
import type { MembershipRepository } from "../../src/domain/membership.js";
import type { DashboardRepository } from "../../src/domain/dashboard.js";
import type { LeadershipTransitionRepository } from "../../src/domain/leadership-transition.js";
import type { EventRegistrationRepository } from "../../src/domain/event-registration.js";
import type { EventCheckInRepository } from "../../src/domain/event-checkin.js";
import type { EventFeedbackRepository } from "../../src/domain/event-feedback.js";
import type { StudentFeedbackRepository } from "../../src/domain/student-feedback.js";
import type { MemberSpaceRepository } from "../../src/domain/member-space.js";
import { openApiDocument } from "../../src/interface/http/openapi.js";
import { buildApp } from "../../src/interface/http/server.js";

const stubAuth: AuthRouteDeps = {
  accessRepo: { findSnapshot: async () => null },
  repo: {
    allowedDomains: async () => [],
    findOrCreateGoogleUser: async () => { throw new Error("unused"); },
    findUserById: async () => null,
    systemRoleCodes: async () => [],
    clubIds: async () => [],
    auditLogin: async () => undefined,
  },
  sessions: {
    issue: async () => { throw new Error("unused"); },
    resolve: async () => null,
    revoke: async () => undefined,
    revokeUser: async () => undefined,
  },
  google: {
    begin: async () => { throw new Error("unused"); },
    complete: async () => { throw new Error("unused"); },
  },
  oauthFlow: { seal: () => "", unseal: () => null, sealError: () => "", unsealError: () => null },
  clientBaseUrl: "http://localhost:5173",
  secureCookies: false,
};

const stubAdmin = {
  listUsers: async () => ({ items: [], total: 0 }),
  findUser: async () => null,
  systemRoles: async () => [],
  applyRoleChange: async () => undefined,
  setLock: async () => undefined,
};
const stubPublic: PublicDiscoveryRepository = {
  listClubs: async () => ({ items: [], total: 0, page: 1, pageSize: 12 }),
  fields: async () => [],
  getClub: async () => null,
  board: async () => [],
  campaigns: async () => [],
  getCampaign: async () => null,
  clubUpcomingEvents: async () => [],
  clubHistory: async () => [],
  listEvents: async () => ({ items: [], total: 0, page: 1, pageSize: 8 }),
  getEvent: async () => null,
};
const stubPolicy = {
  findEffective: async () => null,
  listRecent: async () => [],
  findDecisionImpacts: async () => [],
  append: async () => { throw new Error("unused"); },
};
const stubApplications: ClubApplicationRepository = {
  createDraft: async () => { throw new Error("unused"); },
  listMine: async () => [],
  findOwned: async () => null,
  versions: async () => [], decisionFeedback: async () => [],
  findActiveUserByEmail: async () => null, founderProfiles: async () => [],
  saveDraft: async () => { throw new Error("unused"); },
  addDocument: async () => { throw new Error("unused"); },
  removeDocument: async () => { throw new Error("unused"); },
  usersExist: async () => false,
  activeClubNameExists: async () => false,
  activeLeaderUserIds: async () => [],
  submit: async () => { throw new Error("unused"); },
  withdraw: async () => { throw new Error("unused"); },
};
const stubClubFields: ClubFieldRepository = {
  listActive: async () => [], listWithUsage: async () => [], find: async () => null,
  create: async () => { throw new Error("unused"); },
  update: async () => { throw new Error("unused"); },
  remove: async () => { throw new Error("unused"); },
};
const stubProperties: PropertyRepository = {
  list: async () => [], find: async () => null, hasBookings: async () => false,
  create: async () => { throw new Error("unused"); }, update: async () => { throw new Error("unused"); },
  setActive: async () => { throw new Error("unused"); }, remove: async () => { throw new Error("unused"); },
};
const stubSchemes: EvaluationSchemeRepository = {
  list: async () => [], find: async () => null,
  createDraft: async () => { throw new Error("unused"); }, updateDraft: async () => { throw new Error("unused"); },
  activate: async () => { throw new Error("unused"); }, deleteDraft: async () => { throw new Error("unused"); },
};
const stubExports: ExportRepository = {
  table: async () => ({ columns: [], rows: [] }), clubs: async () => [], audit: async () => undefined,
};
async function unusedLifecycle(): Promise<never> { throw new Error("unused"); }
const stubLifecycle: ClubLifecycleRepository = {
  list: async () => [], detail: async () => null, suspend: unusedLifecycle, reactivate: unusedLifecycle,
  decideDissolution: unusedLifecycle, suspensionsDueForReminder: async () => [], markReminded: unusedLifecycle,
  expiredSuspensions: async () => [], startDissolving: async () => [], completeDissolutions: async () => [],
  officerIds: async () => [],
};
const stubWriter: ExportFileWriter = { write: async () => { throw new Error("unused"); } };
const stubApplicationReviews: ClubApplicationReviewRepository = {
  listOpen: async () => [], find: async () => null,
  findDocument: async () => null,
  claim: async () => { throw new Error("unused"); },
  decide: async () => { throw new Error("unused"); },
};
const stubEventProposalReviews: EventProposalReviewRepository = {
  listOpen: async () => [], find: async () => null,
  claim: async () => { throw new Error("unused"); },
  decide: async () => { throw new Error("unused"); },
  advanceLifecycle: async () => ({ expired: 0, started: 0, completed: 0 }),
};
const stubClubProfiles: ClubProfileRepository = {
  findProfile: async () => null, listDepartments: async () => [],
  updateProfile: async () => { throw new Error("unused"); },
  applyDepartmentTemplate: async () => [],
  createDepartment: async () => { throw new Error("unused"); },
  updateDepartment: async () => { throw new Error("unused"); },
  deactivateDepartment: async () => { throw new Error("unused"); },
};
const stubBoardNominations: BoardNominationRepository = {
  getContext: async () => null, submit: async () => { throw new Error("unused"); },
  listOpen: async () => [], find: async () => null,
  claim: async () => { throw new Error("unused"); }, decide: async () => { throw new Error("unused"); },
};
const stubRecruitmentCampaigns: RecruitmentCampaignRepository = {
  list: async () => [], find: async () => null, overlaps: async () => [],
  createDraft: async () => { throw new Error("unused"); },
  updateDraft: async () => { throw new Error("unused"); },
  publish: async () => { throw new Error("unused"); },
  cancel: async () => { throw new Error("unused"); },
};
const stubRecruitmentApplications: RecruitmentApplicationRepository = {
  campaign: async () => null,
  eligibility: async () => ({ userActive: false, activeMembership: false, bannedMembership: false }),
  createDraft: async () => { throw new Error("unused"); },
  findOwned: async () => null, findMineForCampaign: async () => null, listMine: async () => [],
  updateDraft: async () => { throw new Error("unused"); },
  addAttachment: async () => { throw new Error("unused"); }, attachmentAccess: async () => null,
  submit: async () => { throw new Error("unused"); }, withdraw: async () => { throw new Error("unused"); },
  listForReview: async () => [], transition: async () => { throw new Error("unused"); },
  onboard: async () => { throw new Error("unused"); }, declineAccepted: async () => { throw new Error("unused"); },
  reviewAttachment: async () => null,
};
const stubMemberships: MembershipRepository = {
  listMine: async () => [], listClub: async () => [],
  changeState: async () => { throw new Error("unused"); },
  requestWithdrawal: async () => { throw new Error("unused"); },
  listMyWithdrawalRequests: async () => [], listClubWithdrawalRequests: async () => [],
  executeWithdrawal: async () => { throw new Error("unused"); },
};
const stubDashboard: DashboardRepository = {
  student: async (_userId, now) => ({ kind: "student", generatedAt: now, panels: [] }),
  club: async (clubId, _permissions, now) => ({ kind: "club", clubId, generatedAt: now, panels: [] }),
  icpdp: async (now) => ({ kind: "icpdp", generatedAt: now, panels: [] }),
};
const stubLeadershipTransitions: LeadershipTransitionRepository = {
  listOpen: async () => [], find: async () => null,
  claim: async () => { throw new Error("unused"); },
  decide: async () => { throw new Error("unused"); },
};
const stubMemberSpace: MemberSpaceRepository = { find: async () => null };
const stubStudentFeedback: StudentFeedbackRepository = {
  club: async () => null, eventBelongsToClub: async () => false, listMine: async () => [], inbox: async () => [],
  submit: async () => { throw new Error("unused"); },
};
const stubEventFeedback: EventFeedbackRepository = {
  target: async () => null, listMine: async () => [],
  submit: async () => { throw new Error("unused"); },
};
const stubEventCheckIns: EventCheckInRepository = {
  target: async () => null, listMine: async () => [],
  checkIn: async () => { throw new Error("unused"); },
};
const stubEventRegistrations: EventRegistrationRepository = {
  context: async () => null, listMine: async () => [], findOwned: async () => null,
  register: async () => { throw new Error("unused"); },
  cancel: async () => { throw new Error("unused"); },
};

// Minimal view of Express 5's router internals — enough to enumerate mounted routes.
interface Layer {
  name: string;
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: { name: string } }> };
  matchers?: Array<(path: string) => false | { path: string }>;
  handle?: { stack?: Layer[] };
}

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];
const PUBLIC_ROUTES = new Set<string>();

describe("openapi document", () => {
  // Walks the real app's router, so adding a route without documenting it (or documenting
  // a route that doesn't exist) fails here. Field-level drift is caught at compile time:
  // openapi.ts's User schema `satisfies` the domain entity's wire shape.
  it("matches the routes the app actually serves", () => {
    const app = buildApp({ auth: stubAuth, adminRepo: stubAdmin, policyRepo: stubPolicy,
      applicationRepo: stubApplications, clubFieldRepo: stubClubFields, propertyRepo: stubProperties,
      evaluationSchemeRepo: stubSchemes, exportRepo: stubExports, exportWriter: stubWriter, clubLifecycleRepo: stubLifecycle,
      applicationReviewRepo: stubApplicationReviews, eventProposalReviewRepo: stubEventProposalReviews,
      clubProfileRepo: stubClubProfiles,
      boardNominationRepo: stubBoardNominations,
      recruitmentCampaignRepo: stubRecruitmentCampaigns,
      recruitmentApplicationRepo: stubRecruitmentApplications,
      membershipRepo: stubMemberships,
      dashboardRepo: stubDashboard,
      leadershipTransitionRepo: stubLeadershipTransitions,
      eventRegistrationRepo: stubEventRegistrations,
      eventCheckInRepo: stubEventCheckIns,
      eventFeedbackRepo: stubEventFeedback,
      studentFeedbackRepo: stubStudentFeedback,
      memberSpaceRepo: stubMemberSpace,
      publicRepo: stubPublic, dbReady: () => true });
    const base = openApiDocument.servers?.[0]?.url ?? "";
    expect(base).toBe("/api/v1");

    const served = new Set<string>();
    const stack = (app as unknown as { router: { stack: Layer[] } }).router.stack;
    for (const layer of stack) {
      if (layer.route) {
        if (layer.route.path.startsWith(`${base}/`)) {
          for (const method of Object.keys(layer.route.methods)) {
            served.add(`${method} ${layer.route.path.slice(base.length)}`);
          }
        }
      } else if (layer.name === "router") {
        // ponytail: handles one level of Router mounting — the app's actual shape
        const match = layer.matchers?.[0]?.(`${base}/probe`);
        if (match && match.path === base) {
          for (const sub of layer.handle?.stack ?? []) {
            if (!sub.route) continue;
            for (const method of Object.keys(sub.route.methods)) {
                served.add(`${method} ${sub.route.path.replace(/:(\w+)/g, "{$1}")}`);
            }
          }
        }
      }
    }

    const documented = new Set<string>();
    for (const [path, item] of Object.entries(openApiDocument.paths ?? {})) {
      for (const method of HTTP_METHODS) {
        if (item && method in item) documented.add(`${method} ${path}`);
      }
    }

    expect([...served].sort()).toEqual([...documented].sort());
  });

  it("guards every mutation or explicitly lists it as public", () => {
    const app = buildApp({ auth: stubAuth, adminRepo: stubAdmin, policyRepo: stubPolicy,
      applicationRepo: stubApplications, clubFieldRepo: stubClubFields, propertyRepo: stubProperties,
      evaluationSchemeRepo: stubSchemes, exportRepo: stubExports, exportWriter: stubWriter, clubLifecycleRepo: stubLifecycle, applicationReviewRepo: stubApplicationReviews, eventProposalReviewRepo: stubEventProposalReviews,
      clubProfileRepo: stubClubProfiles,
      boardNominationRepo: stubBoardNominations,
      recruitmentCampaignRepo: stubRecruitmentCampaigns,
      recruitmentApplicationRepo: stubRecruitmentApplications,
      publicRepo: stubPublic, dbReady: () => true });
    const stack = (app as unknown as { router: { stack: Layer[] } }).router.stack;
    const routes = stack.flatMap((layer) => layer.route ? [layer.route]
      : layer.name === "router" ? (layer.handle?.stack ?? []).flatMap((sub) =>
        sub.route ? [sub.route] : []) : []);
    for (const route of routes) {
      for (const method of ["post", "put", "patch", "delete"]) {
        if (!route.methods[method]) continue;
        const key = `${method.toUpperCase()} ${route.path}`;
        expect(PUBLIC_ROUTES.has(key) || route.stack.some((handler) =>
          handler.handle.name === "requireAuth"), key).toBe(true);
      }
    }
  });

  it("mounts only public routes when OAuth configuration is absent", () => {
    const app = buildApp({ publicRepo: stubPublic, dbReady: () => true });
    const stack = (app as unknown as { router: { stack: Layer[] } }).router.stack;
    const paths = stack.flatMap((layer) => layer.name === "router"
      ? (layer.handle?.stack ?? []).flatMap((sub) => sub.route ? [sub.route.path] : []) : []);
    expect(paths).toContain("/public/clubs");
    expect(paths).toContain("/public/events");
    expect(paths).not.toContain("/auth/login");
    expect(paths).not.toContain("/admin/users");
  });

  it("documents only mounted routes in public-only mode", () => {
    const app = buildApp({ publicRepo: stubPublic, dbReady: () => true });
    const stack = (app as unknown as { router: { stack: Array<{
      route?: { path: string; stack: Array<{
        handle: (req: unknown, res: unknown) => void;
      }> };
    }> } }).router.stack;
    const handler = stack.find((layer) => layer.route?.path === "/docs/openapi.json")
      ?.route?.stack[0]?.handle;
    if (!handler) throw new Error("OpenAPI route missing");
    const send = vi.fn();
    const res = { type: vi.fn().mockReturnThis(), send };
    handler({}, res);
    const document = JSON.parse(String(send.mock.calls[0]?.[0])) as { paths: Record<string, unknown> };
    expect(document.paths).toHaveProperty("/public/clubs");
    expect(document.paths).not.toHaveProperty("/auth/login");
    expect(document.paths).not.toHaveProperty("/admin/users");
  });
});
