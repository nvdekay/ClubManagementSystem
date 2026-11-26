// Shared harness for full-HTTP integration tests: the real Express app from buildApp, wired to
// real Mongo repositories (as main.ts does), real sessions and CSRF. Only file storage that would
// leave the system (Cloudinary) is replaced by in-memory fakes. Each test file passes its own name,
// gets its own database `ucms-<name>-test-<pid>` and drops it in close().
import { randomUUID } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import mongoose, { Types } from 'mongoose'
import type { ApplicationFileStorage } from '../../src/domain/club-application.js'
import type { RecruitmentAttachmentStorage } from '../../src/domain/recruitment-application.js'
import { DEFAULT_FORM_REQUIREMENTS } from '../../src/domain/policy.js'
import type { AuthConfig } from '../../src/infra/config/index.js'
import { createSessionService } from '../../src/infra/auth/session-service.js'
import { ensureAuthBootstrap } from '../../src/infra/db/bootstrap-auth.js'
import { mongoAccessRepository } from '../../src/infra/db/mongo-access-repository.js'
import { mongoAccessDenialAuditRepository } from '../../src/infra/db/mongo-access-denial-audit-repository.js'
import { mongoAccountAdminRepository } from '../../src/infra/db/mongo-account-admin-repository.js'
import { mongoApprovalRoutingRepository } from '../../src/infra/db/mongo-approval-routing-repository.js'
import {
  ensureAuthSessionIndexes,
  mongoSessionRepository,
} from '../../src/infra/db/mongo-auth-session-repository.js'
import { mongoAuthRepository } from '../../src/infra/db/mongo-auth-repository.js'
import { mongoBoardNominationRepository } from '../../src/infra/db/mongo-board-nomination-repository.js'
import { mongoBudgetDisbursementRepository } from '../../src/infra/db/mongo-budget-disbursement-repository.js'
import { mongoCandidateEvaluationRepository } from '../../src/infra/db/mongo-candidate-evaluation-repository.js'
import { mongoClubApplicationRepository } from '../../src/infra/db/mongo-club-application-repository.js'
import { mongoClubApplicationReviewRepository } from '../../src/infra/db/mongo-club-application-review-repository.js'
import { mongoClubEvaluationRepository } from '../../src/infra/db/mongo-club-evaluation-repository.js'
import { mongoClubEventRepository } from '../../src/infra/db/mongo-club-event-repository.js'
import {
  ensureDefaultClubFields,
  mongoClubFieldRepository,
} from '../../src/infra/db/mongo-club-field-repository.js'
import { mongoClubInvitationRepository } from '../../src/infra/db/mongo-club-invitation-repository.js'
import { mongoClubLifecycleRepository } from '../../src/infra/db/mongo-club-lifecycle-repository.js'
import { mongoClubPeriodicReportRepository } from '../../src/infra/db/mongo-club-periodic-report-repository.js'
import { mongoClubProfileRepository } from '../../src/infra/db/mongo-club-profile-repository.js'
import { mongoClubTransitionPlanRepository } from '../../src/infra/db/mongo-club-transition-plan-repository.js'
import { mongoClubViolationRepository } from '../../src/infra/db/mongo-club-violation-repository.js'
import { mongoComplaintRepository } from '../../src/infra/db/mongo-complaint-repository.js'
import { mongoDashboardRepository } from '../../src/infra/db/mongo-dashboard-repository.js'
import { mongoEvaluationRepository } from '../../src/infra/db/mongo-evaluation-repository.js'
import { mongoEvaluationSchemeRepository } from '../../src/infra/db/mongo-evaluation-scheme-repository.js'
import { mongoEventCheckInRepository } from '../../src/infra/db/mongo-event-checkin-repository.js'
import { mongoEventDefenseRepository } from '../../src/infra/db/mongo-event-defense-repository.js'
import { mongoEventFeedbackRepository } from '../../src/infra/db/mongo-event-feedback-repository.js'
import { mongoEventFinanceRepository } from '../../src/infra/db/mongo-event-finance-repository.js'
import { mongoEventProposalReviewRepository } from '../../src/infra/db/mongo-event-proposal-review-repository.js'
import { mongoEventRegistrationRepository } from '../../src/infra/db/mongo-event-registration-repository.js'
import { mongoExportRepository } from '../../src/infra/db/mongo-export-repository.js'
import { mongoFacilityBookingRepository } from '../../src/infra/db/mongo-facility-booking-repository.js'
import { mongoLeadershipTransitionRepository } from '../../src/infra/db/mongo-leadership-transition-repository.js'
import { mongoMemberSpaceRepository } from '../../src/infra/db/mongo-member-space-repository.js'
import { mongoMembershipReconfirmationRepository } from '../../src/infra/db/mongo-membership-reconfirmation-repository.js'
import { mongoMembershipRepository } from '../../src/infra/db/mongo-membership-repository.js'
import { mongoNotificationRepository } from '../../src/infra/db/mongo-notification-repository.js'
import { mongoPeriodicReportRepository } from '../../src/infra/db/mongo-periodic-report-repository.js'
import { mongoPolicyRepository } from '../../src/infra/db/mongo-policy-repository.js'
import { mongoPostEventReportRepository } from '../../src/infra/db/mongo-post-event-report-repository.js'
import { mongoPropertyRepository } from '../../src/infra/db/mongo-property-repository.js'
import { mongoPublicDiscoveryRepository } from '../../src/infra/db/mongo-public-discovery-repository.js'
import { mongoRecruitmentApplicationRepository } from '../../src/infra/db/mongo-recruitment-application-repository.js'
import { mongoRecruitmentCampaignRepository } from '../../src/infra/db/mongo-recruitment-campaign-repository.js'
import { mongoRoomAllocationRepository } from '../../src/infra/db/mongo-room-allocation-repository.js'
import { mongoSchoolEventRepository } from '../../src/infra/db/mongo-school-event-repository.js'
import { mongoSponsoredItemRepository } from '../../src/infra/db/mongo-sponsored-item-repository.js'
import { mongoSuspensionRequestRepository } from '../../src/infra/db/mongo-suspension-request-repository.js'
import { mongoViolationRepository } from '../../src/infra/db/mongo-violation-repository.js'
import { ensureUcmsDatabase, ucmsModels } from '../../src/infra/db/ucms-models.js'
import { buildApp } from '../../src/interface/http/server.js'

export const DAY = 86_400_000
export const HTTP_DOMAIN = 'http.edu'
const SECRET = 'http-harness-session-secret-long-enough-123'

/** Parsed JSON envelope; every field read from it is checked by an expect() right away. */
export type Json = ReturnType<typeof JSON.parse>

export interface Actor {
  id: string
  email: string
  cookie: string
  csrf: string
}

export interface Reply {
  status: number
  headers: Headers
  body: Json
}

export interface CallOptions {
  /** Send the session cookie but no X-CSRF-Token header. */
  noCsrf?: boolean
  /** Send this X-CSRF-Token instead of the actor's real one. */
  csrf?: string
  headers?: Record<string, string>
}

export interface SeededClub {
  id: string
  termId: string
  leaderMembershipId: string
  memberMembershipIds: Record<string, string>
}

export interface Harness {
  /** Calls /api/v1<path>. `who: null` sends no cookie. Buffers are sent raw, objects as JSON. */
  call(
    who: Actor | null,
    method: string,
    path: string,
    body?: unknown,
    options?: CallOptions,
  ): Promise<Reply>
  /** Creates (or reuses by email) an Active user and issues a real session for it. */
  signIn(email: string, displayName?: string): Promise<Actor>
  /** Signs in a user holding the ICPDP_OFFICER system role. */
  signInOfficer(email: string): Promise<Actor>
  /** The bootstrap ICPDP officer. */
  officer: Actor
  /** An Active club with a confirmed leader seat in an Active term, plus Active members. */
  seedClub(input: {
    code: string
    name?: string
    leader: Actor
    members?: Actor[]
    state?: string
  }): Promise<SeededClub>
  /** Inserts the current policy version (an academic term spanning now). */
  seedPolicy(overrides?: Record<string, unknown>): Promise<void>
  close(): Promise<void>
}

const inMemoryApplicationFiles: ApplicationFileStorage = {
  async upload(input) {
    const id = randomUUID()
    return {
      id,
      documentType: input.documentType,
      fileName: input.fileName,
      mimeType: input.mimeType,
      bytes: input.bytes.length,
      assetId: `asset-${id}`,
      uploadedAt: input.now,
      ...(input.visibility === 'public' ? { publicUrl: `https://cdn.test/${id}` } : {}),
    }
  },
  async accessUrl(assetId) {
    return `https://files.test/${assetId}`
  },
  async remove() {},
}

const inMemoryRecruitmentFiles: RecruitmentAttachmentStorage = {
  async upload(input) {
    const id = randomUUID()
    return {
      id,
      fieldKey: input.fieldKey,
      fileName: input.fileName,
      mimeType: input.mimeType,
      bytes: input.bytes.length,
      assetId: `asset-${id}`,
      uploadedAt: input.now,
    }
  },
  async accessUrl(assetId) {
    return `https://files.test/${assetId}`
  },
}

/** Builds the app exactly like main.ts (with Auth configured) on a fresh per-file database. */
export async function startHttpHarness(name: string): Promise<Harness> {
  const uri = process.env.MONGO_URI
  if (!uri) {
    throw new Error('startHttpHarness needs MONGO_URI')
  }
  await mongoose.connect(uri, { dbName: `ucms-${name}-test-${process.pid}` })
  await ensureUcmsDatabase()
  await ensureAuthSessionIndexes()
  await ensureDefaultClubFields()
  await ensureAuthBootstrap({
    ALLOWED_DOMAIN: HTTP_DOMAIN,
    BOOTSTRAP_ICPDP_EMAIL: `officer@${HTTP_DOMAIN}`,
  } as AuthConfig)

  const sessions = createSessionService(mongoSessionRepository(), SECRET)
  async function unused(): Promise<never> {
    throw new Error('not used over the HTTP harness')
  }
  const eventProposalReviewRepo = mongoEventProposalReviewRepository()
  const app = buildApp({
    publicRepo: mongoPublicDiscoveryRepository(),
    dbReady: () => mongoose.connection.readyState === 1,
    accessDenialAudit: mongoAccessDenialAuditRepository(),
    clubEvaluationRepo: mongoClubEvaluationRepository(),
    clubViolationRepo: mongoClubViolationRepository(),
    membershipReconfirmationRepo: mongoMembershipReconfirmationRepository(),
    suspensionRequestRepo: mongoSuspensionRequestRepository(),
    clubTransitionPlanRepo: mongoClubTransitionPlanRepository(),
    adminRepo: mongoAccountAdminRepository(),
    policyRepo: mongoPolicyRepository(),
    applicationRepo: mongoClubApplicationRepository(),
    clubFieldRepo: mongoClubFieldRepository(),
    propertyRepo: mongoPropertyRepository(),
    facilityBookingRepo: mongoFacilityBookingRepository(),
    roomAllocationRepo: mongoRoomAllocationRepository(),
    evaluationSchemeRepo: mongoEvaluationSchemeRepository(),
    exportRepo: mongoExportRepository(),
    clubLifecycleRepo: mongoClubLifecycleRepository(),
    eventProposalReviewRepo,
    eventDefenseRepo: mongoEventDefenseRepository(eventProposalReviewRepo),
    budgetDisbursementRepo: mongoBudgetDisbursementRepository(),
    postEventReportRepo: mongoPostEventReportRepository(),
    violationRepo: mongoViolationRepository(),
    periodicReportRepo: mongoPeriodicReportRepository(),
    clubPeriodicReportRepo: mongoClubPeriodicReportRepository(),
    eventFinanceRepo: mongoEventFinanceRepository({
      recoveryDueDays: 7,
      evidenceTypes: ['INVOICE', 'RECEIPT', 'PROOF_OF_PAYMENT'],
    }),
    sponsoredItemRepo: mongoSponsoredItemRepository(),
    schoolEventRepo: mongoSchoolEventRepository(),
    clubInvitationRepo: mongoClubInvitationRepository(),
    clubEventRepo: mongoClubEventRepository({
      proposalNoticeHours: 168,
      cancellationNoticeHours: 24,
    }),
    evaluationRepo: mongoEvaluationRepository(),
    applicationReviewRepo: mongoClubApplicationReviewRepository(),
    clubProfileRepo: mongoClubProfileRepository(),
    boardNominationRepo: mongoBoardNominationRepository(),
    leadershipTransitionRepo: mongoLeadershipTransitionRepository(),
    eventRegistrationRepo: mongoEventRegistrationRepository(),
    eventCheckInRepo: mongoEventCheckInRepository(),
    eventFeedbackRepo: mongoEventFeedbackRepository(),
    complaintRepo: mongoComplaintRepository(),
    approvalRoutingRepo: mongoApprovalRoutingRepository(),
    memberSpaceRepo: mongoMemberSpaceRepository(),
    notificationRepo: mongoNotificationRepository(),
    recruitmentCampaignRepo: mongoRecruitmentCampaignRepository(),
    recruitmentApplicationRepo: mongoRecruitmentApplicationRepository(),
    candidateEvaluationRepo: mongoCandidateEvaluationRepository(),
    membershipRepo: mongoMembershipRepository(),
    dashboardRepo: mongoDashboardRepository(),
    recruitmentAttachmentStorage: inMemoryRecruitmentFiles,
    applicationFiles: inMemoryApplicationFiles,
    eventProposalFiles: null,
    periodicEvidenceFiles: null,
    auth: {
      repo: mongoAuthRepository(HTTP_DOMAIN),
      accessRepo: mongoAccessRepository(),
      sessions,
      google: { begin: unused, complete: unused } as never,
      oauthFlow: { seal: unused, open: unused } as never,
      clientBaseUrl: 'http://localhost:5173',
      secureCookies: false,
    },
  })
  const server: Server = app.listen(0)
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`
  const m = ucmsModels

  async function call(
    who: Actor | null,
    method: string,
    path: string,
    body?: unknown,
    options: CallOptions = {},
  ): Promise<Reply> {
    const headers: Record<string, string> = { ...options.headers }
    if (who) {
      headers.Cookie = `ucms_session=${who.cookie}`
      if (!options.noCsrf) {
        headers['X-CSRF-Token'] = options.csrf ?? who.csrf
      }
    }
    let payload: Uint8Array | string | undefined
    if (Buffer.isBuffer(body)) {
      payload = new Uint8Array(body)
    } else if (body !== undefined) {
      headers['Content-Type'] ??= 'application/json'
      payload = JSON.stringify(body)
    }
    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: payload,
      redirect: 'manual',
    })
    const text = await response.text()
    return {
      status: response.status,
      headers: response.headers,
      body: (text.startsWith('{') || text.startsWith('[') ? JSON.parse(text) : {}) as Json,
    }
  }

  async function signIn(email: string, displayName = email.split('@')[0] ?? email) {
    const existing = await m.users!.findOne({ email }).lean()
    const id = existing
      ? String(existing._id)
      : String(
          (
            await m.users!.create({
              email,
              displayName,
              googleSubject: `sub-${email}`,
              accountState: 'Active',
              createdAt: new Date(),
            })
          )._id,
        )
    const issued = await sessions.issue(id, new Date())
    return { id, email, cookie: issued.cookieValue, csrf: issued.csrfToken }
  }

  async function signInOfficer(email: string) {
    const who = await signIn(email)
    const role = await m.roles!.findOne({ code: 'ICPDP_OFFICER' }).lean()
    await m.userRoleAssignments!.updateOne(
      { userId: new Types.ObjectId(who.id), roleId: role!._id, revokedAt: null },
      {
        $setOnInsert: {
          grantedBy: new Types.ObjectId(who.id),
          grantedAt: new Date(),
          reason: 'test officer',
        },
      },
      { upsert: true },
    )
    return who
  }

  async function seedClub(input: {
    code: string
    name?: string
    leader: Actor
    members?: Actor[]
    state?: string
  }): Promise<SeededClub> {
    const now = new Date()
    const club = await m.clubs!.create({
      code: input.code,
      name: input.name ?? `Club ${input.code}`,
      field: 'Công nghệ',
      state: input.state ?? 'Active',
      createdAt: new Date(now.getTime() - 400 * DAY),
    })
    const clubId = club._id as Types.ObjectId
    const all = [input.leader, ...(input.members ?? [])]
    const memberships = await m.clubMemberships!.create(
      all.map((who) => ({
        clubId,
        userId: new Types.ObjectId(who.id),
        state: 'Active',
        joinedAt: new Date(now.getTime() - 300 * DAY),
        defaultRole: 'MEMBER',
        statusHistory: [],
      })),
    )
    const [leaderPosition] = await m.clubPositions!.create([
      {
        clubId,
        code: 'LEADER',
        name: 'Chủ nhiệm',
        isBoardSeat: true,
        isLeaderRole: true,
        isActive: true,
        permissionCodes: [],
      },
      {
        clubId,
        code: 'MEMBER',
        name: 'Thành viên',
        isBoardSeat: false,
        isLeaderRole: false,
        isDefaultMemberRole: true,
        isActive: true,
        permissionCodes: [],
      },
    ])
    const term = await m.clubTerms!.create({
      clubId,
      name: 'Current term',
      state: 'Active',
      startAt: new Date(now.getTime() - 200 * DAY),
      endAt: new Date(now.getTime() + 365 * DAY),
    })
    await m.clubPositionAssignments!.create({
      clubId,
      termId: term._id,
      positionId: leaderPosition!._id,
      membershipId: memberships[0]!._id,
      effectiveFrom: new Date(now.getTime() - 200 * DAY),
      assignedBy: new Types.ObjectId(input.leader.id),
      confirmedBy: new Types.ObjectId(input.leader.id),
    })
    return {
      id: String(clubId),
      termId: String(term._id),
      leaderMembershipId: String(memberships[0]!._id),
      memberMembershipIds: Object.fromEntries(
        (input.members ?? []).map((who, index) => [who.id, String(memberships[index + 1]!._id)]),
      ),
    }
  }

  async function seedPolicy(overrides: Record<string, unknown> = {}) {
    const now = new Date()
    const officerDoc = await m.users!.findOne({ email: `officer@${HTTP_DOMAIN}` }).lean()
    await m.policyVersions!.create({
      minFoundingMembers: 3,
      formRequirements: DEFAULT_FORM_REQUIREMENTS,
      reportDeadlines: [],
      conflictThresholdMinutes: 15,
      feedbackWindowHours: 72,
      feedbackMinRespondents: 2,
      allowOverbooking: false,
      enforceOverdueReportBlock: false,
      academicCalendar: [
        {
          code: 'Term',
          startAt: new Date(now.getTime() - 60 * DAY),
          endAt: new Date(now.getTime() + 180 * DAY),
        },
      ],
      effectiveFrom: new Date(now.getTime() - DAY),
      createdBy: officerDoc!._id,
      createdAt: now,
      ...overrides,
    })
  }

  const officerDoc = await m.users!.findOne({ email: `officer@${HTTP_DOMAIN}` }).lean()
  const officerIssued = await sessions.issue(String(officerDoc!._id), new Date())
  const officer: Actor = {
    id: String(officerDoc!._id),
    email: `officer@${HTTP_DOMAIN}`,
    cookie: officerIssued.cookieValue,
    csrf: officerIssued.csrfToken,
  }

  return {
    call,
    signIn,
    signInOfficer,
    officer,
    seedClub,
    seedPolicy,
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()))
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.dropDatabase()
      }
      await mongoose.disconnect()
    },
  }
}

/** A fresh, never-used ObjectId string (for 404 paths). */
export function missingId(): string {
  return String(new Types.ObjectId())
}

/** Asserts the standard success envelope and returns its data. */
export function dataOf(reply: Reply, status = 200): Json {
  if (reply.status !== status) {
    throw new Error(`expected ${status}, got ${reply.status}: ${JSON.stringify(reply.body)}`)
  }
  if (reply.body.statusCode !== status || reply.body.message !== 'success') {
    throw new Error(`not a success envelope: ${JSON.stringify(reply.body)}`)
  }
  return reply.body.data
}
