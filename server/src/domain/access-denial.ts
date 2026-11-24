/**
 * SEC-08 / AC17: người gọi đã xác thực mà bị từ chối thao tác sẽ để lại một dòng audit chỉ-thêm
 * (append-only). Chỉ lưu dữ liệu route đã chuẩn hoá — không bao giờ lưu body, cookie, header hay token.
 */
export interface AccessDenial {
  actorId: string
  method: string
  /** Mẫu route như `/api/v1/admin/bookings/:id/decision`, không bao giờ là URL thô. */
  route: string
  entityType: string
  entityId: string
  clubId?: string
  requiredPermission?: string
  reason: string
  correlationId: string
  at: Date
}

export interface AccessDenialAuditRepository {
  record(denial: AccessDenial): Promise<void>
}

const OBJECT_ID = /^[0-9a-f]{24}$/i

// Kiểm tra chuỗi có đúng định dạng ObjectId hay không
export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID.test(value)
}

// Xác định thực thể bị truy cập trái phép từ route và tham số để ghi log từ chối
/**
 * Thực thể mà người gọi cố truy cập: tham số ObjectId cuối cùng trên mẫu route, xác định loại bởi
 * đoạn cố định ngay trước nó (`/admin/bookings/:id` → `BOOKINGS`). Nếu không có tham số như vậy
 * thì lần truy cập được ghi nhận cho chính người gọi.
 */
export function accessDenialTarget(
  route: string,
  params: Readonly<Record<string, string>>,
  actorId: string,
): { entityType: string; entityId: string; clubId?: string } {
  const segments = route.split('/').filter(Boolean)
  const clubId = isObjectId(params.clubId) ? params.clubId : undefined
  for (let index = segments.length - 1; index > 0; index -= 1) {
    const segment = segments[index]!
    if (!segment.startsWith(':')) {
      continue
    }
    const value = params[segment.slice(1)]
    const label = segments[index - 1]!
    if (!isObjectId(value) || label.startsWith(':')) {
      continue
    }
    return {
      entityType: label.toUpperCase().replaceAll('-', '_'),
      entityId: value,
      ...(clubId ? { clubId } : {}),
    }
  }
  return { entityType: 'USER', entityId: actorId, ...(clubId ? { clubId } : {}) }
}
