import { AppSelect } from "@/components/ui/select/AppSelect";
import { cn } from "@/utils/cn";

interface AppTableLimitSelectProps {
  value: number;
  onChange: (limit: number) => void;
  /** Localized label rendered before the control. */
  label: string;
  /** Custom option list — defaults match the API's limit cap (max 100). */
  options?: number[];
  className?: string;
}

const DEFAULT_OPTIONS = [5, 10, 20, 50, 100];

export function AppTableLimitSelect({
  value,
  onChange,
  label,
  options = DEFAULT_OPTIONS,
  className,
}: AppTableLimitSelectProps) {
  return (
    <span className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-app", className)}>
      {label}
      <AppSelect
        value={value}
        // min-w keeps the trigger from resizing between "5" and "100".
        className="min-w-20"
        options={options.map((n) => ({ value: n, label: String(n) }))}
        onChange={onChange}
        label={label}
      />
    </span>
  );
}
