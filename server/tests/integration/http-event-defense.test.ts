// Event proposal defense sessions (UC33) over HTTP: ICPDP scheduling, live session, notes,
// decision, no-show and cancellation, plus the club side (view, confirm, reschedule request).
// Defense start/no-show depend on the wall clock, so the test moves a scheduled session's slot
// in the database instead of waiting for it.
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

const HOUR = 3_600_000

describe.skipIf(!process.env.MONGO_URI)('HTTP: event defense routes', () => {
  let h: Harness
  let panel: Actor, leader: Actor, member: Actor, otherLeader: Actor
  let club: SeededClub, otherClub: SeededClub
  let roomId = '',
    secondRoomId = ''
  let main = '',
    noShow = '',
    cancelled = ''

  async function seedProposal(title: string) {
    const now = new Date()
    const startAt = new Date(now.getTime() + 20 * DAY)
    const event = await m.events!.create({
      organizerType: 'CLUB',
      clubId: new Types.ObjectId(club.id),
      clubName: 'Club DEF',
      title,
      startAt,
      endAt: new Date(startAt.getTime() + 2 * HOUR),
      semesterCode: 'Term',
      venueText: 'Hall',
      audienceScope: 'PUBLIC',
      capacity: 100,
      riskCategory: 'HIGH',
      conflictResult: 'No Conflict',
      state: 'Pending Approval',
      currentRevisionNo: 1,
      createdAt: now,
    })
    await m.eventProposalVersions!.create({
      eventId: event._id,
      revisionNo: 1,
      submittedBy: new Types.ObjectId(leader.id),
      submittedAt: now,
      payload: { title, plan: 'Plan' },
      budgetLines: [{ category: 'Stage', amount: 5_000_000, purpose: 'Lighting' }],
      requestedBudgetTotal: 5_000_000,
    })
    await m.approvalTasks!.create({
      entityType: 'EVENT_PROPOSAL',
      entityId: event._id,
      clubId: new Types.ObjectId(club.id),
      title,
      state: 'Open',
      openedAt: now,
    })
    return String(event._id)
  }

  async function seedRoom(code: string) {
    const room = await m.properties!.create({
      code,
      name: `Room ${code}`,
      type: 'ROOM',
      location: 'Beta',
      capacity: 30,
      bookableHours: Array.from({ length: 7 }, (_, day) => ({
        day: day + 1,
        open: '00:00',
        close: '23:59',
      })),
      isActive: true,
      createdAt: new Date(),
    })
    return String(room._id)
  }

  /** Moves the proposal's latest defense session so that it starts at `startAt`. */
  async function moveSlot(eventId: string, startAt: Date) {
    const session = await m
      .eventDefenseSessions!.findOne({ eventId: new Types.ObjectId(eventId) })
      .sort({ createdAt: -1 })
    session!.set({ startAt, endAt: new Date(startAt.getTime() + HOUR) })
    await session!.save()
  }

  function slot(daysAhead: number, hour = 2) {
    const start = new Date(Date.now() + daysAhead * DAY)
    start.setUTCHours(hour, 0, 0, 0)
    return start.toISOString()
  }

  function scheduleBody(overrides: Record<string, unknown> = {}) {
    return {
      title: 'Round 1',
      startAt: slot(5),
      durationMinutes: 60,
      propertyId: roomId,
      note: 'Bring the stage plan',
      ...overrides,
    }
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-event-defense')
    panel = await h.signInOfficer('panel@http.edu')
    leader = await h.signIn('leader@http.edu')
    member = await h.signIn('member@http.edu')
    otherLeader = await h.signIn('other-leader@http.edu')
    club = await h.seedClub({ code: 'DEF', leader, members: [member] })
    otherClub = await h.seedClub({ code: 'DX', leader: otherLeader })
    roomId = await seedRoom('BE-201')
    secondRoomId = await seedRoom('BE-202')
    main = await seedProposal('AI Summit')
    noShow = await seedProposal('No-show Fair')
    cancelled = await seedProposal('Cancelled Gala')
    for (const id of [main, noShow, cancelled]) {
      dataOf(await h.call(h.officer, 'POST', `/admin/event-proposals/${id}/claim`))
    }
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('GET /admin/event-defense/rooms', () => {
    it('lists free rooms for a slot and validates the query', async () => {
      const rooms = dataOf(
        await h.call(
          h.officer,
          'GET',
          `/admin/event-defense/rooms?startAt=${encodeURIComponent(slot(4))}&durationMinutes=60`,
        ),
      )
      expect(rooms.map((room: { id: string }) => room.id).sort()).toEqual(
        [roomId, secondRoomId].sort(),
      )
      expect((await h.call(h.officer, 'GET', '/admin/event-defense/rooms')).status).toBe(400)
      expect(
        (
          await h.call(
            h.officer,
            'GET',
            `/admin/event-defense/rooms?startAt=${encodeURIComponent(slot(4))}&durationMinutes=5`,
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            h.officer,
            'GET',
            `/admin/event-defense/rooms?startAt=${encodeURIComponent(slot(4))}&durationMinutes=60&floor=2`,
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            h.officer,
            'GET',
            `/admin/event-defense/rooms?startAt=${encodeURIComponent(slot(4))}&durationMinutes=60&excludeDefenseId=x`,
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            leader,
            'GET',
            `/admin/event-defense/rooms?startAt=${encodeURIComponent(slot(4))}&durationMinutes=60`,
          )
        ).status,
      ).toBe(403)
      expect((await h.call(null, 'GET', '/admin/event-defense/rooms')).status).toBe(401)
    })
  })

  describe('scheduling', () => {
    it('validates the request before scheduling', async () => {
      const path = `/admin/event-proposals/${main}/defense/schedule`
      expect((await h.call(h.officer, 'POST', path, scheduleBody({ title: '' }))).status).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', path, scheduleBody({ durationMinutes: 300 }))).status,
      ).toBe(400)
      expect((await h.call(h.officer, 'POST', path, scheduleBody({ room: 'x' }))).status).toBe(400)
      // Less than 48 hours of notice.
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            path,
            scheduleBody({ startAt: new Date(Date.now() + 24 * HOUR).toISOString() }),
          )
        ).status,
      ).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', path, scheduleBody({ propertyId: missingId() }))).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            '/admin/event-proposals/bad/defense/schedule',
            scheduleBody(),
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            `/admin/event-proposals/${missingId()}/defense/schedule`,
            scheduleBody(),
          )
        ).status,
      ).toBe(404)
    })

    it('only the assigned officer may schedule, with a CSRF token', async () => {
      const path = `/admin/event-proposals/${main}/defense/schedule`
      expect((await h.call(leader, 'POST', path, scheduleBody())).status).toBe(403)
      expect((await h.call(panel, 'POST', path, scheduleBody())).status).toBe(403)
      expect((await h.call(h.officer, 'POST', path, scheduleBody(), { noCsrf: true })).status).toBe(
        403,
      )
      expect((await h.call(null, 'POST', path, scheduleBody())).status).toBe(401)
    })

    it('schedules a session, then refuses a second one and a clashing room', async () => {
      const scheduled = dataOf(
        await h.call(
          h.officer,
          'POST',
          `/admin/event-proposals/${main}/defense/schedule`,
          scheduleBody(),
        ),
      )
      expect(scheduled).toMatchObject({ state: 'SCHEDULED', title: 'Round 1' })
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            `/admin/event-proposals/${main}/defense/schedule`,
            scheduleBody(),
          )
        ).status,
      ).toBe(409)
      // Same room, overlapping slot, for another proposal.
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            `/admin/event-proposals/${noShow}/defense/schedule`,
            scheduleBody(),
          )
        ).status,
      ).toBe(409)
      dataOf(
        await h.call(
          h.officer,
          'POST',
          `/admin/event-proposals/${noShow}/defense/schedule`,
          scheduleBody({ propertyId: secondRoomId }),
        ),
      )
      dataOf(
        await h.call(
          h.officer,
          'POST',
          `/admin/event-proposals/${cancelled}/defense/schedule`,
          scheduleBody({ startAt: slot(6) }),
        ),
      )
    })
  })

  describe('club side', () => {
    it('the leader views the defense; members and other clubs cannot', async () => {
      const view = dataOf(await h.call(leader, 'GET', `/clubs/${club.id}/events/${main}/defense`))
      expect(JSON.stringify(view)).toContain('SCHEDULED')
      expect((await h.call(member, 'GET', `/clubs/${club.id}/events/${main}/defense`)).status).toBe(
        403,
      )
      expect(
        (await h.call(otherLeader, 'GET', `/clubs/${club.id}/events/${main}/defense`)).status,
      ).toBe(403)
      expect(
        (await h.call(otherLeader, 'GET', `/clubs/${otherClub.id}/events/${main}/defense`)).status,
      ).toBe(404)
      expect((await h.call(leader, 'GET', `/clubs/${club.id}/events/bad/defense`)).status).toBe(400)
    })

    it('the leader asks to reschedule with a reason', async () => {
      const path = `/clubs/${club.id}/events/${cancelled}/defense/reschedule-request`
      expect((await h.call(leader, 'POST', path, {})).status).toBe(400)
      expect((await h.call(leader, 'POST', path, { reason: '  ' })).status).toBe(400)
      expect((await h.call(member, 'POST', path, { reason: 'exam week' })).status).toBe(403)
      expect((await h.call(leader, 'POST', path, { reason: 'x' }, { noCsrf: true })).status).toBe(
        403,
      )
      expect((await h.call(leader, 'POST', path, { reason: 'exam week' })).status).toBe(200)
    })

    it('the officer validates a reschedule response', async () => {
      const path = `/admin/event-proposals/${cancelled}/defense/respond-reschedule`
      expect((await h.call(h.officer, 'POST', path, {})).status).toBe(400)
      expect((await h.call(h.officer, 'POST', path, { accept: 'yes' })).status).toBe(400)
      expect((await h.call(leader, 'POST', path, { accept: false, reason: 'no' })).status).toBe(403)
      expect(
        (
          await h.call(h.officer, 'POST', `/admin/event-proposals/bad/defense/respond-reschedule`, {
            accept: false,
          })
        ).status,
      ).toBe(400)
    })

    it('the leader confirms attendance once', async () => {
      const path = `/clubs/${club.id}/events/${main}/defense/confirm`
      expect((await h.call(member, 'POST', path)).status).toBe(403)
      expect((await h.call(leader, 'POST', path, undefined, { noCsrf: true })).status).toBe(403)
      expect(dataOf(await h.call(leader, 'POST', path)).state).toBe('CONFIRMED')
      expect((await h.call(leader, 'POST', path)).status).toBe(409)
      expect(
        (await h.call(leader, 'POST', `/clubs/${club.id}/events/${missingId()}/defense/confirm`))
          .status,
      ).toBe(404)
    })
  })

  describe('live session', () => {
    it('cannot start long before the slot; the session view shows the confirmed slot', async () => {
      expect(
        (await h.call(h.officer, 'POST', `/admin/event-proposals/${main}/defense/start`)).status,
      ).toBe(409)
      expect(
        dataOf(await h.call(h.officer, 'GET', `/admin/event-proposals/${main}/defense/session`))
          .state,
      ).toBe('CONFIRMED')
      expect(
        (await h.call(h.officer, 'GET', `/admin/event-proposals/${missingId()}/defense/session`))
          .status,
      ).toBe(404)
      expect(
        (await h.call(h.officer, 'GET', '/admin/event-proposals/bad/defense/session')).status,
      ).toBe(400)
    })

    it('starts, collects notes from several officers, and ends', async () => {
      await moveSlot(main, new Date(Date.now() + 10 * 60_000))
      const start = `/admin/event-proposals/${main}/defense/start`
      expect((await h.call(panel, 'POST', start)).status).toBe(403)
      expect((await h.call(leader, 'POST', start)).status).toBe(403)
      expect(dataOf(await h.call(h.officer, 'POST', start)).state).toBe('IN_PROGRESS')
      expect((await h.call(h.officer, 'POST', start)).status).toBe(409)

      const notes = `/admin/event-proposals/${main}/defense/notes`
      expect((await h.call(h.officer, 'PUT', notes, { content: 'x'.repeat(50_001) })).status).toBe(
        400,
      )
      expect((await h.call(h.officer, 'PUT', notes, { text: 'x' })).status).toBe(400)
      expect((await h.call(leader, 'PUT', notes, { content: 'x' })).status).toBe(403)
      dataOf(await h.call(h.officer, 'PUT', notes, { content: '# Lead\n- good plan' }))
      const withPanel = dataOf(await h.call(panel, 'PUT', notes, { content: '# Panel\n- budget?' }))
      expect(withPanel.notes).toHaveLength(2)

      const live = dataOf(
        await h.call(panel, 'GET', `/admin/event-proposals/${main}/defense/session`),
      )
      expect(live.state).toBe('IN_PROGRESS')
      expect(
        (await h.call(leader, 'GET', `/admin/event-proposals/${main}/defense/session`)).status,
      ).toBe(403)

      const end = `/admin/event-proposals/${main}/defense/end`
      expect((await h.call(panel, 'POST', end)).status).toBe(403)
      expect(dataOf(await h.call(h.officer, 'POST', end)).state).toBe('DEFENDED')
      expect((await h.call(h.officer, 'POST', end)).status).toBe(409)
    })

    it('records the decision after the defense', async () => {
      const path = `/admin/event-proposals/${main}/defense/decision`
      expect((await h.call(h.officer, 'POST', path, { outcome: 'Maybe' })).status).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', path, {
            outcome: 'Approve',
            budgetLines: [{ fundingDecision: 'BEFORE_EVENT', approvedAmount: 9_000_000 }],
          })
        ).status,
      ).toBe(400)
      expect((await h.call(leader, 'POST', path, { outcome: 'Reject', reason: 'no' })).status).toBe(
        403,
      )
      expect(
        (
          await h.call(
            h.officer,
            'POST',
            `/admin/event-proposals/${missingId()}/defense/decision`,
            {
              outcome: 'Reject',
              reason: 'no',
            },
          )
        ).status,
      ).toBe(404)
      const detail = dataOf(
        await h.call(h.officer, 'POST', path, {
          outcome: 'Approve',
          sections: [],
          conditions: ['Submit the vendor contract'],
          budgetLines: [{ fundingDecision: 'BEFORE_EVENT', approvedAmount: 5_000_000 }],
        }),
      )
      expect(detail.event.state).toBe('Approved')
    })
  })

  describe('no-show and cancellation', () => {
    it('a no-show can only be recorded after the slot, and rejects the proposal', async () => {
      const path = `/admin/event-proposals/${noShow}/defense/no-show`
      expect((await h.call(h.officer, 'POST', path, {})).status).toBe(409)
      expect((await h.call(h.officer, 'POST', path, { reason: 'x'.repeat(2001) })).status).toBe(400)
      await moveSlot(noShow, new Date(Date.now() - 10 * 60_000))
      expect((await h.call(leader, 'POST', path, {})).status).toBe(403)
      expect(dataOf(await h.call(h.officer, 'POST', path, {})).state).toBe('NO_SHOW')
      const event = await m.events!.findById(noShow).lean()
      expect(event?.state).toBe('Rejected')
    })

    it('cancels a scheduled session with a reason', async () => {
      const path = `/admin/event-proposals/${cancelled}/defense/cancel`
      expect((await h.call(h.officer, 'POST', path, {})).status).toBe(400)
      expect((await h.call(h.officer, 'POST', path, { reason: 'r', more: 1 })).status).toBe(400)
      expect((await h.call(leader, 'POST', path, { reason: 'r' })).status).toBe(403)
      expect(
        (await h.call(h.officer, 'POST', path, { reason: 'r' }, { noCsrf: true })).status,
      ).toBe(403)
      expect(dataOf(await h.call(h.officer, 'POST', path, { reason: 'room flooded' })).state).toBe(
        'CANCELLED',
      )
      expect((await h.call(h.officer, 'POST', path, { reason: 'again' })).status).toBe(409)
    })
  })
})
