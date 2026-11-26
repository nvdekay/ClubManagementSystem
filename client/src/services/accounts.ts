import { apiRequest } from '@/services/apiRequest'
import type { AuthUser } from '@/services/auth'

export type SystemRoleCode = 'ICPDP_OFFICER'

export interface AdminUserClub {
  clubId: string
  clubName: string
  membershipState: string
  positions: string[]
}

export interface AdminUserPage {
  items: Array<{
    user: AuthUser
    systemRoles: string[]
    clubs: AdminUserClub[]
    lockCase?: { violationId: string; title: string; clubName: string }
  }>
  total: number
  page: number
  pageSize: number
}

export type AccountAction =
  | { kind: 'grant' | 'revoke'; userId: string; roleCode: SystemRoleCode; reason: string }
  | { kind: 'lock'; userId: string; reason: string; violationId?: string }
  | { kind: 'unlock'; userId: string; reason: string }

// Sends a CSRF-protected POST/DELETE to an account administration endpoint
async function accountRequest(
  path: string,
  method: 'POST' | 'DELETE',
  csrfToken: string,
  body: object,
): Promise<void> {
  await apiRequest<unknown>(path, { method, csrfToken, body })
}

// GET /admin/users: tìm và phân trang người dùng cho ICPDP quản trị tài khoản
export async function fetchAdminUsers(
  search: string,
  page: number,
  pageSize: number,
  signal: AbortSignal,
): Promise<AdminUserPage> {
  const params = new URLSearchParams({ search, page: String(page), pageSize: String(pageSize) })
  return apiRequest<AdminUserPage>(`/api/v1/admin/users?${params}`, { signal })
}

// Gọi /admin/users/:id để cấp/thu hồi role hệ thống hoặc khoá/mở khoá tài khoản
export async function applyAccountAction(action: AccountAction, csrfToken: string): Promise<void> {
  const base = `/api/v1/admin/users/${encodeURIComponent(action.userId)}`
  if (action.kind === 'grant') {
    await accountRequest(`${base}/roles`, 'POST', csrfToken, {
      roleCode: action.roleCode,
      reason: action.reason,
    })
  } else if (action.kind === 'revoke') {
    await accountRequest(
      `${base}/roles/${encodeURIComponent(action.roleCode)}`,
      'DELETE',
      csrfToken,
      { reason: action.reason },
    )
  } else if (action.kind === 'lock') {
    await accountRequest(`${base}/lock`, 'POST', csrfToken, {
      reason: action.reason,
      ...(action.violationId ? { violationId: action.violationId } : {}),
    })
  } else {
    await accountRequest(`${base}/unlock`, 'POST', csrfToken, { reason: action.reason })
  }
}
