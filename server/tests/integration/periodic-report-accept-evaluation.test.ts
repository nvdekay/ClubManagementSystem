import mongoose, { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_SCHEME_SETTINGS } from '../../src/domain/evaluation-scheme.js'
import { DEFAULT_FORM_REQUIREMENTS } from '../../src/domain/policy.js'
import { mongoEvaluationRepository } from '../../src/infra/db/mongo-evaluation-repository.js'
import { mongoEvaluationSchemeRepository } from '../../src/infra/db/mongo-evaluation-scheme-repository.js'
import { mongoPeriodicReportRepository } from '../../src/infra/db/mongo-periodic-report-repository.js'
import { ensureUcmsDatabase, ucmsModels as m } from '../../src/infra/db/ucms-models.js'
import { generateClubEvaluation } from '../../src/usecase/evaluation.js'
import { decidePeriodicReport, type PeriodicReportDeps } from '../../src/usecase/periodic-report.js'

const uri = process.env.MONGO_URI
const now = new Date('2026-10-11T00:00:00Z')
const summer = {
  code: 'Summer 2026',
  startAt: new Date('2026-05-01Z'),
  endAt: new Date('2026-09-01Z'),
}
const officer = new Types.ObjectId()
const actor = { id: String(officer), accountState: 'Active' as const }
const early = new Types.ObjectId(),
  ready = new Types.ObjectId(),
  drafted = new Types.ObjectId()

describe.skipIf(!uri)('UC39 accept creates the UC42 evaluation draft', () => {
  const schemes = mongoEvaluationSchemeRepository()
  const evaluations = mongoEvaluationRepository()
  let deps: PeriodicReportDeps
  const reports = new Map<string, string>()

  beforeAll(async () => {
    await mongoose.connect(uri ?? '', { dbName: `ucms-accept-evaluation-test-${process.pid}` })
    await ensureUcmsDatabase()
    const founded = new Date('2026-01-01Z')
    await m.clubs!.create(
      [early, ready, drafted].map((id, index) => ({
        _id: id,
        code: `C${index}`,
        name: `Club ${index}`,
        field: 'Technology',
        state: 'Active',
        createdAt: founded,
      })),
    )
    const policy = {
      minFoundingMembers: 5,
      formRequirements: DEFAULT_FORM_REQUIREMENTS,
      reportDeadlines: [
        {
          reportType: 'PERIODIC' as const,
          dueDaysAfterPeriodEnd: 14,
          remindBeforeDays: 3,
          overdueAfterDays: 0,
          escalateAfterDays: 7,
        },
      ],
      conflictThresholdMinutes: 15,
      feedbackWindowHours: 72,
      feedbackMinRespondents: 2,
      allowOverbooking: false,
      enforceOverdueReportBlock: true,
      academicCalendar: [summer],
      effectiveFrom: founded,
      createdBy: String(officer),
      createdAt: founded,
    }
    const created = await m.periodicReports!.create(
      [early, ready, drafted].map((clubId) => ({
        clubId,
        periodCode: summer.code,
        periodType: 'SEMESTER',
        dueAt: new Date('2026-09-15Z'),
        versionNo: 1,
        preloadedFigures: {},
        narrative: 'n',
        nextPlan: 'p',
        evidence: [],
        state: 'Submitted',
        submittedAt: new Date('2026-09-10Z'),
      })),
    )
    for (const report of created) {
      reports.set(String(report.clubId), String(report._id))
    }
    const auth = { systemRoleCodes: async () => ['ICPDP_OFFICER'] }
    const policyRepo = { findEffective: async () => ({ id: 'p', ...policy }) }
    deps = {
      repo: mongoPeriodicReportRepository(),
      policy: policyRepo,
      auth,
      evaluation: { repo: evaluations, schemes, policy: policyRepo, auth },
    }
  }, 30_000)

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
  })

  async function accept(clubId: Types.ObjectId) {
    return decidePeriodicReport(
      deps,
      actor,
      reports.get(String(clubId))!,
      { outcome: 'Accept' },
      now,
    )
  }

  it('still accepts the report when the period has no active scheme, and creates nothing', async () => {
    expect((await accept(early)).state).toBe('Accepted')
    expect(await evaluations.latest(summer.code)).toEqual([])
  })

  it('creates exactly one Data Ready evaluation for the accepted club and period', async () => {
    const draft = await schemes.createDraft(
      summer.code,
      DEFAULT_SCHEME_SETTINGS,
      String(officer),
      now,
    )
    await schemes.activate(draft.id, String(officer), now)
    await accept(ready)
    const latest = await evaluations.latest(summer.code)
    expect(latest.map((item) => [item.clubId, item.state])).toEqual([[String(ready), 'Data Ready']])
  })

  it('does not duplicate an evaluation the club already has for the period', async () => {
    await generateClubEvaluation(deps.evaluation!, actor, String(drafted), summer.code, now)
    await accept(drafted)
    expect(
      (await evaluations.latest(summer.code)).filter((item) => item.clubId === String(drafted)),
    ).toHaveLength(1)
  })
})
