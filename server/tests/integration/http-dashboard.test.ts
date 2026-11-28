// Dashboard (UC02) over HTTP: the per-workspace snapshot for students, club members and ICPDP, and
// the board history of a club, on the real app with Mongo, sessions and the access rules.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type Actor,
  type Harness,
  type SeededClub,
  dataOf,
  missingId,
  startHttpHarness,
} from './http-harness.js'

describe.skipIf(!process.env.MONGO_URI)('HTTP: dashboard routes', () => {
  let h: Harness
  let leader: Actor, member: Actor, outsider: Actor, otherLeader: Actor
  let club: SeededClub, otherClub: SeededClub

  beforeAll(async () => {
    h = await startHttpHarness('http-dashboard')
    leader = await h.signIn('dash-leader@http.edu')
    member = await h.signIn('dash-member@http.edu')
    outsider = await h.signIn('dash-outsider@http.edu')
    otherLeader = await h.signIn('dash-other@http.edu')
    club = await h.seedClub({ code: 'DSH', name: 'Dashboard Club', leader, members: [member] })
    otherClub = await h.seedClub({ code: 'OTH', name: 'Other Club', leader: otherLeader })
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('GET /dashboard', () => {
    it('returns the student snapshot in the success envelope', async () => {
      const reply = await h.call(outsider, 'GET', '/dashboard?workspace=student')
      expect(reply.body).toMatchObject({ statusCode: 200, message: 'success' })
      expect(typeof reply.body.timestamp).toBe('string')
      const data = dataOf(reply)
      expect(data.kind).toBe('student')
      expect(Array.isArray(data.panels)).toBe(true)
      expect(data.panels.length).toBeGreaterThan(0)
      for (const panel of data.panels) {
        expect(['ready', 'error']).toContain(panel.status)
      }
    })

    it('returns the ICPDP snapshot to an officer only', async () => {
      const data = dataOf(await h.call(h.officer, 'GET', '/dashboard?workspace=icpdp'))
      expect(data.kind).toBe('icpdp')
      expect(data.panels.length).toBeGreaterThan(0)
      const denied = await h.call(leader, 'GET', '/dashboard?workspace=icpdp')
      expect(denied.status).toBe(403)
      expect(denied.body).toMatchObject({
        statusCode: 403,
        path: '/api/v1/dashboard?workspace=icpdp',
      })
    })

    it('returns the club snapshot to its leader and to an active member', async () => {
      const asLeader = dataOf(
        await h.call(leader, 'GET', `/dashboard?workspace=club&clubId=${club.id}`),
      )
      expect(asLeader).toMatchObject({ kind: 'club', clubId: club.id })
      expect(asLeader.panels.length).toBeGreaterThan(0)
      const asMember = dataOf(
        await h.call(member, 'GET', `/dashboard?workspace=club&clubId=${club.id}`),
      )
      expect(asMember).toMatchObject({ kind: 'club', clubId: club.id })
      // A plain member sees no more panels than the leader, who holds every permission.
      expect(asMember.panels.length).toBeLessThanOrEqual(asLeader.panels.length)
    })

    it('denies the club workspace to outsiders and to leaders of another club', async () => {
      for (const who of [outsider, otherLeader, h.officer]) {
        const reply = await h.call(who, 'GET', `/dashboard?workspace=club&clubId=${club.id}`)
        expect(reply.status).toBe(403)
      }
      expect(
        (await h.call(leader, 'GET', `/dashboard?workspace=club&clubId=${otherClub.id}`)).status,
      ).toBe(403)
      expect(
        (await h.call(leader, 'GET', `/dashboard?workspace=club&clubId=${missingId()}`)).status,
      ).toBe(403)
    })

    it('rejects a missing or unknown workspace, a bad club id and unknown query keys', async () => {
      for (const query of [
        '',
        '?workspace=admin',
        '?workspace=club',
        '?workspace=club&clubId=abc',
        '?workspace=student&clubId=' + club.id,
        '?workspace=icpdp&extra=1',
      ]) {
        const reply = await h.call(leader, 'GET', `/dashboard${query}`)
        expect([query, reply.status]).toEqual([query, 400])
        expect(reply.body).toMatchObject({
          statusCode: 400,
          message: 'invalid dashboard context',
          path: `/api/v1/dashboard${query}`,
        })
        expect(Array.isArray(reply.body.details)).toBe(true)
      }
    })

    it('needs a session', async () => {
      const reply = await h.call(null, 'GET', '/dashboard?workspace=student')
      expect(reply.status).toBe(401)
      expect(reply.body.statusCode).toBe(401)
    })
  })

  describe('GET /dashboard/clubs/:clubId/board-history', () => {
    function path(clubId: string) {
      return `/dashboard/clubs/${clubId}/board-history`
    }

    it('shows the club, its terms and the confirmed leader seat', async () => {
      for (const who of [h.officer, leader]) {
        const data = dataOf(await h.call(who, 'GET', path(club.id)))
        expect(data.club).toMatchObject({
          id: club.id,
          code: 'DSH',
          name: 'Dashboard Club',
          state: 'Active',
        })
        expect(Array.isArray(data.structures)).toBe(true)
        const term = data.terms.find((item: { id: string }) => item.id === club.termId)
        expect(term).toMatchObject({ name: 'Current term', state: 'Active' })
        expect(term.seats).toHaveLength(1)
        expect(term.seats[0]).toMatchObject({ positionName: 'Chủ nhiệm' })
      }
    })

    it('needs club.board.nominate within the club unless the actor is an officer', async () => {
      // An active member only holds the default member permissions.
      expect((await h.call(member, 'GET', path(club.id))).status).toBe(403)
      expect((await h.call(outsider, 'GET', path(club.id))).status).toBe(403)
      expect((await h.call(otherLeader, 'GET', path(club.id))).status).toBe(403)
      expect((await h.call(leader, 'GET', path(otherClub.id))).status).toBe(403)
    })

    it('404s an unknown club for an officer and 400s a bad id', async () => {
      const missing = await h.call(h.officer, 'GET', path(missingId()))
      expect(missing.status).toBe(404)
      expect(missing.body).toMatchObject({ statusCode: 404, message: 'club not found' })
      const bad = await h.call(h.officer, 'GET', path('not-an-id'))
      expect(bad.status).toBe(400)
      expect(bad.body.message).toBe('invalid club identifier')
    })

    it('needs a session', async () => {
      expect((await h.call(null, 'GET', path(club.id))).status).toBe(401)
    })
  })
})
