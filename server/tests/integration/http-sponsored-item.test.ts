// Sponsored budget items (UC35–UC37) over HTTP: the club and ICPDP views of a budget, the item
// actions of the three payment channels, invoice and refund uploads, file access and the school
// refund account, on the real app with Mongo, sessions, CSRF and in-memory file storage.
import { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ucmsModels as m } from '../../src/infra/db/ucms-models.js'
import {
  type Actor,
  DAY,
  type Harness,
  type Json,
  type Reply,
  type SeededClub,
  dataOf,
  missingId,
  startHttpHarness,
} from './http-harness.js'

const PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])
const PNG_2 = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 4, 5, 6])
const JPEG = Buffer.from([255, 216, 255, 7, 8, 9])
const PDF = Buffer.from('%PDF-1.4 vendor contract')
const RECEIPT = Buffer.from([255, 216, 255, 10, 11, 12])
const RECEIPT_2 = Buffer.from([255, 216, 255, 13, 14, 15])
const VENDOR = {
  vendorName: 'Sound Co',
  accountHolder: 'SOUND CO LTD',
  accountNumber: '0123456789',
  bankName: 'VCB',
}

function decimal(value: number) {
  return Types.Decimal128.fromString(String(value))
}

describe.skipIf(!process.env.MONGO_URI)('HTTP: sponsored item routes', () => {
  let h: Harness
  let leader: Actor, member: Actor, outsider: Actor, otherLeader: Actor
  let club: SeededClub, otherClub: SeededClub
  let budgetId: string, legacyBudgetId: string, pausedBudgetId: string

  function clubBase(id = budgetId, clubId = club.id) {
    return `/clubs/${clubId}/budgets/${id}/items`
  }
  function adminBase(id = budgetId) {
    return `/admin/budgets/${id}/items`
  }
  async function revision(): Promise<number> {
    return dataOf(await h.call(leader, 'GET', clubBase())).revision
  }
  function itemOf(budget: Json, id: string): Json {
    return budget.items.find((item: { id: string }) => item.id === id)
  }
  async function act(who: Actor, base: string, itemId: string, action: unknown): Promise<Reply> {
    return h.call(who, 'POST', `${base}/${itemId}/actions`, { revision: await revision(), action })
  }
  async function upload(
    itemId: string,
    bytes: Buffer,
    mimeType: string,
    query: Record<string, string> = {},
    who: Actor = leader,
  ): Promise<Reply> {
    const params = new URLSearchParams({
      revision: String(await revision()),
      fileName: 'invoice-file',
      ...query,
    })
    return h.call(who, 'POST', `${clubBase()}/${itemId}/images?${params}`, bytes, {
      headers: { 'Content-Type': mimeType },
    })
  }

  async function seedBudget(
    clubId: string,
    items: Record<string, unknown>[] | undefined,
    eventState = 'Completed',
  ) {
    const now = Date.now()
    const endAt = new Date(now - DAY)
    const event = await m.events!.create({
      organizerType: 'CLUB',
      clubId: new Types.ObjectId(clubId),
      clubName: 'Club',
      title: `Sponsored ${eventState}`,
      startAt: new Date(endAt.getTime() - 3_600_000),
      endAt,
      semesterCode: 'Term',
      audienceScope: 'PUBLIC',
      capacity: 50,
      state: eventState,
      currentRevisionNo: 1,
      createdAt: new Date(now - 30 * DAY),
    })
    await m.eventProposalVersions!.create({
      eventId: event._id,
      revisionNo: 1,
      submittedBy: new Types.ObjectId(leader.id),
      submittedAt: new Date(now - 30 * DAY),
      payload: {},
    })
    const sponsoredItems = items?.map((item) => ({
      requestedAmount: item.approvedAmount,
      approvedAt: new Date(now - 20 * DAY).toISOString(),
      eventEndAt: endAt.toISOString(),
      amount: 0,
      description: '',
      images: [],
      ...item,
    }))
    const doc = await m.eventBudgets!.create({
      eventId: event._id,
      clubId: new Types.ObjectId(clubId),
      state: 'Approved',
      periodCode: 'Term',
      lines: [],
      requestedTotal: decimal(9_000_000),
      approvedTotal: decimal(9_000_000),
      approvedByDecisionId: new Types.ObjectId(),
      disbursedTotal: decimal(0),
      refundedTotal: decimal(0),
      isSettlementLate: false,
      createdAt: new Date(now - 20 * DAY),
      ...(sponsoredItems ? { sponsoredItems } : {}),
    })
    return String(doc._id)
  }

  beforeAll(async () => {
    h = await startHttpHarness('http-sponsored-item')
    leader = await h.signIn('sp-leader@http.edu')
    member = await h.signIn('sp-member@http.edu')
    outsider = await h.signIn('sp-outsider@http.edu')
    otherLeader = await h.signIn('sp-other@http.edu')
    club = await h.seedClub({ code: 'SPO', name: 'Sponsored Club', leader, members: [member] })
    otherClub = await h.seedClub({ code: 'OSP', name: 'Other Club', leader: otherLeader })
    budgetId = await seedBudget(club.id, [
      {
        id: 'reimburse',
        category: 'Food',
        approvedAmount: 2_000_000,
        fundingDecision: 'AFTER_EVENT',
        paymentChannel: 'VIA_OFFICER_REIMBURSE',
        status: 'Draft',
      },
      {
        id: 'vendor',
        category: 'Sound',
        approvedAmount: 6_000_000,
        fundingDecision: 'AFTER_EVENT',
        paymentChannel: 'DIRECT_VENDOR',
        status: 'Draft',
      },
      {
        id: 'advance',
        category: 'Print',
        approvedAmount: 1_000_000,
        fundingDecision: 'BEFORE_EVENT',
        paymentChannel: 'VIA_OFFICER_ADVANCE',
        status: 'AwaitingAdvance',
      },
    ])
    legacyBudgetId = await seedBudget(club.id, undefined)
    pausedBudgetId = await seedBudget(
      club.id,
      [
        {
          id: 'paused',
          category: 'Food',
          approvedAmount: 1_000_000,
          fundingDecision: 'AFTER_EVENT',
          status: 'Draft',
        },
      ],
      'Cancelled',
    )
  }, 60_000)

  afterAll(async () => {
    await h?.close()
  })

  describe('GET items', () => {
    it('shows the club its full budget and the officer a redacted draft', async () => {
      await act(leader, clubBase(), 'reimburse', {
        kind: 'save',
        amount: 1_500_000,
        description: 'Draft only',
      })
      const reply = await h.call(leader, 'GET', clubBase())
      expect(reply.body).toMatchObject({ statusCode: 200, message: 'success' })
      const asClub = dataOf(reply)
      expect(asClub).toMatchObject({ id: budgetId, clubId: club.id, eventState: 'Completed' })
      expect(asClub.items).toHaveLength(3)
      expect(itemOf(asClub, 'reimburse')).toMatchObject({
        amount: 1_500_000,
        description: 'Draft only',
      })
      const asOfficer = dataOf(await h.call(h.officer, 'GET', adminBase()))
      expect(itemOf(asOfficer, 'reimburse')).toMatchObject({ amount: 0, description: '' })
      expect(itemOf(asOfficer, 'advance')).toMatchObject({ status: 'AwaitingAdvance' })
    })

    it('needs a session and the right role for each path', async () => {
      expect((await h.call(null, 'GET', clubBase())).status).toBe(401)
      expect((await h.call(null, 'GET', adminBase())).status).toBe(401)
      for (const who of [member, outsider, otherLeader, h.officer]) {
        const reply = await h.call(who, 'GET', clubBase())
        expect([who.email, reply.status]).toEqual([who.email, 403])
      }
      expect((await h.call(leader, 'GET', adminBase())).status).toBe(403)
    })

    it('404s another club budget, a legacy budget and an unknown one; 400s bad ids', async () => {
      // Another leader asking through their own club does not see this club's budget.
      const theirs = await h.call(otherLeader, 'GET', clubBase(budgetId, otherClub.id))
      expect(theirs.status).toBe(404)
      expect(theirs.body.message).toBe('sponsored budget not found')
      expect((await h.call(leader, 'GET', clubBase(legacyBudgetId))).status).toBe(404)
      expect((await h.call(h.officer, 'GET', adminBase(missingId()))).status).toBe(404)
      expect((await h.call(h.officer, 'GET', adminBase('abc'))).status).toBe(400)
      expect((await h.call(leader, 'GET', clubBase(budgetId, 'abc'))).status).toBe(400)
    })
  })

  describe('POST actions', () => {
    it('validates the body', async () => {
      const rev = await revision()
      const bad: unknown[] = [
        {},
        { action: { kind: 'submit' } },
        { revision: -1, action: { kind: 'submit' } },
        { revision: rev, action: { kind: 'explode' } },
        { revision: rev, action: { kind: 'submit', extra: 1 } },
        { revision: rev, action: { kind: 'submit' }, extra: 1 },
        { revision: rev, action: { kind: 'save', amount: 0, description: '' } },
        { revision: rev, action: { kind: 'save', amount: 1.5, description: '' } },
        { revision: rev, action: { kind: 'return', reason: '' } },
        { revision: rev, action: { kind: 'removeImage', imageId: 'not-a-uuid' } },
        {
          revision: rev,
          action: {
            kind: 'save',
            amount: 1,
            description: '',
            vendorBankInfo: { ...VENDOR, swift: 'X' },
          },
        },
      ]
      for (const body of bad) {
        const reply = await h.call(leader, 'POST', `${clubBase()}/vendor/actions`, body)
        expect([body, reply.status]).toEqual([body, 400])
        expect(reply.body.message).toBe('invalid sponsored item action')
      }
    })

    it('needs a session, a CSRF token and the role that owns the action', async () => {
      const body = { revision: await revision(), action: { kind: 'recordAdvance' } }
      const path = `${adminBase()}/advance/actions`
      expect((await h.call(null, 'POST', path, body)).status).toBe(401)
      expect((await h.call(h.officer, 'POST', path, body, { noCsrf: true })).status).toBe(403)
      expect((await h.call(h.officer, 'POST', path, body, { csrf: 'forged' })).status).toBe(403)
      // Officer actions through the club path and club actions through the admin path.
      const wrongSide = await h.call(leader, 'POST', `${clubBase()}/advance/actions`, body)
      expect(wrongSide.status).toBe(403)
      expect(wrongSide.body.message).toBe('action not allowed for this role')
      const save = { revision: body.revision, action: { kind: 'submit' } }
      expect((await h.call(h.officer, 'POST', `${adminBase()}/vendor/actions`, save)).status).toBe(
        403,
      )
      expect((await h.call(member, 'POST', `${clubBase()}/vendor/actions`, save)).status).toBe(403)
      expect((await h.call(leader, 'POST', `${adminBase()}/advance/actions`, body)).status).toBe(
        403,
      )
    })

    it('404s an unknown item and budget, and 409s a stale revision or a wrong state', async () => {
      const unknownItem = await act(h.officer, adminBase(), 'nope', { kind: 'recordAdvance' })
      expect(unknownItem.status).toBe(404)
      expect(unknownItem.body.message).toBe('budget item not found')
      expect(
        (
          await h.call(h.officer, 'POST', `${adminBase(missingId())}/advance/actions`, {
            revision: 0,
            action: { kind: 'recordAdvance' },
          })
        ).status,
      ).toBe(404)
      const stale = await h.call(h.officer, 'POST', `${adminBase()}/advance/actions`, {
        revision: (await revision()) + 5,
        action: { kind: 'recordAdvance' },
      })
      expect(stale.status).toBe(409)
      expect(stale.body.message).toBe('budget changed; reload before continuing')
      const early = await act(leader, clubBase(), 'reimburse', { kind: 'pay' })
      expect(early.status).toBe(409)
      expect(early.body.message).toBe('this item is not awaiting payment')
      const noFiles = await act(leader, clubBase(), 'reimburse', { kind: 'submit' })
      expect(noFiles.status).toBe(400)
      const paused = await h.call(leader, 'POST', `${clubBase(pausedBudgetId)}/paused/actions`, {
        revision: 0,
        action: { kind: 'save', amount: 1, description: '' },
      })
      expect(paused.status).toBe(409)
    })

    it('reimburses an AFTER_EVENT item below 5M: save, upload, submit, return, review, pay', async () => {
      const uploaded = dataOf(await upload('reimburse', PNG, 'image/png'))
      expect(itemOf(uploaded, 'reimburse').images).toHaveLength(1)
      const submitted = dataOf(await act(leader, clubBase(), 'reimburse', { kind: 'submit' }))
      expect(itemOf(submitted, 'reimburse')).toMatchObject({ status: 'Submitted' })
      expect(
        await m.notifications!.countDocuments({
          recipientUserId: new Types.ObjectId(h.officer.id),
          eventCode: 'SPONSORED_ITEM_SUBMITTED',
        }),
      ).toBeGreaterThan(0)

      const returned = dataOf(
        await act(h.officer, adminBase(), 'reimburse', { kind: 'return', reason: 'Blurry' }),
      )
      expect(itemOf(returned, 'reimburse')).toMatchObject({
        status: 'Returned',
        reviewReason: 'Blurry',
      })
      dataOf(await act(leader, clubBase(), 'reimburse', { kind: 'submit' }))
      const overValue = await act(h.officer, adminBase(), 'reimburse', {
        kind: 'review',
        validAmount: 9_000_000,
        reason: 'Too much',
      })
      expect(overValue.status).toBe(400)
      const reviewed = dataOf(
        await act(h.officer, adminBase(), 'reimburse', {
          kind: 'review',
          validAmount: 1_200_000,
          reason: 'Valid receipts',
        }),
      )
      expect(itemOf(reviewed, 'reimburse')).toMatchObject({
        status: 'Accepted',
        payable: 1_200_000,
      })
      expect(
        (await act(h.officer, adminBase(), 'reimburse', { kind: 'confirmVendorPaid' })).status,
      ).toBe(409)
      const paid = dataOf(await act(leader, clubBase(), 'reimburse', { kind: 'pay' }))
      expect(itemOf(paid, 'reimburse')).toMatchObject({ status: 'Paid' })
      expect((await act(leader, clubBase(), 'reimburse', { kind: 'pay' })).status).toBe(409)
    })

    it('pays a vendor directly for an item of 5M or more', async () => {
      const reimburse = await act(leader, clubBase(), 'vendor', {
        kind: 'save',
        amount: 5_500_000,
        description: 'Speakers',
        paymentChannel: 'VIA_OFFICER_REIMBURSE',
      })
      expect(reimburse.status).toBe(400)
      dataOf(
        await act(leader, clubBase(), 'vendor', {
          kind: 'save',
          amount: 5_500_000,
          description: 'Speakers',
        }),
      )
      dataOf(await upload('vendor', PDF, 'application/pdf'))
      const noBank = await act(leader, clubBase(), 'vendor', { kind: 'submit' })
      expect(noBank.status).toBe(400)
      expect(noBank.body.message).toBe(
        'vendor bank transfer details are required before submission',
      )
      dataOf(
        await act(leader, clubBase(), 'vendor', {
          kind: 'save',
          amount: 5_500_000,
          description: 'Speakers',
          vendorBankInfo: VENDOR,
        }),
      )
      dataOf(await act(leader, clubBase(), 'vendor', { kind: 'submit' }))
      dataOf(
        await act(h.officer, adminBase(), 'vendor', {
          kind: 'review',
          validAmount: 5_500_000,
          reason: 'Contract ok',
        }),
      )
      expect((await act(leader, clubBase(), 'vendor', { kind: 'pay' })).status).toBe(409)
      const paid = dataOf(
        await act(h.officer, adminBase(), 'vendor', { kind: 'confirmVendorPaid' }),
      )
      expect(itemOf(paid, 'vendor')).toMatchObject({
        status: 'Paid',
        paymentChannel: 'DIRECT_VENDOR',
        paidBy: h.officer.id,
        vendorBankInfo: VENDOR,
      })
    })
  })

  describe('BEFORE_EVENT advance, refund account and refund receipts', () => {
    function refundAccountPath(itemId = 'advance') {
      return `${clubBase()}/${itemId}/refund-account`
    }

    it('advances, reconciles below the advance and asks for a refund', async () => {
      const sent = dataOf(await act(h.officer, adminBase(), 'advance', { kind: 'recordAdvance' }))
      expect(itemOf(sent, 'advance')).toMatchObject({
        status: 'AdvanceSent',
        advanceAmount: 1_000_000,
      })
      expect((await act(h.officer, adminBase(), 'advance', { kind: 'recordAdvance' })).status).toBe(
        409,
      )
      const received = dataOf(
        await act(leader, clubBase(), 'advance', { kind: 'confirmAdvanceReceived' }),
      )
      expect(itemOf(received, 'advance').status).toBe('Draft')
      dataOf(
        await act(leader, clubBase(), 'advance', {
          kind: 'save',
          amount: 1_000_000,
          description: 'Posters',
        }),
      )
      dataOf(await upload('advance', JPEG, 'image/jpeg'))
      dataOf(await act(leader, clubBase(), 'advance', { kind: 'submit' }))
      const reviewed = dataOf(
        await act(h.officer, adminBase(), 'advance', {
          kind: 'review',
          validAmount: 600_000,
          reason: 'Partly valid',
        }),
      )
      expect(itemOf(reviewed, 'advance')).toMatchObject({
        status: 'RefundPending',
        refundAmount: 400_000,
      })
    })

    it('gives the refund account only for an item awaiting a refund, once configured', async () => {
      expect((await h.call(null, 'GET', refundAccountPath())).status).toBe(401)
      expect((await h.call(member, 'GET', refundAccountPath())).status).toBe(403)
      expect((await h.call(h.officer, 'GET', refundAccountPath())).status).toBe(403)
      expect((await h.call(leader, 'GET', refundAccountPath('nope'))).status).toBe(404)
      const notRefund = await h.call(leader, 'GET', refundAccountPath('vendor'))
      expect(notRefund.status).toBe(409)
      const unconfigured = await h.call(leader, 'GET', refundAccountPath())
      expect(unconfigured.status).toBe(503)
      expect(unconfigured.body.message).toBe('school refund bank account is not configured')

      const account = {
        accountHolder: 'TRUONG DAI HOC',
        accountNumber: '999888777',
        bankName: 'BIDV',
      }
      await h.seedPolicy({ schoolRefundAccount: account })
      expect(dataOf(await h.call(leader, 'GET', refundAccountPath()))).toEqual({
        refundAmount: 400_000,
        account,
      })
    })

    it('uploads, removes and submits refund receipts until the officer confirms them', async () => {
      const noProof = await act(leader, clubBase(), 'advance', { kind: 'submitRefund' })
      expect(noProof.status).toBe(400)
      const first = dataOf(await upload('advance', RECEIPT, 'image/jpeg', { target: 'refund' }))
      const proofId = itemOf(first, 'advance').refundProofs[0].id
      const removed = dataOf(
        await act(leader, clubBase(), 'advance', { kind: 'removeRefundImage', imageId: proofId }),
      )
      expect(itemOf(removed, 'advance').refundProofs).toHaveLength(0)
      dataOf(await upload('advance', RECEIPT_2, 'image/jpeg', { target: 'refund' }))
      const submitted = dataOf(
        await act(leader, clubBase(), 'advance', { kind: 'submitRefund', note: ' Sent ' }),
      )
      expect(itemOf(submitted, 'advance')).toMatchObject({
        status: 'RefundSubmitted',
        refundNote: 'Sent',
      })
      dataOf(
        await act(h.officer, adminBase(), 'advance', {
          kind: 'returnRefund',
          reason: 'Unreadable',
        }),
      )
      dataOf(await act(leader, clubBase(), 'advance', { kind: 'submitRefund' }))
      const confirmed = dataOf(
        await act(h.officer, adminBase(), 'advance', { kind: 'confirmRefund' }),
      )
      expect(itemOf(confirmed, 'advance')).toMatchObject({
        status: 'Reconciled',
        refundConfirmedBy: h.officer.id,
      })
      expect((await act(h.officer, adminBase(), 'advance', { kind: 'confirmRefund' })).status).toBe(
        409,
      )
      // Every item is finished now, so the budget closes.
      expect((await m.eventBudgets!.findById(budgetId).lean())?.state).toBe('Closed')
    })
  })

  describe('POST images', () => {
    it('validates the upload query and file before storing anything', async () => {
      const rev = await revision()
      const base = `${clubBase()}/reimburse/images`
      async function post(query: string, bytes: Buffer, mimeType = 'image/png') {
        return h.call(leader, 'POST', `${base}${query}`, bytes, {
          headers: { 'Content-Type': mimeType },
        })
      }
      expect((await post(`?revision=${rev}&fileName=a&target=cover`, PNG_2)).status).toBe(400)
      expect((await post('?fileName=a', PNG_2)).status).toBe(400)
      expect((await post('?revision=-1&fileName=a', PNG_2)).status).toBe(400)
      expect((await post(`?revision=abc&fileName=a`, PNG_2)).status).toBe(400)
      expect(
        (await h.call(leader, 'POST', `${clubBase()}/nope/images?revision=${rev}`, PNG_2)).status,
      ).toBe(404)
      // The reimburse item is paid, so its invoice pack is locked.
      expect((await post(`?revision=${rev}&fileName=a`, PNG_2)).status).toBe(409)
      // A refund upload for an item that is not awaiting a refund.
      expect((await post(`?revision=${rev}&fileName=a&target=refund`, PNG_2)).status).toBe(409)
    })

    it('rejects bad files, duplicates and stale revisions on an editable item', async () => {
      const draftBudget = await seedBudget(club.id, [
        {
          id: 'fresh',
          category: 'Food',
          approvedAmount: 1_000_000,
          fundingDecision: 'AFTER_EVENT',
          status: 'Draft',
        },
      ])
      const base = `${clubBase(draftBudget)}/fresh/images`
      async function post(query: string, bytes: Buffer, mimeType: string, who = leader) {
        return h.call(who, 'POST', `${base}${query}`, bytes, {
          headers: { 'Content-Type': mimeType },
        })
      }
      expect(
        (await post('?revision=0&fileName=a.txt', Buffer.from('hello'), 'text/plain')).status,
      ).toBe(400)
      expect((await post('?revision=0&fileName=a.png', JPEG, 'image/png')).status).toBe(400)
      expect((await post('?revision=0', PNG_2, 'image/png')).status).toBe(400)
      expect((await post('?revision=0&fileName=a.png', PNG_2, 'image/png', member)).status).toBe(
        403,
      )
      expect(
        (await post('?revision=0&fileName=a.png', PNG_2, 'image/png', otherLeader)).status,
      ).toBe(403)
      const noCsrf = await h.call(leader, 'POST', `${base}?revision=0&fileName=a.png`, PNG_2, {
        headers: { 'Content-Type': 'image/png' },
        noCsrf: true,
      })
      expect(noCsrf.status).toBe(403)
      expect(
        (
          await h.call(null, 'POST', `${base}?revision=0&fileName=a.png`, PNG_2, {
            headers: { 'Content-Type': 'image/png' },
          })
        ).status,
      ).toBe(401)
      const stored = dataOf(await post('?revision=0&fileName=a.png', PNG_2, 'image/png'))
      expect(stored.items[0].images[0]).toMatchObject({ fileName: 'a.png', mimeType: 'image/png' })
      expect((await post('?revision=1&fileName=b.png', PNG_2, 'image/png')).status).toBe(409)
      expect((await post('?revision=0&fileName=c.pdf', PDF, 'application/pdf')).status).toBe(409)
    })
  })

  describe('GET images/:imageId', () => {
    it('returns a viewing or download URL to the club and to the officer', async () => {
      const budget = dataOf(await h.call(leader, 'GET', clubBase()))
      const image = itemOf(budget, 'vendor').images[0]
      const asClub = dataOf(await h.call(leader, 'GET', `${clubBase()}/vendor/images/${image.id}`))
      expect(asClub).toEqual({
        url: `https://files.test/${image.assetId}`,
        fileName: 'invoice-file',
        mimeType: 'application/pdf',
      })
      const officer = dataOf(
        await h.call(h.officer, 'GET', `${adminBase()}/vendor/images/${image.id}?download=1`),
      )
      expect(officer.url).toBe(`https://files.test/${image.assetId}`)
      const proof = itemOf(budget, 'advance').refundProofs[0]
      expect(
        dataOf(await h.call(h.officer, 'GET', `${adminBase()}/advance/images/${proof.id}`)),
      ).toMatchObject({ mimeType: 'image/jpeg' })
    })

    it('404s unknown files and enforces access', async () => {
      const unknown = await h.call(leader, 'GET', `${clubBase()}/vendor/images/${missingId()}`)
      expect(unknown.status).toBe(404)
      expect(unknown.body.message).toBe('invoice image not found')
      expect((await h.call(leader, 'GET', `${clubBase()}/nope/images/x`)).status).toBe(404)
      expect((await h.call(null, 'GET', `${clubBase()}/vendor/images/x`)).status).toBe(401)
      expect((await h.call(member, 'GET', `${clubBase()}/vendor/images/x`)).status).toBe(403)
      expect((await h.call(leader, 'GET', `${adminBase()}/vendor/images/x`)).status).toBe(403)
    })
  })
})
