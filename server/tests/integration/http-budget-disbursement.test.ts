// Event budget disbursement (UC38) over HTTP: the paged ICPDP budget queue with tab counts and the
// club scope, budget detail, and recording money flows, on the real app with Mongo and sessions.
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

function decimal(value: number) {
  return Types.Decimal128.fromString(String(value))
}

describe.skipIf(!process.env.MONGO_URI)('HTTP: budget disbursement routes', () => {
  let h: Harness
  let leader: Actor, otherLeader: Actor
  let club: SeededClub, otherClub: SeededClub
  const budgets: Record<string, string> = {}

  async function seedBudget(clubId: string, state: string, title: string) {
    const now = new Date()
    const endAt = new Date(now.getTime() + 10 * DAY)
    const event = await m.events!.create({
      organizerType: 'CLUB',
      clubId: new Types.ObjectId(clubId),
      clubName: 'Club',
      title,
      startAt: new Date(endAt.getTime() - 3_600_000),
      endAt,
      semesterCode: 'Term',
      audienceScope: 'PUBLIC',
      capacity: 50,
      state: 'Approved',
      currentRevisionNo: 1,
      createdAt: now,
    })
    await m.eventProposalVersions!.create({
      eventId: event._id,
      revisionNo: 1,
      submittedBy: new Types.ObjectId(leader.id),
      submittedAt: now,
      payload: {},
    })
    const doc = await m.eventBudgets!.create({
      eventId: event._id,
      clubId: new Types.ObjectId(clubId),
      state,
      periodCode: 'Term',
      lines: [{ category: 'Logistics', requestedAmount: 5_000_000, approvedAmount: 4_000_000 }],
      requestedTotal: decimal(5_000_000),
      approvedTotal: decimal(4_000_000),
      approvedByDecisionId: new Types.ObjectId(),
      disbursedTotal: decimal(0),
      refundedTotal: decimal(0),
      isSettlementLate: false,
      createdAt: now,
    })
    return String(doc._id)
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-budget')
    leader = await h.signIn('leader@http.edu')
    otherLeader = await h.signIn('other-leader@http.edu')
    club = await h.seedClub({ code: 'BUD', name: 'Budget Club', leader })
    otherClub = await h.seedClub({ code: 'ABC', name: 'Another Club', leader: otherLeader })
    budgets.open = await seedBudget(club.id, 'Approved', 'Open budget')
    budgets.closed = await seedBudget(club.id, 'Closed', 'Closed budget')
    budgets.other = await seedBudget(otherClub.id, 'Approved', 'Other club budget')
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('GET /admin/budgets', () => {
    it('pages a tab with per-tab counts and the club picker', async () => {
      const all = dataOf(await h.call(h.officer, 'GET', '/admin/budgets?pageSize=2'))
      expect(all).toMatchObject({ total: 3, page: 1, pageSize: 2 })
      expect(all.items).toHaveLength(2)
      expect(all.counts).toMatchObject({ all: 3, inProgress: 2, closed: 1 })
      expect(all.clubs).toEqual([
        { id: otherClub.id, name: 'Another Club' },
        { id: club.id, name: 'Budget Club' },
      ])
      const page2 = dataOf(await h.call(h.officer, 'GET', '/admin/budgets?pageSize=2&page=2'))
      expect(page2.items).toHaveLength(1)

      const closed = dataOf(await h.call(h.officer, 'GET', '/admin/budgets?filter=closed'))
      expect(closed.total).toBe(1)
      expect(closed.items[0].id).toBe(budgets.closed)

      const scoped = dataOf(await h.call(h.officer, 'GET', `/admin/budgets?clubId=${club.id}`))
      expect(scoped.total).toBe(2)
      expect(scoped.counts).toMatchObject({ all: 2, inProgress: 1, closed: 1 })
      expect(
        dataOf(await h.call(h.officer, 'GET', '/admin/budgets?filter=awaitingAdvance')).total,
      ).toBe(0)
    })

    it('rejects bad query parameters and non-officers', async () => {
      expect((await h.call(h.officer, 'GET', '/admin/budgets?filter=pending')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/budgets?clubId=abc')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/budgets?page=0')).status).toBe(400)
      expect((await h.call(h.officer, 'GET', '/admin/budgets?state=Closed')).status).toBe(400)
      expect((await h.call(leader, 'GET', '/admin/budgets')).status).toBe(403)
      expect((await h.call(null, 'GET', '/admin/budgets')).status).toBe(401)
    })
  })

  describe('GET /admin/budgets/:id', () => {
    it('shows a budget with the flow it allows next', async () => {
      const detail = dataOf(await h.call(h.officer, 'GET', `/admin/budgets/${budgets.open}`))
      expect(detail).toMatchObject({
        id: budgets.open,
        state: 'Approved',
        approvedTotal: 4_000_000,
        allowed: { kind: 'Advance', max: 4_000_000 },
      })
      expect((await h.call(h.officer, 'GET', `/admin/budgets/${missingId()}`)).status).toBe(404)
      expect((await h.call(h.officer, 'GET', '/admin/budgets/bad')).status).toBe(400)
      expect((await h.call(leader, 'GET', `/admin/budgets/${budgets.open}`)).status).toBe(403)
    })
  })

  describe('POST /admin/budgets/:id/flows', () => {
    function path() {
      return `/admin/budgets/${budgets.open}/flows`
    }

    it('validates the flow', async () => {
      const advance = { kind: 'Advance', amount: 1_000_000 }
      expect((await h.call(h.officer, 'POST', path(), { ...advance, amount: 0 })).status).toBe(400)
      expect((await h.call(h.officer, 'POST', path(), { ...advance, amount: 1.5 })).status).toBe(
        400,
      )
      expect((await h.call(h.officer, 'POST', path(), { ...advance, kind: 'Gift' })).status).toBe(
        400,
      )
      expect((await h.call(h.officer, 'POST', path(), { ...advance, tip: 1 })).status).toBe(400)
      expect(
        (
          await h.call(h.officer, 'POST', path(), {
            ...advance,
            disbursedAt: new Date(Date.now() + DAY).toISOString(),
          })
        ).status,
      ).toBe(400)
      expect(
        (await h.call(h.officer, 'POST', path(), { ...advance, amount: 9_000_000 })).status,
      ).toBe(400)
      expect((await h.call(h.officer, 'POST', path(), { kind: 'Refund', amount: 1 })).status).toBe(
        409,
      )
      expect(
        (await h.call(h.officer, 'POST', `/admin/budgets/${missingId()}/flows`, advance)).status,
      ).toBe(404)
      expect((await h.call(h.officer, 'POST', '/admin/budgets/bad/flows', advance)).status).toBe(
        400,
      )
    })

    it('needs an officer and a CSRF token', async () => {
      const advance = { kind: 'Advance', amount: 1_000_000 }
      expect((await h.call(leader, 'POST', path(), advance)).status).toBe(403)
      expect((await h.call(h.officer, 'POST', path(), advance, { noCsrf: true })).status).toBe(403)
      expect((await h.call(null, 'POST', path(), advance)).status).toBe(401)
    })

    it('records advances until the approved total is paid out', async () => {
      const first = dataOf(
        await h.call(h.officer, 'POST', path(), {
          kind: 'Advance',
          amount: 1_500_000,
          paymentReference: 'UNC-01',
          note: 'First tranche',
        }),
      )
      expect(first).toMatchObject({
        state: 'Disbursed',
        disbursedTotal: 1_500_000,
        allowed: { kind: 'Advance', max: 2_500_000 },
      })
      expect(first.flows[0]).toMatchObject({ kind: 'Advance', paymentReference: 'UNC-01' })
      const second = dataOf(
        await h.call(h.officer, 'POST', path(), { kind: 'Advance', amount: 2_500_000 }),
      )
      expect(second.disbursedTotal).toBe(4_000_000)
      expect(second.allowed).toBeUndefined()
      expect((await h.call(h.officer, 'POST', path(), { kind: 'Advance', amount: 1 })).status).toBe(
        409,
      )
    })
  })
})
