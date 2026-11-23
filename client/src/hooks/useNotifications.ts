import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead,
  type NotificationScope,
} from "@/services/notifications";

const key = ["notifications"] as const;

// Query key theo workspace của thông báo
function scopeKey(scope: NotificationScope) {
  return [scope.kind, scope.kind === "club" ? scope.clubId : null] as const;
}

// Query số thông báo chưa đọc của workspace
/** Badge chưa đọc của một workspace; poll mỗi phút để thông báo mới hiện ra mà không cần tải lại trang. */
export function useUnreadNotificationCount(userId: string | undefined, scope: NotificationScope) {
  return useQuery({
    queryKey: [...key, "unread", userId, ...scopeKey(scope)],
    queryFn: ({ signal }) => fetchUnreadNotificationCount(scope, signal),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });
}

// Query hộp thư thông báo của workspace, tải thêm theo trang
/** Hộp thư của một workspace, mới nhất trước, tải từng trang một khi panel đang mở. */
export function useNotificationInbox(userId: string | undefined, scope: NotificationScope, open: boolean) {
  return useInfiniteQuery({
    queryKey: [...key, "inbox", userId, ...scopeKey(scope)],
    queryFn: ({ pageParam, signal }) => fetchNotifications(scope, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextBefore,
    enabled: Boolean(userId) && open,
  });
}

// Mutation đánh dấu một thông báo đã đọc
export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; csrfToken: string }) => markNotificationRead(input.id, input.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

// Mutation đánh dấu đã đọc mọi thông báo của workspace
export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { scope: NotificationScope; csrfToken: string }) =>
      markAllNotificationsRead(input.scope, input.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
