const mimeTypes = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;
export type ProposalFileExtension = keyof typeof mimeTypes;
const maxBytes = 10 * 1024 * 1024;

// Trả về MIME type nếu file hợp lệ về đuôi và dung lượng, ngược lại null
/**
 * MIME type to upload with when the file has an allowed extension and fits the 10 MB limit, else null.
 * Taken from the extension because browsers often leave `File.type` empty for Office files; the server
 * still checks the bytes.
 */
export function proposalFileType(file: File, allowed: readonly ProposalFileExtension[]): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const match = allowed.find((item) => item === extension);
  return match && file.size > 0 && file.size <= maxBytes ? mimeTypes[match] : null;
}

// Định dạng dung lượng file thành KB hoặc MB
export function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
