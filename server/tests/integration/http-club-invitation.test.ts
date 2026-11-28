// Club invitations to school events (UC54) over HTTP: the club's invitation list and the leader's
// accept/decline answer, on the real app with Mongo, sessions, CSRF and the club access rules.
import { Types } from 'mongoose'
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

describe.skipIf(!process.env.MONGO_URI)('HTTP: club invitation routes', () => {
  let h: Harness
  let leader: Actor, member: Actor, outsider: Actor, otherLeader: Actor, pausedLeader: Actor
  let club: SeededClub, otherClub: SeededClub, pausedClub: SeededClub

  async function seedSchoolEvent(title: string, change: Record<string, unknown> = {}) {
    const now = Date.now()
    const event = await m.events!.create({
      organizerType: 'ICPDP',
      title,
      objective: 'Kết nối sinh viên',
      venueText: 'Hall A',
      startAt: new Date(now + 20 * DAY),
      endAt: new Date(now + 20 * DAY + 3_600_000),
      semesterCode: 'Term',
      audienceScope: 'PUBLIC',
      capacity: 200,
      state: 'Upcoming',
      currentRevisionNo: 1,
      createdAt: new Date(now),
      ...change,
    })
    await m.eventProposalVersions!.create({
      eventId: event._id,
      revisionNo: 1,
      submittedBy: new Types.ObjectId(h.officer.id),
      submittedAt: new Date(now),
      payload: { plan: 'Mỗi CLB một gian hàng' },
    })
    return event._id as Types.ObjectId
  }

  async function invite(
    eventId: Types.ObjectId,
    target: SeededClub,
    change: Record<string, unknown> = {},
  ) {
    const now = Date.now()
    const doc = await m.eventInvitations!.create({
      eventId,
      clubId: new Types.ObjectId(target.id),
      clubName: 'Club',
      status: 'Pending',
      deadline: new Date(now + 10 * DAY),
      invitedAt: new Date(now - DAY),
      invitedBy: new Types.ObjectId(h.officer.id),
      createdAt: new Date(now - DAY),
      updatedAt: new Date(now - DAY),
      ...change,
    })
    return String(doc._id)
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-club-invitation')
    leader = await h.signIn('inv-leader@http.edu')
    member = await h.signIn('inv-member@http.edu')
    outsider = await h.signIn('inv-outsider@http.edu')
    otherLeader = await h.signIn('inv-other@http.edu')
    pausedLeader = await h.signIn('inv-paused@http.edu')
    club = await h.seedClub({ code: 'INV', name: 'Invited Club', leader, members: [member] })
    otherClub = await h.seedClub({ code: 'OTI', name: 'Other Club', leader: otherLeader })
    pausedClub = await h.seedClub({
      code: 'PAU',
      name: 'Paused Club',
      leader: pausedLeader,
      state: 'Suspended',
    })
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('GET /clubs/:clubId/invitations', () => {
    it('lists the club invitations, newest first, with their school event', async () => {
      const eventId = await seedSchoolEvent('Ngày hội CLB')
      const first = await invite(eventId, club, { invitedAt: new Date(Date.now() - 2 * DAY) })
      const second = await invite(await seedSchoolEvent('Hội thảo'), club)
      await invite(eventId, otherClub)

      const reply = await h.call(leader, 'GET', `/clubs/${club.id}/invitations`)
      expect(reply.body).toMatchObject({ statusCode: 200, message: 'success' })
      const items = dataOf(reply)
      expect(items.map((item: { id: string }) => item.id)).toEqual([second, first])
      expect(items[1]).toMatchObject({
        id: first,
        clubId: club.id,
        status: 'Pending',
        event: {
          id: String(eventId),
          title: 'Ngày hội CLB',
          state: 'Upcoming',
          venue: 'Hall A',
          objective: 'Kết nối sinh viên',
          coordination: 'Mỗi CLB một gian hàng',
        },
      })
    })

    it('needs club.event.manage in that club', async () => {
      for (const who of [member, outsider, otherLeader, h.officer]) {
        const reply = await h.call(who, 'GET', `/clubs/${club.id}/invitations`)
        expect([who.email, reply.status]).toEqual([who.email, 403])
      }
      expect((await h.call(null, 'GET', `/clubs/${club.id}/invitations`)).status).toBe(401)
    })

    it('rejects a bad club id', async () => {
      const reply = await h.call(leader, 'GET', '/clubs/abc/invitations')
      expect(reply.status).toBe(400)
      expect(reply.body).toMatchObject({
        statusCode: 400,
        message: 'invalid invitation request',
        path: '/api/v1/clubs/abc/invitations',
      })
    })
  })

  describe('POST /clubs/:clubId/invitations/:id/response', () => {
    function path(id: string, clubId = club.id) {
      return `/clubs/${clubId}/invitations/${id}/response`
    }

    it('accepts an invitation with details and tells the officer who sent it', async () => {
      const id = await invite(await seedSchoolEvent('Accept me'), club)
      const data = dataOf(
        await h.call(leader, 'POST', path(id), {
          outcome: 'Accepted',
          responseNote: '  Sẵn sàng  ',
          responseDetails: { booths: 2, contact: 'Lan' },
        }),
      )
      expect(data).toMatchObject({
        id,
        status: 'Accepted',
        responseNote: 'Sẵn sàng',
        responseDetails: { booths: 2, contact: 'Lan' },
        event: { title: 'Accept me' },
      })
      expect(typeof data.respondedAt).toBe('string')
      expect(
        await m.notifications!.countDocuments({
          recipientUserId: new Types.ObjectId(h.officer.id),
          eventCode: 'EVENT_INVITATION_ACCEPTED',
          entityId: new Types.ObjectId(id),
        }),
      ).toBe(1)
      expect(
        await m.auditLogs!.countDocuments({
          entityId: new Types.ObjectId(id),
          action: 'EVENT_INVITATION_ACCEPTED',
        }),
      ).toBe(1)
      // A second answer is a state conflict.
      const again = await h.call(leader, 'POST', path(id), {
        outcome: 'Declined',
        responseNote: 'Đổi ý',
      })
      expect(again.status).toBe(409)
      expect(again.body).toMatchObject({
        statusCode: 409,
        message: 'invitation is no longer pending before its deadline',
      })
    })

    it('declines with a reason and drops the response details', async () => {
      const id = await invite(await seedSchoolEvent('Decline me'), club)
      const data = dataOf(
        await h.call(leader, 'POST', path(id), {
          outcome: 'Declined',
          responseNote: 'Trùng lịch thi',
          responseDetails: { booths: 1 },
        }),
      )
      expect(data).toMatchObject({ status: 'Declined', responseNote: 'Trùng lịch thi' })
      expect(data.responseDetails ?? {}).toEqual({})
      expect(
        await m.notifications!.countDocuments({
          eventCode: 'EVENT_INVITATION_DECLINED',
          entityId: new Types.ObjectId(id),
        }),
      ).toBe(1)
    })

    it('validates the path and the body', async () => {
      const id = await invite(await seedSchoolEvent('Validate me'), club)
      const accept = { outcome: 'Accepted' }
      const bad: [string, unknown][] = [
        [path('abc'), accept],
        [path(id, 'abc'), accept],
        [path(id), {}],
        [path(id), { outcome: 'Maybe' }],
        [path(id), { ...accept, extra: true }],
        [path(id), { ...accept, responseNote: 'x'.repeat(5_001) }],
        [path(id), { ...accept, responseDetails: { '': 'empty key' } }],
        [path(id), { ...accept, responseDetails: { nested: { a: 1 } } }],
        [path(id), { outcome: 'Declined' }],
        [path(id), { outcome: 'Declined', responseNote: '   ' }],
      ]
      for (const [url, body] of bad) {
        const reply = await h.call(leader, 'POST', url, body)
        expect([url, body, reply.status]).toEqual([url, body, 400])
        expect(reply.body.statusCode).toBe(400)
      }
      const tooMany = Object.fromEntries(
        Array.from({ length: 21 }, (_, index) => [`k${index}`, index]),
      )
      const details = await h.call(leader, 'POST', path(id), {
        ...accept,
        responseDetails: tooMany,
      })
      expect(details.status).toBe(400)
      expect(details.body.message).toBe('invalid response details')
      // Nothing above changed the invitation.
      expect((await m.eventInvitations!.findById(id).lean())?.status).toBe('Pending')
    })

    it('needs a session, a CSRF token and club.event.manage in that club', async () => {
      const id = await invite(await seedSchoolEvent('Guard me'), club)
      const accept = { outcome: 'Accepted' }
      expect((await h.call(null, 'POST', path(id), accept)).status).toBe(401)
      const noCsrf = await h.call(leader, 'POST', path(id), accept, { noCsrf: true })
      expect(noCsrf.status).toBe(403)
      expect(noCsrf.body.statusCode).toBe(403)
      expect((await h.call(leader, 'POST', path(id), accept, { csrf: 'forged' })).status).toBe(403)
      for (const who of [member, outsider, otherLeader, h.officer]) {
        const reply = await h.call(who, 'POST', path(id), accept)
        expect([who.email, reply.status]).toEqual([who.email, 403])
      }
      expect((await m.eventInvitations!.findById(id).lean())?.status).toBe('Pending')
    })

    it('404s an unknown invitation and an invitation of another club', async () => {
      const accept = { outcome: 'Accepted' }
      const missing = await h.call(leader, 'POST', path(missingId()), accept)
      expect(missing.status).toBe(404)
      expect(missing.body.message).toBe('invitation not found')
      const theirs = await invite(await seedSchoolEvent('Not yours'), otherClub)
      expect((await h.call(leader, 'POST', path(theirs), accept)).status).toBe(404)
    })

    it('refuses answers after the deadline, for a closed event or from a club that is not active', async () => {
      const accept = { outcome: 'Accepted' }
      const late = await invite(await seedSchoolEvent('Late'), club, {
        deadline: new Date(Date.now() - 1_000),
      })
      expect((await h.call(leader, 'POST', path(late), accept)).status).toBe(409)

      const cancelled = await invite(
        await seedSchoolEvent('Cancelled', { state: 'Cancelled' }),
        club,
      )
      const cancelledReply = await h.call(leader, 'POST', path(cancelled), accept)
      expect(cancelledReply.status).toBe(409)
      expect(cancelledReply.body.message).toBe('school event is no longer answerable')

      const started = await invite(
        await seedSchoolEvent('Started', { startAt: new Date(Date.now() - 3_600_000) }),
        club,
      )
      expect((await h.call(leader, 'POST', path(started), accept)).status).toBe(409)

      const paused = await invite(await seedSchoolEvent('Paused'), pausedClub)
      const pausedReply = await h.call(pausedLeader, 'POST', path(paused, pausedClub.id), accept)
      expect(pausedReply.status).toBe(409)
      expect(pausedReply.body.message).toBe('club must be active to respond')
      expect((await m.eventInvitations!.findById(paused).lean())?.status).toBe('Pending')
    })
  })
})
