import type { RecruitmentAttachmentStorage } from "../../domain/recruitment-application.js";
import type { CloudinaryConfig } from "../config/index.js";
import { cloudinaryApplicationFiles } from "./cloudinary-application-files.js";

export function cloudinaryRecruitmentFiles(config: CloudinaryConfig): RecruitmentAttachmentStorage {
  const files = cloudinaryApplicationFiles(config);
  return {
    async upload(input) {
      const document = await files.upload({ ...input, documentType: input.fieldKey });
      return {
        id: document.id, fieldKey: input.fieldKey,
        fileName: document.fileName, mimeType: document.mimeType,
        bytes: document.bytes, assetId: document.assetId, uploadedAt: document.uploadedAt,
      };
    },
    accessUrl(assetId) { return files.accessUrl(assetId); },
  };
}
