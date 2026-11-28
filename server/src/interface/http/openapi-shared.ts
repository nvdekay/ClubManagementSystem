import { z } from 'zod'
import type { createDocument } from 'zod-openapi'

// Các mảnh OpenAPI dùng chung của openapi.ts và các file openapi-*.ts (trước đây mỗi file chép một bản)

export type OpenApiPaths = NonNullable<Parameters<typeof createDocument>[0]['paths']>

// Body lỗi chuẩn — xem fail() ở interface/http/response.ts
export const ApiError = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
  timestamp: z.string(),
  path: z.string(),
})

// Bọc schema dữ liệu vào envelope response thành công (mọi response 2xx — xem response.ts)
export function envelope<T extends z.ZodType>(data: T, timestamp: z.ZodType = z.string()) {
  return z.object({ statusCode: z.number(), message: z.string(), data, timestamp })
}

// Response JSON thành công có envelope
export function jsonOk(description: string, data: z.ZodType, timestamp?: z.ZodType) {
  return { description, content: { 'application/json': { schema: envelope(data, timestamp) } } }
}

// Response lỗi JSON theo body ApiError
export function apiError(description: string) {
  return { description, content: { 'application/json': { schema: ApiError } } }
}

// Request body JSON (tuỳ chọn đánh dấu bắt buộc)
export function jsonBody(schema: z.ZodType, required?: boolean) {
  return {
    ...(required ? { required } : {}),
    content: { 'application/json': { schema } },
  }
}

// Ba lỗi chung của các nhóm endpoint đã đăng nhập
export const commonErrors = {
  '400': { description: 'Invalid request' },
  '401': { description: 'Authentication required' },
  '403': { description: 'Permission required' },
}
