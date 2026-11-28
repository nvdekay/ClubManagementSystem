import { Router } from 'express'
import { z } from 'zod'
import type { AccountAdminRepository } from '../../domain/account-admin.js'
import { changeSystemRole, searchAdminUsers, setAccountLock } from '../../usecase/account-admin.js'
import { guards, type SessionDeps } from './auth-routes.js'
import { ok } from './response.js'
import { actor, parse, objectId } from './request.js'

export interface AccountAdminRouteDeps extends SessionDeps {
  adminRepo: AccountAdminRepository
}

const roleBody = z.object({ roleCode: z.string(), reason: z.string().optional() }).strict()
const reasonBody = z.object({ reason: z.string() }).strict()
export const lockBody = z
  .object({
    reason: z.string(),
    violationId: objectId.optional(),
  })
  .strict()

// Ép tham số route thành chuỗi hợp lệ
function param(value: unknown): string {
  return parse(z.string(), value, 'route parameter')
}

// Mount các route quản trị tài khoản người dùng của ICPDP
export function accountAdminRoutes(deps: AccountAdminRouteDeps): Router {
  const router = Router()
  const { read, write } = guards(deps)

  // Tìm kiếm và phân trang danh sách tài khoản người dùng
  router.get('/admin/users', read, async (req, res) => {
    ok(
      res,
      await searchAdminUsers(deps.adminRepo, actor(res), req.query.search, {
        page: req.query.page,
        pageSize: req.query.pageSize,
      }),
    )
  })

  // Cấp system role cho tài khoản kèm lý do
  router.post('/admin/users/:id/roles', write, async (req, res) => {
    const body = parse(roleBody, req.body, 'request body')
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
  router.delete('/admin/users/:id/roles/:roleCode', write, async (req, res) => {
    const body = parse(reasonBody, req.body, 'request body')
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
  router.post('/admin/users/:id/lock', write, async (req, res) => {
    const body = parse(lockBody, req.body, 'request body')
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
  router.post('/admin/users/:id/unlock', write, async (req, res) => {
    const body = parse(reasonBody, req.body, 'request body')
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
