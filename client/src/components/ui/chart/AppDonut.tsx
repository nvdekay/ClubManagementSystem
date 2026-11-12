import { chartToneFill, chartToneStroke, type ChartTone } from "./chartScale";
import { cn } from "@/utils/cn";

export interface AppDonutSegment {
  key: string;
  label: string;
  value: number;
  tone: ChartTone;
}

interface AppDonutProps {
  segments: AppDonutSegment[];
  /** Headline inside the ring, e.g. "82%". */
  centerValue: string;
  centerLabel: string;
  formatValue?: (value: number) => string;
  /** Accessible summary of the whole ring; the legend below repeats every value as text. */
  label: string;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Surface gap between neighbouring segments, in the same units as the circumference. */
const GAP = 2.2;

/** Part-to-whole ring with a headline in the middle and a legend that carries every value as text. */
export function AppDonut({ segments, centerValue, centerLabel, formatValue = String, label }: AppDonutProps) {
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const visible = segments.filter((item) => item.value > 0);
  let offset = 0;
  return (
    // Container query: beside the ring when the card is wide enough, under it in narrow cards.
    <div className="@container">
    <div className="flex flex-col items-center gap-x-6 gap-y-4 @sm:flex-row">
      <div role="img" aria-label={label} className="relative size-36 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle cx="50" cy="50" r={RADIUS} fill="none" strokeWidth={12} className="stroke-surface-strong-app" />
          {total > 0 && visible.map((item) => {
            const length = (item.value / total) * CIRCUMFERENCE;
            const dash = Math.max(0, visible.length > 1 ? length - GAP : length);
            const circle = (
              <circle key={item.key} cx="50" cy="50" r={RADIUS} fill="none" strokeWidth={12}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`} strokeDashoffset={-offset}
                className={cn("transition-[stroke-dasharray] duration-500", chartToneStroke[item.tone])}>
                <title>{`${item.label}: ${formatValue(item.value)}`}</title>
              </circle>
            );
            offset += length;
            return circle;
          })}
        </svg>
        <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-heading text-2xl font-semibold text-text-app tabular-nums">{centerValue}</span>
          <span className="max-w-20 text-[0.6875rem] leading-tight text-muted-app">{centerLabel}</span>
        </span>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {segments.map((item) => (
          <li key={item.key} className="flex items-center gap-2">
            <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-sm", chartToneFill[item.tone])} />
            <span className="min-w-0 flex-1 text-muted-app">{item.label}</span>
            <span className="shrink-0 font-medium text-text-app tabular-nums">{formatValue(item.value)}</span>
            <span className="w-10 shrink-0 text-right text-xs text-muted-app tabular-nums">
              {total ? `${Math.round((item.value / total) * 100)}%` : "–"}
            </span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
