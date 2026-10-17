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
}

/** One headline number: label, value and a short line of context. */
export function AppStatTile({ label, value, hint, icon, tone = "default", href }: AppStatTileProps) {
  const body = (
    <>
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-app">{label}</span>
        <span aria-hidden="true" className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-soft-app text-primary-app",
          { "bg-danger-app/10 text-danger-app": tone === "attention" })}>
          <AppIcon name={icon} className="size-4.5" />
        </span>
      </span>
      <span className="mt-2 block font-heading text-3xl font-semibold text-text-app">{value}</span>
      {hint && <span className={cn("mt-1 block text-xs text-muted-app", { "text-danger-app": tone === "attention" })}>{hint}</span>}
    </>
  );
  const className = "block h-full rounded-2xl border border-border-app bg-bg-app p-5";
  return href ? <Link to={href} className={cn(className, "transition-colors hover:border-primary-app focus-visible:outline-2 focus-visible:outline-ring-app")}>{body}</Link>
    : <div className={className}>{body}</div>;
}
