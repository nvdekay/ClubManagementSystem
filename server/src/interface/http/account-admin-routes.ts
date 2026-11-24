import { Router, type Response } from 'express'
import { z } from 'zod'
import type { AccountAdminRepository } from '../../domain/account-admin.js'
import { DomainError } from '../../domain/errors.js'
import type { SessionService } from '../../domain/session.js'
import type { AuthRepository } from '../../domain/auth.js'
import { changeSystemRole, searchAdminUsers, setAccountLock } from '../../usecase/account-admin.js'
import type { AccessActor } from '../../usecase/access.js'
import { authGuard } from './auth-routes.js'
import { ok } from './response.js'

export interface AccountAdminRouteDeps {
  adminRepo: AccountAdminRepository
  authRepo: AuthRepository
  sessions: SessionService
}

const roleBody = z.object({ roleCode: z.string(), reason: z.string().optional() }).strict()
const reasonBody = z.object({ reason: z.string() }).strict()
export const lockBody = z
  .object({
    reason: z.string(),
    violationId: z
      .string()
      .regex(/^[0-9a-f]{24}$/i)
      .optional(),
  })
  .strict()

// Lấy actor đã xác thực từ res.locals, thiếu thì báo unauthorized
function actor(res: Response): AccessActor {
  const value = res.locals.actor as AccessActor | undefined
  if (!value) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  return value
}

// Kiểm tra dữ liệu vào bằng zod, sai thì ném DomainError validation
function parsed<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new DomainError('invalid request body', 'validation', result.error.issues)
  }
  return result.data
}

// Ép tham số route thành chuỗi hợp lệ
function param(value: unknown): string {
  return parsed(z.string(), value)
}

// Mount các route quản trị tài khoản người dùng của ICPDP
export function accountAdminRoutes(deps: AccountAdminRouteDeps): Router {
  const router = Router()
  const guardDeps = { repo: deps.authRepo, sessions: deps.sessions }

  // Tìm kiếm và phân trang danh sách tài khoản người dùng
  router.get('/admin/users', authGuard(guardDeps, false), async (req, res) => {
    ok(
      res,
      await searchAdminUsers(deps.adminRepo, actor(res), req.query.search, {
        page: req.query.page,
        pageSize: req.query.pageSize,
      }),
    )
  })

  // Cấp system role cho tài khoản kèm lý do
  router.post('/admin/users/:id/roles', authGuard(guardDeps), async (req, res) => {
    const body = parsed(roleBody, req.body)
    await changeSystemRole(
      deps.adminRepo,
      deps.sessions,
      actor(res),
      param(req.params.id),
      body.roleCode,
      'grant',
      body.reason,
      new Date(),
    )
    ok(res, { changed: true })
  })

  // Thu hồi system role của tài khoản kèm lý do
  router.delete('/admin/users/:id/roles/:roleCode', authGuard(guardDeps), async (req, res) => {
    const body = parsed(reasonBody, req.body)
    await changeSystemRole(
      deps.adminRepo,
      deps.sessions,
      actor(res),
      param(req.params.id),
      param(req.params.roleCode),
      'revoke',
      body.reason,
      new Date(),
    )
    ok(res, { changed: true })
  })

  // Khoá tài khoản (có thể gắn violationId) và thu hồi phiên
  router.post('/admin/users/:id/lock', authGuard(guardDeps), async (req, res) => {
    const body = parsed(lockBody, req.body)
    await setAccountLock(
      deps.adminRepo,
      deps.sessions,
      actor(res),
      param(req.params.id),
      true,
      body.reason,
      new Date(),
      body.violationId,
    )
    ok(res, { changed: true })
  })

  // Mở khoá tài khoản kèm lý do
  router.post('/admin/users/:id/unlock', authGuard(guardDeps), async (req, res) => {
    const body = parsed(reasonBody, req.body)
    await setAccountLock(
      deps.adminRepo,
      deps.sessions,
      actor(res),
      param(req.params.id),
      false,
      body.reason,
      new Date(),
    )
    ok(res, { changed: true })
  })

  return router
}
