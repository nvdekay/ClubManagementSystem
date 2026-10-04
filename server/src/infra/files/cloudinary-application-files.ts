import { createHash, randomUUID } from "node:crypto";
import { DomainError } from "../../domain/errors.js";
import type { ApplicationFileStorage, ApplicationDocument } from "../../domain/club-application.js";
import type { CloudinaryConfig } from "../config/index.js";

const extensionForMime: Record<string, string> = {
  "application/pdf": "pdf", "image/png": "png", "image/jpeg": "jpg",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

function signature(params: Record<string, string>, secret: string): string {
  const serialized = Object.entries(params).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`).join("&");
  return createHash("sha1").update(serialized + secret).digest("hex");
}

export function cloudinaryApplicationFiles(config: CloudinaryConfig): ApplicationFileStorage {
  const base = `https://api.cloudinary.com/v1_1/${config.CLOUDINARY_CLOUD_NAME}`;
  const authorization = `Basic ${Buffer.from(`${config.CLOUDINARY_API_KEY}:${config.CLOUDINARY_API_SECRET}`).toString("base64")}`;
  return {
    async upload(input): Promise<ApplicationDocument> {
      const extension = extensionForMime[input.mimeType];
      if (!extension) throw new DomainError("unsupported file type", "validation");
      const file = new FormData();
      file.append("file", new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }),
        input.fileName);
      file.append("public_id", `ucms/applications/${input.ownerId}/${input.applicationId}/${randomUUID()}.${extension}`);
      file.append("type", "authenticated");
      let response: globalThis.Response;
      try {
        response = await fetch(`${base}/raw/upload`, {
          method: "POST", headers: { Authorization: authorization },
          body: file, signal: AbortSignal.timeout(30_000),
        });
      } catch {
        throw new DomainError("file storage unavailable", "unavailable");
      }
      const body = await response.json().catch(() => null) as { asset_id?: unknown } | null;
      if (!response.ok || typeof body?.asset_id !== "string") {
        throw new DomainError("file upload failed", "unavailable");
      }
      return { id: randomUUID(), documentType: input.documentType,
        fileName: input.fileName, mimeType: input.mimeType,
        bytes: input.bytes.length, assetId: body.asset_id, uploadedAt: input.now };
    },
    async accessUrl(assetId): Promise<string> {
      const now = Math.floor(Date.now() / 1000);
      const params = { asset_id: assetId, attachment: "true",
        expires_at: String(now + 60), timestamp: String(now) };
      const url = new URL(`${base}/asset/download`);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      url.searchParams.set("api_key", config.CLOUDINARY_API_KEY);
      url.searchParams.set("signature", signature(params, config.CLOUDINARY_API_SECRET));
      return url.toString();
    },
  };
}
