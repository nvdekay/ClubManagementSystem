const mimeTypes = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const
export type ProposalFileExtension = keyof typeof mimeTypes
export const proposalDocumentMaxBytes = 10 * 1024 * 1024

// Trả về MIME type nếu file hợp lệ về đuôi và dung lượng, ngược lại null
/**
 * MIME type dùng khi upload nếu file có đuôi được phép và không vượt giới hạn dung lượng, ngược lại là null.
 * Lấy theo đuôi file vì trình duyệt thường để `File.type` rỗng với file Office; server
 * vẫn kiểm tra nội dung byte.
 */
export function proposalFileType(
  file: File,
  allowed: readonly ProposalFileExtension[],
  maxBytes = proposalDocumentMaxBytes,
): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const match = allowed.find((item) => item === extension)
  return match && file.size > 0 && file.size <= maxBytes ? mimeTypes[match] : null
}

// Định dạng dung lượng file thành KB hoặc MB
export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.ceil(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
