import type { Request, Response } from "express";

// Trả envelope thành công cho mọi response 2xx
// Envelope thành công — dạng duy nhất mà mọi response 2xx đi qua.
export function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({
    statusCode: status,
    message: "success",
    data: data ?? null,
    timestamp: new Date().toISOString(),
  });
}

// Trả envelope lỗi cho mọi response không phải 2xx
// Envelope lỗi — dạng duy nhất mà mọi response không phải 2xx đi qua.
export function fail(
  res: Response,
  req: Request,
  status: number,
  error: string,
  message: string,
  details?: unknown,
) {
  res.status(status).json({
    statusCode: status,
    error,
    message,
    ...(details !== undefined ? { details } : {}),
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}

// Trả file sinh ra dưới dạng attachment tải về
// Tải file — response 2xx duy nhất không phải JSON: file được tạo ra và gửi dưới dạng attachment (UC55).
export function download(res: Response, file: { bytes: Buffer; mimeType: string }, fileName: string) {
  res.status(200).type(file.mimeType).attachment(fileName).send(file.bytes);
}
