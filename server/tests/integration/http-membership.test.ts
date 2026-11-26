// Club memberships and withdrawal requests (UC20/UC21) over HTTP: real app, Mongo, sessions, CSRF.
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

describe.skipIf(!process.env.MONGO_URI)('HTTP: membership routes', () => {
  let h: Harness
  let leader: Actor, member: Actor, leaver: Actor, outsider: Actor, newcomer: Actor
  let otherLeader: Actor
  let club: SeededClub, otherClub: SeededClub

  beforeAll(async () => {
    h = await startHttpHarness('http-membership')
    leader = await h.signIn('leader@http.edu')
    member = await h.signIn('member@http.edu')
    leaver = await h.signIn('leaver@http.edu')
    outsider = await h.signIn('outsider@http.edu')
    newcomer = await h.signIn('newcomer@http.edu')
    otherLeader = await h.signIn('other-leader@http.edu')
    club = await h.seedClub({ code: 'MEM', leader, members: [member, leaver] })
    otherClub = await h.seedClub({ code: 'OTH', leader: otherLeader })
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  function today() {
    return new Date().toISOString()
  }

  it('GET /memberships/mine lists only the caller memberships', async () => {
    const mine = dataOf(await h.call(member, 'GET', '/memberships/mine'))
    expect(mine).toHaveLength(1)
    expect(mine[0]).toMatchObject({ clubId: club.id, state: 'Active' })
    expect(dataOf(await h.call(outsider, 'GET', '/memberships/mine'))).toEqual([])
    expect((await h.call(null, 'GET', '/memberships/mine')).status).toBe(401)
  })

  describe('GET /clubs/:clubId/memberships', () => {
    it('lists members for the club leader', async () => {
      const list = dataOf(await h.call(leader, 'GET', `/clubs/${club.id}/memberships`))
      expect(list.map((row: { email: string }) => row.email).sort()).toEqual([
        'leader@http.edu',
        'leaver@http.edu',
        'member@http.edu',
      ])
      expect(
        list.find((row: { email: string }) => row.email === 'leader@http.edu').positions,
      ).toEqual(['Chủ nhiệm'])
    })

    it('forbids plain members, outsiders and the leader of another club', async () => {
      expect((await h.call(member, 'GET', `/clubs/${club.id}/memberships`)).status).toBe(403)
      expect((await h.call(outsider, 'GET', `/clubs/${club.id}/memberships`)).status).toBe(403)
      expect((await h.call(otherLeader, 'GET', `/clubs/${club.id}/memberships`)).status).toBe(403)
    })

    it('rejects a malformed club id, an unknown club and anonymous callers', async () => {
      expect((await h.call(leader, 'GET', '/clubs/nope/memberships')).status).toBe(400)
      expect([403, 404]).toContain(
        (await h.call(leader, 'GET', `/clubs/${missingId()}/memberships`)).status,
      )
      expect((await h.call(null, 'GET', `/clubs/${club.id}/memberships`)).status).toBe(401)
    })
  })

  describe('POST /clubs/:clubId/memberships (manual onboarding)', () => {
    function path() {
      return `/clubs/${club.id}/memberships`
    }

    it('onboards a signed-in student with a reason', async () => {
      const created = dataOf(
        await h.call(leader, 'POST', path(), { email: 'NEWCOMER@http.edu', reason: 'founding' }),
        201,
      )
      expect(created).toMatchObject({ clubId: club.id, userId: newcomer.id, state: 'Active' })
      expect(
        (await h.call(leader, 'POST', path(), { email: 'newcomer@http.edu', reason: 'again' }))
          .status,
      ).toBe(409)
    })

    it('validates the body and returns 404 for an unknown email', async () => {
      expect((await h.call(leader, 'POST', path(), { email: 'a@b.c' })).status).toBe(400)
      expect(
        (await h.call(leader, 'POST', path(), { email: 'not-an-email', reason: 'x' })).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', path(), { email: 'a@b.c', reason: 'x', role: 'LEADER' }))
          .status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', path(), { email: 'ghost@http.edu', reason: 'x' })).status,
      ).toBe(404)
    })

    it('needs CSRF and the review permission', async () => {
      const body = { email: 'outsider@http.edu', reason: 'x' }
      expect((await h.call(leader, 'POST', path(), body, { noCsrf: true })).status).toBe(403)
      expect((await h.call(member, 'POST', path(), body)).status).toBe(403)
      expect((await h.call(otherLeader, 'POST', path(), body)).status).toBe(403)
      expect((await h.call(null, 'POST', path(), body)).status).toBe(401)
    })
  })

  describe('PATCH /clubs/:clubId/memberships/:membershipId/state', () => {
    it('moves a member Active -> Inactive -> Active and rejects invalid transitions', async () => {
      const path = `/clubs/${club.id}/memberships/${club.memberMembershipIds[member.id]}/state`
      const inactive = dataOf(
        await h.call(leader, 'PATCH', path, { state: 'Inactive', effectiveDate: today() }),
      )
      expect(inactive.state).toBe('Inactive')
      expect(
        (await h.call(leader, 'PATCH', path, { state: 'Inactive', effectiveDate: today() })).status,
      ).toBe(409)
      expect(
        dataOf(await h.call(leader, 'PATCH', path, { state: 'Active', effectiveDate: today() }))
          .state,
      ).toBe('Active')
    })

    it('validates state, date and ban reason', async () => {
      const path = `/clubs/${club.id}/memberships/${club.memberMembershipIds[member.id]}/state`
      expect(
        (await h.call(leader, 'PATCH', path, { state: 'Left', effectiveDate: today() })).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'PATCH', path, { state: 'Inactive', effectiveDate: 'yesterday' }))
          .status,
      ).toBe(400)
      expect(
        (
          await h.call(leader, 'PATCH', path, {
            state: 'Inactive',
            effectiveDate: new Date(Date.now() - 3 * DAY).toISOString(),
          })
        ).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'PATCH', path, { state: 'Banned', effectiveDate: today() })).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'PATCH', `/clubs/${club.id}/memberships/xyz/state`, {})).status,
      ).toBe(400)
    })

    it('refuses to end the leader seat holder and 404s for an unknown membership', async () => {
      expect(
        (
          await h.call(
            leader,
            'PATCH',
            `/clubs/${club.id}/memberships/${club.leaderMembershipId}/state`,
            {
              state: 'Inactive',
              effectiveDate: today(),
            },
          )
        ).status,
      ).toBe(409)
      expect(
        (
          await h.call(leader, 'PATCH', `/clubs/${club.id}/memberships/${missingId()}/state`, {
            state: 'Inactive',
            effectiveDate: today(),
          })
        ).status,
      ).toBe(404)
      // A membership of another club is not found through this club.
      expect(
        (
          await h.call(
            leader,
            'PATCH',
            `/clubs/${club.id}/memberships/${otherClub.leaderMembershipId}/state`,
            { state: 'Inactive', effectiveDate: today() },
          )
        ).status,
      ).toBe(404)
    })

    it('forbids members and other leaders', async () => {
      const path = `/clubs/${club.id}/memberships/${club.memberMembershipIds[member.id]}/state`
      const body = { state: 'Inactive', effectiveDate: today() }
      expect((await h.call(member, 'PATCH', path, body)).status).toBe(403)
      expect((await h.call(otherLeader, 'PATCH', path, body)).status).toBe(403)
      expect((await h.call(leader, 'PATCH', path, body, { csrf: 'bad' })).status).toBe(403)
    })
  })

  describe('withdrawal requests', () => {
    let requestId = ''

    it('a member requests to leave; a duplicate pending request is a conflict', async () => {
      const path = `/memberships/${club.memberMembershipIds[leaver.id]}/withdrawal-requests`
      expect((await h.call(leaver, 'POST', path, { reason: 'busy' })).status).toBe(400)
      expect(
        (
          await h.call(leaver, 'POST', path, {
            reason: 'busy',
            requestedEffectiveDate: new Date(Date.now() - 3 * DAY).toISOString(),
          })
        ).status,
      ).toBe(400)
      const created = dataOf(
        await h.call(leaver, 'POST', path, { reason: 'busy', requestedEffectiveDate: today() }),
        201,
      )
      expect(created).toMatchObject({ clubId: club.id, state: 'Pending', reason: 'busy' })
      requestId = created.id
      expect(
        (await h.call(leaver, 'POST', path, { reason: 'again', requestedEffectiveDate: today() }))
          .status,
      ).toBe(409)
    })

    it("refuses someone else's membership, a bad id and a missing CSRF token", async () => {
      const path = `/memberships/${club.memberMembershipIds[member.id]}/withdrawal-requests`
      const body = { reason: 'x', requestedEffectiveDate: today() }
      expect((await h.call(leaver, 'POST', path, body)).status).toBe(404)
      expect(
        (await h.call(leaver, 'POST', '/memberships/bad/withdrawal-requests', body)).status,
      ).toBe(400)
      expect((await h.call(member, 'POST', path, body, { noCsrf: true })).status).toBe(403)
    })

    it('lists my requests and the club queue (leader only)', async () => {
      const mine = dataOf(await h.call(leaver, 'GET', '/memberships/withdrawal-requests/mine'))
      expect(mine.map((row: { id: string }) => row.id)).toEqual([requestId])
      const queue = dataOf(await h.call(leader, 'GET', `/clubs/${club.id}/membership-withdrawals`))
      expect(queue[0]).toMatchObject({ id: requestId, memberName: 'leaver' })
      expect((await h.call(member, 'GET', `/clubs/${club.id}/membership-withdrawals`)).status).toBe(
        403,
      )
      expect((await h.call(leader, 'GET', '/clubs/bad/membership-withdrawals')).status).toBe(400)
    })

    it('the leader executes the request once; the member has left', async () => {
      function path(id: string) {
        return `/clubs/${club.id}/membership-withdrawals/${id}/execute`
      }
      expect((await h.call(member, 'POST', path(requestId))).status).toBe(403)
      expect((await h.call(otherLeader, 'POST', path(requestId))).status).toBe(403)
      expect((await h.call(leader, 'POST', path('bad'))).status).toBe(400)
      expect((await h.call(leader, 'POST', path(missingId()))).status).toBe(404)
      expect((await h.call(leader, 'POST', path(requestId))).status).toBe(200)
      expect((await h.call(leader, 'POST', path(requestId))).status).toBe(404)
      // A membership that has Left is no longer listed as one of mine.
      expect(dataOf(await h.call(leaver, 'GET', '/memberships/mine'))).toEqual([])
    })

    it('a request dated in the future cannot be executed yet', async () => {
      const path = `/memberships/${club.memberMembershipIds[member.id]}/withdrawal-requests`
      const future = dataOf(
        await h.call(member, 'POST', path, {
          reason: 'next month',
          requestedEffectiveDate: new Date(Date.now() + 30 * DAY).toISOString(),
        }),
        201,
      )
      expect(
        (
          await h.call(
            leader,
            'POST',
            `/clubs/${club.id}/membership-withdrawals/${future.id}/execute`,
          )
        ).status,
      ).toBe(409)
    })
  })
})
