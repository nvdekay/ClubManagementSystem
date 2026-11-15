import { createHash, randomUUID } from "node:crypto";
import { DomainError } from "../../domain/errors.js";
import type { ApplicationFileStorage, ApplicationDocument } from "../../domain/club-application.js";
import type { CloudinaryConfig } from "../config/index.js";

const extensionForMime: Record<string, string> = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

// Tạo chữ ký SHA-1 cho tham số gọi API Cloudinary
function signature(params: Record<string, string>, secret: string): string {
  const serialized = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`).join("&");
  return createHash("sha1").update(serialized + secret).digest("hex");
}

// Trả URL gốc của API Cloudinary theo cloud name
function cloudinaryBase(config: CloudinaryConfig): string {
  return `https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}`;
}

// Upload một file lên Cloudinary (ảnh công khai hoặc raw có xác thực)
/** Uploads one file: a public image at a random path, or an authenticated raw asset under `folder`. */
export async function uploadToCloudinary(config: CloudinaryConfig, input: { folder: string; fileName: string;
  mimeType: string; bytes: Buffer; isPublic: boolean }): Promise<{ assetId: string; secureUrl?: string }> {
  const extension = extensionForMime[input.mimeType];
  if (!extension) throw new DomainError("unsupported file type", "validation");
  const authorization = `Basic ${Buffer.from(`${config.CLOUDINARY_API_KEY}:${config.CLOUDINARY_API_SECRET}`).toString("base64")}`;
  const file = new FormData();
  file.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }), input.fileName);
  file.append("public_id", input.isPublic ? `${input.folder}/${randomUUID()}`
    : `${input.folder}/${randomUUID()}.${extension}`);
  file.append("type", input.isPublic ? "upload" : "authenticated");
  let response: globalThis.Response;
  try {
    response = await fetch(`${cloudinaryBase(config)}/${input.isPublic ? "image" : "raw"}/upload`, {
      method: "POST", headers: { Authorization: authorization },
      body: file, signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new DomainError("file storage unavailable", "unavailable");
  }
  const body = await response.json().catch(() => null) as
    { asset_id?: unknown; secure_url?: unknown } | null;
  if (!response.ok || typeof body?.asset_id !== "string" ||
    (input.isPublic && typeof body.secure_url !== "string")) {
    throw new DomainError("file upload failed", "unavailable");
  }
  return { assetId: body.asset_id, ...(input.isPublic ? { secureUrl: String(body.secure_url) } : {}) };
}

// Tạo kho file hồ sơ đơn lập CLB trên Cloudinary
export function cloudinaryApplicationFiles(config: CloudinaryConfig): ApplicationFileStorage {
  const base = cloudinaryBase(config);
  return {
    // Upload tài liệu hồ sơ và trả metadata tài liệu để lưu
    async upload(input): Promise<ApplicationDocument> {
      // Proposed logos are public images (random path) so they can be previewed and reused as the
      // club logo on approval; every other document stays an authenticated raw asset.
      const isPublic = input.visibility === "public";
      const stored = await uploadToCloudinary(config, { folder: isPublic ? "ucms/club-logo-proposals"
        : `ucms/applications/${input.ownerId}/${input.applicationId}`, fileName: input.fileName,
      mimeType: input.mimeType, bytes: input.bytes, isPublic });
      return { id: randomUUID(), documentType: input.documentType,
        fileName: input.fileName, mimeType: input.mimeType,
        bytes: input.bytes.length, assetId: stored.assetId,
        ...(stored.secureUrl ? { publicUrl: stored.secureUrl } : {}), uploadedAt: input.now };
    },
    // Tạo URL tải file có chữ ký, hiệu lực 60 giây
    async accessUrl(assetId, options): Promise<string> {
      const now = Math.floor(Date.now() / 1000);
      const params = { asset_id: assetId, attachment: options?.inline ? "false" : "true",
        expires_at: String(now + 60), timestamp: String(now) };
      const url = new URL(`${base}/asset/download`);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      url.searchParams.set("api_key", config.CLOUDINARY_API_KEY);
      url.searchParams.set("signature", signature(params, config.CLOUDINARY_API_SECRET));
      return url.toString();
    },
  };
}
