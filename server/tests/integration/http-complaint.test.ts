// Complaints (UC50/UC51/UC52) over HTTP: student submission and withdrawal, the paged ICPDP queue
// and its decisions, and the club inbox and response, on the real app with Mongo and sessions.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  type Actor,
  type Harness,
  type SeededClub,
  dataOf,
  missingId,
  startHttpHarness,
} from './http-harness.js'

describe.skipIf(!process.env.MONGO_URI)('HTTP: complaint routes', () => {
  let h: Harness
  let student: Actor, other: Actor, leader: Actor, member: Actor, otherLeader: Actor
  let club: SeededClub, otherClub: SeededClub
  const ids: Record<string, string> = {}

  function body(overrides: Record<string, unknown> = {}) {
    return {
      clubId: club.id,
      type: 'CONDUCT',
      description: 'The event ran late',
      evidence: [{ label: 'photo', url: 'https://img.test/1.png' }],
      ...overrides,
    }
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-complaint')
    student = await h.signIn('student@http.edu')
    other = await h.signIn('other@http.edu')
    leader = await h.signIn('leader@http.edu')
    member = await h.signIn('member@http.edu')
    otherLeader = await h.signIn('other-leader@http.edu')
    club = await h.seedClub({ code: 'CMP', leader, members: [member] })
    otherClub = await h.seedClub({ code: 'CX', leader: otherLeader })
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('student side', () => {
    it('validates a complaint before accepting it', async () => {
      expect((await h.call(student, 'POST', '/complaints', body({ clubId: 'x' }))).status).toBe(400)
      expect((await h.call(student, 'POST', '/complaints', body({ type: 'NOISE' }))).status).toBe(
        400,
      )
      expect(
        (await h.call(student, 'POST', '/complaints', body({ description: '  ' }))).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            student,
            'POST',
            '/complaints',
            body({ evidence: [{ label: 'x', url: 'javascript:alert(1)' }] }),
          )
        ).status,
      ).toBe(400)
      expect((await h.call(student, 'POST', '/complaints', body({ anonymous: true }))).status).toBe(
        400,
      )
      expect(
        (await h.call(student, 'POST', '/complaints', body({ eventId: missingId() }))).status,
      ).toBe(400)
      expect(
        (await h.call(student, 'POST', '/complaints', body({ clubId: missingId() }))).status,
      ).toBe(404)
      expect((await h.call(student, 'POST', '/complaints', body(), { noCsrf: true })).status).toBe(
        403,
      )
      expect((await h.call(null, 'POST', '/complaints', body())).status).toBe(401)
    })

    it('submits complaints and lists them as mine', async () => {
      for (const key of ['a', 'b', 'c', 'd']) {
        const created = dataOf(
          await h.call(student, 'POST', '/complaints', body({ description: `Complaint ${key}` })),
          201,
        )
        expect(created).toMatchObject({ state: 'Submitted', clubId: club.id })
        ids[key] = created.id
      }
      const mine = dataOf(await h.call(student, 'GET', '/complaints/mine'))
      expect(mine).toHaveLength(4)
      expect(dataOf(await h.call(other, 'GET', '/complaints/mine'))).toEqual([])
    })

    it('withdraws only my own undecided complaint, once', async () => {
      expect((await h.call(other, 'POST', `/complaints/${ids.d}/withdraw`)).status).toBe(409)
      expect((await h.call(student, 'POST', '/complaints/bad/withdraw')).status).toBe(400)
      expect(dataOf(await h.call(student, 'POST', `/complaints/${ids.d}/withdraw`)).state).toBe(
        'Withdrawn',
      )
      expect((await h.call(student, 'POST', `/complaints/${ids.d}/withdraw`)).status).toBe(409)
    })
  })

  describe('ICPDP queue', () => {
    it('pages the queue with counts and filters by state', async () => {
      const first = dataOf(await h.call(h.officer, 'GET', '/admin/complaints?page=1&pageSize=3'))
      expect(first).toMatchObject({ total: 4, page: 1, pageSize: 3 })
      expect(first.items).toHaveLength(3)
      const second = dataOf(await h.call(h.officer, 'GET', '/admin/complaints?page=2&pageSize=3'))
      expect(second.items).toHaveLength(1)
      const withdrawn = dataOf(await h.call(h.officer, 'GET', '/admin/complaints?state=Withdrawn'))
      expect(withdrawn.total).toBe(1)
      expect(withdrawn.items[0].id).toBe(ids.d)
      // Newest first; undecided complaints of the same student and club are link candidates.
      expect(first.items[0].id).toBe(ids.d)
      const c = first.items.find((item: { id: string }) => item.id === ids.c)
      expect(c.linkCandidates.map((row: { id: string }) => row.id).sort()).toEqual(
        [ids.a, ids.b].sort(),
      )
    })

    it('rejects bad paging, unknown filters and non-officers', async () => {
      expect((await h.call(h.officer, 'GET', '/admin/complaints?state=Open')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/complaints?pageSize=0')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/complaints?clubId=x')).status).toBe(400)
      expect((await h.call(student, 'GET', '/admin/complaints')).status).toBe(403)
      expect((await h.call(null, 'GET', '/admin/complaints')).status).toBe(401)
    })

    it('shows one complaint to officers only', async () => {
      expect(dataOf(await h.call(h.officer, 'GET', `/admin/complaints/${ids.a}`)).id).toBe(ids.a)
      expect((await h.call(h.officer, 'GET', `/admin/complaints/${missingId()}`)).status).toBe(404)
      expect((await h.call(h.officer, 'GET', '/admin/complaints/bad')).status).toBe(400)
      expect((await h.call(student, 'GET', `/admin/complaints/${ids.a}`)).status).toBe(403)
    })
  })

  describe('ICPDP decisions and the club response', () => {
    const triage = {
      outcome: 'Forwarded',
      severity: 'MINOR',
      validity: 'VALID',
      reason: 'The club should answer',
    }

    it('links a duplicate into another complaint, which then cannot be decided alone', async () => {
      const path = `/admin/complaints/${ids.b}/link`
      expect((await h.call(h.officer, 'POST', path, { targetId: 'x', reason: 'dup' })).status).toBe(
        400,
      )
      expect((await h.call(student, 'POST', path, { targetId: ids.a, reason: 'dup' })).status).toBe(
        403,
      )
      dataOf(await h.call(h.officer, 'POST', path, { targetId: ids.a, reason: 'same incident' }))
      expect((await h.call(h.officer, 'POST', `/admin/complaints/${ids.b}/open`)).status).toBe(409)
    })

    it('opens, then triages and forwards a complaint to the club', async () => {
      expect(
        (await h.call(h.officer, 'POST', `/admin/complaints/${ids.c}/triage`, triage)).status,
      ).toBe(409)
      expect(
        (await h.call(h.officer, 'POST', `/admin/complaints/${missingId()}/open`)).status,
      ).toBe(404)
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/complaints/${ids.a}/open`, undefined, {
            noCsrf: true,
          })
        ).status,
      ).toBe(403)
      for (const key of ['a', 'c']) {
        expect(
          dataOf(await h.call(h.officer, 'POST', `/admin/complaints/${ids[key]}/open`)).state,
        ).toBe('Under Triage')
      }
      expect((await h.call(h.officer, 'POST', `/admin/complaints/${ids.a}/open`)).status).toBe(409)
      const path = `/admin/complaints/${ids.a}/triage`
      expect((await h.call(h.officer, 'POST', path, { ...triage, severity: 'HUGE' })).status).toBe(
        400,
      )
      expect((await h.call(h.officer, 'POST', path, { ...triage, reason: ' ' })).status).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', path, {
            ...triage,
            responseDueAt: new Date(Date.now() - 60_000).toISOString(),
          })
        ).status,
      ).toBe(400)
      expect(dataOf(await h.call(h.officer, 'POST', path, triage)).state).toBe('Forwarded')
      dataOf(await h.call(h.officer, 'POST', `/admin/complaints/${ids.c}/triage`, triage))
    })

    it('shows forwarded complaints in the club inbox, without the complainant', async () => {
      const inbox = dataOf(await h.call(leader, 'GET', `/clubs/${club.id}/complaints`))
      expect(inbox.map((row: { id: string }) => row.id).sort()).toEqual([ids.a, ids.c].sort())
      expect(JSON.stringify(inbox)).not.toContain(student.id)
      expect(dataOf(await h.call(otherLeader, 'GET', `/clubs/${otherClub.id}/complaints`))).toEqual(
        [],
      )
      expect((await h.call(member, 'GET', `/clubs/${club.id}/complaints`)).status).toBe(403)
      expect((await h.call(otherLeader, 'GET', `/clubs/${club.id}/complaints`)).status).toBe(403)
      expect((await h.call(leader, 'GET', '/clubs/bad/complaints')).status).toBe(400)
    })

    it('the club answers a forwarded complaint once', async () => {
      const answer = { text: 'We apologise', action: 'Start on time next time' }
      const path = `/clubs/${club.id}/complaints/${ids.a}/response`
      expect((await h.call(leader, 'POST', path, { text: 'x' })).status).toBe(400)
      expect((await h.call(leader, 'POST', path, { ...answer, text: ' ' })).status).toBe(400)
      expect((await h.call(member, 'POST', path, answer)).status).toBe(403)
      expect(
        (
          await h.call(
            otherLeader,
            'POST',
            `/clubs/${otherClub.id}/complaints/${ids.a}/response`,
            answer,
          )
        ).status,
      ).toBe(409)
      expect(dataOf(await h.call(leader, 'POST', path, answer)).state).toBe('Club Responded')
      expect((await h.call(leader, 'POST', path, answer)).status).toBe(409)
      dataOf(await h.call(leader, 'POST', `/clubs/${club.id}/complaints/${ids.c}/response`, answer))
    })

    it('closes one answered complaint and escalates the other', async () => {
      expect(
        (await h.call(h.officer, 'POST', `/admin/complaints/${ids.d}/close`, { reason: 'x' }))
          .status,
      ).toBe(409)
      expect((await h.call(h.officer, 'POST', `/admin/complaints/${ids.a}/close`, {})).status).toBe(
        400,
      )
      expect(
        dataOf(
          await h.call(h.officer, 'POST', `/admin/complaints/${ids.a}/close`, {
            reason: 'Resolved',
          }),
        ).state,
      ).toBe('Closed')
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/complaints/${ids.c}/escalate`, {
            reason: 'Repeated',
            severity: 'EXTREME',
          })
        ).status,
      ).toBe(400)
      expect(
        dataOf(
          await h.call(h.officer, 'POST', `/admin/complaints/${ids.c}/escalate`, {
            reason: 'Repeated',
            severity: 'SERIOUS',
          }),
        ).state,
      ).toBe('Escalated')
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/complaints/${ids.a}/escalate`, {
            reason: 'again',
            severity: 'SERIOUS',
          })
        ).status,
      ).toBe(409)
      const closed = dataOf(await h.call(h.officer, 'GET', '/admin/complaints?state=Closed'))
      expect(closed.total).toBe(1)
    })
  })
})
