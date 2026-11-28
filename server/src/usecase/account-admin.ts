import { z } from 'zod'
import {
  SYSTEM_ROLE_CODES,
  type AccountAdminRepository,
  type AdminUserPage,
  type SystemRoleCode,
} from '../domain/account-admin.js'
import { DomainError } from '../domain/errors.js'
import type { SessionService } from '../domain/session.js'
import { isObjectId, parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

const reasonSchema = z.string().trim().min(1).max(1000)
const searchSchema = z.string().trim().max(100)
const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(50),
})

// Kiểm actor là ICPDP officer được quản trị tài khoản
function requireAdmin(repo: AccountAdminRepository, actor: AccessActor | null): Promise<string> {
  const auth = { systemRoleCodes: (id: string) => repo.systemRoles(id) }
  return requireIcpdpOfficer(auth, actor, 'account administration denied')
}

// Kiểm mã role thuộc nhóm role hệ thống được quản lý
function parseRole(roleCode: string): SystemRoleCode {
  if (!SYSTEM_ROLE_CODES.some((code) => code === roleCode)) {
    throw new DomainError('only system roles can be managed here', 'validation')
  }
  return roleCode as SystemRoleCode
}

// Tìm và phân trang người dùng cho trang quản trị tài khoản
export async function searchAdminUsers(
  repo: AccountAdminRepository,
  actor: AccessActor | null,
  rawSearch: unknown,
  rawPage: { page?: unknown; pageSize?: unknown } = {},
): Promise<AdminUserPage> {
  await requireAdmin(repo, actor)
  const parsed = searchSchema.safeParse(rawSearch ?? '')
  const paging = pageSchema.safeParse(rawPage)
  if (!parsed.success || !paging.success) {
    throw new DomainError('invalid search', 'validation')
  }
  return repo.listUsers(parsed.data, paging.data.page, paging.data.pageSize)
}

// Cấp hoặc thu hồi role hệ thống của người dùng và hủy phiên của họ
export async function changeSystemRole(
  repo: AccountAdminRepository,
  sessions: SessionService,
  actor: AccessActor | null,
  targetId: string,
  roleCode: string,
  action: 'grant' | 'revoke',
  rawReason: unknown,
  now: Date,
): Promise<void> {
  const actorId = await requireAdmin(repo, actor)
  const target = parseObjectId(targetId, 'target user')
  const role = parseRole(roleCode)
  const reason = action === 'revoke' ? reasonSchema.safeParse(rawReason) : null
  if (reason && !reason.success) {
    throw new DomainError('reason is required', 'validation')
  }
  if (!(await repo.findUser(target))) {
    throw new DomainError('user not found', 'not_found')
  }
  if (action === 'revoke' && target === actorId && role === 'ICPDP_OFFICER') {
    throw new DomainError('cannot revoke your last admin role', 'forbidden')
  }
  await repo.applyRoleChange({
    actorId,
    targetId: target,
    roleCode: role,
    action,
    reason: reason?.success ? reason.data : undefined,
    now,
  })
  await sessions.revokeUser(target, now)
}

// Khóa hoặc mở khóa tài khoản (có thể gắn vụ vi phạm) và hủy phiên
export async function setAccountLock(
  repo: AccountAdminRepository,
  sessions: SessionService,
  actor: AccessActor | null,
  targetId: string,
  locked: boolean,
  rawReason: unknown,
  now: Date,
  violationId?: string,
): Promise<void> {
  const actorId = await requireAdmin(repo, actor)
  const target = parseObjectId(targetId, 'target user')
  const reason = reasonSchema.safeParse(rawReason)
  if (!reason.success) {
    throw new DomainError('reason is required', 'validation')
  }
  if (!(await repo.findUser(target))) {
    throw new DomainError('user not found', 'not_found')
  }
  if (locked && target === actorId) {
    throw new DomainError('cannot lock your own account', 'forbidden')
  }
  if (violationId !== undefined && (!locked || !isObjectId(violationId))) {
    throw new DomainError('a violation case can only be linked to a lock', 'validation')
  }
  await repo.setLock({
    actorId,
    targetId: target,
    locked,
    reason: reason.data,
    now,
    ...(violationId ? { violationId } : {}),
  })
  await sessions.revokeUser(target, now)
}
