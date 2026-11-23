import { type ComponentProps } from "react";

import { cn } from "@/utils/cn";

export function AppInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(
      "h-11 sm:h-9 rounded-lg border border-border-app bg-bg-app px-3 text-sm text-text-app shadow-xs transition-colors placeholder:text-muted-app hover:border-muted-app/40 focus-visible:ring-3 focus-visible:ring-ring-app/20 focus-visible:border-ring-app focus-visible:outline-none aria-[invalid=true]:border-danger-app aria-[invalid=true]:focus-visible:ring-danger-app disabled:bg-surface-app disabled:opacity-70 read-only:bg-surface-app",
      className,
    )} {...props} />;
}
