import type { Request, Response } from "express";

// Success envelope — the one shape every 2xx response goes through.
export function ok(res: Response, data: unknown, status = 200) {
  res.status(status).json({
    statusCode: status,
    message: "success",
    data: data ?? null,
    timestamp: new Date().toISOString(),
  });
}

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
