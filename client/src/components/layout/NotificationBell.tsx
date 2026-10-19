import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { AppSkeleton } from "@/components/ui/skeleton/AppSkeleton";
import {
  useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationInbox, useUnreadNotificationCount,
} from "@/hooks/useNotifications";
import type { AppNotification } from "@/services/notifications";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/formatDate";
import { notificationFamily, notificationLink, notificationSubject } from "@/utils/notificationLink";

/** Bell with the unread count; opens the user's in-app inbox (NTF-04), the same in every workspace. */
export function NotificationBell({ userId, csrfToken }: { userId: string; csrfToken: string }) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const count = useUnreadNotificationCount(userId);
  const inbox = useNotificationInbox(userId, open);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = count.data?.unread ?? 0;
  const codes = t("notifications.codes", { returnObjects: true }) as Record<string, string>;
  const families = t("notifications.families", { returnObjects: true }) as Record<string, string>;
  const items = inbox.data?.pages.flatMap((page) => page.items) ?? [];

  function title(item: AppNotification): string {
    return codes[item.eventCode] ?? families[notificationFamily(item.eventCode)] ?? families.OTHER ?? item.eventCode;
  }

  function openItem(item: AppNotification) {
    if (!item.readAt) markRead.mutate({ id: item.id, csrfToken });
    const link = notificationLink(item);
    if (!link) return;
    setOpen(false);
    void navigate(link);
  }

  return <>
    <button type="button" onClick={() => setOpen(true)}
      aria-label={unread ? t("notifications.openUnread", { count: unread }) : t("notifications.open")}
      title={t("notifications.open")}
      className="relative flex size-10 items-center justify-center rounded-full text-muted-app transition-colors hover:bg-surface-strong-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
      <AppIcon name="bell" />
      {unread > 0 && <span aria-hidden="true"
        className="absolute top-1 right-1 flex min-w-4.5 items-center justify-center rounded-full bg-danger-app px-1 text-[0.65rem] leading-4.5 font-bold text-on-primary-app">
        {unread > 99 ? "99+" : unread}
      </span>}
    </button>
    <AppDialog open={open} title={t("notifications.title")} onClose={() => setOpen(false)} closeLabel={t("notifications.close")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-app">{unread ? t("notifications.openUnread", { count: unread }) : t("notifications.title")}</p>
        <AppButton variant="secondary" disabled={!unread || markAll.isPending}
          onClick={() => markAll.mutate(csrfToken)}>
          <AppIcon name="check" className="size-4" />{t("notifications.markAll")}
        </AppButton>
      </div>
      {inbox.isPending ? <div className="mt-4 space-y-3">{[0, 1, 2].map((row) => <AppSkeleton key={row} className="h-16 w-full" />)}</div>
        : inbox.isError ? <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 text-sm text-danger-app">
          {t("notifications.error")}
          <AppButton variant="secondary" onClick={() => void inbox.refetch()}>{t("notifications.retry")}</AppButton>
        </div>
        : items.length === 0 ? <p className="mt-6 mb-2 text-center text-sm text-muted-app">{t("notifications.empty")}</p>
        : <ul className="mt-4 divide-y divide-border-app rounded-xl border border-border-app">
          {items.map((item) => {
            const subject = notificationSubject(item);
            const reason = typeof item.payload.reason === "string" && item.payload.reason.trim() ? item.payload.reason : undefined;
            return <li key={item.id}>
              <button type="button" onClick={() => openItem(item)}
                className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app",
                  { "bg-primary-soft-app/40": !item.readAt })}>
                <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.readAt ? "bg-transparent" : "bg-primary-app")} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm break-words", item.readAt ? "text-text-app" : "font-semibold text-text-app")}>
                    {title(item)}{!item.readAt && <span className="sr-only"> · {t("notifications.unread")}</span>}
                  </span>
                  {subject && <span className="block text-sm break-words text-muted-app">{subject}</span>}
                  {reason && <span className="line-clamp-2 block text-xs break-words text-muted-app">{t("notifications.reason", { reason })}</span>}
                  <span className="mt-1 block text-xs text-muted-app">{formatDate(item.createdAt, i18n.language)}</span>
                </span>
                {notificationLink(item) && <AppIcon name="chevronRight" className="mt-1 size-4 text-muted-app" />}
              </button>
            </li>;
          })}
        </ul>}
      {inbox.hasNextPage && <div className="mt-3 flex justify-center">
        <AppButton variant="secondary" disabled={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()}>
          {t("notifications.loadMore")}
        </AppButton>
      </div>}
    </AppDialog>
  </>;
}
