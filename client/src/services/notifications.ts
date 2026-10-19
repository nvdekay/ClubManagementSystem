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

export interface NotificationPage {
  items: AppNotification[];
  unread: number;
  nextBefore?: string;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1/notifications${path}`, { credentials: "same-origin", ...init });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  return (await response.json() as { data: T }).data;
}

export function fetchNotifications(before: string | undefined, signal: AbortSignal): Promise<NotificationPage> {
  const params = new URLSearchParams({ limit: "15", ...(before ? { before } : {}) });
  return request(`/mine?${params.toString()}`, { signal });
}

export function fetchUnreadNotificationCount(signal: AbortSignal): Promise<{ unread: number }> {
  return request("/mine/unread-count", { signal });
}

export function markNotificationRead(id: string, csrfToken: string): Promise<{ unread: number }> {
  return request(`/${encodeURIComponent(id)}/read`, { method: "POST", headers: { "X-CSRF-Token": csrfToken } });
}

export function markAllNotificationsRead(csrfToken: string): Promise<{ marked: number; unread: number }> {
  return request("/mine/read-all", { method: "POST", headers: { "X-CSRF-Token": csrfToken } });
}
