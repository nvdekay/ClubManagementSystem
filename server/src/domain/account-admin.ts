import type { AuthUser } from './auth.js'

export const SYSTEM_ROLE_CODES = ['ICPDP_OFFICER'] as const
export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number]

/** UC03 bước 2: một CLB mà người dùng tham gia, kèm các ghế ban điều hành họ đang giữ ở CLB đó. */
export interface AdminUserClub {
  clubId: string
  clubName: string
  membershipState: string
  positions: string[]
}

/** UC03 A1: hồ sơ UC40 mà việc khoá khẩn cấp được ghi nhận kèm theo. */
export interface AdminLockCase {
  violationId: string
  title: string
  clubName: string
}

export interface AdminUserPage {
  items: Array<{
    user: AuthUser
    systemRoles: string[]
    clubs: AdminUserClub[]
    lockCase?: AdminLockCase
  }>
  total: number
  page: number
  pageSize: number
}

export interface AccountAdminRepository {
  /** Một trang người dùng khớp tìm kiếm, sắp xếp theo email; `page` bắt đầu từ 1. */
  listUsers(search: string, page: number, pageSize: number): Promise<AdminUserPage>
  findUser(userId: string): Promise<AuthUser | null>
  systemRoles(userId: string): Promise<string[]>
  applyRoleChange(input: {
    actorId: string
    targetId: string
    roleCode: SystemRoleCode
    action: 'grant' | 'revoke'
    reason?: string
    now: Date
  }): Promise<void>
  setLock(input: {
    actorId: string
    targetId: string
    locked: boolean
    reason: string
    /** UC03 A1: hồ sơ UC40 đang mở yêu cầu khoá; khoá và hồ sơ liên kết hai chiều với nhau. */
    violationId?: string
    now: Date
  }): Promise<void>
}
