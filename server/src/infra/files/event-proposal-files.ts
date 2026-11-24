import { randomUUID } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { EventProposalDocument, EventProposalFileStorage } from '../../domain/club-event.js'
import type { CloudinaryConfig } from '../config/index.js'
import { cloudinaryApplicationFiles, uploadToCloudinary } from './cloudinary-application-files.js'

// Tạo kho file đề án sự kiện và template của ICPDP trên Cloudinary
/** Tài liệu đề xuất và template của ICPDP là raw asset có xác thực, chỉ đọc qua signed URL 60 giây. */
export function cloudinaryEventProposalFiles(config: CloudinaryConfig): EventProposalFileStorage {
  async function upload(
    folder: string,
    input: { actorId: string; fileName: string; mimeType: string; bytes: Buffer; now: Date },
  ): Promise<EventProposalDocument> {
    const { assetId } = await uploadToCloudinary(config, {
      folder,
      fileName: input.fileName,
      mimeType: input.mimeType,
      bytes: input.bytes,
      isPublic: false,
    })
    return {
      id: randomUUID(),
      fileName: input.fileName,
      mimeType: input.mimeType,
      bytes: input.bytes.length,
      assetId,
      uploadedAt: input.now,
      uploadedBy: input.actorId,
    }
  }
  return {
    uploadProposalDocument: (input) =>
      upload(`ucms/event-proposals/${input.clubId}/${input.eventId}`, input),
    uploadTemplateDocument: (input) => upload('ucms/event-proposal-templates', input),
    accessUrl: (assetId, options) => cloudinaryApplicationFiles(config).accessUrl(assetId, options),
  }
}

// Cùng độ sâu từ server/src/infra/files (tsx, vitest) và server/dist/infra/files (build): lên bốn cấp là gốc repo.
const DEFAULT_TEMPLATE = fileURLToPath(
  new URL('../../../../docs/Template Đề án sự kiện.docx', import.meta.url),
)
let cachedDefault:
  Promise<{ fileName: string; mimeType: string; content: Buffer; updatedAt: Date }> | undefined

// Đọc template đề án sự kiện mặc định đi kèm repo (cache trong bộ nhớ)
/** Template đi kèm được phục vụ cho tới khi ICPDP upload template mới; đọc một lần rồi giữ trong bộ nhớ. */
export function loadDefaultEventProposalTemplate() {
  cachedDefault ??= Promise.all([readFile(DEFAULT_TEMPLATE), stat(DEFAULT_TEMPLATE)]).then(
    ([content, info]) => ({
      fileName: 'Template Đề án sự kiện.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content,
      updatedAt: info.mtime,
    }),
  )
  cachedDefault.catch(() => {
    cachedDefault = undefined
  })
  return cachedDefault
}
