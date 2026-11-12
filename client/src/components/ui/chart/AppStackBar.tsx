import { chartToneFill, type ChartTone } from "./chartScale";
import { cn } from "@/utils/cn";

interface AppStackBarProps {
  segments: { key: string; label: string; value: number; tone: ChartTone }[];
  formatValue?: (value: number) => string;
}

/** One thin part-to-whole bar for a stat tile, with a text legend so no part rests on color alone. */
export function AppStackBar({ segments, formatValue = String }: AppStackBarProps) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  return (
    <div>
      <div aria-hidden="true" className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-strong-app">
        {total > 0 && segments.filter((item) => item.value > 0).map((item) => (
          <span key={item.key} className={cn("h-full first:rounded-l-full last:rounded-r-full", chartToneFill[item.tone])}
            style={{ width: `${(item.value / total) * 100}%` }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-app">
        {segments.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={cn("size-2 rounded-sm", chartToneFill[item.tone])} />
            {item.label} <span className="font-medium text-text-app tabular-nums">{formatValue(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
