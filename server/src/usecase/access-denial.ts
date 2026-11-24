import {
  accessDenialTarget,
  isObjectId,
  type AccessDenialAuditRepository,
} from '../domain/access-denial.js'
import { CLUB_PERMISSIONS, type ClubPermission } from '../domain/access.js'

export interface AccessDenialInput {
  actorId: string
  method: string
  route: string
  params: Readonly<Record<string, string>>
  reason: string
  details?: unknown
  correlationId: string
  at: Date
}

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])

// Lấy permission CLB bị thiếu từ chi tiết lỗi bị từ chối
function requiredPermission(details: unknown): ClubPermission | undefined {
  if (typeof details !== 'object' || details === null) {
    return undefined
  }
  const value = (details as { requiredPermission?: unknown }).requiredPermission
  return CLUB_PERMISSIONS.find((code) => code === value)
}

// Ghi audit một lần truy cập bị từ chối của người dùng đã đăng nhập
/** Ghi một lần truy cập bị từ chối; bỏ qua mọi thứ không phải request đã xác thực đúng dạng. */
export async function recordAccessDenial(
  repo: AccessDenialAuditRepository,
  input: AccessDenialInput,
): Promise<boolean> {
  const method = input.method.toUpperCase()
  if (!isObjectId(input.actorId) || !METHODS.has(method) || !input.route.startsWith('/')) {
    return false
  }
  const target = accessDenialTarget(input.route, input.params, input.actorId)
  const permission = requiredPermission(input.details)
  await repo.record({
    actorId: input.actorId,
    method,
    route: input.route.slice(0, 200),
    ...target,
    ...(permission ? { requiredPermission: permission } : {}),
    reason: input.reason.slice(0, 500),
    correlationId: input.correlationId,
    at: input.at,
  })
  return true
}
