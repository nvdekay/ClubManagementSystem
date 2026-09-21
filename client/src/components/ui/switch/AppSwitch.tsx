import { type ButtonHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

interface AppSwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function AppSwitch({ checked, onChange, className, ...props }: AppSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "h-5 w-9 rounded-full bg-border-app p-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none disabled:opacity-50",
        { "bg-primary-app": checked },
        className,
      )}
      {...props}
    >
      <span
        className={cn("block h-4 w-4 rounded-full bg-bg-app shadow transition-transform", {
          "translate-x-4": checked,
        })}
      />
    </button>
  );
}
