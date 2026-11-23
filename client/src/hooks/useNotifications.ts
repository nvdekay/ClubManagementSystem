import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead,
  type NotificationScope,
} from "@/services/notifications";

const key = ["notifications"] as const;

function scopeKey(scope: NotificationScope) {
  return [scope.kind, scope.kind === "club" ? scope.clubId : null] as const;
}

/** Unread badge of one workspace; polls every minute so new notifications show up without a reload. */
export function useUnreadNotificationCount(userId: string | undefined, scope: NotificationScope) {
  return useQuery({
    queryKey: [...key, "unread", userId, ...scopeKey(scope)],
    queryFn: ({ signal }) => fetchUnreadNotificationCount(scope, signal),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });
}

/** Newest-first inbox of one workspace, loaded one page at a time while the panel is open. */
export function useNotificationInbox(userId: string | undefined, scope: NotificationScope, open: boolean) {
  return useInfiniteQuery({
    queryKey: [...key, "inbox", userId, ...scopeKey(scope)],
    queryFn: ({ pageParam, signal }) => fetchNotifications(scope, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextBefore,
    enabled: Boolean(userId) && open,
  });
}

export function useMarkNotificationRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; csrfToken: string }) => markNotificationRead(input.id, input.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}

export function useMarkAllNotificationsRead() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { scope: NotificationScope; csrfToken: string }) =>
      markAllNotificationsRead(input.scope, input.csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
