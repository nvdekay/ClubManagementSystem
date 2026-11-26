import type { PeriodicEvidenceStorage } from '../../domain/periodic-report.js'
import type { CloudinaryConfig } from '../config/index.js'
import {
  deleteFromCloudinary,
  signedDownloadUrl,
  uploadToCloudinary,
} from './cloudinary-application-files.js'

const extensionForMime = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' } as const
// Ảnh minh chứng hiển thị ngay trên trang báo cáo nên cần sống lâu hơn link tải 60 giây của tệp đính kèm.
const EVIDENCE_URL_TTL_SECONDS = 10 * 60

// Tạo kho ảnh minh chứng báo cáo định kỳ trên Cloudinary
/** Ảnh là raw asset có xác thực dưới `ucms/periodic-reports/{clubId}`, chỉ đọc qua signed URL 10 phút. */
export function cloudinaryPeriodicEvidenceFiles(config: CloudinaryConfig): PeriodicEvidenceStorage {
  return {
    // Upload ảnh minh chứng riêng tư và trả assetId để dựng tham chiếu
    async upload(input) {
      const { assetId } = await uploadToCloudinary(config, {
        folder: `ucms/periodic-reports/${input.clubId}`,
        fileName: `evidence.${extensionForMime[input.mimeType]}`,
        mimeType: input.mimeType,
        bytes: input.bytes,
        isPublic: false,
      })
      return { assetId }
    },
    // Tạo signed URL xem ảnh ngay trên trang (inline), hết hạn sau 10 phút
    async accessUrl(assetId) {
      return signedDownloadUrl(config, assetId, {
        inline: true,
        ttlSeconds: EVIDENCE_URL_TTL_SECONDS,
      })
    },
    // Xoá ảnh minh chứng không còn được tham chiếu (job dọn dẹp)
    async remove(assetId) {
      await deleteFromCloudinary(config, assetId)
    },
  }
}
