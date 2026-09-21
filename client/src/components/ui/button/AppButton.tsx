import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function AppButton({ variant = "primary", className, ...props }: AppButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 sm:h-9 items-center justify-center rounded-md border border-transparent px-3 transition-colors focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none disabled:opacity-50",
        {
          "bg-primary-app text-on-primary-app hover:opacity-90": variant === "primary",
          "border border-border-app text-text-app hover:bg-surface-app": variant === "secondary",
        },
        className,
      )}
      {...props}
    />
  );
}
