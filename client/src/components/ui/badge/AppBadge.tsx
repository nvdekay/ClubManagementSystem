import { type ReactNode } from "react";
import { cn } from "@/utils/cn";

export type AppBadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

interface AppBadgeProps {
  tone?: AppBadgeTone;
  className?: string;
  children: ReactNode;
}

/** Small status pill; the text carries the meaning, tone only reinforces it. */
export function AppBadge({ tone = "neutral", className, children }: AppBadgeProps) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap", {
      "bg-surface-strong-app text-muted-app": tone === "neutral",
      "bg-primary-soft-app text-primary-app": tone === "info",
      "bg-mint-soft-app text-success-app": tone === "success",
      "bg-warning-app/12 text-warning-app": tone === "warning",
      "bg-danger-app/10 text-danger-app": tone === "danger",
    }, className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
