// feat-periodic-report-evidence-upload over HTTP: real Express app, Mongo repositories, sessions
// and CSRF. Only Cloudinary is replaced by an in-memory store, since uploads leave the system.
import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'
import mongoose, { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PeriodicEvidenceStorage } from '../../src/domain/periodic-report.js'
import { DEFAULT_FORM_REQUIREMENTS } from '../../src/domain/policy.js'
import type { AuthConfig } from '../../src/infra/config/index.js'
import { createSessionService } from '../../src/infra/auth/session-service.js'
import { ensureAuthBootstrap } from '../../src/infra/db/bootstrap-auth.js'
import { mongoAccessRepository } from '../../src/infra/db/mongo-access-repository.js'
import { mongoAccountAdminRepository } from '../../src/infra/db/mongo-account-admin-repository.js'
import {
  ensureAuthSessionIndexes,
  mongoSessionRepository,
} from '../../src/infra/db/mongo-auth-session-repository.js'
import { mongoAuthRepository } from '../../src/infra/db/mongo-auth-repository.js'
import { mongoClubPeriodicReportRepository } from '../../src/infra/db/mongo-club-periodic-report-repository.js'
import { mongoPeriodicReportRepository } from '../../src/infra/db/mongo-periodic-report-repository.js'
import { mongoPolicyRepository } from '../../src/infra/db/mongo-policy-repository.js'
import { mongoPublicDiscoveryRepository } from '../../src/infra/db/mongo-public-discovery-repository.js'
import { ensureUcmsDatabase, ucmsModels as m } from '../../src/infra/db/ucms-models.js'
import { buildApp } from '../../src/interface/http/server.js'

const uri = process.env.MONGO_URI
const secret = 'periodic-evidence-session-secret-long-enough'
const DAY = 86_400_000
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
const legacyDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ'

interface Actor {
  id: string
  cookie: string
  csrf: string
}
type Json = ReturnType<typeof JSON.parse>

describe.skipIf(!uri)('Periodic report evidence images', () => {
  let server: Server
  let base = ''
  let officer: Actor, leader: Actor, outsider: Actor
  const club = new Types.ObjectId()
  let uploads = 0
  const files: PeriodicEvidenceStorage = {
    async upload() {
      uploads += 1
      return { assetId: String(uploads).padStart(32, 'a') }
    },
    async accessUrl(assetId) {
      return `https://files.test/${assetId}?signed=1`
    },
  }

  async function call(
    who: Actor,
    method: string,
    path: string,
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const all: Record<string, string> = {
      ...headers,
      Cookie: `ucms_session=${who.cookie}`,
      'X-CSRF-Token': who.csrf,
    }
    let payload: Uint8Array | string | undefined
    if (Buffer.isBuffer(body)) {
      payload = new Uint8Array(body)
    } else if (body !== undefined) {
      all['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }
    const response = await fetch(`${base}/api/v1${path}`, { method, headers: all, body: payload })
    const text = await response.text()
    return {
      status: response.status,
      text,
      body: (text.startsWith('{') ? JSON.parse(text) : {}) as Json,
    }
  }
  async function signIn(email: string, existingId?: string): Promise<Actor> {
    const id =
      existingId ??
      String(
        (
          await m.users!.create({
            email,
            displayName: email,
            googleSubject: `sub-${email}`,
            accountState: 'Active',
            createdAt: new Date(),
          })
        )._id,
      )
    const issued = await createSessionService(mongoSessionRepository(), secret).issue(
      id,
      new Date(),
    )
    return { id, cookie: issued.cookieValue, csrf: issued.csrfToken }
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? '', { dbName: `ucms-periodic-evidence-${process.pid}` })
    await ensureUcmsDatabase()
    await ensureAuthSessionIndexes()
    await ensureAuthBootstrap({
      ALLOWED_DOMAIN: 'evidence.edu',
      BOOTSTRAP_ICPDP_EMAIL: 'officer@evidence.edu',
    } as AuthConfig)
    async function unused(): Promise<never> {
      throw new Error('not used')
    }
    const app = buildApp({
      publicRepo: mongoPublicDiscoveryRepository(),
      dbReady: () => true,
      adminRepo: mongoAccountAdminRepository(),
      policyRepo: mongoPolicyRepository(),
      clubPeriodicReportRepo: mongoClubPeriodicReportRepository(),
      periodicReportRepo: mongoPeriodicReportRepository(),
      periodicEvidenceFiles: files,
      auth: {
        repo: mongoAuthRepository('evidence.edu'),
        accessRepo: mongoAccessRepository(),
        sessions: createSessionService(mongoSessionRepository(), secret),
        google: { begin: unused, complete: unused } as never,
        oauthFlow: { seal: unused, open: unused } as never,
        clientBaseUrl: 'http://localhost:5173',
        secureCookies: false,
      },
    })
    server = app.listen(0)
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    const officerDoc = await m.users!.findOne({ email: 'officer@evidence.edu' }).lean()
    officer = await signIn('officer@evidence.edu', String(officerDoc!._id))
    leader = await signIn('leader@evidence.edu')
    outsider = await signIn('outsider@evidence.edu')
    const now = new Date()
    await m.policyVersions!.create({
      minFoundingMembers: 5,
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
      createdBy: new Types.ObjectId(officer.id),
      createdAt: now,
    })
    await m.clubs!.create({
      _id: club,
      code: 'EVI',
      name: 'Evidence Club',
      field: 'Technology',
      state: 'Active',
      createdAt: now,
    })
    const membership = await m.clubMemberships!.create({
      clubId: club,
      userId: new Types.ObjectId(leader.id),
      state: 'Active',
      joinedAt: now,
      statusHistory: [],
    })
    const position = await m.clubPositions!.create({
      clubId: club,
      code: 'LEADER',
      name: 'Chủ nhiệm',
      isBoardSeat: true,
      isLeaderRole: true,
      isActive: true,
      permissionCodes: [],
    })
    const term = await m.clubTerms!.create({
      clubId: club,
      name: 'Term',
      state: 'Active',
      startAt: new Date(now.getTime() - 60 * DAY),
      endAt: new Date(now.getTime() + 365 * DAY),
    })
    await m.clubPositionAssignments!.create({
      clubId: club,
      termId: term._id,
      positionId: position._id,
      membershipId: membership._id,
      effectiveFrom: new Date(now.getTime() - 60 * DAY),
      assignedBy: new Types.ObjectId(leader.id),
      confirmedBy: new Types.ObjectId(leader.id),
    })
  }, 60_000)

  afterAll(async () => {
    server?.close()
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
  })

  const reports = `/clubs/${club}/periodic-reports`
  let reportId = ''
  let revision = 0
  let reference = ''

  it('1. uploads only real PNG/JPEG/WebP images for a club allowed to report', async () => {
    const campaign = await call(officer, 'PUT', '/admin/periodic-reports/campaign', {
      periodCode: 'Term',
      isOpen: true,
      dueAt: new Date(Date.now() + 30 * DAY).toISOString(),
    })
    expect(campaign.status).toBe(200)
    const created = await call(leader, 'POST', reports, { periodCode: 'Term' })
    expect(created.status).toBe(201)
    reportId = created.body.data.id
    revision = created.body.data.revision

    const asImage = { 'Content-Type': 'image/png' }
    expect(
      (
        await call(leader, 'POST', `${reports}/evidence-images`, svg, {
          'Content-Type': 'image/svg+xml',
        })
      ).status,
    ).toBe(400)
    expect((await call(leader, 'POST', `${reports}/evidence-images`, svg, asImage)).status).toBe(
      400,
    )
    expect((await call(outsider, 'POST', `${reports}/evidence-images`, png, asImage)).status).toBe(
      403,
    )
    expect(
      (await call({ ...leader, csrf: 'wrong' }, 'POST', `${reports}/evidence-images`, png, asImage))
        .status,
    ).toBe(403)
    expect(uploads).toBe(0)

    const uploaded = await call(leader, 'POST', `${reports}/evidence-images`, png, asImage)
    expect(uploaded.status).toBe(201)
    reference = uploaded.body.data.reference
    expect(reference).toBe(`ucms-evidence:${club}:${'1'.padStart(32, 'a')}`)
    expect(uploaded.body.data.url).toMatch(/^https:\/\/files\.test\//)
  })

  it('2. stores the reference, rejects data: URLs and returns signed URLs on read', async () => {
    const achievement = { title: 'Prize', description: 'First place' }
    const rejected = await call(leader, 'PUT', `${reports}/${reportId}`, {
      revision,
      achievements: [{ ...achievement, evidenceUrl: legacyDataUrl }],
    })
    expect(rejected.status).toBe(400)

    const saved = await call(leader, 'PUT', `${reports}/${reportId}`, {
      revision,
      achievements: [{ ...achievement, evidenceUrl: reference }],
    })
    expect(saved.status).toBe(200)
    expect(saved.body.data.achievements[0].evidenceUrl).toBe(reference)
    expect(saved.body.data.evidenceUrls[reference]).toMatch(/signed=1$/)
    revision = saved.body.data.revision

    const stored = await m.periodicReports!.findById(reportId).lean()
    expect(JSON.stringify(stored)).toContain(reference)
    expect(JSON.stringify(stored)).not.toContain('files.test')
  })

  it('3. still returns legacy data: URLs on both the club and the ICPDP side', async () => {
    await m.periodicReports!.updateOne(
      { _id: new Types.ObjectId(reportId) },
      { $set: { evidence: [{ note: 'Old photo', url: legacyDataUrl }] } },
    )
    const listed = await call(leader, 'GET', reports)
    expect(listed.status).toBe(200)
    const report = listed.body.data.reports.find((item: { id: string }) => item.id === reportId)
    expect(report.evidence[0].url).toBe(legacyDataUrl)
    expect(Object.keys(report.evidenceUrls)).toEqual([reference])

    const detail = await call(officer, 'GET', `/admin/periodic-reports/${reportId}`)
    expect(detail.status).toBe(200)
    expect(detail.body.data.evidence[0].url).toBe(legacyDataUrl)
    expect(detail.body.data.evidenceUrls[reference]).toMatch(/signed=1$/)
  })

  it('4. caps JSON bodies at 100kb except on routes that parse larger bodies after auth', async () => {
    const tooLarge = await call(leader, 'POST', reports, { periodCode: 'x'.repeat(150_000) })
    expect(tooLarge.status).toBe(413)

    const members = Array.from({ length: 300 }, (_, index) => ({
      fullName: `Nguyễn Văn Thành Viên Số ${index} ${'đ'.repeat(160)}`,
      studentCode: `HE${String(index).padStart(6, '0')}`,
      email: `member${index}@evidence.edu`,
      activityScore: 8,
    }))
    const body = { revision: 0, members }
    expect(Buffer.byteLength(JSON.stringify(body))).toBeGreaterThan(100 * 1024)

    const anonymous = await fetch(`${base}/api/v1${reports}/${reportId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    expect(anonymous.status).toBe(401)

    const current = (await m.periodicReports!.findById(reportId).lean()) as { __v?: number }
    const saved = await call(leader, 'PUT', `${reports}/${reportId}`, {
      ...body,
      revision: current.__v ?? 0,
    })
    expect(saved.status).toBe(200)
    expect(saved.body.data.members).toHaveLength(300)
  })
})
