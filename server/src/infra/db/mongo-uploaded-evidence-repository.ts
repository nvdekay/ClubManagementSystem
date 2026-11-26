import { Types } from 'mongoose'
import {
  evidenceReference,
  type UploadedEvidence,
  type UploadedEvidenceRepository,
} from '../../domain/periodic-report.js'
import { ucmsModels as m } from './ucms-models.js'

const KIND = 'PERIODIC_EVIDENCE'

// Sổ theo dõi ảnh minh chứng báo cáo định kỳ đã upload (feat-upload-orphan-cleanup)
export function mongoUploadedEvidenceRepository(): UploadedEvidenceRepository {
  const assets = m.uploadedAssets!

  return {
    // Ghi một ảnh vừa upload
    async record(input) {
      await assets.create({
        assetId: input.assetId,
        kind: KIND,
        clubId: new Types.ObjectId(input.clubId),
        uploadedAt: input.uploadedAt,
      })
    },

    // Ảnh upload trước mốc cắt mà chưa từng thấy được tham chiếu, cũ nhất trước
    async unconfirmed(before, limit) {
      const docs = await assets
        .find({ kind: KIND, referencedAt: null, uploadedAt: { $lt: before } })
        .sort({ uploadedAt: 1, _id: 1 })
        .limit(limit)
        .lean()
      return docs.map((doc) => ({ assetId: String(doc.assetId), clubId: String(doc.clubId) }))
    },

    // Ảnh được tham chiếu ở bất kỳ đâu trong báo cáo của CLB sở hữu hoặc trong snapshot phiên bản đã nộp
    async referenced(candidates) {
      const byClub = new Map<string, UploadedEvidence[]>()
      for (const candidate of candidates) {
        byClub.set(candidate.clubId, [...(byClub.get(candidate.clubId) ?? []), candidate])
      }
      const found = new Set<string>()
      for (const [clubId, items] of byClub) {
        const reports = await m.periodicReports!.find({ clubId: new Types.ObjectId(clubId) }).lean()
        const snapshots = reports.length
          ? await m
              .auditLogs!.find({
                entityType: 'PeriodicReport',
                entityId: { $in: reports.map((report) => report._id) },
                action: 'PERIODIC_REPORT_SUBMITTED',
              })
              .select({ after: 1 })
              .lean()
          : []
        // The reference string is unique enough to search the serialized documents directly, which
        // covers every field that can hold it (draft, clubData, systemData, version snapshots).
        const haystack = JSON.stringify([reports, snapshots.map((audit) => audit.after)])
        for (const item of items) {
          if (haystack.includes(evidenceReference(clubId, item.assetId))) {
            found.add(item.assetId)
          }
        }
      }
      return found
    },

    // Đánh dấu ảnh đã được tham chiếu để job không xét lại
    async markReferenced(assetIds, now) {
      await assets.updateMany(
        { assetId: { $in: [...assetIds] }, referencedAt: null },
        { $set: { referencedAt: now } },
      )
    },

    // Bỏ dòng theo dõi sau khi asset đã bị xoá khỏi storage
    async forget(assetId) {
      await assets.deleteOne({ assetId, kind: KIND })
    },
  }
}
