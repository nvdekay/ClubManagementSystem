import mongoose, { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mongoBudgetDisbursementRepository } from '../../src/infra/db/mongo-budget-disbursement-repository.js'
import { ensureUcmsDatabase, ucmsModels } from '../../src/infra/db/ucms-models.js'

const uri = process.env.MONGO_URI
const dbName = `ucms-budget-test-${process.pid}`
const DAY = 24 * 60 * 60 * 1000

function decimal(value: number) {
  return Types.Decimal128.fromString(String(value))
}

describe.skipIf(!uri)('Mongo budget disbursement repository', () => {
  const now = new Date('2026-10-10T08:00:00Z')
  const officer = new Types.ObjectId()
  const leader = new Types.ObjectId()
  const submitter = new Types.ObjectId()
  const clubId = new Types.ObjectId()
  const endAt = new Date(now.getTime() + 5 * DAY)

  async function budget(
    state: string,
    extra: Record<string, unknown> = {},
    eventState = 'Approved',
  ) {
    const eventId = new Types.ObjectId()
    await ucmsModels.events!.create({
      _id: eventId,
      organizerType: 'CLUB',
      clubId,
      clubName: 'HEBE',
      title: `Sự kiện ${state}`,
      startAt: new Date(endAt.getTime() - 3_600_000),
      endAt,
      semesterCode: 'Fall 2026',
      audienceScope: 'PUBLIC',
      capacity: 50,
      state: eventState,
      currentRevisionNo: 1,
      createdAt: now,
    })
    await ucmsModels.eventProposalVersions!.create({
      eventId,
      revisionNo: 1,
      submittedBy: submitter,
      submittedAt: now,
      payload: {},
    })
    const doc = await ucmsModels.eventBudgets!.create({
      eventId,
      clubId,
      state,
      periodCode: 'Fall 2026',
      lines: [
        {
          category: 'Hậu cần',
          requestedAmount: 5_000_000,
          approvedAmount: 4_000_000,
          reason: 'Giảm',
        },
      ],
      requestedTotal: decimal(5_000_000),
      approvedTotal: decimal(4_000_000),
      approvedByDecisionId: new Types.ObjectId(),
      disbursedTotal: decimal(Number(extra.disbursedTotal ?? 0)),
      refundedTotal: decimal(Number(extra.refundedTotal ?? 0)),
      isSettlementLate: false,
      createdAt: now,
      ...(extra.settlementBalance !== undefined
        ? { settlementBalance: decimal(Number(extra.settlementBalance)) }
        : {}),
      ...(extra.recoveryAmount !== undefined
        ? { recoveryAmount: decimal(Number(extra.recoveryAmount)) }
        : {}),
    })
    return String(doc._id)
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? '', { dbName })
    await ensureUcmsDatabase()
    await ucmsModels.users!.insertMany([
      {
        _id: officer,
        email: 'o@fpt.edu.vn',
        displayName: 'Cán bộ',
        googleSubject: 'o',
        accountState: 'Active',
        createdAt: now,
      },
      {
        _id: leader,
        email: 'l@fpt.edu.vn',
        displayName: 'Chủ nhiệm',
        googleSubject: 'l',
        accountState: 'Active',
        createdAt: now,
      },
    ])
    const officerRole = await ucmsModels.roles!.create({
      code: 'ICPDP_OFFICER',
      name: 'Officer',
      scope: 'system',
      permissionCodes: [],
    })
    await ucmsModels.userRoleAssignments!.create({
      userId: officer,
      roleId: officerRole._id,
      grantedBy: officer,
      grantedAt: now,
    })
    await ucmsModels.clubs!.create({
      _id: clubId,
      code: 'CLB-HEBE',
      name: 'HEBE',
      field: 'Nghệ thuật',
      state: 'Active',
      createdAt: now,
    })
    const membershipId = new Types.ObjectId()
    const positionId = new Types.ObjectId()
    await ucmsModels.clubMemberships!.create({
      _id: membershipId,
      clubId,
      userId: leader,
      state: 'Active',
      joinedAt: now,
      statusHistory: [],
    })
    await ucmsModels.clubPositions!.create({
      _id: positionId,
      clubId,
      code: 'LEADER',
      name: 'Chủ nhiệm',
      isLeaderRole: true,
      isActive: true,
      permissionCodes: [],
    })
    await ucmsModels.clubPositionAssignments!.create({
      clubId,
      termId: new Types.ObjectId(),
      positionId,
      membershipId,
      effectiveFrom: now,
      assignedBy: officer,
    })
  }, 30_000)

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
  })

  it('shows a legacy budget with the money flows recorded before sponsored items', async () => {
    const repo = mongoBudgetDisbursementRepository()
    const id = await budget('Disbursed', { disbursedTotal: 1_500_000 })
    await ucmsModels.budgetDisbursements!.create({
      eventBudgetId: new Types.ObjectId(id),
      kind: 'Advance',
      amount: decimal(1_500_000),
      disbursedAt: now,
      paymentReference: 'UNC-01',
      recordedBy: officer,
    })
    expect(
      (await repo.list({ filter: 'all', page: 1, pageSize: 100 })).items.map((item) => item.id),
    ).toContain(id)
    const detail = await repo.find(id)
    expect(detail).toMatchObject({
      state: 'Disbursed',
      disbursedTotal: 1_500_000,
      lines: [{ category: 'Hậu cần', approvedAmount: 4_000_000, reason: 'Giảm' }],
      flows: [
        {
          kind: 'Advance',
          amount: 1_500_000,
          paymentReference: 'UNC-01',
          recordedByName: 'Cán bộ',
        },
      ],
    })
    expect(detail).not.toHaveProperty('allowed')
    expect(await repo.find(String(new Types.ObjectId()))).toBeNull()
  })

  it('pages budgets server-side with tab and club filters and per-tab counts', async () => {
    const repo = mongoBudgetDisbursementRepository()
    await ucmsModels.eventBudgets!.deleteMany({})
    const anh = new Types.ObjectId()
    const bong = new Types.ObjectId()
    await ucmsModels.clubs!.insertMany([
      { _id: anh, code: 'CLB-AD', name: 'Ánh Dương', field: 'x', state: 'Active', createdAt: now },
      { _id: bong, code: 'CLB-BR', name: 'Bóng rổ', field: 'x', state: 'Active', createdAt: now },
    ])
    let minute = 0
    async function insert(club: Types.ObjectId, state: string, sponsoredItems?: unknown[]) {
      minute += 1
      const doc = await ucmsModels.eventBudgets!.create({
        eventId: new Types.ObjectId(),
        clubId: club,
        state,
        lines: [],
        requestedTotal: decimal(1),
        approvedTotal: decimal(1),
        approvedByDecisionId: new Types.ObjectId(),
        disbursedTotal: decimal(0),
        refundedTotal: decimal(0),
        isSettlementLate: false,
        createdAt: new Date(now.getTime() + minute * 60_000),
        ...(sponsoredItems ? { sponsoredItems } : {}),
      })
      return String(doc._id)
    }
    function item(fundingDecision: string, status: string, approvedAmount = 1_000_000, extra = {}) {
      return { id: `i${minute}`, fundingDecision, status, approvedAmount, ...extra }
    }
    // 22 legacy budgets of HEBE without sponsored items.
    const legacy: string[] = []
    for (let index = 0; index < 22; index += 1) {
      legacy.push(await insert(clubId, 'Approved'))
    }
    await insert(anh, 'Approved', [item('BEFORE_EVENT', 'AwaitingAdvance')])
    await insert(anh, 'Approved', [item('NOT_SPONSORED', 'AwaitingAdvance')])
    await insert(anh, 'Approved', [item('AFTER_EVENT', 'Submitted')])
    await insert(anh, 'Approved', [item('AFTER_EVENT', 'Accepted', 6_000_000)])
    await insert(anh, 'Approved', [item('AFTER_EVENT', 'Accepted')])
    await insert(bong, 'Approved', [
      item('AFTER_EVENT', 'Accepted', 1_000_000, { paymentChannel: 'DIRECT_VENDOR' }),
      item('BEFORE_EVENT', 'RefundSubmitted'),
    ])
    await insert(bong, 'Closed', [item('AFTER_EVENT', 'Paid')])
    await insert(bong, 'Cancelled')

    const first = await repo.list({ filter: 'all', page: 1, pageSize: 20 })
    expect(first).toMatchObject({
      total: 30,
      page: 1,
      pageSize: 20,
      counts: {
        all: 30,
        awaitingAdvance: 1,
        awaitingReview: 1,
        awaitingVendorPay: 2,
        awaitingRefundConfirm: 1,
        inProgress: 28,
        closed: 2,
      },
    })
    expect(first.items).toHaveLength(20)
    // Vietnamese collation: "Ánh Dương" sorts before "Bóng rổ" and "HEBE".
    expect(first.clubs.map((club) => club.name)).toEqual(['Ánh Dương', 'Bóng rổ', 'HEBE'])
    const second = await repo.list({ filter: 'all', page: 2, pageSize: 20 })
    expect(second.items.map((budget) => budget.id)).toEqual(legacy.slice(0, 10).reverse())

    // The tab counts agree with the per-budget item counts the client shows as badges.
    const all = (await repo.list({ filter: 'all', page: 1, pageSize: 100 })).items
    expect(all.filter((budget) => (budget.itemCounts?.awaitingVendorPay ?? 0) > 0)).toHaveLength(2)
    expect(all.filter((budget) => (budget.itemCounts?.awaitingAdvance ?? 0) > 0)).toHaveLength(1)

    const vendor = await repo.list({ filter: 'awaitingVendorPay', page: 1, pageSize: 1 })
    expect(vendor.total).toBe(2)
    expect(vendor.items[0]?.clubName).toBe('Bóng rổ')
    const anhOnly = await repo.list({
      filter: 'inProgress',
      clubId: String(anh),
      page: 1,
      pageSize: 20,
    })
    expect(anhOnly.total).toBe(5)
    expect(anhOnly.counts).toMatchObject({ all: 5, awaitingVendorPay: 1, closed: 0 })
    expect(anhOnly.items.every((budget) => budget.clubId === String(anh))).toBe(true)
    expect(
      (
        await repo.list({ filter: 'closed', clubId: String(bong), page: 1, pageSize: 20 })
      ).items.map((budget) => budget.state),
    ).toEqual(['Cancelled', 'Closed'])
  })
})
