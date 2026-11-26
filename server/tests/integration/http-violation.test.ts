// Violation cases (UC40) over HTTP: the paged ICPDP case queue with filter counts, opening a case
// and the case steps, on the real app with Mongo, sessions and CSRF.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type Actor,
  DAY,
  type Harness,
  type SeededClub,
  dataOf,
  missingId,
  startHttpHarness,
} from './http-harness.js'

describe.skipIf(!process.env.MONGO_URI)('HTTP: violation routes', () => {
  let h: Harness
  let leader: Actor
  let club: SeededClub
  const cases: Record<string, string> = {}

  function openBody(overrides: Record<string, unknown> = {}) {
    return {
      clubId: club.id,
      originType: 'OTHER',
      severity: 'MODERATE',
      title: 'Unregistered fundraising',
      description: 'Collected money without approval',
      evidence: [{ note: 'Photo of the booth', url: 'https://img.test/booth.png' }],
      ...overrides,
    }
  }
  function steps(key: string, body: unknown, who: Actor = h.officer) {
    return h.call(who, 'POST', `/admin/violations/${cases[key]}/steps`, body)
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-violation')
    leader = await h.signIn('leader@http.edu')
    club = await h.seedClub({ code: 'VIO', leader })
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('POST /admin/violations', () => {
    it('validates the case before opening it', async () => {
      expect(
        (await h.call(h.officer, 'POST', '/admin/violations', openBody({ clubId: 'x' }))).status,
      ).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', '/admin/violations', openBody({ severity: 'HUGE' })))
          .status,
      ).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', '/admin/violations', openBody({ title: '' }))).status,
      ).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', '/admin/violations', openBody({ title: '   ' }))).status,
      ).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', '/admin/violations', openBody({ fine: 10 }))).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            '/admin/violations',
            openBody({ evidence: [{ note: 'x', url: 'ftp://files' }] }),
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            '/admin/violations',
            openBody({ originRefId: missingId() }),
          )
        ).status,
      ).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', '/admin/violations', openBody({ clubId: missingId() })))
          .status,
      ).toBe(404)
    })

    it('is for officers only, with CSRF', async () => {
      expect((await h.call(leader, 'POST', '/admin/violations', openBody())).status).toBe(403)
      expect(
        (await h.call(h.officer, 'POST', '/admin/violations', openBody(), { noCsrf: true })).status,
      ).toBe(403)
      expect((await h.call(null, 'POST', '/admin/violations', openBody())).status).toBe(401)
    })

    it('opens cases', async () => {
      for (const key of ['main', 'cleared', 'idle']) {
        const created = dataOf(
          await h.call(h.officer, 'POST', '/admin/violations', openBody({ title: `Case ${key}` })),
          201,
        )
        expect(created).toMatchObject({ state: 'Open', clubId: club.id, severity: 'MODERATE' })
        cases[key] = created.id
      }
    })
  })

  describe('reading cases', () => {
    it('shows a case and the sources of its club', async () => {
      const detail = dataOf(await h.call(h.officer, 'GET', `/admin/violations/${cases.main}`))
      expect(detail).toMatchObject({ id: cases.main, title: 'Case main', clubState: 'Active' })
      expect(detail.history.length).toBeGreaterThan(0)
      expect((await h.call(h.officer, 'GET', `/admin/violations/${missingId()}`)).status).toBe(404)
      expect((await h.call(h.officer, 'GET', '/admin/violations/bad')).status).toBe(400)
      expect((await h.call(leader, 'GET', `/admin/violations/${cases.main}`)).status).toBe(403)

      expect(
        dataOf(await h.call(h.officer, 'GET', `/admin/violations/sources/${club.id}`)),
      ).toEqual({
        events: [],
        budgets: [],
      })
      expect(
        (await h.call(h.officer, 'GET', `/admin/violations/sources/${missingId()}`)).status,
      ).toBe(404)
      expect((await h.call(h.officer, 'GET', '/admin/violations/sources/bad')).status).toBe(400)
      expect((await h.call(leader, 'GET', `/admin/violations/sources/${club.id}`)).status).toBe(403)
    })
  })

  describe('case steps', () => {
    it('validates step bodies', async () => {
      expect((await steps('main', { type: 'teleport' })).status).toBe(400)
      expect((await steps('main', { type: 'investigate', extra: 1 })).status).toBe(400)
      expect((await steps('main', { type: 'requestResponse', message: ' ' })).status).toBe(400)
      expect(
        (
          await steps('main', {
            type: 'requestResponse',
            message: 'Explain',
            dueAt: new Date(Date.now() - DAY).toISOString(),
          })
        ).status,
      ).toBe(400)
      expect((await steps('main', { type: 'addEvidence', evidence: { note: '' } })).status).toBe(
        400,
      )
      expect(
        (await h.call(h.officer, 'POST', '/admin/violations/bad/steps', { type: 'investigate' }))
          .status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/violations/${missingId()}/steps`, {
            type: 'investigate',
          })
        ).status,
      ).toBe(404)
      expect((await steps('main', { type: 'investigate' }, leader)).status).toBe(403)
    })

    it('runs a case from investigation to corrective actions', async () => {
      expect(dataOf(await steps('main', { type: 'investigate' })).state).toBe('Under Investigation')
      expect((await steps('main', { type: 'investigate' })).status).toBe(409)
      expect(
        dataOf(await steps('main', { type: 'addEvidence', evidence: { note: 'Receipt copy' } }))
          .evidence.length,
      ).toBe(2)
      // A violation finding needs the club's response first.
      expect(
        (
          await steps('main', {
            type: 'decide',
            finding: 'VIOLATION',
            reason: 'Confirmed',
          })
        ).status,
      ).toBe(409)
      expect((await steps('main', { type: 'recordResponse', text: 'x' })).status).toBe(409)
      expect(
        dataOf(await steps('main', { type: 'requestResponse', message: 'Explain the booth' }))
          .state,
      ).toBe('Awaiting Club Response')
      // The deadline has not passed, so "no response" cannot be recorded yet.
      expect((await steps('main', { type: 'recordResponse', noResponse: true })).status).toBe(409)
      expect((await steps('main', { type: 'recordResponse', text: ' ' })).status).toBe(400)
      dataOf(await steps('main', { type: 'recordResponse', text: 'It was a charity drive' }))
      expect((await steps('main', { type: 'recordResponse', text: 'again' })).status).toBe(409)
      expect(
        (await steps('main', { type: 'decide', finding: 'VIOLATION', reason: ' ' })).status,
      ).toBe(400)
      expect(
        dataOf(
          await steps('main', {
            type: 'decide',
            finding: 'VIOLATION',
            reason: 'Money was collected without approval',
            evidence: [{ note: 'Bank statement' }],
          }),
        ).state,
      ).toBe('Decision Issued')
      expect(
        (await steps('main', { type: 'decide', finding: 'NO_VIOLATION', reason: 'oops' })).status,
      ).toBe(409)
      expect(
        (
          await steps('main', {
            type: 'addActions',
            actions: [{ description: 'Refund', dueAt: new Date(Date.now() - DAY).toISOString() }],
          })
        ).status,
      ).toBe(400)
      expect((await steps('main', { type: 'addActions', actions: [] })).status).toBe(400)
      const withActions = dataOf(
        await steps('main', {
          type: 'addActions',
          actions: [
            { description: 'Refund donors', dueAt: new Date(Date.now() + 14 * DAY).toISOString() },
          ],
        }),
      )
      expect(withActions.state).toBe('Corrective Action')
      expect(withActions.actions).toHaveLength(1)
      // The club has not submitted evidence, and the deadline is still ahead.
      expect(
        (
          await steps('main', {
            type: 'verifyAction',
            actionId: withActions.actions[0].id,
            outcome: 'Verified',
          })
        ).status,
      ).toBe(409)
      expect(
        (await steps('main', { type: 'verifyAction', actionId: missingId(), outcome: 'Failed' }))
          .status,
      ).toBe(404)
      expect((await steps('main', { type: 'resolve' })).status).toBe(409)
    })

    it('closes a case with no violation; a closed case takes no more steps', async () => {
      expect(
        dataOf(
          await steps('cleared', {
            type: 'decide',
            finding: 'NO_VIOLATION',
            reason: 'Approved after all',
          }),
        ).state,
      ).toBe('Closed')
      expect((await steps('cleared', { type: 'investigate' })).status).toBe(409)
      expect((await steps('idle', { type: 'resolve' })).status).toBe(409)
    })
  })

  describe('GET /admin/violations (paged queue)', () => {
    it('pages one filter and counts every filter', async () => {
      const all = dataOf(await h.call(h.officer, 'GET', '/admin/violations?pageSize=2'))
      expect(all).toMatchObject({ total: 3, page: 1, pageSize: 2 })
      expect(all.items).toHaveLength(2)
      expect(all.counts).toEqual({ all: 3, active: 1, awaiting: 0, actions: 1, closed: 1, open: 2 })
      expect(all.items[0]).toMatchObject({
        id: cases.idle,
        clubName: `Club VIO`,
        pendingActions: 0,
      })

      const actions = dataOf(await h.call(h.officer, 'GET', '/admin/violations?filter=actions'))
      expect(actions.total).toBe(1)
      expect(actions.items[0]).toMatchObject({ id: cases.main, pendingActions: 1 })
      expect(
        dataOf(await h.call(h.officer, 'GET', '/admin/violations?filter=closed&page=2')).items,
      ).toEqual([])
    })

    it('rejects bad filters and paging, and non-officers', async () => {
      expect((await h.call(h.officer, 'GET', '/admin/violations?filter=mine')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/violations?page=abc')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/violations?pageSize=1000')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/violations?sort=title')).status).toBe(400)
      expect((await h.call(leader, 'GET', '/admin/violations')).status).toBe(403)
      expect((await h.call(null, 'GET', '/admin/violations')).status).toBe(401)
    })
  })
})
