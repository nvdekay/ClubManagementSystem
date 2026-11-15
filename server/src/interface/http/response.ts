import type { Request, Response } from "express";

// Trả envelope thành công cho mọi response 2xx
// Success envelope — the one shape every 2xx response goes through.
export function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({
    statusCode: status,
    message: "success",
    data: data ?? null,
    timestamp: new Date().toISOString(),
  });
}

// Trả envelope lỗi cho mọi response không phải 2xx
// Error envelope — the one shape every non-2xx response goes through.
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
// File download — the one non-JSON 2xx: a generated file sent as an attachment (UC55).
export function download(res: Response, file: { bytes: Buffer; mimeType: string }, fileName: string) {
  res.status(200).type(file.mimeType).attachment(fileName).send(file.bytes);
}
