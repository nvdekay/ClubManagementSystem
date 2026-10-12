import { type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface AppNoticeProps {
  tone?: "info" | "success" | "warning" | "danger" | "neutral";
  title?: string;
  /** "alert" for errors the user must notice now, "status" for polite updates. */
  role?: "alert" | "status";
  className?: string;
  children?: ReactNode;
}

/** Flat inline message (error, empty state, hint) with a coloured left rule instead of a card. */
export function AppNotice({ tone = "neutral", title, role, className, children }: AppNoticeProps) {
  return (
    <div role={role} className={cn("rounded-xl border-l-4 px-4 py-3 text-sm", {
      "border-border-app bg-surface-app text-text-app": tone === "neutral",
      "border-primary-app bg-primary-soft-app text-text-app": tone === "info",
      "border-success-app bg-mint-soft-app text-text-app": tone === "success",
      "border-warning-app bg-warning-app/10 text-text-app": tone === "warning",
      "border-danger-app bg-danger-app/10 text-text-app": tone === "danger",
    }, className)}>
      {title && <p className={cn("font-semibold", {
        "text-danger-app": tone === "danger",
        "text-warning-app": tone === "warning",
        "text-success-app": tone === "success",
        "text-primary-app": tone === "info",
      })}>{title}</p>}
      {children && <div className={cn("space-y-2", { "mt-1": Boolean(title) })}>{children}</div>}
    </div>
  );
}
