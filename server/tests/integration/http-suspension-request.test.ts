// Club suspension requests (UC15) over HTTP: the club leader's context and submission, and the
// paged ICPDP review queue with its decisions, on the real app with Mongo, sessions and CSRF.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ucmsModels as m } from '../../src/infra/db/ucms-models.js'
import {
  type Actor,
  DAY,
  type Harness,
  type SeededClub,
  dataOf,
  missingId,
  startHttpHarness,
} from './http-harness.js'

describe.skipIf(!process.env.MONGO_URI)('HTTP: suspension request routes', () => {
  let h: Harness
  let leaders: Actor[]
  let member: Actor
  let clubs: SeededClub[]
  const requests: string[] = []

  function body(overrides: Record<string, unknown> = {}) {
    return {
      reason: 'Exam season',
      until: new Date(Date.now() + 60 * DAY).toISOString(),
      obligationsPlan: 'Finish pending reports',
      recoveryPlan: 'Resume in spring',
      acknowledgedImpactIds: [],
      ...overrides,
    }
  }
  function path(index: number) {
    return `/clubs/${clubs[index]!.id}/suspension-requests`
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-suspension')
    member = await h.signIn('member@http.edu')
    leaders = []
    clubs = []
    for (const index of [0, 1, 2]) {
      const leader = await h.signIn(`leader${index}@http.edu`)
      leaders.push(leader)
      clubs.push(
        await h.seedClub({
          code: `SUS${index}`,
          leader,
          ...(index === 0 ? { members: [member] } : {}),
        }),
      )
    }
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('club side', () => {
    it('shows the leader the impacts and past requests', async () => {
      expect(dataOf(await h.call(leaders[0]!, 'GET', path(0)))).toEqual({
        impacts: [],
        requests: [],
      })
      expect((await h.call(member, 'GET', path(0))).status).toBe(403)
      expect((await h.call(leaders[1]!, 'GET', path(0))).status).toBe(403)
      expect((await h.call(leaders[0]!, 'GET', '/clubs/bad/suspension-requests')).status).toBe(400)
      expect((await h.call(null, 'GET', path(0))).status).toBe(401)
    })

    it('validates the request', async () => {
      const leader = leaders[0]!
      expect((await h.call(leader, 'POST', path(0), body({ reason: ' ' }))).status).toBe(400)
      expect(
        (
          await h.call(
            leader,
            'POST',
            path(0),
            body({ until: new Date(Date.now() - DAY).toISOString() }),
          )
        ).status,
      ).toBe(400)
      expect((await h.call(leader, 'POST', path(0), body({ until: 'later' }))).status).toBe(400)
      expect((await h.call(leader, 'POST', path(0), body({ urgent: true }))).status).toBe(400)
      // The acknowledged impacts must match what the server computes.
      expect(
        (await h.call(leader, 'POST', path(0), body({ acknowledgedImpactIds: ['event:x'] })))
          .status,
      ).toBe(409)
    })

    it('needs the leader permission and a CSRF token', async () => {
      expect((await h.call(member, 'POST', path(0), body())).status).toBe(403)
      expect((await h.call(leaders[1]!, 'POST', path(0), body())).status).toBe(403)
      expect((await h.call(leaders[0]!, 'POST', path(0), body(), { noCsrf: true })).status).toBe(
        403,
      )
    })

    it('submits one pending request per club', async () => {
      for (const index of [0, 1, 2]) {
        const created = dataOf(await h.call(leaders[index]!, 'POST', path(index), body()), 201)
        expect(created).toMatchObject({ state: 'Pending', reason: 'Exam season' })
        requests.push(created.id)
      }
      expect((await h.call(leaders[0]!, 'POST', path(0), body())).status).toBe(409)
      const context = dataOf(await h.call(leaders[0]!, 'GET', path(0)))
      expect(context.requests.map((row: { id: string }) => row.id)).toEqual([requests[0]])
    })
  })

  describe('ICPDP review', () => {
    it('pages the queue with a total', async () => {
      const first = dataOf(await h.call(h.officer, 'GET', '/admin/suspension-requests?pageSize=2'))
      expect(first).toMatchObject({ total: 3, page: 1, pageSize: 2 })
      expect(first.items).toHaveLength(2)
      expect(
        dataOf(await h.call(h.officer, 'GET', '/admin/suspension-requests?pageSize=2&page=2'))
          .items,
      ).toHaveLength(1)
      expect(
        (await h.call(h.officer, 'GET', '/admin/suspension-requests?state=Pending')).status,
      ).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/suspension-requests?pageSize=x')).status).toBe(
        400,
      )
      expect((await h.call(leaders[0]!, 'GET', '/admin/suspension-requests')).status).toBe(403)
      expect((await h.call(null, 'GET', '/admin/suspension-requests')).status).toBe(401)
    })

    it('validates decisions', async () => {
      const decide = `/admin/suspension-requests/${requests[0]}/decision`
      expect((await h.call(h.officer, 'POST', decide, { outcome: 'Approve' })).status).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', decide, { outcome: 'Maybe', reason: 'x' })).status,
      ).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', decide, { outcome: 'Approve', reason: ' ' })).status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', '/admin/suspension-requests/bad/decision', {
            outcome: 'Approve',
            reason: 'ok',
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/suspension-requests/${missingId()}/decision`, {
            outcome: 'Approve',
            reason: 'ok',
          })
        ).status,
      ).toBe(404)
      expect(
        (await h.call(leaders[0]!, 'POST', decide, { outcome: 'Approve', reason: 'ok' })).status,
      ).toBe(403)
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            decide,
            { outcome: 'Approve', reason: 'ok' },
            { noCsrf: true },
          )
        ).status,
      ).toBe(403)
    })

    it('approves one request, suspending the club, and rejects another', async () => {
      const approved = dataOf(
        await h.call(h.officer, 'POST', `/admin/suspension-requests/${requests[0]}/decision`, {
          outcome: 'Approve',
          reason: 'Plan is sound',
        }),
      )
      expect(approved.items.find((row: { id: string }) => row.id === requests[0]).state).toBe(
        'Approved',
      )
      expect((await m.clubs!.findById(clubs[0]!.id).lean())?.state).toBe('Suspended')
      const rejected = dataOf(
        await h.call(h.officer, 'POST', `/admin/suspension-requests/${requests[1]}/decision`, {
          outcome: 'Reject',
          reason: 'Obligations unclear',
        }),
      )
      expect(rejected.items.find((row: { id: string }) => row.id === requests[1]).state).toBe(
        'Rejected',
      )
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/suspension-requests/${requests[1]}/decision`, {
            outcome: 'Approve',
            reason: 'changed my mind',
          })
        ).status,
      ).toBe(409)
      // A suspended club cannot ask again; a rejected one can.
      expect((await h.call(leaders[0]!, 'POST', path(0), body())).status).toBe(409)
      expect((await h.call(leaders[1]!, 'POST', path(1), body())).status).toBe(201)
    })
  })
})
