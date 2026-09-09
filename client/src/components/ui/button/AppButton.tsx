import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function AppButton({ variant = "primary", className, ...props }: AppButtonProps) {
  return (
    <button
      className={cn(
        "rounded px-3 py-1 disabled:opacity-50",
        {
          "bg-primary-app text-white": variant === "primary",
          "border border-border-app text-text-app": variant === "secondary",
        },
        className,
      )}
      {...props}
    />
  );
}
