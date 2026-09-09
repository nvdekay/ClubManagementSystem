import { STATUS_CODES } from "node:http";
import type { NextFunction, Request, Response } from "express";
import { DomainError, type DomainErrorKind } from "../../domain/errors.js";
import { fail } from "./response.js";

const DOMAIN_STATUS: Record<DomainErrorKind, number> = {
  validation: 400,
  conflict: 409,
  not_found: 404,
};

// Performance/access log: one JSON line per request with duration.
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  const { method, originalUrl } = req; // captured now — express rewrites req.path per router
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        ts: new Date().toISOString(),
        method,
        path: originalUrl,
        status: res.statusCode,
        duration_ms: Math.round(performance.now() - start),
      }),
    );
  });
  next();
}

function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null) return undefined;
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown };
  const code = typeof status === "number" ? status : statusCode;
  return typeof code === "number" && code >= 400 && code < 500 ? code : undefined;
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err); // too late to write a body — let express close the socket
  if (err instanceof DomainError) {
    fail(res, req, DOMAIN_STATUS[err.kind], err.kind, err.message, err.details);
    return;
  }
  // Framework 4xx (body-parser 400/413/415, http-errors) keep their status, but the client gets
  // the generic reason phrase — err.message can echo raw request bytes (LOG-01). Log the real cause.
  const status = clientErrorStatus(err);
  if (status !== undefined) {
    console.warn(`client error ${status}: ${err instanceof Error ? err.message : String(err)}`);
    const reason = (STATUS_CODES[status] ?? "bad request").toLowerCase();
    fail(res, req, status, reason, reason);
    return;
  }
  console.error(err);
  fail(res, req, 500, "internal server error", "internal server error");
}
