import type { ReactNode } from "react";
import { Link } from "react-router";

import { AppIcon, type AppIconName } from "@/components/ui/icon/AppIcon";
import { cn } from "@/utils/cn";

interface AppStatTileProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: AppIconName;
  /** `attention` pairs the danger color with the icon so state never rests on color alone. */
  tone?: "default" | "attention";
  href?: string;
  /** Change against the previous period, shown as a small pill beside the value. */
  delta?: { text: string; direction: "up" | "down" | "flat" };
  /** A small visual under the number: a sparkline or a part-to-whole bar. */
  chart?: ReactNode;
}

/** One headline number: label, value and a short line of context. */
export function AppStatTile({ label, value, hint, icon, tone = "default", href, delta, chart }: AppStatTileProps) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-app">{label}</span>
        <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border border-border-app text-muted-app",
          { "border-transparent bg-danger-app/10 text-danger-app": tone === "attention" })}>
          <AppIcon name={icon} className="size-4.5" />
        </span>
      </span>
      <span className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-heading text-3xl font-semibold text-text-app tabular-nums">{value}</span>
        {delta && <span className={cn("rounded-md bg-surface-strong-app px-1.5 py-0.5 text-xs font-medium text-muted-app", {
          "bg-mint-soft-app text-success-app": delta.direction === "up",
          "bg-danger-app/10 text-danger-app": delta.direction === "down",
        })}>{delta.direction === "up" ? "↑ " : delta.direction === "down" ? "↓ " : ""}{delta.text}</span>}
      </span>
      {hint && <span className={cn("mt-1 block text-xs text-muted-app", { "text-danger-app": tone === "attention" })}>{hint}</span>}
      {chart && <span className="mt-auto block pt-3">{chart}</span>}
    </>
  );
  const className = "flex h-full flex-col rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs";
  return href ? <Link to={href} className={cn(className, "transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app")}>{body}</Link>
    : <div className={className}>{body}</div>;
}
