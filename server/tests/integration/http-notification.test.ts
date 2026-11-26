// The notification inbox over HTTP: workspace scopes, cursor paging, unread counts and marking
// read, on the real app with Mongo, sessions and CSRF. Rows are seeded directly; producing them is
// covered by each feature's own tests.
import { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ucmsModels as m } from '../../src/infra/db/ucms-models.js'
import { type Actor, type Harness, dataOf, missingId, startHttpHarness } from './http-harness.js'

describe.skipIf(!process.env.MONGO_URI)('HTTP: notification routes', () => {
  let h: Harness
  let student: Actor, other: Actor
  const clubA = new Types.ObjectId()
  const clubB = new Types.ObjectId()
  const ids: Record<string, string> = {}

  async function seed(key: string, eventCode: string, minutesAgo: number, clubId?: Types.ObjectId) {
    const doc = await m.notifications!.create({
      recipientUserId: new Types.ObjectId(student.id),
      eventCode,
      entityType: clubId ? 'Club' : 'ClubApplication',
      entityId: clubId ?? new Types.ObjectId(),
      ...(clubId ? { clubId } : {}),
      channels: ['IN_APP'],
      payload: { key },
      state: 'Sent',
      dueAt: new Date(Date.now() - minutesAgo * 60_000),
      attempts: 0,
      createdAt: new Date(Date.now() - minutesAgo * 60_000),
    })
    ids[key] = String(doc._id)
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-notification')
    student = await h.signIn('student@http.edu')
    other = await h.signIn('other@http.edu')
    await seed('s1', 'CLUB_APPLICATION_APPROVED', 50)
    await seed('s2', 'CLUB_APPLICATION_REJECTED', 40)
    await seed('s3', 'EVENT_REGISTRATION_CONFIRMED', 30)
    await seed('i1', 'BOOKING_SUBMITTED', 20)
    await seed('ca', 'EVENT_PROPOSAL_APPROVED', 10, clubA)
    await seed('cb', 'EVENT_PROPOSAL_REJECTED', 5, clubB)
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  it('lists my inbox newest first with a cursor for the next page', async () => {
    const first = dataOf(await h.call(student, 'GET', '/notifications/mine?limit=4'))
    expect(first.items.map((row: { id: string }) => row.id)).toEqual([
      ids.cb,
      ids.ca,
      ids.i1,
      ids.s3,
    ])
    expect(first.unread).toBe(6)
    expect(first.items[0].clubId).toBe(String(clubB))
    const next = dataOf(
      await h.call(
        student,
        'GET',
        `/notifications/mine?limit=4&before=${encodeURIComponent(first.nextBefore)}`,
      ),
    )
    expect(next.items.map((row: { id: string }) => row.id)).toEqual([ids.s2, ids.s1])
    expect(next.nextBefore).toBeUndefined()
    expect(dataOf(await h.call(other, 'GET', '/notifications/mine'))).toEqual({
      items: [],
      unread: 0,
    })
  })

  it('filters by workspace scope and by club', async () => {
    function codes(reply: { body: { data: { items: { eventCode: string }[] } } }) {
      return reply.body.data.items.map((row) => row.eventCode)
    }
    expect(codes(await h.call(student, 'GET', '/notifications/mine?scope=student'))).toEqual([
      'EVENT_REGISTRATION_CONFIRMED',
      'CLUB_APPLICATION_REJECTED',
      'CLUB_APPLICATION_APPROVED',
    ])
    expect(codes(await h.call(student, 'GET', '/notifications/mine?scope=icpdp'))).toEqual([
      'BOOKING_SUBMITTED',
    ])
    expect(codes(await h.call(student, 'GET', '/notifications/mine?scope=club'))).toEqual([
      'EVENT_PROPOSAL_REJECTED',
      'EVENT_PROPOSAL_APPROVED',
    ])
    const clubOnly = dataOf(
      await h.call(student, 'GET', `/notifications/mine?scope=club&clubId=${clubA}`),
    )
    expect(clubOnly).toMatchObject({ unread: 1 })
    expect(clubOnly.items.map((row: { id: string }) => row.id)).toEqual([ids.ca])
  })

  it('rejects bad inbox queries', async () => {
    for (const query of [
      'limit=0',
      'limit=51',
      'before=yesterday',
      'unreadOnly=yes',
      'scope=admin',
      `clubId=${clubA}`,
      'clubId=bad&scope=club',
      'sort=asc',
    ]) {
      expect((await h.call(student, 'GET', `/notifications/mine?${query}`)).status).toBe(400)
    }
    expect((await h.call(null, 'GET', '/notifications/mine')).status).toBe(401)
  })

  it('counts unread notifications, per scope', async () => {
    expect(dataOf(await h.call(student, 'GET', '/notifications/mine/unread-count'))).toEqual({
      unread: 6,
    })
    expect(
      dataOf(await h.call(student, 'GET', '/notifications/mine/unread-count?scope=student')),
    ).toEqual({ unread: 3 })
    expect((await h.call(student, 'GET', '/notifications/mine/unread-count?limit=5')).status).toBe(
      400,
    )
    expect((await h.call(null, 'GET', '/notifications/mine/unread-count')).status).toBe(401)
  })

  it('marks one notification read, only my own', async () => {
    expect(dataOf(await h.call(student, 'POST', `/notifications/${ids.s1}/read`))).toEqual({
      unread: 5,
    })
    // Marking it again is idempotent.
    expect(dataOf(await h.call(student, 'POST', `/notifications/${ids.s1}/read`))).toEqual({
      unread: 5,
    })
    expect((await h.call(other, 'POST', `/notifications/${ids.s2}/read`)).status).toBe(404)
    expect((await h.call(student, 'POST', `/notifications/${missingId()}/read`)).status).toBe(404)
    expect((await h.call(student, 'POST', '/notifications/bad/read')).status).toBe(400)
    expect(
      (await h.call(student, 'POST', `/notifications/${ids.s2}/read`, undefined, { noCsrf: true }))
        .status,
    ).toBe(403)
    const unreadOnly = dataOf(await h.call(student, 'GET', '/notifications/mine?unreadOnly=true'))
    expect(unreadOnly.items.map((row: { id: string }) => row.id)).not.toContain(ids.s1)
    expect(
      dataOf(await h.call(student, 'GET', '/notifications/mine?scope=student')).items.find(
        (row: { id: string }) => row.id === ids.s1,
      ).readAt,
    ).toBeDefined()
  })

  it('marks all read within a scope', async () => {
    expect(
      dataOf(await h.call(student, 'POST', '/notifications/mine/read-all?scope=student')),
    ).toEqual({ marked: 2, unread: 0 })
    expect(dataOf(await h.call(student, 'GET', '/notifications/mine/unread-count'))).toEqual({
      unread: 3,
    })
    expect(
      (await h.call(student, 'POST', '/notifications/mine/read-all?scope=nobody')).status,
    ).toBe(400)
    expect(
      (await h.call(student, 'POST', '/notifications/mine/read-all', undefined, { csrf: 'bad' }))
        .status,
    ).toBe(403)
    expect(dataOf(await h.call(student, 'POST', '/notifications/mine/read-all'))).toEqual({
      marked: 3,
      unread: 0,
    })
  })
})
