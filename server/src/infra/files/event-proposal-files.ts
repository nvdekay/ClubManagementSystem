import { randomUUID } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { EventProposalDocument, EventProposalFileStorage } from "../../domain/club-event.js";
import type { CloudinaryConfig } from "../config/index.js";
import { cloudinaryApplicationFiles, uploadToCloudinary } from "./cloudinary-application-files.js";

// Tạo kho file đề án sự kiện và template của ICPDP trên Cloudinary
/** Proposal documents and ICPDP templates are authenticated raw assets, read only through 60-second signed URLs. */
export function cloudinaryEventProposalFiles(config: CloudinaryConfig): EventProposalFileStorage {
  async function upload(folder: string, input: { actorId: string; fileName: string; mimeType: string; bytes: Buffer; now: Date }):
    Promise<EventProposalDocument> {
    const { assetId } = await uploadToCloudinary(config, { folder, fileName: input.fileName, mimeType: input.mimeType,
      bytes: input.bytes, isPublic: false });
    return { id: randomUUID(), fileName: input.fileName, mimeType: input.mimeType, bytes: input.bytes.length, assetId,
      uploadedAt: input.now, uploadedBy: input.actorId };
  }
  return {
    uploadProposalDocument: (input) => upload(`ucms/event-proposals/${input.clubId}/${input.eventId}`, input),
    uploadTemplateDocument: (input) => upload("ucms/event-proposal-templates", input),
    accessUrl: (assetId, options) => cloudinaryApplicationFiles(config).accessUrl(assetId, options),
  };
}

// Same depth from server/src/infra/files (tsx, vitest) and server/dist/infra/files (build): four levels up is the repo root.
const DEFAULT_TEMPLATE = fileURLToPath(new URL("../../../../docs/Template Đề án sự kiện.docx", import.meta.url));
let cachedDefault: Promise<{ fileName: string; mimeType: string; content: Buffer; updatedAt: Date }> | undefined;

// Đọc template đề án sự kiện mặc định đi kèm repo (cache trong bộ nhớ)
/** The bundled template served until ICPDP uploads one; read once, then kept in memory. */
export function loadDefaultEventProposalTemplate() {
  cachedDefault ??= Promise.all([readFile(DEFAULT_TEMPLATE), stat(DEFAULT_TEMPLATE)]).then(([content, info]) => ({
    fileName: "Template Đề án sự kiện.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    content, updatedAt: info.mtime,
  }));
  cachedDefault.catch(() => { cachedDefault = undefined; });
  return cachedDefault;
}
