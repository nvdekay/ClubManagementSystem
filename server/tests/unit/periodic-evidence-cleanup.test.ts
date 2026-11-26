import { describe, expect, it, vi } from 'vitest'
import type {
  PeriodicEvidenceStorage,
  UploadedEvidence,
  UploadedEvidenceRepository,
} from '../../src/domain/periodic-report.js'
import {
  cleanupOrphanedEvidence,
  EVIDENCE_CLEANUP_BATCH,
  trackEvidenceUploads,
} from '../../src/usecase/periodic-evidence-cleanup.js'

const club = 'aaaaaaaaaaaaaaaaaaaaaaaa'
const now = new Date('2026-11-26T00:00:00Z')
const HOUR = 60 * 60 * 1000

function fakeStorage(fail: string[] = []) {
  const assets = new Set<string>()
  let next = 0
  const storage = {
    upload: vi.fn(async () => {
      next += 1
      const assetId = String(next).padStart(32, '0')
      assets.add(assetId)
      return { assetId }
    }),
    accessUrl: vi.fn(async (assetId: string) => `https://files.test/${assetId}`),
    remove: vi.fn(async (assetId: string) => {
      if (fail.includes(assetId)) {
        throw new Error('storage down')
      }
      assets.delete(assetId)
    }),
  } satisfies PeriodicEvidenceStorage
  return { storage, assets }
}

interface Row extends UploadedEvidence {
  uploadedAt: Date
  referencedAt?: Date
}

function memoryUploads(rows: Row[] = [], referencedIds: string[] = []) {
  const repo: UploadedEvidenceRepository = {
    record: vi.fn(async (input) => {
      rows.push({ ...input })
    }),
    unconfirmed: vi.fn(async (before, limit) =>
      rows
        .filter((row) => !row.referencedAt && row.uploadedAt < before)
        .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime())
        .slice(0, limit)
        .map(({ assetId, clubId }) => ({ assetId, clubId })),
    ),
    referenced: vi.fn(
      async (assets: readonly UploadedEvidence[]) =>
        new Set(
          assets.filter((item) => referencedIds.includes(item.assetId)).map((item) => item.assetId),
        ),
    ),
    markReferenced: vi.fn(async (assetIds, at) => {
      for (const row of rows) {
        if (assetIds.includes(row.assetId)) {
          row.referencedAt = at
        }
      }
    }),
    forget: vi.fn(async (assetId) => {
      rows.splice(
        rows.findIndex((row) => row.assetId === assetId),
        1,
      )
    }),
  }
  return { repo, rows }
}

describe('trackEvidenceUploads', () => {
  it('records each upload with the lower-cased club and passes reads and deletes through', async () => {
    const { storage } = fakeStorage()
    const { repo, rows } = memoryUploads()
    const tracked = trackEvidenceUploads(storage, repo, () => now)
    const result = await tracked.upload({
      clubId: club.toUpperCase(),
      mimeType: 'image/png',
      bytes: Buffer.from('x'),
    })
    expect(rows).toEqual([{ assetId: result.assetId, clubId: club, uploadedAt: now }])
    expect(await tracked.accessUrl(result.assetId)).toBe(`https://files.test/${result.assetId}`)
    await tracked.remove(result.assetId)
    expect(storage.remove).toHaveBeenCalledWith(result.assetId)
  })

  it('deletes the fresh asset when the upload cannot be recorded', async () => {
    const { storage, assets } = fakeStorage()
    const { repo } = memoryUploads()
    vi.mocked(repo.record).mockRejectedValue(new Error('db down'))
    const tracked = trackEvidenceUploads(storage, repo)
    await expect(
      tracked.upload({ clubId: club, mimeType: 'image/png', bytes: Buffer.from('x') }),
    ).rejects.toThrow('db down')
    expect(assets.size).toBe(0)
  })
})

describe('cleanupOrphanedEvidence', () => {
  it('is a no-op without storage', async () => {
    const { repo } = memoryUploads([{ assetId: 'a', clubId: club, uploadedAt: new Date(0) }])
    expect(await cleanupOrphanedEvidence(null, repo, now)).toEqual({ removed: 0, failures: [] })
    expect(repo.unconfirmed).not.toHaveBeenCalled()
  })

  it('removes unreferenced uploads older than 24h and marks referenced ones', async () => {
    const { storage, assets } = fakeStorage()
    const old = new Date(now.getTime() - 25 * HOUR)
    for (const id of ['orphan', 'used', 'fresh']) {
      assets.add(id)
    }
    const { repo, rows } = memoryUploads(
      [
        { assetId: 'orphan', clubId: club, uploadedAt: old },
        { assetId: 'used', clubId: club, uploadedAt: old },
        { assetId: 'fresh', clubId: club, uploadedAt: new Date(now.getTime() - 23 * HOUR) },
      ],
      ['used'],
    )
    expect(await cleanupOrphanedEvidence(storage, repo, now)).toEqual({
      removed: 1,
      failures: [],
    })
    expect([...assets].sort()).toEqual(['fresh', 'used'])
    expect(rows.map((row) => [row.assetId, row.referencedAt])).toEqual([
      ['used', now],
      ['fresh', undefined],
    ])
    expect(repo.unconfirmed).toHaveBeenCalledWith(
      new Date(now.getTime() - 24 * HOUR),
      EVIDENCE_CLEANUP_BATCH,
    )

    // A second run finds nothing left to do.
    expect(await cleanupOrphanedEvidence(storage, repo, now)).toEqual({
      removed: 0,
      failures: [],
    })
    expect(storage.remove).toHaveBeenCalledTimes(1)
  })

  it('keeps the record of an asset whose delete failed and still handles the others', async () => {
    const { storage } = fakeStorage(['broken'])
    const old = new Date(now.getTime() - 48 * HOUR)
    const { repo, rows } = memoryUploads([
      { assetId: 'broken', clubId: club, uploadedAt: old },
      { assetId: 'orphan', clubId: club, uploadedAt: old },
    ])
    expect(await cleanupOrphanedEvidence(storage, repo, now)).toEqual({
      removed: 1,
      failures: [{ assetId: 'broken', error: 'storage down' }],
    })
    expect(rows.map((row) => row.assetId)).toEqual(['broken'])
    expect(repo.markReferenced).not.toHaveBeenCalled()
  })
})
