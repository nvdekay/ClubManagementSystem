import { type SelectHTMLAttributes } from "react";

import { cn } from "@/utils/cn";

interface AppTableLimitSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> {
  value: number;
  onChange: (limit: number) => void;
  /** Localized label rendered before the select. */
  label: string;
  /** Custom option list — defaults match the API's limit cap (max 100). */
  options?: number[];
}

const DEFAULT_OPTIONS = [5, 10, 20, 50, 100];

export function AppTableLimitSelect({
  value,
  onChange,
  label,
  options = DEFAULT_OPTIONS,
  className,
  ...props
}: AppTableLimitSelectProps) {
  return (
    <label className={cn("flex items-center gap-2 text-sm text-muted-app", className)}>
      {label}
      {/* appearance-none hides the UA arrow so the ▾ span can replace it — keep them in sync. */}
      <span className="relative">
        <select
          className="appearance-none rounded-md border border-border-app bg-surface-app py-1 pl-2.5 pr-7 text-sm text-text-app transition-colors hover:border-muted-app focus:border-primary-app focus:outline-none"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          {...props}
        >
          {options.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs"
        >
          ▾
        </span>
      </span>
    </label>
  );
}
