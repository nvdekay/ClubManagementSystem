import mongoose, { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mongoViolationRepository } from '../../src/infra/db/mongo-violation-repository.js'
import { ensureUcmsDatabase, ucmsModels } from '../../src/infra/db/ucms-models.js'

const uri = process.env.MONGO_URI
const dbName = `ucms-violation-test-${process.pid}`
const DAY = 24 * 60 * 60 * 1000

describe.skipIf(!uri)('Mongo violation repository', () => {
  const now = new Date('2026-10-10T08:00:00Z')
  const officer = new Types.ObjectId()
  const leader = new Types.ObjectId()
  const clubId = new Types.ObjectId()
  const otherClubId = new Types.ObjectId()
  const eventId = new Types.ObjectId()

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
    await ucmsModels.clubs!.insertMany([
      {
        _id: clubId,
        code: 'CLB-HEBE',
        name: 'HEBE',
        field: 'Nghệ thuật',
        state: 'Active',
        createdAt: now,
      },
      {
        _id: otherClubId,
        code: 'CLB-EHC',
        name: 'EHC',
        field: 'Công nghệ',
        state: 'Active',
        createdAt: now,
      },
    ])
    await ucmsModels.events!.create({
      _id: eventId,
      organizerType: 'CLUB',
      clubId,
      clubName: 'HEBE',
      title: 'Đêm nhạc không phép',
      startAt: now,
      endAt: now,
      semesterCode: 'Fall 2026',
      audienceScope: 'PUBLIC',
      capacity: 10,
      state: 'Completed',
      currentRevisionNo: 1,
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

  it('opens a case linked to a club event and carries it through to resolution', async () => {
    const repo = mongoViolationRepository()
    expect((await repo.sources(String(clubId)))?.events.map((event) => event.title)).toEqual([
      'Đêm nhạc không phép',
    ])
    await expect(
      repo.open(
        {
          clubId: String(otherClubId),
          originType: 'UNAUTHORIZED_EVENT',
          originRefId: String(eventId),
          severity: 'MODERATE',
          title: 'x',
        },
        String(officer),
        now,
      ),
    ).rejects.toMatchObject({ kind: 'validation' })

    const opened = await repo.open(
      {
        clubId: String(clubId),
        originType: 'UNAUTHORIZED_EVENT',
        originRefId: String(eventId),
        severity: 'SERIOUS',
        title: 'Tổ chức sự kiện chưa được duyệt',
        evidence: [{ note: 'Ảnh chụp poster', url: 'https://x.vn/p.jpg' }],
      },
      String(officer),
      now,
    )
    expect(opened).toMatchObject({
      state: 'Open',
      clubName: 'HEBE',
      source: { kind: 'event', label: 'Đêm nhạc không phép' },
      evidence: [{ note: 'Ảnh chụp poster', url: 'https://x.vn/p.jpg' }],
    })
    expect(opened.names[String(officer)]).toBe('Cán bộ')

    await repo.apply(opened.id, String(officer), { type: 'investigate' }, now)
    const asked = await repo.apply(
      opened.id,
      String(officer),
      { type: 'requestResponse', message: 'Giải trình' },
      now,
    )
    expect(asked).toMatchObject({
      state: 'Awaiting Club Response',
      responseDueAt: new Date(now.getTime() + 7 * DAY),
    })
    const [summary] = (await repo.list({ filter: 'all', page: 1, pageSize: 20 })).items
    expect(summary).toMatchObject({ id: opened.id, state: 'Awaiting Club Response' })

    await repo.apply(
      opened.id,
      String(officer),
      { type: 'recordResponse', text: 'CLB nhầm lịch duyệt' },
      now,
    )
    await expect(
      repo.apply(opened.id, String(officer), { type: 'recordResponse', text: 'lần 2' }, now),
    ).rejects.toMatchObject({ kind: 'conflict' })
    const decided = await repo.apply(
      opened.id,
      String(officer),
      {
        type: 'decide',
        finding: 'VIOLATION',
        reason: 'Tổ chức khi chưa được duyệt',
        evidence: [{ note: 'Biên bản làm việc' }],
      },
      now,
    )
    expect(decided).toMatchObject({
      state: 'Decision Issued',
      clubResponse: { source: 'RECORDED_BY_ICPDP', text: 'CLB nhầm lịch duyệt' },
    })

    const assigned = await repo.apply(
      opened.id,
      String(officer),
      {
        type: 'addActions',
        actions: [
          { description: 'Nộp bản kiểm điểm', dueAt: new Date(now.getTime() + 5 * DAY) },
          {
            description: 'Tạm dừng tổ chức sự kiện 1 tháng',
            dueAt: new Date(now.getTime() + 30 * DAY),
            linkedLifecycleAction: 'SUSPEND',
          },
        ],
      },
      now,
    )
    expect(assigned.actions.map((item) => item.state)).toEqual(['Pending', 'Pending'])
    expect(
      (await repo.list({ filter: 'all', page: 1, pageSize: 20 })).items[0]?.pendingActions,
    ).toBe(2)

    await expect(
      repo.apply(
        opened.id,
        String(officer),
        { type: 'verifyAction', actionId: assigned.actions[0]!.id, outcome: 'Verified' },
        now,
      ),
    ).rejects.toMatchObject({ kind: 'conflict' })
    // The club's evidence normally arrives through the club compliance screen (UC40).
    await ucmsModels.correctiveActions!.updateMany(
      { violationId: new Types.ObjectId(opened.id) },
      {
        $set: {
          submission: {
            note: 'Đã thực hiện',
            evidence: [],
            submittedBy: String(leader),
            submittedAt: now,
          },
        },
      },
    )
    await repo.apply(
      opened.id,
      String(officer),
      { type: 'verifyAction', actionId: assigned.actions[0]!.id, outcome: 'Verified' },
      now,
    )
    const resolved = await repo.apply(
      opened.id,
      String(officer),
      { type: 'verifyAction', actionId: assigned.actions[1]!.id, outcome: 'Verified' },
      now,
    )
    expect(resolved).toMatchObject({ state: 'Resolved', resolvedAt: now })
    expect(resolved.history.map((item) => item.action)).toEqual([
      'VIOLATION_OPENED',
      'VIOLATION_INVESTIGATING',
      'VIOLATION_RESPONSE_REQUESTED',
      'VIOLATION_RESPONSE_RECORDED',
      'VIOLATION_DECIDED',
      'VIOLATION_ACTIONS_ASSIGNED',
      'VIOLATION_ACTION_VERIFIED',
      'VIOLATION_RESOLVED',
    ])
    const notified = await ucmsModels
      .notifications!.find({ entityId: new Types.ObjectId(opened.id) })
      .lean()
    expect(new Set(notified.map((item) => String(item.recipientUserId)))).toEqual(
      new Set([String(leader)]),
    )
    expect(notified.map((item) => item.eventCode)).toContain('VIOLATION_RESPONSE_REQUESTED')
  })

  it('pages cases server-side with the tab filter applied before skip/limit', async () => {
    const repo = mongoViolationRepository()
    await ucmsModels.violations!.deleteMany({})
    const states = [
      ...Array.from({ length: 23 }, () => 'Open'),
      ...Array.from({ length: 4 }, () => 'Awaiting Club Response'),
      'Corrective Action',
      'Resolved',
      'Closed',
    ]
    await ucmsModels.violations!.insertMany(
      states.map((state, index) => ({
        clubId,
        originType: 'OTHER',
        severity: 'MINOR',
        title: `Case ${index}`,
        state,
        openedBy: officer,
        // Newer index first: case 0 is the oldest.
        openedAt: new Date(now.getTime() + index * 60_000),
      })),
    )
    const counts = { all: 30, active: 23, awaiting: 4, actions: 1, closed: 2, open: 28 }

    const first = await repo.list({ filter: 'all', page: 1, pageSize: 20 })
    expect(first).toMatchObject({ total: 30, page: 1, pageSize: 20, counts })
    expect(first.items).toHaveLength(20)
    expect(first.items[0]?.title).toBe('Case 29')
    const second = await repo.list({ filter: 'all', page: 2, pageSize: 20 })
    expect(second.items.map((item) => item.title)).toEqual(
      Array.from({ length: 10 }, (_, index) => `Case ${9 - index}`),
    )
    expect(await repo.list({ filter: 'all', page: 3, pageSize: 20 })).toMatchObject({
      items: [],
      total: 30,
    })

    const active = await repo.list({ filter: 'active', page: 2, pageSize: 20 })
    expect(active).toMatchObject({ total: 23, counts })
    expect(active.items.map((item) => item.state)).toEqual(['Open', 'Open', 'Open'])
    const awaiting = await repo.list({ filter: 'awaiting', page: 1, pageSize: 3 })
    expect(awaiting.total).toBe(4)
    expect(awaiting.items.map((item) => item.title)).toEqual(['Case 26', 'Case 25', 'Case 24'])
    const closed = await repo.list({ filter: 'closed', page: 1, pageSize: 20 })
    expect(closed.items.map((item) => item.state)).toEqual(['Closed', 'Resolved'])
    expect(closed.items[0]?.clubName).toBe('HEBE')
  })
})
