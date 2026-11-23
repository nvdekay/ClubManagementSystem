import type { RecruitmentAttachmentStorage } from "../../domain/recruitment-application.js";
import type { CloudinaryConfig } from "../config/index.js";
import { cloudinaryApplicationFiles } from "./cloudinary-application-files.js";

// Tạo kho file đính kèm đơn ứng tuyển, luôn ở chế độ private
export function cloudinaryRecruitmentFiles(config: CloudinaryConfig): RecruitmentAttachmentStorage {
  const files = cloudinaryApplicationFiles(config);
  return {
    // Upload file đính kèm ứng tuyển và trả metadata theo fieldKey
    async upload(input) {
      const document = await files.upload({ ...input, documentType: input.fieldKey,
        visibility: "private" });
      return {
        id: document.id, fieldKey: input.fieldKey,
        fileName: document.fileName, mimeType: document.mimeType,
        bytes: document.bytes, assetId: document.assetId, uploadedAt: document.uploadedAt,
      };
    },
    // Tạo URL tải có chữ ký cho file đính kèm ứng tuyển
    accessUrl(assetId) { return files.accessUrl(assetId); },
  };
}
