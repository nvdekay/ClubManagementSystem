import mongoose, { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mongoEventProposalReviewRepository } from '../../src/infra/db/mongo-event-proposal-review-repository.js'
import { ensureUcmsDatabase, ucmsModels } from '../../src/infra/db/ucms-models.js'

const uri = process.env.MONGO_URI
const dbName = `ucms-event-review-test-${process.pid}`
const DAY = 24 * 60 * 60 * 1000

describe.skipIf(!uri)('Mongo event proposal review repository', () => {
  const now = new Date('2026-10-10T08:00:00Z')
  const officer = new Types.ObjectId()
  const otherOfficer = new Types.ObjectId()
  const member = new Types.ObjectId()
  const clubId = new Types.ObjectId()
  const budgetLines = [
    { category: 'Truyền thông', amount: 2_000_000, purpose: 'In poster' },
    { category: 'Hậu cần', amount: 3_000_000, purpose: 'Nước uống' },
  ]

  /** What the club side writes on submit (UC25 contract in the SPEC). */
  async function submit(
    title: string,
    lines: typeof budgetLines | null,
    eventId = new Types.ObjectId(),
    revisionNo = 1,
  ) {
    const startAt = new Date(now.getTime() + 10 * DAY)
    if (revisionNo === 1) {
      await ucmsModels.events!.create({
        _id: eventId,
        organizerType: 'CLUB',
        clubId,
        clubName: 'HEBE',
        title,
        startAt,
        endAt: new Date(startAt.getTime() + 3 * 3_600_000),
        semesterCode: 'Fall 2026',
        venueText: 'Sảnh Delta',
        audienceScope: 'PUBLIC',
        capacity: 80,
        riskCategory: 'MEDIUM',
        conflictResult: 'No Conflict',
        state: 'Pending Approval',
        currentRevisionNo: 1,
        createdAt: now,
      })
    } else {
      await ucmsModels.events!.updateOne(
        { _id: eventId },
        { $set: { state: 'Pending Approval', currentRevisionNo: revisionNo } },
      )
    }
    await ucmsModels.eventProposalVersions!.create({
      eventId,
      revisionNo,
      submittedBy: member,
      submittedAt: now,
      payload: { title, plan: 'Kế hoạch chi tiết' },
      ...(lines
        ? {
            budgetLines: lines,
            requestedBudgetTotal: lines.reduce((sum, line) => sum + line.amount, 0),
          }
        : {}),
    })
    await ucmsModels.approvalTasks!.create({
      entityType: 'EVENT_PROPOSAL',
      entityId: eventId,
      clubId,
      title,
      state: 'Open',
      openedAt: new Date(now.getTime() + revisionNo),
    })
    return String(eventId)
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? '', { dbName })
    await ensureUcmsDatabase()
    await ucmsModels.users!.insertMany([
      {
        _id: officer,
        email: 'o@fpt.edu.vn',
        displayName: 'Officer',
        googleSubject: 'o',
        accountState: 'Active',
        createdAt: now,
      },
      {
        _id: otherOfficer,
        email: 'p@fpt.edu.vn',
        displayName: 'Other',
        googleSubject: 'p',
        accountState: 'Active',
        createdAt: now,
      },
      {
        _id: member,
        email: 'm@fpt.edu.vn',
        displayName: 'Trưởng ban sự kiện',
        googleSubject: 'm',
        accountState: 'Active',
        createdAt: now,
      },
    ])
    await ucmsModels.clubs!.create({
      _id: clubId,
      code: 'CLB-HEBE',
      name: 'HEBE',
      field: 'Nghệ thuật',
      state: 'Active',
      createdAt: now,
    })
  }, 30_000)

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
  })

  it('claims, requests a revision, then approves the resubmission with full funding for each sponsored item', async () => {
    const repo = mongoEventProposalReviewRepository()
    const id = await submit('Đêm nhạc acoustic', budgetLines)
    expect(
      (await repo.listOpen()).map((item) => [item.event.title, item.event.requestedBudgetTotal]),
    ).toContainEqual(['Đêm nhạc acoustic', 5_000_000])

    const claimed = await repo.claim(id, String(officer), now)
    expect(claimed.event.state).toBe('Under Review')
    expect(claimed.task.assigneeId).toBe(String(officer))
    expect(claimed.versions[0]?.submittedByName).toBe('Trưởng ban sự kiện')
    await expect(repo.claim(id, String(otherOfficer), now)).rejects.toMatchObject({
      kind: 'conflict',
    })

    const deadline = new Date(now.getTime() + 3 * DAY)
    const revised = await repo.decide(
      id,
      String(officer),
      {
        outcome: 'Request revision',
        reason: 'Làm rõ chi phí',
        sections: ['budget'],
        revisionDeadlineAt: deadline,
        conditions: [],
        budgetLines: [],
      },
      now,
    )
    expect(revised.event).toMatchObject({
      state: 'Revision Requested',
      revisionDeadlineAt: deadline,
    })
    await expect(
      repo.decide(
        id,
        String(officer),
        { outcome: 'Reject', reason: 'x', sections: [], conditions: [], budgetLines: [] },
        now,
      ),
    ).rejects.toMatchObject({ kind: 'conflict' })

    await submit('Đêm nhạc acoustic', budgetLines, new Types.ObjectId(id), 2)
    await repo.claim(id, String(officer), now)
    await expect(
      repo.decide(
        id,
        String(officer),
        {
          outcome: 'Approve',
          sections: [],
          conditions: [],
          budgetLines: [{ approvedAmount: 2_000_000 }],
        },
        now,
      ),
    ).rejects.toMatchObject({ kind: 'validation' })
    const approved = await repo.decide(
      id,
      String(officer),
      {
        outcome: 'Approve',
        sections: [],
        conditions: ['Có bảo vệ trực'],
        budgetLines: [
          { approvedAmount: 2_000_000, fundingDecision: 'BEFORE_EVENT' },
          { approvedAmount: 3_000_000, fundingDecision: 'AFTER_EVENT' },
        ],
      },
      now,
    )
    expect(approved.event).toMatchObject({
      state: 'Approved',
      approvalConditions: ['Có bảo vệ trực'],
    })
    expect(approved.event.revisionDeadlineAt).toBeUndefined()
    expect(approved.decisions.map((decision) => decision.outcome)).toEqual([
      'Request revision',
      'Approve',
    ])
    expect(approved.budget).toMatchObject({
      state: 'Approved',
      requestedTotal: 5_000_000,
      approvedTotal: 5_000_000,
      lines: [
        { category: 'Truyền thông', requestedAmount: 2_000_000, approvedAmount: 2_000_000 },
        { category: 'Hậu cần', requestedAmount: 3_000_000, approvedAmount: 3_000_000 },
      ],
    })
    expect(await ucmsModels.eventBudgets!.countDocuments({ eventId: new Types.ObjectId(id) })).toBe(
      1,
    )
    expect(
      (await ucmsModels.eventBudgets!.findOne({ eventId: new Types.ObjectId(id) }).lean())
        ?.sponsoredItems,
    ).toMatchObject([
      {
        fundingDecision: 'BEFORE_EVENT',
        paymentChannel: 'VIA_OFFICER_ADVANCE',
        approvedAmount: 2_000_000,
        status: 'AwaitingAdvance',
        images: [],
        approvedAt: now.toISOString(),
      },
      {
        fundingDecision: 'AFTER_EVENT',
        paymentChannel: 'VIA_OFFICER_REIMBURSE',
        approvedAmount: 3_000_000,
        status: 'Draft',
        images: [],
      },
    ])
    expect(
      await ucmsModels.notifications!.countDocuments({
        recipientUserId: member,
        entityId: new Types.ObjectId(id),
      }),
    ).toBe(2)
    expect(
      await ucmsModels.auditLogs!.countDocuments({
        entityId: new Types.ObjectId(id),
        action: 'EVENT_PROPOSAL_APPROVED',
      }),
    ).toBe(1)
    expect((await repo.listOpen()).some((item) => item.event.id === id)).toBe(false)

    const second = await submit('Hội thảo khởi nghiệp', null)
    await repo.claim(second, String(officer), now)
    const other = await repo.find(second, now)
    expect(
      other?.semesterBudgets.map((budget) => [budget.eventTitle, budget.approvedTotal]),
    ).toEqual([['Đêm nhạc acoustic', 5_000_000]])
  })

  it('approves a proposal without budget lines without creating a budget, and rejects with a reason', async () => {
    const repo = mongoEventProposalReviewRepository()
    const id = await submit('Sinh hoạt định kỳ', null)
    await repo.claim(id, String(officer), now)
    const approved = await repo.decide(
      id,
      String(officer),
      { outcome: 'Approve', sections: [], conditions: [], budgetLines: [] },
      now,
    )
    expect(approved.event.state).toBe('Approved')
    expect(approved.budget).toBeUndefined()

    const rejected = await submit('Cắm trại qua đêm', null)
    await expect(
      repo.decide(
        rejected,
        String(officer),
        { outcome: 'Reject', reason: 'Rủi ro cao', sections: [], conditions: [], budgetLines: [] },
        now,
      ),
    ).rejects.toMatchObject({ kind: 'conflict' })
    await repo.claim(rejected, String(officer), now)
    expect(
      (
        await repo.decide(
          rejected,
          String(officer),
          {
            outcome: 'Reject',
            reason: 'Rủi ro cao',
            sections: [],
            conditions: [],
            budgetLines: [],
          },
          now,
        )
      ).event.state,
    ).toBe('Rejected')
  })

  it("UC05: one officer's approval is final, even for a task opened while two levels existed (BR31)", async () => {
    const repo = mongoEventProposalReviewRepository()
    const id = await submit('Đại nhạc hội', budgetLines)
    await ucmsModels.approvalTasks!.updateOne(
      { entityId: new Types.ObjectId(id) },
      { $set: { requiredLevel: 2, currentLevel: 1 } },
    )
    await repo.claim(id, String(officer), now)
    const approved = [{ approvedAmount: 2_000_000 }, { approvedAmount: 3_000_000 }]
    const final = await repo.decide(
      id,
      String(officer),
      { outcome: 'Approve', sections: [], conditions: [], budgetLines: approved },
      now,
    )
    expect(final.event.state).toBe('Approved')
    expect(await ucmsModels.eventBudgets!.countDocuments({ eventId: new Types.ObjectId(id) })).toBe(
      1,
    )
    expect(
      (
        await ucmsModels
          .approvalDecisions!.find({
            approvalTaskId: (await ucmsModels
              .approvalTasks!.findOne({ entityId: new Types.ObjectId(id) })
              .lean())!._id,
          })
          .lean()
      ).map((row) => row.level),
    ).toEqual([1])
  })

  it('expires overdue revisions and moves published events along their own times', async () => {
    const repo = mongoEventProposalReviewRepository()
    const id = await submit('Quá hạn sửa', null)
    await repo.claim(id, String(officer), now)
    await repo.decide(
      id,
      String(officer),
      {
        outcome: 'Request revision',
        reason: 'Bổ sung kế hoạch',
        sections: ['content'],
        revisionDeadlineAt: new Date(now.getTime() + DAY),
        conditions: [],
        budgetLines: [],
      },
      now,
    )
    function published(title: string, startAt: Date, endAt: Date, state: string) {
      return {
        organizerType: 'CLUB',
        clubId,
        clubName: 'HEBE',
        title,
        startAt,
        endAt,
        semesterCode: 'Fall 2026',
        audienceScope: 'PUBLIC',
        capacity: 10,
        state,
        createdAt: now,
      }
    }
    const later = new Date(now.getTime() + 2 * DAY)
    const [running, finished] = await ucmsModels.events!.insertMany([
      published(
        'Đang diễn ra',
        new Date(later.getTime() - 3_600_000),
        new Date(later.getTime() + 3_600_000),
        'Upcoming',
      ),
      published(
        'Đã xong',
        new Date(later.getTime() - 5 * 3_600_000),
        new Date(later.getTime() - 3_600_000),
        'Ongoing',
      ),
    ])

    expect(await repo.advanceLifecycle(later)).toMatchObject({
      expired: 1,
      started: 1,
      completed: 1,
    })
    expect((await ucmsModels.events!.findById(id).lean())?.state).toBe('Expired')
    expect((await ucmsModels.events!.findById(running!._id).lean())?.state).toBe('Ongoing')
    expect((await ucmsModels.events!.findById(finished!._id).lean())?.state).toBe('Completed')
    // Scheduled transitions are audited like the expiry path.
    expect(
      await ucmsModels
        .auditLogs!.find({ entityId: { $in: [running!._id, finished!._id] } })
        .select({ entityId: 1, action: 1, before: 1, after: 1, actorRole: 1 })
        .lean(),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: running!._id,
          action: 'EVENT_STARTED',
          actorRole: 'SYSTEM',
          before: { state: 'Upcoming' },
          after: { state: 'Ongoing' },
        }),
        expect.objectContaining({
          entityId: finished!._id,
          action: 'EVENT_COMPLETED',
          before: { state: 'Ongoing' },
          after: { state: 'Completed' },
        }),
      ]),
    )
    expect(await repo.advanceLifecycle(later)).toMatchObject({
      expired: 0,
      started: 0,
      completed: 0,
    })
    expect(
      await ucmsModels.auditLogs!.countDocuments({
        entityId: { $in: [running!._id, finished!._id] },
      }),
    ).toBe(2)
  })

  it('keeps approved proposals accessible without duplicating previous revision tasks', async () => {
    const repo = mongoEventProposalReviewRepository()
    const id = await submit('Approved history proposal', null)
    await repo.claim(id, String(officer), now)
    await repo.decide(
      id,
      String(officer),
      { outcome: 'Approve', sections: [], conditions: [], budgetLines: [] },
      now,
    )
    expect((await repo.listOpen()).some((item) => item.event.id === id)).toBe(false)
    expect((await repo.listOpen('approved')).filter((item) => item.event.id === id)).toHaveLength(1)
    await ucmsModels.approvalTasks!.create({
      entityType: 'EVENT_PROPOSAL',
      entityId: new Types.ObjectId(id),
      clubId,
      title: 'Earlier revision',
      state: 'Decided',
      openedAt: new Date(now.getTime() - 60_000),
    })
    for (const state of ['Upcoming', 'Ongoing', 'Completed']) {
      await ucmsModels.events!.updateOne({ _id: new Types.ObjectId(id) }, { $set: { state } })
      const approved = (await repo.listOpen('approved')).filter((item) => item.event.id === id)
      expect(approved).toHaveLength(1)
      expect(approved[0]?.event.state).toBe(state)
      expect(approved[0]?.task.title).not.toBe('Earlier revision')
      expect((await repo.find(id, now))?.event.id).toBe(id)
    }
    const pendingId = await submit('Pending history exclusion', null)
    expect((await repo.listOpen('approved')).some((item) => item.event.id === pendingId)).toBe(
      false,
    )
  })

  it('lists the newest submitted review tasks first with a stable descending ID tie-breaker', async () => {
    const repo = mongoEventProposalReviewRepository()
    const newest = await submit('Newest proposal', null)
    const oldest = await submit('Oldest proposal', null)
    const tied = await submit('Same submission time', null)
    const newestAt = new Date(now.getTime() + 40 * 60_000)
    for (const [id, openedAt] of [
      [newest, newestAt],
      [oldest, new Date(now.getTime() + 10 * 60_000)],
      [tied, newestAt],
    ] as const) {
      await ucmsModels.approvalTasks!.updateOne(
        { entityType: 'EVENT_PROPOSAL', entityId: new Types.ObjectId(id) },
        { $set: { openedAt } },
      )
    }
    const selected = new Set([newest, oldest, tied])
    const queue = (await repo.listOpen()).filter((item) => selected.has(item.event.id))
    expect(queue.map((item) => item.event.id)).toEqual([tied, newest, oldest])
  })
})
