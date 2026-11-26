import mongoose, { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { mongoSuspensionRequestRepository } from '../../src/infra/db/mongo-suspension-request-repository.js'
import { ensureUcmsDatabase, ucmsModels as m } from '../../src/infra/db/ucms-models.js'

const uri = process.env.MONGO_URI
const dbName = `ucms-suspension-test-${process.pid}`

describe.skipIf(!uri)('Mongo suspension request repository', () => {
  const now = new Date('2026-10-15T00:00:00Z')
  const leader = new Types.ObjectId()
  const clubs = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()]

  beforeAll(async () => {
    await mongoose.connect(uri ?? '', { dbName })
    await ensureUcmsDatabase()
    await m.clubs!.insertMany(
      clubs.map((id, index) => ({
        _id: id,
        code: `C${index}`,
        name: `Club ${index}`,
        field: 'Art',
        state: 'Active',
        createdAt: now,
      })),
    )
    // 25 requests spread over three clubs; request n is submitted n minutes after `now`.
    await m.suspensionRequests!.insertMany(
      Array.from({ length: 25 }, (_, index) => ({
        clubId: clubs[index % 3],
        reason: `Reason ${index}`,
        until: new Date('2026-12-30'),
        obligationsPlan: 'Plan',
        recoveryPlan: 'Recover',
        acknowledgedImpactIds: [],
        state: index % 2 ? 'Rejected' : 'Pending',
        submittedBy: leader,
        submittedAt: new Date(now.getTime() + index * 60_000),
      })),
    )
  }, 30_000)

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
  })

  it('pages every club request newest first with the club names resolved in batch', async () => {
    const repo = mongoSuspensionRequestRepository()
    const first = await repo.list({ page: 1, pageSize: 20 })
    expect(first).toMatchObject({ total: 25, page: 1, pageSize: 20 })
    expect(first.items).toHaveLength(20)
    expect(first.items[0]).toMatchObject({ reason: 'Reason 24', clubName: 'Club 0' })
    expect(first.items[1]).toMatchObject({ reason: 'Reason 23', clubName: 'Club 2' })
    const second = await repo.list({ page: 2, pageSize: 20 })
    expect(second.items.map((item) => item.reason)).toEqual([
      'Reason 4',
      'Reason 3',
      'Reason 2',
      'Reason 1',
      'Reason 0',
    ])
    expect(await repo.list({ page: 3, pageSize: 20 })).toMatchObject({ items: [], total: 25 })
    // The club-scoped context keeps listing only that club's requests, unpaged.
    const context = await repo.context(String(clubs[1]), now)
    expect(context.requests).toHaveLength(8)
    expect(context.requests.every((item) => item.clubName === 'Club 1')).toBe(true)
  })
})
