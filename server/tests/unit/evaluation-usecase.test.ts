import { describe, expect, it } from 'vitest'
import {
  DIMENSION_NAMES,
  METRIC_KEYS,
  type ClubMetrics,
  type EvaluationDetail,
  type EvaluationRepository,
  type MetricKey,
} from '../../src/domain/evaluation.js'
import {
  DEFAULT_SCHEME_SETTINGS,
  type EvaluationScheme,
} from '../../src/domain/evaluation-scheme.js'
import type { PolicyVersion } from '../../src/domain/policy.js'
import type { AccessActor } from '../../src/usecase/access.js'
import {
  evaluationOverview,
  finalizeEvaluation,
  generateClubEvaluation,
  generateEvaluations,
  getEvaluation,
  publishEvaluations,
  regenerateEvaluation,
  reopenEvaluation,
  setManualScore,
  type EvaluationDeps,
} from '../../src/usecase/evaluation.js'
import { actor, LEADER_ID, NOW, OFFICER_ID, officerAuth } from './club-access-fixtures.js'

const PERIOD = 'FA26'
const CLUB_A = 'c0000000000000000000a001'
const CLUB_B = 'c0000000000000000000a002'
const MISSING_ID = 'e00000000000000000000fff'
const officer = actor(OFFICER_ID)

const calendar = [
  {
    code: 'SU26',
    startAt: new Date('2026-05-01T00:00:00Z'),
    endAt: new Date('2026-08-31T00:00:00Z'),
  },
  {
    code: PERIOD,
    startAt: new Date('2026-09-01T00:00:00Z'),
    endAt: new Date('2026-12-31T00:00:00Z'),
  },
  {
    code: 'SP27',
    startAt: new Date('2027-01-01T00:00:00Z'),
    endAt: new Date('2027-04-30T00:00:00Z'),
  },
]

const activeScheme: EvaluationScheme = {
  ...DEFAULT_SCHEME_SETTINGS,
  id: 'scheme-fa26-v1',
  periodCode: PERIOD,
  version: 1,
  state: 'Active',
  totalWeight: 100,
  createdAt: new Date('2026-08-01T00:00:00Z'),
}

const busyClub: Partial<Record<MetricKey, number>> = {
  registrations: 10,
  attendances: 8,
  uniqueAttendees: 8,
  activeMembers: 10,
  outsiderAttendees: 4,
  publicCompletedEvents: 2,
  acceptedInvitations: 1,
  applications: 5,
  completedEvents: 3,
  cancelledEvents: 1,
  feedbackCount: 6,
  feedbackAverage: 4.5,
  reportsDue: 2,
  reportsOnTime: 2,
  bookingsGranted: 2,
  bookingsUsed: 2,
  budgets: 2,
  budgetsClean: 1,
  leaderSeated: 1,
  membersLeft: 2,
}

function metrics(values: Partial<Record<MetricKey, number>>): ClubMetrics {
  return Object.fromEntries(
    METRIC_KEYS.map((key) => [
      key,
      { value: values[key] ?? 0, sourceEntity: 'fixture', sourceIds: [] },
    ]),
  ) as unknown as ClubMetrics
}

/** In-memory evaluation store: one record per revision, latest revision per club and period wins. */
function fakeRepository() {
  const records = new Map<string, EvaluationDetail>()
  const state = {
    clubs: [
      { id: CLUB_A, name: 'Alpha', state: 'Active' },
      { id: CLUB_B, name: 'Beta', state: 'Suspended' },
    ],
    metrics: new Map<string, Partial<Record<MetricKey, number>>>([
      [CLUB_A, busyClub],
      [CLUB_B, busyClub],
    ]),
    penalty: new Map<string, number>(),
    unreviewed: [] as { clubId: string; clubName: string }[],
    writes: 0,
  }
  let nextId = 1

  function revisionsOf(record: EvaluationDetail) {
    return [...records.values()]
      .filter((item) => item.clubId === record.clubId && item.periodCode === record.periodCode)
      .sort((a, b) => b.revisionNo - a.revisionNo)
  }

  function latest(periodCode: string) {
    return [...records.values()].filter(
      (item) => item.periodCode === periodCode && revisionsOf(item)[0]?.id === item.id,
    )
  }

  const repo: EvaluationRepository = {
    async clubsInScope() {
      return state.clubs
    },
    async latest(periodCode) {
      return latest(periodCode).map((item) => structuredClone(item))
    },
    async find(id) {
      const found = records.get(id)
      return found
        ? structuredClone({
            ...found,
            revisions: revisionsOf(found).map(({ id: revisionId, revisionNo, state: s }) => ({
              id: revisionId,
              revisionNo,
              state: s,
            })),
          })
        : null
    },
    async collectMetrics(clubId) {
      return metrics({
        ...state.metrics.get(clubId),
        periodicReportOverdue: state.penalty.get(clubId) ?? 0,
      })
    },
    async reportPenalty(clubId) {
      return {
        value: state.penalty.get(clubId) ?? 0,
        sourceEntity: 'periodicReports',
        sourceIds: [],
      }
    },
    async unreviewedReports(_periodCode, clubId) {
      return state.unreviewed.filter((item) => !clubId || item.clubId === clubId)
    },
    async writeDraft(input) {
      state.writes += 1
      const previous =
        input.target.kind === 'replace'
          ? records.get(input.target.evaluationId)
          : input.target.kind === 'revision'
            ? records.get(input.target.fromEvaluationId)
            : undefined
      const id =
        input.target.kind === 'replace'
          ? input.target.evaluationId
          : `e${String(nextId++).padStart(23, '0')}`
      const club = state.clubs.find((item) => item.id === input.clubId)!
      records.set(id, {
        id,
        clubId: input.clubId,
        clubName: club.name,
        periodCode: input.periodCode,
        schemeId: input.scheme.id,
        schemeVersion: input.scheme.version,
        state: 'Data Ready',
        revisionNo:
          input.target.kind === 'revision' ? previous!.revisionNo + 1 : (previous?.revisionNo ?? 1),
        dimensions: input.results.map((result) => {
          const setting = input.scheme.dimensions.find((item) => item.code === result.code)!
          return {
            ...result,
            name: DIMENSION_NAMES.get(result.code) ?? result.code,
            weight: setting.weight,
            allowsManual: setting.allowsManual,
          }
        }),
        revisions: [],
        trend: [],
        thresholds: input.scheme.thresholds,
      })
      return id
    },
    async setManual(id, code, manual) {
      const record = records.get(id)!
      record.state = 'Under Review'
      record.dimensions = record.dimensions.map((item) => {
        if (item.code !== code) {
          return item
        }
        const { justification: _drop, ...rest } = item
        return manual
          ? { ...rest, score: manual.score, isManual: true, justification: manual.justification }
          : { ...rest, score: item.computedScore, isManual: false }
      })
    },
    async finalize(id, total) {
      Object.assign(records.get(id)!, { state: 'Finalized', ...total })
    },
    async reopen(id) {
      records.get(id)!.state = 'Under Review'
    },
    async publish(periodCode) {
      const finalized = latest(periodCode).filter((item) => item.state === 'Finalized')
      for (const item of finalized) {
        item.state = 'Published'
      }
      return finalized.length
    },
  }
  return { repo, records, state }
}

function setup(change: { schemes?: EvaluationScheme[]; calendar?: typeof calendar } = {}) {
  const fake = fakeRepository()
  const deps: EvaluationDeps = {
    repo: fake.repo,
    schemes: { list: async () => change.schemes ?? [activeScheme] },
    policy: {
      findEffective: async () =>
        ({
          academicCalendar: change.calendar ?? calendar,
          feedbackMinRespondents: 5,
        }) as unknown as PolicyVersion,
    },
    auth: officerAuth,
  }
  return { ...fake, deps }
}

async function generated() {
  const ctx = setup()
  const overview = await generateEvaluations(ctx.deps, officer, PERIOD, NOW)
  function idOf(clubId: string): string {
    return overview.rows.find((row) => row.clubId === clubId)!.evaluationId!
  }
  return { ...ctx, overview, idA: idOf(CLUB_A), idB: idOf(CLUB_B) }
}

describe('evaluation usecases: officer gate', () => {
  const calls: Array<
    [string, (deps: EvaluationDeps, who: AccessActor | null) => Promise<unknown>]
  > = [
    ['overview', (deps, who) => evaluationOverview(deps, who, PERIOD, NOW)],
    ['generate', (deps, who) => generateEvaluations(deps, who, PERIOD, NOW)],
    ['generate one club', (deps, who) => generateClubEvaluation(deps, who, CLUB_A, PERIOD, NOW)],
    ['get', (deps, who) => getEvaluation(deps, who, MISSING_ID)],
    ['regenerate', (deps, who) => regenerateEvaluation(deps, who, MISSING_ID, NOW)],
    [
      'manual score',
      (deps, who) =>
        setManualScore(deps, who, MISSING_ID, 'D4', { score: 1, justification: 'x' }, NOW),
    ],
    ['finalize', (deps, who) => finalizeEvaluation(deps, who, MISSING_ID, NOW)],
    ['reopen', (deps, who) => reopenEvaluation(deps, who, MISSING_ID, NOW)],
    ['publish', (deps, who) => publishEvaluations(deps, who, PERIOD, NOW)],
  ]
  const callers = [
    ['anonymous', null, 'unauthorized'],
    ['a locked officer', actor(OFFICER_ID, { accountState: 'Locked' }), 'locked'],
    ['a malformed actor id', actor('officer-1'), 'validation'],
    ['a club leader', actor(LEADER_ID), 'forbidden'],
  ] as const

  it.each(calls)(
    '%s rejects every caller that is not an active ICPDP officer',
    async (_name, call) => {
      for (const [, who, kind] of callers) {
        const ctx = setup()
        await expect(call(ctx.deps, who)).rejects.toMatchObject({ kind })
        expect(ctx.state.writes).toBe(0)
      }
    },
  )
})

describe('evaluation overview', () => {
  it('returns no rows when the academic calendar is empty', async () => {
    const ctx = setup({ calendar: [] })
    await expect(evaluationOverview(ctx.deps, officer, undefined, NOW)).resolves.toEqual({
      periods: [],
      rows: [],
      canPublish: false,
    })
  })

  it('defaults to the latest period that has started and flags periods with an active scheme', async () => {
    const ctx = setup()
    const overview = await evaluationOverview(ctx.deps, officer, undefined, NOW)
    expect(overview.periodCode).toBe(PERIOD)
    expect(overview.periods.map((item) => [item.code, item.hasActiveScheme])).toEqual([
      ['SU26', false],
      [PERIOD, true],
      ['SP27', false],
    ])
    expect(overview.scheme).toEqual({ id: activeScheme.id, version: 1 })
    expect(overview.rows).toEqual([
      expect.objectContaining({ clubId: CLUB_A, insufficientCount: 0, manualCount: 0 }),
      expect.objectContaining({ clubId: CLUB_B, clubState: 'Suspended' }),
    ])
    expect(overview.rows[0]).not.toHaveProperty('evaluationId')
    expect(overview.canPublish).toBe(false)
  })

  it('falls back to the first period when none has started yet', async () => {
    const ctx = setup()
    const overview = await evaluationOverview(
      ctx.deps,
      officer,
      undefined,
      new Date('2026-01-01T00:00:00Z'),
    )
    expect(overview.periodCode).toBe('SU26')
    expect(overview).not.toHaveProperty('scheme')
  })

  it('rejects a period that is not in the academic calendar', async () => {
    const ctx = setup()
    await expect(evaluationOverview(ctx.deps, officer, 'XX99', NOW)).rejects.toMatchObject({
      kind: 'validation',
      details: { field: 'periodCode' },
    })
  })
})

describe('generate evaluations (UC42)', () => {
  it('writes one Data Ready draft per club in scope and is idempotent', async () => {
    const { deps, state, overview } = await generated()
    expect(state.writes).toBe(2)
    expect(overview.rows.map((row) => [row.clubName, row.state, row.revisionNo])).toEqual([
      ['Alpha', 'Data Ready', 1],
      ['Beta', 'Data Ready', 1],
    ])
    expect(overview.rows.every((row) => Number.isFinite(row.totalScore) === false)).toBe(true)
    await generateEvaluations(deps, officer, PERIOD, NOW)
    expect(state.writes).toBe(2)
  })

  it('rejects an unknown period and a period without an active scheme', async () => {
    const ctx = setup()
    await expect(generateEvaluations(ctx.deps, officer, 'XX99', NOW)).rejects.toMatchObject({
      kind: 'validation',
    })
    await expect(generateEvaluations(ctx.deps, officer, 'SU26', NOW)).rejects.toMatchObject({
      kind: 'conflict',
    })
    expect(ctx.state.writes).toBe(0)
  })

  it('requires the periodic reports of the period to be reviewed first', async () => {
    const ctx = setup()
    ctx.state.unreviewed = [{ clubId: CLUB_B, clubName: 'Beta' }]
    await expect(generateEvaluations(ctx.deps, officer, PERIOD, NOW)).rejects.toMatchObject({
      kind: 'conflict',
      details: { field: 'periodicReports', clubs: ['Beta'] },
    })
    expect(ctx.state.writes).toBe(0)
  })

  it('does not wait for a report that is already overdue and scores that club zero', async () => {
    const ctx = setup()
    ctx.state.unreviewed = [{ clubId: CLUB_B, clubName: 'Beta' }]
    ctx.state.penalty.set(CLUB_B, 1)
    const overview = await generateEvaluations(ctx.deps, officer, PERIOD, NOW)
    const beta = overview.rows.find((row) => row.clubId === CLUB_B)!
    const detail = await getEvaluation(ctx.deps, officer, beta.evaluationId!)
    expect(detail.dimensions.every((item) => item.score === 0)).toBe(true)
  })

  it('keeps using the scheme version already pinned by the period evaluations (BR51)', async () => {
    const ctx = await generated()
    const newer: EvaluationScheme = { ...activeScheme, id: 'scheme-fa26-v2', version: 2 }
    ctx.deps.schemes = { list: async () => [{ ...activeScheme, state: 'Superseded' }, newer] }
    const overview = await evaluationOverview(ctx.deps, officer, PERIOD, NOW)
    expect(overview.scheme).toEqual({ id: activeScheme.id, version: 1 })
  })
})

describe('generate one club evaluation after a report is accepted', () => {
  it('writes the draft of a club in scope that has none yet', async () => {
    const ctx = setup()
    await generateClubEvaluation(ctx.deps, officer, CLUB_A, PERIOD, NOW)
    expect(ctx.state.writes).toBe(1)
    expect([...ctx.records.values()][0]).toMatchObject({ clubId: CLUB_A, state: 'Data Ready' })
  })

  it.each([
    ['the period is not in the calendar', CLUB_A, 'XX99'],
    ['the period has no active scheme', CLUB_A, 'SU26'],
    ['the club is out of scope', 'c0000000000000000000a0ff', PERIOD],
  ])('does nothing when %s', async (_name, clubId, periodCode) => {
    const ctx = setup()
    await expect(
      generateClubEvaluation(ctx.deps, officer, clubId, periodCode, NOW),
    ).resolves.toBeUndefined()
    expect(ctx.state.writes).toBe(0)
  })

  it('does nothing when the club already has an evaluation for the period', async () => {
    const ctx = await generated()
    await generateClubEvaluation(ctx.deps, officer, CLUB_A, PERIOD, NOW)
    expect(ctx.state.writes).toBe(2)
  })
})

describe('evaluation detail', () => {
  it('rejects a malformed id and reports a missing evaluation', async () => {
    const ctx = setup()
    await expect(getEvaluation(ctx.deps, officer, '{"$ne":null}')).rejects.toMatchObject({
      kind: 'validation',
    })
    await expect(getEvaluation(ctx.deps, officer, MISSING_ID)).rejects.toMatchObject({
      kind: 'not_found',
    })
  })
})

describe('manual scores (UC43 FR-02)', () => {
  it('sets and clears a manual score on a dimension the scheme allows', async () => {
    const { deps, idA } = await generated()
    const scored = await setManualScore(
      deps,
      officer,
      idA,
      'D4',
      { score: 95, justification: '  Ran every planned event  ' },
      NOW,
    )
    expect(scored.dimensions.find((item) => item.code === 'D4')).toMatchObject({
      score: 95,
      isManual: true,
      justification: 'Ran every planned event',
    })
    const cleared = await setManualScore(deps, officer, idA, 'D4', null, NOW)
    expect(cleared.dimensions.find((item) => item.code === 'D4')?.isManual).toBe(false)
  })

  it('rejects a dimension the scheme computes only, and an out-of-range or unjustified score', async () => {
    const { deps, idA } = await generated()
    await expect(
      setManualScore(deps, officer, idA, 'D1', { score: 50, justification: 'x' }, NOW),
    ).rejects.toMatchObject({ kind: 'conflict' })
    await expect(
      setManualScore(deps, officer, idA, 'D4', { score: 101, justification: 'x' }, NOW),
    ).rejects.toMatchObject({ kind: 'validation' })
    await expect(
      setManualScore(deps, officer, idA, 'D4', { score: 50, justification: '  ' }, NOW),
    ).rejects.toMatchObject({ kind: 'validation' })
  })

  it('refuses manual scores once finalized or when a periodic report is overdue', async () => {
    const ctx = await generated()
    ctx.state.penalty.set(CLUB_B, 1)
    await expect(
      setManualScore(ctx.deps, officer, ctx.idB, 'D4', { score: 50, justification: 'x' }, NOW),
    ).rejects.toMatchObject({ kind: 'conflict' })
    await finalizeEvaluation(ctx.deps, officer, ctx.idA, NOW)
    await expect(
      setManualScore(ctx.deps, officer, ctx.idA, 'D4', { score: 50, justification: 'x' }, NOW),
    ).rejects.toMatchObject({ kind: 'conflict' })
  })
})

describe('finalize, reopen and regenerate', () => {
  it('finalizes with the weighted total and classification, then reopens', async () => {
    const { deps, idA } = await generated()
    const finalized = await finalizeEvaluation(deps, officer, idA, NOW)
    expect(finalized.state).toBe('Finalized')
    expect(finalized.totalScore).toBeGreaterThan(0)
    expect(finalized.classification).toBeDefined()
    await expect(finalizeEvaluation(deps, officer, idA, NOW)).rejects.toMatchObject({
      kind: 'conflict',
    })
    await expect(regenerateEvaluation(deps, officer, idA, NOW)).rejects.toMatchObject({
      kind: 'conflict',
    })
    const reopened = await reopenEvaluation(deps, officer, idA, NOW)
    expect(reopened.state).toBe('Under Review')
    await expect(reopenEvaluation(deps, officer, idA, NOW)).rejects.toMatchObject({
      kind: 'conflict',
    })
  })

  it('refuses to finalize an evaluation with no scored dimension', async () => {
    const ctx = setup()
    ctx.state.metrics.set(CLUB_A, {})
    await generateClubEvaluation(ctx.deps, officer, CLUB_A, PERIOD, NOW)
    const [id] = [...ctx.records.keys()]
    const record = ctx.records.get(id!)!
    record.dimensions = record.dimensions.map(({ score: _score, ...rest }) => rest)
    await expect(finalizeEvaluation(ctx.deps, officer, id!, NOW)).rejects.toMatchObject({
      kind: 'conflict',
    })
  })

  it('regenerates a penalized draft to a zero score before finalizing it', async () => {
    const ctx = await generated()
    ctx.state.penalty.set(CLUB_A, 1)
    const finalized = await finalizeEvaluation(ctx.deps, officer, ctx.idA, NOW)
    expect(finalized).toMatchObject({ state: 'Finalized', totalScore: 0 })
  })

  it('keeps the officer manual scores when a draft is regenerated in place', async () => {
    const { deps, idA, state } = await generated()
    await setManualScore(deps, officer, idA, 'D5', { score: 42, justification: 'late' }, NOW)
    const regenerated = await regenerateEvaluation(deps, officer, idA, NOW)
    expect(regenerated.id).toBe(idA)
    expect(regenerated.revisionNo).toBe(1)
    expect(regenerated.dimensions.find((item) => item.code === 'D5')).toMatchObject({
      score: 42,
      isManual: true,
    })
    expect(state.writes).toBe(3)
  })

  it('drops manual scores when the regenerated data carries a report penalty', async () => {
    const ctx = await generated()
    await setManualScore(ctx.deps, officer, ctx.idA, 'D5', { score: 42, justification: 'x' }, NOW)
    ctx.state.penalty.set(CLUB_A, 1)
    const regenerated = await regenerateEvaluation(ctx.deps, officer, ctx.idA, NOW)
    expect(regenerated.dimensions.every((item) => item.score === 0 && !item.isManual)).toBe(true)
  })

  it('rejects regenerating when the pinned scheme no longer exists', async () => {
    const ctx = await generated()
    ctx.deps.schemes = { list: async () => [] }
    await expect(regenerateEvaluation(ctx.deps, officer, ctx.idA, NOW)).rejects.toMatchObject({
      kind: 'conflict',
    })
  })

  it('requires the club report to be reviewed before regenerating', async () => {
    const ctx = await generated()
    ctx.state.unreviewed = [{ clubId: CLUB_A, clubName: 'Alpha' }]
    await expect(regenerateEvaluation(ctx.deps, officer, ctx.idA, NOW)).rejects.toMatchObject({
      kind: 'conflict',
      details: { clubs: ['Alpha'] },
    })
  })
})

describe('publish (UC43)', () => {
  async function allFinalized() {
    const ctx = await generated()
    await finalizeEvaluation(ctx.deps, officer, ctx.idA, NOW)
    await finalizeEvaluation(ctx.deps, officer, ctx.idB, NOW)
    return ctx
  }

  it('refuses to publish until every club is finalized', async () => {
    const ctx = await generated()
    await finalizeEvaluation(ctx.deps, officer, ctx.idA, NOW)
    await expect(publishEvaluations(ctx.deps, officer, PERIOD, NOW)).rejects.toMatchObject({
      kind: 'conflict',
    })
  })

  it('publishes the whole period once every club is finalized', async () => {
    const ctx = await allFinalized()
    expect((await evaluationOverview(ctx.deps, officer, PERIOD, NOW)).canPublish).toBe(true)
    const overview = await publishEvaluations(ctx.deps, officer, PERIOD, NOW)
    expect(overview.rows.map((row) => row.state)).toEqual(['Published', 'Published'])
    expect(overview.canPublish).toBe(false)
    await expect(publishEvaluations(ctx.deps, officer, PERIOD, NOW)).rejects.toMatchObject({
      kind: 'conflict',
    })
  })

  it('refuses to publish when a periodic report became overdue after finalizing', async () => {
    const ctx = await allFinalized()
    ctx.state.penalty.set(CLUB_B, 1)
    await expect(publishEvaluations(ctx.deps, officer, PERIOD, NOW)).rejects.toMatchObject({
      kind: 'conflict',
      message: expect.stringMatching(/periodic report status changed/),
    })
  })

  it('opens a new revision when a published result is regenerated (UC43 A1)', async () => {
    const ctx = await allFinalized()
    await publishEvaluations(ctx.deps, officer, PERIOD, NOW)
    const revision = await regenerateEvaluation(ctx.deps, officer, ctx.idA, NOW)
    expect(revision.id).not.toBe(ctx.idA)
    expect(revision).toMatchObject({ revisionNo: 2, state: 'Data Ready' })
    expect(revision.revisions.map((item) => item.revisionNo)).toEqual([2, 1])
    await expect(regenerateEvaluation(ctx.deps, officer, ctx.idA, NOW)).rejects.toMatchObject({
      kind: 'conflict',
      message: 'only the latest revision can change',
    })
  })
})
