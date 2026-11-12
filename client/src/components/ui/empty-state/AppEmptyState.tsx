import { type ReactNode } from "react";

import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";

interface AppEmptyStateProps {
  message: string;
  /**
   * "inline" (default): a muted line, for empty cells or inside a card that already frames it.
   * "boxed": a dashed box with an icon, for a whole section or list that has nothing to show.
   */
  variant?: "inline" | "boxed";
  /** Boxed only: a heading above the message (rendered as h2), for page-level empty queues. */
  title?: string;
  /** Boxed only: the icon in the tile; defaults to an inbox. */
  icon?: AppIconName;
  /** Boxed only: a call to action under the message, e.g. a link to browse clubs. */
  action?: ReactNode;
}

export function AppEmptyState({ message, variant = "inline", title, icon = "inbox", action }: AppEmptyStateProps) {
  if (variant === "inline") return <p className="text-sm text-muted-app">{message}</p>;
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-app px-4 py-10 text-center">
      <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-lg border border-border-app text-muted-app">
        <AppIcon name={icon} className="size-4.5" />
      </span>
      {title && <h2 className="mt-1 font-heading text-base font-semibold text-balance">{title}</h2>}
      <p className="max-w-md text-sm text-pretty text-muted-app">{message}</p>
      {action && <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
