import { ApiError } from '@/services/apiError'
import { apiRequest } from '@/services/apiRequest'
export interface AuthUser {
  id: string
  email: string
  displayName: string
  avatarUrl?: string
  accountState: 'Active' | 'Locked'
  lockReason?: string
}

export interface Workspace {
  kind: 'student' | 'icpdp' | 'club'
  clubId?: string
  clubName?: string
  role?: 'leader' | 'member' | 'founder'
  permissions: string[]
}

export interface Me {
  user: AuthUser
  csrfToken: string
  systemRoles: string[]
  workspaces: Workspace[]
}

// GET /auth/me: lấy phiên đăng nhập, workspace và quyền; null nếu chưa đăng nhập
export async function fetchMe(signal: AbortSignal): Promise<Me | null> {
  try {
    return await apiRequest<Me>('/api/v1/auth/me', { signal })
  } catch (error) {
    // Các route Auth cố ý không có cho đến khi cấu hình xong thông tin OAuth.
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      return null
    }
    throw error
  }
}

// POST /auth/logout: đăng xuất và huỷ phiên
export async function logout(csrfToken: string): Promise<void> {
  await apiRequest<unknown>('/api/v1/auth/logout', { method: 'POST', csrfToken })
}

// Dựng URL bắt đầu đăng nhập Google OAuth kèm returnTo
export function googleLoginUrl(returnTo: string): string {
  const params = new URLSearchParams({ returnTo })
  return `/api/v1/auth/login?${params.toString()}`
}

// GET /auth/error: lấy lý do đăng nhập thất bại gần nhất
export async function fetchLoginError(signal: AbortSignal): Promise<string | null> {
  try {
    const data = await apiRequest<{ reason: string | null }>('/api/v1/auth/error', { signal })
    return data.reason
  } catch (error) {
    if (error instanceof ApiError && error.status !== undefined) {
      return null
    }
    throw error
  }
}
