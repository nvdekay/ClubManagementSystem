import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function AppButton({ variant = "primary", className, ...props }: AppButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 sm:min-h-9 items-center justify-center gap-2 rounded-lg border border-transparent px-3.5 font-heading text-sm font-medium transition-[color,background-color,border-color,opacity,scale] duration-200 active:scale-[0.98] disabled:active:scale-100 focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none disabled:opacity-50",
        {
          "bg-primary-app text-on-primary-app shadow-xs hover:opacity-90": variant === "primary",
          "border border-border-app bg-bg-app text-text-app shadow-xs hover:bg-surface-app": variant === "secondary",
          "text-text-app hover:bg-surface-app": variant === "ghost",
        },
        className,
      )}
      {...props}
    />
  );
}
