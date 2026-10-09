import { type InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function AppInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(
      "h-11 sm:h-10 rounded-xl border border-border-app bg-bg-app px-3.5 text-text-app transition-colors placeholder:text-muted-app focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:border-ring-app focus-visible:outline-none",
      className,
    )} {...props} />;
}
