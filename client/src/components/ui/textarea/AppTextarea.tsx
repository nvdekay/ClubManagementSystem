import { type TextareaHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

export function AppTextarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(
    "min-h-24 rounded-md border border-border-app bg-bg-app px-3 py-2 transition-colors focus-visible:ring-1 focus-visible:ring-ring-app focus-visible:border-ring-app focus-visible:outline-none",
    className,
  )} {...props} />;
}
