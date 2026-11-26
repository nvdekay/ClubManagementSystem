import mongoose, { Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { evidenceReference } from '../../src/domain/periodic-report.js'
import { mongoUploadedEvidenceRepository } from '../../src/infra/db/mongo-uploaded-evidence-repository.js'
import { ensureUcmsDatabase, ucmsModels } from '../../src/infra/db/ucms-models.js'
import { cleanupOrphanedEvidence } from '../../src/usecase/periodic-evidence-cleanup.js'

const uri = process.env.MONGO_URI
const dbName = `ucms-uploaded-evidence-test-${process.pid}`
const HOUR = 60 * 60 * 1000

describe.skipIf(!uri)('Mongo uploaded evidence repository', () => {
  const now = new Date('2026-11-26T00:00:00Z')
  const old = new Date(now.getTime() - 30 * HOUR)
  const club = new Types.ObjectId()
  const otherClub = new Types.ObjectId()
  const clubId = String(club)
  function asset(n: number) {
    return String(n).padStart(32, 'a')
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? '', { dbName })
    await ensureUcmsDatabase()
  }, 30_000)

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase()
    }
    await mongoose.disconnect()
  })

  it('finds references in drafts, system data and submitted snapshots, and cleans the rest', async () => {
    const repo = mongoUploadedEvidenceRepository()
    const draftOnly = asset(1)
    const systemDataOnly = asset(2)
    const snapshotOnly = asset(3)
    const orphan = asset(4)
    const elsewhere = asset(5)
    const fresh = asset(6)
    for (const assetId of [draftOnly, systemDataOnly, snapshotOnly, orphan, elsewhere]) {
      await repo.record({ assetId, clubId, uploadedAt: old })
    }
    await repo.record({ assetId: fresh, clubId, uploadedAt: now })

    const reportId = new Types.ObjectId()
    await ucmsModels.periodicReports!.insertMany([
      {
        _id: reportId,
        clubId: club,
        periodCode: 'FA26',
        periodType: 'SEMESTER',
        dueAt: now,
        state: 'Draft',
        versionNo: 1,
        evidence: [{ note: 'photo', url: evidenceReference(clubId, draftOnly) }],
        preloadedFigures: {
          systemData: { events: [{ evidenceUrl: evidenceReference(clubId, systemDataOnly) }] },
        },
      },
      {
        // Another club's report quoting this club's asset id does not keep it alive.
        clubId: otherClub,
        periodCode: 'FA26',
        periodType: 'SEMESTER',
        dueAt: now,
        state: 'Draft',
        versionNo: 1,
        evidence: [{ url: evidenceReference(clubId, elsewhere) }],
        preloadedFigures: {},
      },
    ])
    await ucmsModels.auditLogs!.create({
      entityType: 'PeriodicReport',
      entityId: reportId,
      action: 'PERIODIC_REPORT_SUBMITTED',
      after: { snapshot: { evidence: [{ url: evidenceReference(clubId, snapshotOnly) }] } },
      correlationId: 'c1',
      at: old,
    })

    const removed: string[] = []
    const storage = {
      upload: async () => ({ assetId: '' }),
      accessUrl: async () => '',
      async remove(assetId: string) {
        removed.push(assetId)
      },
    }
    expect(await cleanupOrphanedEvidence(storage, repo, now)).toEqual({
      removed: 2,
      failures: [],
    })
    expect(removed.sort()).toEqual([orphan, elsewhere].sort())

    const rows = await ucmsModels.uploadedAssets!.find().sort({ assetId: 1 }).lean()
    expect(rows.map((row) => [row.assetId, row.referencedAt ?? null])).toEqual([
      [draftOnly, now],
      [systemDataOnly, now],
      [snapshotOnly, now],
      [fresh, null],
    ])

    // Idempotent: nothing left to look at on the next run.
    expect(await cleanupOrphanedEvidence(storage, repo, now)).toEqual({
      removed: 0,
      failures: [],
    })
    await expect(repo.record({ assetId: fresh, clubId, uploadedAt: now })).rejects.toThrow()
  })
})
