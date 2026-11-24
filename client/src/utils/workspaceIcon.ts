import type { AppIconName } from '@/components/ui/icon/AppIcon'
import type { Workspace } from '@/services/auth'

// Chọn icon cho workspace theo loại và vai trò
/**
 * Mỗi workspace một icon, dùng chung cho bộ chọn workspace và sidebar: ban chủ nhiệm CLB (leader, founder)
 * dùng cặp tài liệu, thành viên CLB thường dùng thẻ ID, để hai thẻ CLB không bao giờ giống hệt nhau.
 */
export function workspaceIcon(kind: Workspace['kind'], role?: Workspace['role']): AppIconName {
  if (kind === 'student') {
    return 'graduationCap'
  }
  if (kind === 'icpdp') {
    return 'shield'
  }
  return role && role !== 'leader' && role !== 'founder' ? 'idCard' : 'briefcase'
}
