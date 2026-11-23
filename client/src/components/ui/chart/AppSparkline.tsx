import { cn } from "@/utils/cn";

interface AppSparklineProps {
  values: number[];
  /** Index drawn as a dot (e.g. the current month); defaults to the last value. */
  highlight?: number;
  className?: string;
}

/** Decorative trend line inside a stat tile; the tile's number and hint carry the meaning in text. */
export function AppSparkline({ values, highlight = values.length - 1, className }: AppSparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => [(index / (values.length - 1)) * 100, 90 - ((value - min) / span) * 80] as const);
  const line = points.map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`).join(" ");
  const dot = points[highlight];
  return (
    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className={cn("h-10 w-full overflow-visible", className)}>
      <path d={`${line} L100,100 L0,100 Z`} className="fill-chart-1-app opacity-10" />
      <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-chart-1-app" />
      {dot && <circle cx={dot[0]} cy={dot[1]} r={3.5} vectorEffect="non-scaling-stroke" className="fill-chart-1-app stroke-bg-app" strokeWidth={2} />}
    </svg>
  );
}
