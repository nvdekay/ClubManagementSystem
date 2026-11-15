import { ApiError, apiFetch } from "@/services/apiError";
export interface AppNotification {
  id: string;
  eventCode: string;
  entityType?: string;
  entityId?: string;
  clubId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

/** Workspace whose notifications to show; a club workspace sees only its own club's. */
export type NotificationScope = { kind: "student" } | { kind: "icpdp" } | { kind: "club"; clubId: string };

export interface NotificationPage {
  items: AppNotification[];
  unread: number;
  nextBefore?: string;
}

// Gọi API /notifications và trả về data, ném ApiError nếu lỗi
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`/api/v1/notifications${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new ApiError(body?.message ?? `HTTP ${response.status}`);
  }
  return (await response.json() as { data: T }).data;
}

// Đổi workspace thông báo thành tham số query
function scopeParams(scope: NotificationScope): Record<string, string> {
  return { scope: scope.kind, ...(scope.kind === "club" ? { clubId: scope.clubId } : {}) };
}

// GET /notifications/mine: hộp thư theo workspace, phân trang bằng before
export function fetchNotifications(scope: NotificationScope, before: string | undefined,
  signal: AbortSignal): Promise<NotificationPage> {
  const params = new URLSearchParams({ limit: "15", ...scopeParams(scope), ...(before ? { before } : {}) });
  return request(`/mine?${params.toString()}`, { signal });
}

// GET số thông báo chưa đọc của workspace
export function fetchUnreadNotificationCount(scope: NotificationScope, signal: AbortSignal): Promise<{ unread: number }> {
  return request(`/mine/unread-count?${new URLSearchParams(scopeParams(scope)).toString()}`, { signal });
}

// POST đánh dấu một thông báo đã đọc
export function markNotificationRead(id: string, csrfToken: string): Promise<{ unread: number }> {
  return request(`/${encodeURIComponent(id)}/read`, { method: "POST", headers: { "X-CSRF-Token": csrfToken } });
}

// POST /read-all: đánh dấu đã đọc mọi thông báo của workspace
/** Marks read only the notifications of this workspace. */
export function markAllNotificationsRead(scope: NotificationScope, csrfToken: string): Promise<{ marked: number; unread: number }> {
  return request(`/mine/read-all?${new URLSearchParams(scopeParams(scope)).toString()}`,
    { method: "POST", headers: { "X-CSRF-Token": csrfToken } });
}
