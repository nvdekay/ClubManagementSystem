import { describe, expect, it } from 'vitest'
import {
  applyViolationStep,
  RESPONSE_DUE_DAYS,
  type ClubResponse,
  type CorrectiveAction,
  type ViolationCase,
  type ViolationStep,
} from '../../src/domain/violation.js'

// Branch-by-branch coverage of applyViolationStep, one describe block per step type.

const now = new Date('2026-10-10T08:00:00Z')
const past = new Date('2026-10-01T08:00:00Z')
const future = new Date('2026-10-20T08:00:00Z')
const officer = 'officer-1'

function base(change: Partial<ViolationCase> = {}): ViolationCase {
  return {
    id: 'c1',
    clubId: 'club-1',
    clubName: 'HEBE',
    originType: 'OTHER',
    severity: 'MODERATE',
    title: 'Case',
    evidence: [],
    decisionEvidence: [],
    state: 'Open',
    openedBy: officer,
    openedAt: past,
    actions: [],
    ...change,
  }
}

function awaiting(response: Partial<ClubResponse> = {}): ViolationCase {
  return base({
    state: 'Awaiting Club Response',
    responseDueAt: future,
    clubResponse: {
      requestMessage: 'Explain',
      requestedBy: officer,
      requestedAt: past,
      dueAt: future,
      ...response,
    },
  })
}

function action(change: Partial<CorrectiveAction> = {}): CorrectiveAction {
  return { id: 'a1', description: 'Fix it', dueAt: future, state: 'Pending', ...change }
}

function step(current: ViolationCase, value: ViolationStep, at = now) {
  return applyViolationStep(current, value, officer, at)
}

describe('applyViolationStep', () => {
  it('rejects every step on a closed or resolved case', () => {
    for (const state of ['Resolved', 'Closed'] as const) {
      expect(() => step(base({ state }), { type: 'investigate' })).toThrow(/already closed/)
    }
  })

  it('does not mutate the stored case', () => {
    const current = base({ evidence: [], actions: [action()], state: 'Corrective Action' })
    step(current, { type: 'addEvidence', evidence: { note: 'n' } })
    expect(current.evidence).toEqual([])
    step(
      {
        ...current,
        actions: [
          action({ submission: { note: 'x', evidence: [], submittedBy: 'l', submittedAt: past } }),
        ],
      },
      { type: 'verifyAction', actionId: 'a1', outcome: 'Verified' },
    )
    expect(current.actions[0]!.state).toBe('Pending')
  })

  describe('investigate', () => {
    it('moves an open case to investigation without notifying the club', () => {
      expect(step(base(), { type: 'investigate' })).toMatchObject({
        next: { state: 'Under Investigation' },
        action: 'VIOLATION_INVESTIGATING',
        notifyClub: false,
      })
    })

    it('only applies to an open case', () => {
      expect(() => step(base({ state: 'Under Investigation' }), { type: 'investigate' })).toThrow(
        /only an open case/,
      )
    })
  })

  describe('addEvidence', () => {
    it('appends normalized evidence', () => {
      const result = step(base({ state: 'Decision Issued' }), {
        type: 'addEvidence',
        evidence: { note: '  photo ', url: 'https://x.vn/a.jpg' },
      })
      expect(result).toMatchObject({ action: 'VIOLATION_EVIDENCE_ADDED', notifyClub: false })
      expect(result.next.evidence).toEqual([
        { note: 'photo', url: 'https://x.vn/a.jpg', addedBy: officer, addedAt: now },
      ])
    })

    it('needs a note or a link', () => {
      expect(() => step(base(), { type: 'addEvidence', evidence: { note: '  ' } })).toThrow(
        /needs a note or a link/,
      )
    })
  })

  describe('requestResponse', () => {
    it('asks the club with the default deadline from Open or Under Investigation', () => {
      for (const state of ['Open', 'Under Investigation'] as const) {
        const result = step(base({ state }), { type: 'requestResponse', message: ' Why? ' })
        const dueAt = new Date(now.getTime() + RESPONSE_DUE_DAYS * 24 * 60 * 60 * 1000)
        expect(result).toEqual({
          next: expect.objectContaining({
            state: 'Awaiting Club Response',
            responseDueAt: dueAt,
            clubResponse: { requestMessage: 'Why?', requestedBy: officer, requestedAt: now, dueAt },
          }),
          action: 'VIOLATION_RESPONSE_REQUESTED',
          reason: 'Why?',
          notifyClub: true,
        })
      }
    })

    it('uses an explicit future deadline', () => {
      const result = step(base(), { type: 'requestResponse', message: 'Why?', dueAt: future })
      expect(result.next.responseDueAt).toEqual(future)
    })

    it('rejects the wrong state, empty or long messages and past deadlines', () => {
      expect(() =>
        step(base({ state: 'Decision Issued' }), { type: 'requestResponse', message: 'x' }),
      ).toThrow(/before a decision/)
      expect(() => step(base(), { type: 'requestResponse', message: '  ' })).toThrow(
        /what to explain/,
      )
      expect(() => step(base(), { type: 'requestResponse', message: 'x'.repeat(2001) })).toThrow(
        /message is too long/,
      )
      expect(() => step(base(), { type: 'requestResponse', message: 'x', dueAt: now })).toThrow(
        /must be in the future/,
      )
    })
  })

  describe('recordResponse', () => {
    it('records what the club answered', () => {
      const result = step(awaiting(), { type: 'recordResponse', text: ' We forgot ' })
      expect(result).toMatchObject({
        next: {
          clubResponse: {
            source: 'RECORDED_BY_ICPDP',
            text: 'We forgot',
            recordedBy: officer,
            respondedAt: now,
          },
        },
        action: 'VIOLATION_RESPONSE_RECORDED',
        notifyClub: false,
      })
    })

    it('records a missing response once the deadline has passed', () => {
      const result = step(awaiting({ dueAt: past }), { type: 'recordResponse', noResponse: true })
      expect(result).toMatchObject({
        next: { clubResponse: { source: 'NO_RESPONSE', recordedBy: officer, respondedAt: now } },
        action: 'VIOLATION_NO_RESPONSE_RECORDED',
        notifyClub: false,
      })
      expect(() => step(awaiting(), { type: 'recordResponse', noResponse: true })).toThrow(
        /has not passed yet/,
      )
      expect(() =>
        step(awaiting({ dueAt: now }), { type: 'recordResponse', noResponse: true }),
      ).toThrow(/has not passed yet/)
    })

    it('needs an awaited, not yet recorded response and a non-empty answer', () => {
      expect(() => step(base(), { type: 'recordResponse', text: 'x' })).toThrow(/no club response/)
      expect(() =>
        step(base({ state: 'Awaiting Club Response' }), { type: 'recordResponse', text: 'x' }),
      ).toThrow(/no club response/)
      expect(() =>
        step(awaiting({ source: 'CLUB' }), { type: 'recordResponse', text: 'x' }),
      ).toThrow(/already recorded/)
      expect(() => step(awaiting(), { type: 'recordResponse' })).toThrow(/what the club answered/)
      expect(() => step(awaiting(), { type: 'recordResponse', text: 'x'.repeat(5001) })).toThrow(
        /text is too long/,
      )
    })
  })

  describe('decide', () => {
    const evidence = [{ note: 'minutes' }]

    it('closes the case on NO_VIOLATION from any state before a decision', () => {
      for (const current of [base(), base({ state: 'Under Investigation' }), awaiting()]) {
        const result = step(current, { type: 'decide', finding: 'NO_VIOLATION', reason: ' ok ' })
        expect(result).toMatchObject({
          next: {
            state: 'Closed',
            decisionReason: 'ok',
            decisionEvidence: [],
            decidedBy: officer,
            decidedAt: now,
            resolvedAt: now,
          },
          action: 'VIOLATION_CLOSED_NO_VIOLATION',
          reason: 'ok',
          notifyClub: true,
        })
      }
    })

    it('refuses NO_VIOLATION after a decision was issued', () => {
      for (const state of ['Decision Issued', 'Corrective Action'] as const) {
        expect(() =>
          step(base({ state }), { type: 'decide', finding: 'NO_VIOLATION', reason: 'x' }),
        ).toThrow(/already been issued/)
      }
    })

    it('issues a violation decision with evidence once the response is recorded', () => {
      const result = step(awaiting({ source: 'NO_RESPONSE' }), {
        type: 'decide',
        finding: 'VIOLATION',
        reason: 'Confirmed',
        evidence,
      })
      expect(result).toMatchObject({
        next: {
          state: 'Decision Issued',
          decisionReason: 'Confirmed',
          decisionEvidence: [{ note: 'minutes', addedBy: officer, addedAt: now }],
          decidedBy: officer,
          decidedAt: now,
        },
        action: 'VIOLATION_DECIDED',
        reason: 'Confirmed',
        notifyClub: true,
      })
      expect(result.next.resolvedAt).toBeUndefined()
    })

    it('requires a reason, a recorded response and evidence for a violation', () => {
      expect(() => step(base(), { type: 'decide', finding: 'VIOLATION', reason: ' ' })).toThrow(
        /needs a reason/,
      )
      expect(() =>
        step(base(), { type: 'decide', finding: 'VIOLATION', reason: 'x', evidence }),
      ).toThrow(/record the club's response/)
      expect(() =>
        step(awaiting(), { type: 'decide', finding: 'VIOLATION', reason: 'x', evidence }),
      ).toThrow(/record the club's response/)
      expect(() =>
        step(awaiting({ source: 'CLUB' }), { type: 'decide', finding: 'VIOLATION', reason: 'x' }),
      ).toThrow(/needs evidence/)
    })
  })

  describe('addActions', () => {
    const decided = base({ state: 'Decision Issued' })

    it('adds trimmed pending actions and moves to Corrective Action', () => {
      const result = step(decided, {
        type: 'addActions',
        actions: [
          { description: ' Train ', dueAt: future },
          { description: 'Pause', dueAt: future, linkedLifecycleAction: 'SUSPEND' },
        ],
      })
      expect(result).toMatchObject({
        next: {
          state: 'Corrective Action',
          actions: [
            { id: 'new-0', description: 'Train', dueAt: future, state: 'Pending' },
            {
              id: 'new-1',
              description: 'Pause',
              dueAt: future,
              state: 'Pending',
              linkedLifecycleAction: 'SUSPEND',
            },
          ],
        },
        action: 'VIOLATION_ACTIONS_ASSIGNED',
        notifyClub: true,
      })
      expect(result.next.actions[0]).not.toHaveProperty('linkedLifecycleAction')
      // More can follow while the case is already in Corrective Action.
      const more = step(result.next, {
        type: 'addActions',
        actions: [{ description: 'More', dueAt: future }],
      })
      expect(more.next.actions).toHaveLength(3)
    })

    it('follows a decision only', () => {
      expect(() =>
        step(base(), { type: 'addActions', actions: [{ description: 'x', dueAt: future }] }),
      ).toThrow(/follow a violation decision/)
    })

    it('validates the count, descriptions, deadlines and lifecycle links', () => {
      expect(() => step(decided, { type: 'addActions', actions: [] })).toThrow(/between 1 and 10/)
      const full = base({
        state: 'Corrective Action',
        actions: Array.from({ length: 10 }, (_, i) => action({ id: `a${i}` })),
      })
      expect(() =>
        step(full, { type: 'addActions', actions: [{ description: 'x', dueAt: future }] }),
      ).toThrow(/between 1 and 10/)
      const bad: { description: string; dueAt: Date; linkedLifecycleAction?: 'SUSPEND' }[][] = [
        [{ description: '  ', dueAt: future }],
        [{ description: 'x', dueAt: now }],
        [{ description: 'x', dueAt: new Date('invalid') }],
        [{ description: 'x', dueAt: future, linkedLifecycleAction: 'FREEZE' as 'SUSPEND' }],
      ]
      const messages = [
        /needs a description/,
        /future deadline/,
        /future deadline/,
        /lifecycle link/,
      ]
      bad.forEach((actions, index) => {
        expect(() => step(decided, { type: 'addActions', actions })).toThrow(messages[index]!)
      })
      expect(() =>
        step(decided, {
          type: 'addActions',
          actions: [{ description: 'x'.repeat(1001), dueAt: future }],
        }),
      ).toThrow(/actions is too long/)
    })
  })

  describe('verifyAction', () => {
    const submission = { note: 'done', evidence: [], submittedBy: 'leader', submittedAt: past }

    it('resolves the case when the last action is verified', () => {
      const current = base({ state: 'Corrective Action', actions: [action({ submission })] })
      const result = step(current, {
        type: 'verifyAction',
        actionId: 'a1',
        outcome: 'Verified',
        note: ' good ',
      })
      expect(result).toMatchObject({
        next: {
          state: 'Resolved',
          resolvedAt: now,
          actions: [{ state: 'Verified', verifiedBy: officer, verifiedAt: now }],
        },
        action: 'VIOLATION_RESOLVED',
        reason: 'good',
        notifyClub: true,
      })
    })

    it('verifies one of several actions without resolving', () => {
      const current = base({
        state: 'Corrective Action',
        actions: [action({ submission }), action({ id: 'a2' })],
      })
      const result = step(current, { type: 'verifyAction', actionId: 'a1', outcome: 'Verified' })
      expect(result).toMatchObject({
        next: { state: 'Corrective Action' },
        action: 'VIOLATION_ACTION_VERIFIED',
        notifyClub: true,
      })
      expect(result.reason).toBeUndefined()
      expect(result.next.resolvedAt).toBeUndefined()
    })

    it('fails an action with club evidence or after its deadline', () => {
      const withEvidence = base({ state: 'Corrective Action', actions: [action({ submission })] })
      expect(
        step(withEvidence, { type: 'verifyAction', actionId: 'a1', outcome: 'Failed' }),
      ).toMatchObject({ next: { state: 'Corrective Action' }, action: 'VIOLATION_ACTION_FAILED' })
      const overdue = base({ state: 'Corrective Action', actions: [action({ dueAt: past })] })
      expect(
        step(overdue, { type: 'verifyAction', actionId: 'a1', outcome: 'Failed' }).action,
      ).toBe('VIOLATION_ACTION_FAILED')
    })

    it('rejects the wrong state, unknown or checked actions and premature outcomes', () => {
      expect(() =>
        step(base({ state: 'Decision Issued' }), {
          type: 'verifyAction',
          actionId: 'a1',
          outcome: 'Verified',
        }),
      ).toThrow(/no corrective action to verify/)
      const pending = base({ state: 'Corrective Action', actions: [action()] })
      expect(() =>
        step(pending, { type: 'verifyAction', actionId: 'zz', outcome: 'Verified' }),
      ).toThrow(expect.objectContaining({ kind: 'not_found' }))
      expect(() =>
        step(base({ state: 'Corrective Action', actions: [action({ state: 'Failed' })] }), {
          type: 'verifyAction',
          actionId: 'a1',
          outcome: 'Verified',
        }),
      ).toThrow(/already checked/)
      expect(() =>
        step(pending, { type: 'verifyAction', actionId: 'a1', outcome: 'Verified' }),
      ).toThrow(/not submitted evidence/)
      expect(() =>
        step(pending, { type: 'verifyAction', actionId: 'a1', outcome: 'Failed' }),
      ).toThrow(/wait for the club's evidence/)
      expect(() =>
        step(base({ state: 'Corrective Action', actions: [action({ submission })] }), {
          type: 'verifyAction',
          actionId: 'a1',
          outcome: 'Verified',
          note: 'x'.repeat(1001),
        }),
      ).toThrow(/note is too long/)
    })
  })

  describe('resolve', () => {
    it('resolves a decided case once no action is pending', () => {
      for (const current of [
        base({ state: 'Decision Issued' }),
        base({ state: 'Corrective Action', actions: [action({ state: 'Failed' })] }),
      ]) {
        expect(step(current, { type: 'resolve', note: ' wrap ' })).toMatchObject({
          next: { state: 'Resolved', resolvedAt: now },
          action: 'VIOLATION_RESOLVED',
          reason: 'wrap',
          notifyClub: true,
        })
      }
      expect(step(base({ state: 'Decision Issued' }), { type: 'resolve' }).reason).toBeUndefined()
    })

    it('rejects undecided cases and pending actions', () => {
      expect(() => step(base(), { type: 'resolve' })).toThrow(/only a decided case/)
      expect(() =>
        step(base({ state: 'Corrective Action', actions: [action()] }), { type: 'resolve' }),
      ).toThrow(/not checked yet/)
    })
  })
})
