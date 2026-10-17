import { percent } from "./chartScale";

interface AppMeterProps {
  label: string;
  value: number;
  max: number;
  valueText: string;
}

/** A single ratio against a limit: the fill on a lighter track of the same hue. */
export function AppMeter({ label, value, max, valueText }: AppMeterProps) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
        <span className="text-muted-app">{label}</span>
        <span className="font-semibold text-text-app">{valueText}</span>
      </div>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={max || 1} aria-valuenow={value} aria-valuetext={valueText}
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-primary-soft-app">
        <div className="h-full rounded-full bg-chart-1-app" style={{ width: percent(value, max || 1) }} />
      </div>
    </div>
  );
}
