import {
  EVIDENCE_ORPHAN_GRACE_HOURS,
  type PeriodicEvidenceStorage,
  type UploadedEvidenceRepository,
} from '../domain/periodic-report.js'

/** Ảnh xét trong một lượt chạy; phần còn lại chờ lượt sau. */
export const EVIDENCE_CLEANUP_BATCH = 200

// Bọc kho ảnh minh chứng để mỗi lần upload thành công đều được ghi vào sổ theo dõi
/**
 * Every successful evidence upload is recorded so the cleanup job can find it later. When the
 * record cannot be written the fresh asset is deleted again, so no upload escapes tracking.
 */
export function trackEvidenceUploads(
  storage: PeriodicEvidenceStorage,
  uploads: Pick<UploadedEvidenceRepository, 'record'>,
  clock: () => Date = () => new Date(),
): PeriodicEvidenceStorage {
  return {
    async upload(input) {
      const stored = await storage.upload(input)
      try {
        await uploads.record({
          assetId: stored.assetId,
          clubId: input.clubId.toLowerCase(),
          uploadedAt: clock(),
        })
      } catch (error) {
        await storage.remove(stored.assetId).catch(() => undefined)
        throw error
      }
      return stored
    },
    accessUrl: (assetId) => storage.accessUrl(assetId),
    remove: (assetId) => storage.remove(assetId),
  }
}

export interface EvidenceCleanupResult {
  removed: number
  /** Assets whose delete failed; their records stay so the next run retries them. */
  failures: { assetId: string; error: string }[]
}

// Xoá ảnh minh chứng đã upload quá 24 giờ mà không báo cáo nào tham chiếu
/**
 * Idempotent: referenced uploads are marked and never looked at again; an orphan is deleted from
 * storage first and only then forgotten, so a failed delete is retried on the next run. Without a
 * storage (no Cloudinary configuration) nothing was ever uploaded and the run is a no-op.
 */
export async function cleanupOrphanedEvidence(
  storage: PeriodicEvidenceStorage | null,
  uploads: UploadedEvidenceRepository,
  now: Date,
): Promise<EvidenceCleanupResult> {
  if (!storage) {
    return { removed: 0, failures: [] }
  }
  const cutoff = new Date(now.getTime() - EVIDENCE_ORPHAN_GRACE_HOURS * 60 * 60 * 1000)
  const candidates = await uploads.unconfirmed(cutoff, EVIDENCE_CLEANUP_BATCH)
  if (!candidates.length) {
    return { removed: 0, failures: [] }
  }
  const referenced = await uploads.referenced(candidates)
  if (referenced.size) {
    await uploads.markReferenced([...referenced], now)
  }
  const result: EvidenceCleanupResult = { removed: 0, failures: [] }
  for (const candidate of candidates) {
    if (referenced.has(candidate.assetId)) {
      continue
    }
    try {
      await storage.remove(candidate.assetId)
      await uploads.forget(candidate.assetId)
      result.removed += 1
    } catch (error) {
      // Keep the record so the next run retries; one failing asset must not block the others.
      result.failures.push({
        assetId: candidate.assetId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return result
}
