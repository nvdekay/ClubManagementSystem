import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../../src/domain/auth.js'
import type { ClubEvaluationRepository } from '../../src/domain/club-evaluation.js'
import type { TransitionPlanInput } from '../../src/domain/club-transition-plan.js'
import type { ClubViolationRepository } from '../../src/domain/club-violation.js'
import type {
  SuspensionRequestInput,
  SuspensionRequestRepository,
} from '../../src/domain/suspension-request.js'
import { runAccountabilityReminders } from '../../src/usecase/accountability-reminder.js'
import { expireClubApplications } from '../../src/usecase/application-expiry.js'
import { publishedClubEvaluations } from '../../src/usecase/club-evaluation.js'
import {
  clubTransitionContext,
  writeClubTransition,
} from '../../src/usecase/club-transition-plan.js'
import { listClubViolations, respondClubViolation } from '../../src/usecase/club-violation.js'
import {
  reviewSuspensions,
  submitSuspension,
  suspensionContext,
} from '../../src/usecase/suspension-request.js'
import {
  actor,
  CLUB_ID,
  clubAccess,
  LEADER_ID,
  MEMBER_ID,
  NOW,
  OFFICER_ID,
  OTHER_CLUB_ID,
  officerAuth,
  OUTSIDER_ID,
} from './club-access-fixtures.js'

const CASE_ID = 'e0000000000000000000e001'
const ACTION_ID = 'e0000000000000000000e002'
const PLAN_ID = 'e0000000000000000000e003'
const REQUEST_ID = 'e0000000000000000000e004'

/**
 * Every club-scoped read and write must reject, before touching the repository, an anonymous
 * caller, a locked account, a malformed identifier, an outsider, a plain member without the
 * permission, and a leader of the club acting on another club.
 */
const deniedCallers = [
  { name: 'anonymous', who: null, clubId: CLUB_ID, kind: 'unauthorized' },
  {
    name: 'locked leader',
    who: actor(LEADER_ID, { accountState: 'Locked', lockReason: 'disciplinary lock' }),
    clubId: CLUB_ID,
    kind: 'locked',
  },
  { name: 'malformed actor id', who: actor('not-an-id'), clubId: CLUB_ID, kind: 'validation' },
  { name: 'malformed club id', who: actor(LEADER_ID), clubId: 'club-1', kind: 'validation' },
  { name: 'outsider', who: actor(OUTSIDER_ID), clubId: CLUB_ID, kind: 'forbidden' },
  { name: 'plain member', who: actor(MEMBER_ID), clubId: CLUB_ID, kind: 'forbidden' },
  {
    name: 'leader of another club',
    who: actor(LEADER_ID),
    clubId: OTHER_CLUB_ID,
    kind: 'forbidden',
  },
] as const

describe('scheduled usecases', () => {
  it('runAccountabilityReminders delegates to the repository with the given time', async () => {
    const remind = vi.fn(async () => 4)
    await expect(runAccountabilityReminders({ remind }, NOW)).resolves.toBe(4)
    expect(remind).toHaveBeenCalledWith(NOW)
  })

  it('expireClubApplications delegates to the repository with the given time', async () => {
    const expire = vi.fn(async () => 2)
    await expect(expireClubApplications({ expire }, NOW)).resolves.toBe(2)
    expect(expire).toHaveBeenCalledWith(NOW)
  })
})

describe('club evaluations (published results)', () => {
  function repo() {
    return { listPublished: vi.fn(async () => []) } satisfies ClubEvaluationRepository
  }

  it.each(deniedCallers)('rejects $name', async ({ who, clubId, kind }) => {
    const evaluations = repo()
    await expect(
      publishedClubEvaluations(evaluations, clubAccess(), who, clubId, NOW),
    ).rejects.toMatchObject({ kind })
    expect(evaluations.listPublished).not.toHaveBeenCalled()
  })

  it('lists the published results of the leader own club', async () => {
    const evaluations = repo()
    await expect(
      publishedClubEvaluations(evaluations, clubAccess(), actor(LEADER_ID), CLUB_ID, NOW),
    ).resolves.toEqual([])
    expect(evaluations.listPublished).toHaveBeenCalledWith(CLUB_ID)
  })
})

describe('club violations', () => {
  function repo() {
    return {
      list: vi.fn(async () => []),
      respond: vi.fn(async () => undefined),
      submitAction: vi.fn(async () => undefined),
    } satisfies ClubViolationRepository
  }

  it.each(deniedCallers)('rejects $name on list and respond', async ({ who, clubId, kind }) => {
    const violations = repo()
    await expect(
      listClubViolations(violations, clubAccess(), who, clubId, NOW),
    ).rejects.toMatchObject({ kind })
    await expect(
      respondClubViolation(violations, clubAccess(), who, clubId, CASE_ID, { text: 'ok' }, NOW),
    ).rejects.toMatchObject({ kind })
    expect(violations.list).not.toHaveBeenCalled()
    expect(violations.respond).not.toHaveBeenCalled()
  })

  it('lets the leader list the cases of the club', async () => {
    const violations = repo()
    await listClubViolations(violations, clubAccess(), actor(LEADER_ID), CLUB_ID, NOW)
    expect(violations.list).toHaveBeenCalledWith(CLUB_ID, NOW)
  })

  it('records a trimmed text response by the leader', async () => {
    const violations = repo()
    await respondClubViolation(
      violations,
      clubAccess(),
      actor(LEADER_ID),
      CLUB_ID,
      CASE_ID,
      { text: '  We cancelled the event.  ' },
      NOW,
    )
    expect(violations.respond).toHaveBeenCalledWith(
      CLUB_ID,
      CASE_ID,
      'We cancelled the event.',
      LEADER_ID,
      NOW,
    )
  })

  it.each([
    ['a malformed case id', 'case-1', { text: 'ok' }],
    ['a blank response', CASE_ID, { text: '   ' }],
    ['a response over 5000 characters', CASE_ID, { text: 'x'.repeat(5001) }],
    ['a malformed corrective action id', CASE_ID, { actionId: 'a1', note: 'done', evidence: [] }],
    [
      'more than 20 evidence items',
      CASE_ID,
      {
        actionId: ACTION_ID,
        note: 'done',
        evidence: Array.from({ length: 21 }, () => ({ note: 'photo' })),
      },
    ],
    [
      'an evidence link that is not http(s)',
      CASE_ID,
      { actionId: ACTION_ID, note: 'done', evidence: [{ note: 'x', url: 'javascript:alert(1)' }] },
    ],
  ] as const)('rejects %s', async (_name, id, input) => {
    const violations = repo()
    await expect(
      respondClubViolation(
        violations,
        clubAccess(),
        actor(LEADER_ID),
        CLUB_ID,
        id,
        structuredClone(input) as Parameters<typeof respondClubViolation>[5],
        NOW,
      ),
    ).rejects.toMatchObject({ kind: 'validation' })
    expect(violations.respond).not.toHaveBeenCalled()
    expect(violations.submitAction).not.toHaveBeenCalled()
  })

  it('submits a corrective action with normalized evidence and without audit fields', async () => {
    const violations = repo()
    await respondClubViolation(
      violations,
      clubAccess(),
      actor(LEADER_ID),
      CLUB_ID,
      CASE_ID,
      {
        actionId: ACTION_ID,
        note: ' Held a briefing ',
        evidence: [
          { note: ' Minutes ', url: 'https://drive.example/minutes' },
          { note: 'Photo only' },
          { note: '   ' },
        ],
      },
      NOW,
    )
    expect(violations.submitAction).toHaveBeenCalledWith(
      CLUB_ID,
      CASE_ID,
      ACTION_ID,
      {
        note: 'Held a briefing',
        evidence: [
          { note: 'Minutes', url: 'https://drive.example/minutes' },
          { note: 'Photo only' },
        ],
      },
      LEADER_ID,
      NOW,
    )
  })
})

describe('club transition plan', () => {
  function repo() {
    return {
      context: vi.fn(async () => ({
        term: null,
        positions: [],
        members: [],
        obligations: [],
        plans: [],
      })),
      create: vi.fn(async () => ({ id: PLAN_ID })),
      save: vi.fn(async () => ({ id: PLAN_ID })),
      submit: vi.fn(async () => ({ id: PLAN_ID })),
    }
  }
  type Repo = Parameters<typeof writeClubTransition>[0]

  function plan(change: Partial<TransitionPlanInput> = {}): TransitionPlanInput {
    return {
      toTerm: {
        name: '  Term 2027  ',
        startAt: new Date('2027-01-01T00:00:00Z'),
        endAt: new Date('2027-12-31T00:00:00Z'),
      },
      candidates: [{ positionCode: 'LEADER', membershipId: MEMBER_ID }],
      handoverItems: [{ id: 'h1', description: 'Bank account' }],
      assignees: { h1: MEMBER_ID },
      ...change,
    }
  }

  it.each(deniedCallers)('rejects $name', async ({ who, clubId, kind }) => {
    const plans = repo()
    await expect(
      clubTransitionContext(plans as unknown as Repo, clubAccess(), who, clubId, NOW),
    ).rejects.toMatchObject({ kind })
    await expect(
      writeClubTransition(
        plans as unknown as Repo,
        clubAccess(),
        who,
        clubId,
        { input: plan() },
        NOW,
      ),
    ).rejects.toMatchObject({ kind })
    expect(plans.context).not.toHaveBeenCalled()
    expect(plans.create).not.toHaveBeenCalled()
  })

  it('returns the transition context to the leader', async () => {
    const plans = repo()
    await clubTransitionContext(
      plans as unknown as Repo,
      clubAccess(),
      actor(LEADER_ID),
      CLUB_ID,
      NOW,
    )
    expect(plans.context).toHaveBeenCalledWith(CLUB_ID, NOW)
  })

  it('creates a new plan with the normalized content', async () => {
    const plans = repo()
    await writeClubTransition(
      plans as unknown as Repo,
      clubAccess(),
      actor(LEADER_ID),
      CLUB_ID,
      { input: plan() },
      NOW,
    )
    expect(plans.create).toHaveBeenCalledWith(
      CLUB_ID,
      expect.objectContaining({ toTerm: expect.objectContaining({ name: 'Term 2027' }) }),
      LEADER_ID,
      NOW,
    )
  })

  it('saves an existing plan at its revision, or submits it when no content is sent', async () => {
    const plans = repo()
    const leader = actor(LEADER_ID)
    await writeClubTransition(
      plans as unknown as Repo,
      clubAccess(),
      leader,
      CLUB_ID,
      { id: PLAN_ID, revision: 2, input: plan() },
      NOW,
    )
    expect(plans.save).toHaveBeenCalledWith(CLUB_ID, PLAN_ID, 2, expect.any(Object), LEADER_ID, NOW)
    await writeClubTransition(
      plans as unknown as Repo,
      clubAccess(),
      leader,
      CLUB_ID,
      { id: PLAN_ID, revision: 3 },
      NOW,
    )
    expect(plans.submit).toHaveBeenCalledWith(CLUB_ID, PLAN_ID, 3, LEADER_ID, NOW)
    expect(plans.create).not.toHaveBeenCalled()
  })

  it.each([
    ['a new plan without content', {}],
    ['a malformed plan id', { id: 'plan-1', revision: 0 }],
    ['a missing revision', { id: PLAN_ID }],
    ['a negative revision', { id: PLAN_ID, revision: -1 }],
    ['a fractional revision', { id: PLAN_ID, revision: 1.5 }],
    ['an empty target term name', { input: plan({ toTerm: { ...plan().toTerm, name: ' ' } }) }],
    [
      'a target term that ends before it starts',
      {
        input: plan({
          toTerm: { ...plan().toTerm, endAt: new Date('2026-12-31T00:00:00Z') },
        }),
      },
    ],
    [
      'duplicate candidates',
      {
        input: plan({
          candidates: [
            { positionCode: 'LEADER', membershipId: MEMBER_ID },
            { positionCode: 'VICE_LEADER', membershipId: MEMBER_ID },
          ],
        }),
      },
    ],
    ['an assignee with a malformed id', { input: plan({ assignees: { h1: 'someone' } }) }],
    ['an early reason over 2000 characters', { input: plan({ earlyReason: 'x'.repeat(2001) }) }],
  ] as const)('rejects %s', async (_name, action) => {
    const plans = repo()
    await expect(
      writeClubTransition(
        plans as unknown as Repo,
        clubAccess(),
        actor(LEADER_ID),
        CLUB_ID,
        action as Parameters<typeof writeClubTransition>[4],
        NOW,
      ),
    ).rejects.toMatchObject({ kind: 'validation' })
    expect(plans.create).not.toHaveBeenCalled()
    expect(plans.save).not.toHaveBeenCalled()
    expect(plans.submit).not.toHaveBeenCalled()
  })
})

describe('suspension request', () => {
  function repo() {
    return {
      context: vi.fn(async () => ({ impacts: [], requests: [] })),
      submit: vi.fn(async () => ({ id: REQUEST_ID })),
      list: vi.fn(async () => []),
      decide: vi.fn(async () => undefined),
    }
  }
  type Repo = SuspensionRequestRepository

  function request(change: Partial<SuspensionRequestInput> = {}): SuspensionRequestInput {
    return {
      reason: '  Exam season  ',
      until: new Date('2026-12-01T00:00:00Z'),
      obligationsPlan: 'Pay pending invoices',
      recoveryPlan: 'Resume in January',
      acknowledgedImpactIds: ['b', 'a', 'b'],
      ...change,
    }
  }

  it.each(deniedCallers)('rejects $name on context and submit', async ({ who, clubId, kind }) => {
    const requests = repo()
    await expect(
      suspensionContext(requests as unknown as Repo, clubAccess(), who, clubId, NOW),
    ).rejects.toMatchObject({ kind })
    await expect(
      submitSuspension(requests as unknown as Repo, clubAccess(), who, clubId, request(), NOW),
    ).rejects.toMatchObject({ kind })
    expect(requests.context).not.toHaveBeenCalled()
    expect(requests.submit).not.toHaveBeenCalled()
  })

  it('submits a normalized request from the leader', async () => {
    const requests = repo()
    await suspensionContext(
      requests as unknown as Repo,
      clubAccess(),
      actor(LEADER_ID),
      CLUB_ID,
      NOW,
    )
    expect(requests.context).toHaveBeenCalledWith(CLUB_ID, NOW)
    await submitSuspension(
      requests as unknown as Repo,
      clubAccess(),
      actor(LEADER_ID),
      CLUB_ID,
      request(),
      NOW,
    )
    expect(requests.submit).toHaveBeenCalledWith(
      CLUB_ID,
      expect.objectContaining({ reason: 'Exam season', acknowledgedImpactIds: ['a', 'b'] }),
      LEADER_ID,
      NOW,
    )
  })

  it.each([
    ['a blank reason', { reason: '  ' }],
    ['an end date in the past', { until: new Date('2026-10-01T00:00:00Z') }],
    ['an invalid end date', { until: new Date('nope') }],
    ['a blank obligations plan', { obligationsPlan: '' }],
    ['a blank recovery plan', { recoveryPlan: ' ' }],
  ])('rejects a request with %s', async (_name, change) => {
    const requests = repo()
    await expect(
      submitSuspension(
        requests as unknown as Repo,
        clubAccess(),
        actor(LEADER_ID),
        CLUB_ID,
        request(change),
        NOW,
      ),
    ).rejects.toMatchObject({ kind: 'validation' })
    expect(requests.submit).not.toHaveBeenCalled()
  })

  it.each([
    ['anonymous', null, 'unauthorized'],
    ['a locked officer', actor(OFFICER_ID, { accountState: 'Locked' }), 'locked'],
    ['a club leader', actor(LEADER_ID), 'forbidden'],
  ] as const)('denies %s the ICPDP review', async (_name, who, kind) => {
    const requests = repo()
    await expect(
      reviewSuspensions(
        requests as unknown as Repo,
        officerAuth as unknown as AuthRepository,
        who,
        undefined,
        NOW,
      ),
    ).rejects.toMatchObject({ kind })
    expect(requests.list).not.toHaveBeenCalled()
    expect(requests.decide).not.toHaveBeenCalled()
  })

  it('lists requests for the officer and records a trimmed decision', async () => {
    const requests = repo()
    const officer = actor(OFFICER_ID)
    await reviewSuspensions(
      requests as unknown as Repo,
      officerAuth as unknown as AuthRepository,
      officer,
      undefined,
      NOW,
    )
    expect(requests.list).toHaveBeenCalledTimes(1)
    expect(requests.decide).not.toHaveBeenCalled()
    await reviewSuspensions(
      requests as unknown as Repo,
      officerAuth as unknown as AuthRepository,
      officer,
      { id: REQUEST_ID, outcome: 'Reject', reason: '  Missing recovery budget  ' },
      NOW,
    )
    expect(requests.decide).toHaveBeenCalledWith(
      REQUEST_ID,
      'Reject',
      'Missing recovery budget',
      OFFICER_ID,
      NOW,
    )
    expect(requests.list).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['a malformed request id', { id: 'r1', outcome: 'Approve', reason: 'ok' }],
    ['a blank reason', { id: REQUEST_ID, outcome: 'Approve', reason: '   ' }],
    [
      'a reason over 2000 characters',
      { id: REQUEST_ID, outcome: 'Approve', reason: 'x'.repeat(2001) },
    ],
  ] as const)('rejects a decision with %s', async (_name, action) => {
    const requests = repo()
    await expect(
      reviewSuspensions(
        requests as unknown as Repo,
        officerAuth as unknown as AuthRepository,
        actor(OFFICER_ID),
        { ...action },
        NOW,
      ),
    ).rejects.toMatchObject({ kind: 'validation' })
    expect(requests.decide).not.toHaveBeenCalled()
  })
})
