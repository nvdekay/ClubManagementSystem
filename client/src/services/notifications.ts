import { apiRequest, type ApiRequestOptions } from '@/services/apiRequest'
export interface AppNotification {
  id: string
  eventCode: string
  entityType?: string
  entityId?: string
  clubId?: string
  payload: Record<string, unknown>
  createdAt: string
  readAt?: string
}

/** Workspace cần hiện thông báo; workspace CLB chỉ thấy thông báo của chính CLB đó. */
export type NotificationScope =
  { kind: 'student' } | { kind: 'icpdp' } | { kind: 'club'; clubId: string }

export interface NotificationPage {
  items: AppNotification[]
  unread: number
  nextBefore?: string
}

// Calls the API through the shared helper
function request<T>(path: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(`/api/v1/notifications${path}`, options)
}

// Đổi workspace thông báo thành tham số query
function scopeParams(scope: NotificationScope): Record<string, string> {
  return { scope: scope.kind, ...(scope.kind === 'club' ? { clubId: scope.clubId } : {}) }
}

// GET /notifications/mine: hộp thư theo workspace, phân trang bằng before
export function fetchNotifications(
  scope: NotificationScope,
  before: string | undefined,
  signal: AbortSignal,
): Promise<NotificationPage> {
  const params = new URLSearchParams({
    limit: '15',
    ...scopeParams(scope),
    ...(before ? { before } : {}),
  })
  return request(`/mine?${params.toString()}`, { signal })
}

// GET số thông báo chưa đọc của workspace
export function fetchUnreadNotificationCount(
  scope: NotificationScope,
  signal: AbortSignal,
): Promise<{ unread: number }> {
  return request(`/mine/unread-count?${new URLSearchParams(scopeParams(scope)).toString()}`, {
    signal,
  })
}

// POST đánh dấu một thông báo đã đọc
export function markNotificationRead(id: string, csrfToken: string): Promise<{ unread: number }> {
  return request(`/${encodeURIComponent(id)}/read`, {
    method: 'POST',
    csrfToken,
  })
}

// POST /read-all: đánh dấu đã đọc mọi thông báo của workspace
/** Chỉ đánh dấu đã đọc các thông báo của workspace này. */
export function markAllNotificationsRead(
  scope: NotificationScope,
  csrfToken: string,
): Promise<{ marked: number; unread: number }> {
  return request(`/mine/read-all?${new URLSearchParams(scopeParams(scope)).toString()}`, {
    method: 'POST',
    csrfToken,
  })
}
