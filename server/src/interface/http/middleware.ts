import { randomUUID } from 'node:crypto'
import { STATUS_CODES } from 'node:http'
import type { NextFunction, Request, Response } from 'express'
import { DomainError, type DomainErrorKind } from '../../domain/errors.js'
import type { AccessDenialAuditRepository } from '../../domain/access-denial.js'
import { recordAccessDenial } from '../../usecase/access-denial.js'
import { fail } from './response.js'

const DOMAIN_STATUS: Record<DomainErrorKind, number> = {
  validation: 400,
  conflict: 409,
  not_found: 404,
  unauthorized: 401,
  forbidden: 403,
  locked: 423,
  unavailable: 503,
}

// A client- or proxy-supplied id is kept only if it is a short token that is safe to log and echo.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,64}$/

type LogLevel = 'info' | 'warn' | 'error'

// Ghi một dòng log JSON
function log(level: LogLevel, fields: Record<string, unknown>) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, ...fields })
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

// Lấy request id mà requestLogger đã gắn vào response
function requestIdOf(res: Response): string | undefined {
  const id: unknown = res.locals.requestId
  return typeof id === 'string' ? id : undefined
}

// Ghi log JSON mỗi request kèm thời gian xử lý
/**
 * Log hiệu năng/truy cập: một dòng JSON cho mỗi request kèm thời lượng. Gắn request id (nhận
 * `X-Request-Id` từ proxy nếu an toàn, nếu không thì tự sinh), trả lại ở header `X-Request-Id`
 * để đối chiếu log của server với báo lỗi từ người dùng.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = performance.now()
  const incoming = req.get('x-request-id')
  const requestId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID()
  res.locals.requestId = requestId
  res.setHeader('X-Request-Id', requestId)
  const { method, originalUrl } = req // lấy ngay bây giờ — express ghi đè req.path theo từng router
  // Never log the query string: it can carry secrets such as the OAuth authorization code.
  const path = originalUrl.split('?', 1)[0]
  res.on('finish', () => {
    const status = res.statusCode
    log(status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info', {
      requestId,
      method,
      path,
      status,
      duration_ms: Math.round(performance.now() - start),
    })
  })
  next()
}

// Lấy mã lỗi 4xx từ lỗi của framework, không phải 4xx thì trả undefined
function clientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) {
    return undefined
  }
  const { status, statusCode } = err as { status?: unknown; statusCode?: unknown }
  const code = typeof status === 'number' ? status : statusCode
  return typeof code === 'number' && code >= 400 && code < 500 ? code : undefined
}

interface AccessContext {
  method: string
  route: string
  params: Record<string, string>
}

// Đọc accessContext từ res.locals, sai dạng thì trả null
function accessContext(value: unknown): AccessContext | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const { method, route, params } = value as Partial<AccessContext>
  return typeof method === 'string' &&
    typeof route === 'string' &&
    typeof params === 'object' &&
    params !== null
    ? { method, route, params }
    : null
}

// Tạo middleware ghi audit mỗi lần người dùng đã đăng nhập bị từ chối 403
/**
 * SEC-08 / AC17: nơi duy nhất audit lỗi 403 cho người gọi đã xác thực. Chạy trước
 * errorHandler và không bao giờ đổi response; nếu ghi audit thất bại thì chỉ log.
 */
export function accessDenialAuditor(repo: AccessDenialAuditRepository) {
  return async function auditAccessDenial(
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const actor = res.locals.actor as { id?: unknown } | undefined
    const context = accessContext(res.locals.accessContext)
    if (
      err instanceof DomainError &&
      err.kind === 'forbidden' &&
      typeof actor?.id === 'string' &&
      context
    ) {
      try {
        await recordAccessDenial(repo, {
          actorId: actor.id,
          ...context,
          reason: err.message,
          details: err.details,
          correlationId: randomUUID(),
          at: new Date(),
        })
      } catch (auditError) {
        console.error(
          `access denial audit failed for ${req.method} ${context.route}: ${auditError instanceof Error ? auditError.name : 'error'}`,
        )
      }
    }
    next(err)
  }
}

// Middleware lỗi cuối cùng: đổi DomainError và lỗi khác thành envelope lỗi thống nhất
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) {
    return next(err)
  } // quá muộn để ghi body — để express tự đóng socket
  if (err instanceof DomainError) {
    fail(res, req, DOMAIN_STATUS[err.kind], err.kind, err.message, err.details)
    return
  }
  // Lỗi 4xx của framework (body-parser 400/413/415, http-errors) giữ nguyên status, nhưng client chỉ nhận
  // cụm lý do chung — err.message có thể phản chiếu byte thô của request (LOG-01). Log nguyên nhân thật.
  const status = clientErrorStatus(err)
  if (status !== undefined) {
    log('warn', {
      requestId: requestIdOf(res),
      msg: `client error ${status}: ${err instanceof Error ? err.message : String(err)}`,
    })
    const reason = (STATUS_CODES[status] ?? 'bad request').toLowerCase()
    fail(res, req, status, reason, reason)
    return
  }
  if (isDuplicateKeyError(err)) {
    // A unique index caught a race the usecase check missed: a conflict, not a server fault.
    log('warn', { requestId: requestIdOf(res), msg: `duplicate key on ${req.method} ${req.path}` })
    fail(res, req, 409, 'conflict', 'resource already exists')
    return
  }
  log('error', {
    requestId: requestIdOf(res),
    method: req.method,
    path: req.originalUrl.split('?', 1)[0],
    error: describeError(err),
  })
  fail(res, req, 500, 'internal server error', 'internal server error')
}

// Mongo duplicate key (E11000), detected structurally: interface/ must not import the driver.
function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000
}

// Only name/message/code/stack: the raw error object can carry document values (keyValue, op…).
function describeError(err: unknown): string {
  if (!(err instanceof Error)) {
    return `non-error thrown: ${typeof err}`
  }
  const code = (err as { code?: unknown }).code
  return [
    `${err.name}: ${err.message}`,
    typeof code === 'string' || typeof code === 'number' ? `code=${code}` : undefined,
    err.stack,
  ]
    .filter(Boolean)
    .join('\n')
}
