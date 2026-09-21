import { type InputHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function AppInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(
      "h-11 sm:h-9 rounded-md border border-border-app bg-bg-app px-3 transition-colors focus-visible:ring-1 focus-visible:ring-ring-app focus-visible:border-ring-app focus-visible:outline-none",
      className,
    )} {...props} />;
}
