import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotifications, fetchUnreadNotificationCount, markAllNotificationsRead, markNotificationRead,
} from "@/services/notifications";

const key = ["notifications"] as const;

/** Unread badge; polls every minute so new notifications show up without a reload. */
export function useUnreadNotificationCount(userId: string | undefined) {
  return useQuery({
    queryKey: [...key, "unread", userId],
    queryFn: ({ signal }) => fetchUnreadNotificationCount(signal),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });
}

/** Newest-first inbox, loaded one page at a time while the panel is open. */
export function useNotificationInbox(userId: string | undefined, open: boolean) {
  return useInfiniteQuery({
    queryKey: [...key, "inbox", userId],
    queryFn: ({ pageParam, signal }) => fetchNotifications(pageParam, signal),
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
    mutationFn: (csrfToken: string) => markAllNotificationsRead(csrfToken),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
}
