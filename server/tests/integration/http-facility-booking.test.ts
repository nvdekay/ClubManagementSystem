// Facility bookings (UC45/UC46) over HTTP: the club's draft, edit, availability, submit and cancel,
// and the ICPDP queue, claim and decision, on the real app with Mongo, sessions and CSRF.
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

/** Campus slot 3 (12:50-15:10, Vietnam time) `days` days from now. */
function slot3(days: number) {
  const day = new Date(Date.now() + 7 * 3_600_000 + days * DAY).toISOString().slice(0, 10)
  return {
    startAt: new Date(`${day}T12:50:00+07:00`).toISOString(),
    endAt: new Date(`${day}T15:10:00+07:00`).toISOString(),
  }
}

describe.skipIf(!process.env.MONGO_URI)('HTTP: facility booking routes', () => {
  let h: Harness
  let leader: Actor, member: Actor, otherLeader: Actor
  let club: SeededClub, otherClub: SeededClub
  let hallId = '',
    roomId = ''
  let first = '',
    second = ''

  function body(overrides: Record<string, unknown> = {}) {
    return {
      propertyId: hallId,
      purpose: 'Club fair',
      ...slot3(5),
      headcount: 80,
      equipment: ['Projector'],
      ...overrides,
    }
  }
  function clubPath(suffix = '', clubId = club.id) {
    return `/clubs/${clubId}/bookings${suffix}`
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-booking')
    await h.seedPolicy()
    leader = await h.signIn('leader@http.edu')
    member = await h.signIn('member@http.edu')
    otherLeader = await h.signIn('other-leader@http.edu')
    club = await h.seedClub({ code: 'BKG', leader, members: [member] })
    otherClub = await h.seedClub({ code: 'BX', leader: otherLeader })
    const hours = Array.from({ length: 7 }, (_, index) => ({
      day: index + 1,
      open: '07:00',
      close: '18:00',
    }))
    const [hall, room] = await m.properties!.create([
      {
        code: 'HALL-A',
        name: 'Main hall',
        type: 'HALL',
        capacity: 100,
        equipment: ['Projector'],
        bookableHours: hours,
        blackouts: [],
        isActive: true,
        createdAt: new Date(),
      },
      {
        code: 'ROOM-1',
        name: 'Room 1',
        type: 'ROOM',
        capacity: 30,
        bookableHours: hours,
        blackouts: [],
        isActive: true,
        createdAt: new Date(),
      },
    ])
    hallId = String(hall!._id)
    roomId = String(room!._id)
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('reference data', () => {
    it('serves the campus slots to any signed-in user', async () => {
      expect(dataOf(await h.call(member, 'GET', '/booking-slots'))).toHaveLength(4)
      expect((await h.call(null, 'GET', '/booking-slots')).status).toBe(401)
    })

    it('lists bookable properties (no rooms) and club events for the leader', async () => {
      const properties = dataOf(await h.call(leader, 'GET', `/clubs/${club.id}/booking-properties`))
      expect(properties.map((row: { id: string }) => row.id)).toEqual([hallId])
      expect(dataOf(await h.call(leader, 'GET', `/clubs/${club.id}/booking-events`))).toEqual([])
      expect((await h.call(member, 'GET', `/clubs/${club.id}/booking-properties`)).status).toBe(403)
      expect((await h.call(otherLeader, 'GET', `/clubs/${club.id}/booking-events`)).status).toBe(
        403,
      )
      expect((await h.call(leader, 'GET', '/clubs/bad/booking-events')).status).toBe(400)
    })

    it('checks availability of a slot', async () => {
      const { startAt, endAt } = slot3(5)
      const query = `startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
      const free = dataOf(
        await h.call(
          leader,
          'GET',
          `/clubs/${club.id}/booking-properties/${hallId}/availability?${query}`,
        ),
      )
      expect(free.conflicts).toEqual([])
      expect(
        (await h.call(leader, 'GET', `/clubs/${club.id}/booking-properties/${hallId}/availability`))
          .status,
      ).toBe(400)
      expect(
        (
          await h.call(
            leader,
            'GET',
            `/clubs/${club.id}/booking-properties/${hallId}/availability?${query}&x=1`,
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(
            leader,
            'GET',
            `/clubs/${club.id}/booking-properties/${missingId()}/availability?${query}`,
          )
        ).status,
      ).toBe(404)
      // Rooms are allocated by ICPDP, never booked by clubs.
      expect(
        (
          await h.call(
            leader,
            'GET',
            `/clubs/${club.id}/booking-properties/${roomId}/availability?${query}`,
          )
        ).status,
      ).toBe(400)
    })
  })

  describe('club bookings', () => {
    it('validates a new booking', async () => {
      expect((await h.call(leader, 'POST', clubPath(), body({ purpose: ' ' }))).status).toBe(400)
      expect((await h.call(leader, 'POST', clubPath(), body({ headcount: 0 }))).status).toBe(400)
      expect((await h.call(leader, 'POST', clubPath(), body({ propertyId: 'x' }))).status).toBe(400)
      expect((await h.call(leader, 'POST', clubPath(), body({ budget: 1 }))).status).toBe(400)
      expect(
        (
          await h.call(
            leader,
            'POST',
            clubPath(),
            body({ endAt: new Date(Date.parse(slot3(5).startAt) + 3_600_000).toISOString() }),
          )
        ).status,
      ).toBe(400)
      expect((await h.call(leader, 'POST', clubPath(), body(slot3(-2)))).status).toBe(400)
      expect(
        (await h.call(leader, 'POST', clubPath(), body({ equipment: ['Laser'] }))).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', clubPath(), body({ eventId: missingId() }))).status,
      ).toBe(400)
      expect(
        (await h.call(leader, 'POST', clubPath(), body({ propertyId: missingId() }))).status,
      ).toBe(404)
    })

    it('needs the booking permission of this club and CSRF', async () => {
      expect((await h.call(member, 'POST', clubPath(), body())).status).toBe(403)
      expect((await h.call(otherLeader, 'POST', clubPath(), body())).status).toBe(403)
      expect((await h.call(leader, 'POST', clubPath(), body(), { noCsrf: true })).status).toBe(403)
      expect((await h.call(null, 'POST', clubPath(), body())).status).toBe(401)
    })

    it('creates, edits and lists drafts', async () => {
      const created = dataOf(await h.call(leader, 'POST', clubPath(), body()), 201)
      expect(created.booking).toMatchObject({ state: 'Draft', purpose: 'Club fair' })
      first = created.booking.id
      second = dataOf(await h.call(leader, 'POST', clubPath(), body({ purpose: 'Rehearsal' })), 201)
        .booking.id

      const edited = dataOf(
        await h.call(leader, 'PATCH', clubPath(`/${first}`), {
          ...body({ headcount: 90 }),
          expectedVersion: created.booking.currentVersionNo,
        }),
      )
      expect(edited.booking.headcount).toBe(90)
      expect(
        (await h.call(leader, 'PATCH', clubPath(`/${first}`), { ...body(), expectedVersion: 99 }))
          .status,
      ).toBe(409)
      expect((await h.call(leader, 'PATCH', clubPath(`/${first}`), body())).status).toBe(400)
      expect(
        (
          await h.call(leader, 'PATCH', clubPath(`/${missingId()}`), {
            ...body(),
            expectedVersion: 0,
          })
        ).status,
      ).toBe(404)

      const list = dataOf(await h.call(leader, 'GET', clubPath()))
      expect(list).toHaveLength(2)
      expect(dataOf(await h.call(leader, 'GET', clubPath(`/${first}`))).booking.id).toBe(first)
      expect((await h.call(otherLeader, 'GET', clubPath(`/${first}`, otherClub.id))).status).toBe(
        404,
      )
      expect((await h.call(leader, 'GET', clubPath('/bad'))).status).toBe(400)
      expect((await h.call(member, 'GET', clubPath())).status).toBe(403)
    })

    it('submits with the current version', async () => {
      const current = dataOf(await h.call(leader, 'GET', clubPath(`/${first}`))).booking
      expect((await h.call(leader, 'POST', clubPath(`/${first}/submit`), {})).status).toBe(400)
      expect(
        (await h.call(leader, 'POST', clubPath(`/${first}/submit`), { expectedVersion: 99 }))
          .status,
      ).toBe(409)
      const submitted = dataOf(
        await h.call(leader, 'POST', clubPath(`/${first}/submit`), {
          expectedVersion: current.currentVersionNo,
        }),
      )
      expect(submitted.booking.state).toBe('Requested')
      expect(
        (
          await h.call(leader, 'PATCH', clubPath(`/${first}`), {
            ...body(),
            expectedVersion: submitted.booking.currentVersionNo,
          })
        ).status,
      ).toBe(409)
    })
  })

  describe('ICPDP review', () => {
    it('lists and shows bookings to officers only', async () => {
      const queue = dataOf(await h.call(h.officer, 'GET', '/admin/bookings'))
      expect(queue.map((row: { id: string }) => row.id)).toEqual(
        expect.arrayContaining([first, second]),
      )
      expect(dataOf(await h.call(h.officer, 'GET', `/admin/bookings/${first}`)).booking.id).toBe(
        first,
      )
      expect((await h.call(h.officer, 'GET', `/admin/bookings/${missingId()}`)).status).toBe(404)
      expect((await h.call(h.officer, 'GET', '/admin/bookings/bad')).status).toBe(400)
      expect((await h.call(leader, 'GET', '/admin/bookings')).status).toBe(403)
      expect((await h.call(leader, 'GET', `/admin/bookings/${first}`)).status).toBe(403)
    })

    it('claims and approves a submitted booking', async () => {
      expect(
        (await h.call(h.officer, 'POST', `/admin/bookings/${first}/claim`, { x: 1 })).status,
      ).toBe(400)
      expect((await h.call(leader, 'POST', `/admin/bookings/${first}/claim`, {})).status).toBe(403)
      expect(
        (await h.call(h.officer, 'POST', `/admin/bookings/${missingId()}/claim`, {})).status,
      ).toBe(404)
      dataOf(await h.call(h.officer, 'POST', `/admin/bookings/${first}/claim`, {}))

      const decide = `/admin/bookings/${first}/decision`
      expect((await h.call(h.officer, 'POST', decide, { outcome: 'Approve' })).status).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', decide, { outcome: 'Maybe', reason: 'x' })).status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', decide, {
            outcome: 'Reject',
            reason: 'x',
            overbookingReason: 'y',
          })
        ).status,
      ).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', decide, {
            outcome: 'Approve',
            reason: 'x',
            alternative: { propertyId: hallId, ...slot3(6) },
          })
        ).status,
      ).toBe(400)
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
      const approved = dataOf(
        await h.call(h.officer, 'POST', decide, { outcome: 'Approve', reason: 'Hall is free' }),
      )
      expect(approved.booking.state).toBe('Approved')
      expect(
        (await h.call(h.officer, 'POST', decide, { outcome: 'Reject', reason: 'x' })).status,
      ).toBe(409)
    })

    it('blocks a second booking of the approved slot and lists property conflicts', async () => {
      const { startAt, endAt } = slot3(5)
      const query = `startAt=${encodeURIComponent(startAt)}&endAt=${encodeURIComponent(endAt)}`
      const taken = dataOf(
        await h.call(
          leader,
          'GET',
          `/clubs/${club.id}/booking-properties/${hallId}/availability?${query}`,
        ),
      )
      expect(taken.conflictResult).toBe('Blocking Conflict')
      const current = dataOf(await h.call(leader, 'GET', clubPath(`/${second}`))).booking
      expect(
        (
          await h.call(leader, 'POST', clubPath(`/${second}/submit`), {
            expectedVersion: current.currentVersionNo,
          })
        ).status,
      ).toBe(409)
      expect(
        dataOf(await h.call(h.officer, 'GET', `/admin/properties/${hallId}/booking-conflicts`)),
      ).toBeDefined()
      expect(
        (await h.call(leader, 'GET', `/admin/properties/${hallId}/booking-conflicts`)).status,
      ).toBe(403)
      expect(
        (await h.call(h.officer, 'GET', '/admin/properties/bad/booking-conflicts')).status,
      ).toBe(400)
    })

    it('the club cancels a booking with a reason', async () => {
      expect((await h.call(leader, 'POST', clubPath(`/${first}/cancel`), {})).status).toBe(400)
      expect(
        (await h.call(member, 'POST', clubPath(`/${first}/cancel`), { reason: 'x' })).status,
      ).toBe(403)
      // Only requested or approved bookings can be cancelled; a draft cannot.
      expect(
        (await h.call(leader, 'POST', clubPath(`/${second}/cancel`), { reason: 'x' })).status,
      ).toBe(409)
      expect(
        dataOf(await h.call(leader, 'POST', clubPath(`/${first}/cancel`), { reason: 'Not needed' }))
          .booking.state,
      ).toBe('Cancelled')
      expect(
        (await h.call(leader, 'POST', clubPath(`/${first}/cancel`), { reason: 'again' })).status,
      ).toBe(409)
    })
  })
})
