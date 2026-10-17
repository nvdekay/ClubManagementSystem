import { niceMax, percent } from "./chartScale";

export interface AppAreaPoint {
  key: string;
  label: string;
  value: number;
}

interface AppAreaChartProps {
  points: AppAreaPoint[];
  seriesLabel: string;
  formatValue?: (value: number) => string;
}

/** One series over time: a 2px line on a light wash, the latest value labelled, a crosshair on hover or focus. */
export function AppAreaChart({ points, seriesLabel, formatValue = String }: AppAreaChartProps) {
  const max = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const step = points.length > 1 ? 100 / (points.length - 1) : 0;
  const coords = points.map((point, index) => [index * step, 100 - (point.value / max) * 100] as const);
  const line = coords.map(([x, y], index) => `${index ? "L" : "M"}${x},${y}`).join(" ");
  const last = points.at(-1);
  return (
    <div className="flex gap-2">
      <div aria-hidden="true" className="flex h-44 flex-col justify-between text-right text-[11px] text-muted-app tabular-nums">
        <span>{formatValue(max)}</span><span>{formatValue(max / 2)}</span><span>0</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-44">
          <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
            <span className="border-t border-chart-grid-app" /><span className="border-t border-chart-grid-app" /><span className="border-t border-border-app" />
          </div>
          {points.length > 1 && (
            <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <path d={`${line} L100,100 L0,100 Z`} className="fill-chart-1-app opacity-10" />
              <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" className="stroke-chart-1-app" />
            </svg>
          )}
          {last && (
            <span aria-hidden="true" className="absolute size-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-chart-1-app ring-2 ring-bg-app"
              style={{ left: "100%", bottom: percent(last.value, max) }} />
          )}
          {last && (
            <span aria-hidden="true" className="absolute right-0 mb-2 text-xs font-semibold text-text-app" style={{ bottom: percent(last.value, max) }}>
              {formatValue(last.value)}
            </span>
          )}
          <ul className="absolute inset-0 flex">
            {points.map((point, index) => (
              <li key={point.key} tabIndex={0} aria-label={`${point.label}, ${seriesLabel}: ${formatValue(point.value)}`}
                className="group relative min-w-0 flex-1 focus-visible:outline-2 focus-visible:outline-ring-app">
                <span aria-hidden="true" className="invisible absolute inset-y-0 w-px bg-border-app group-hover:visible group-focus-visible:visible"
                  style={{ left: points.length > 1 ? `${(index / (points.length - 1)) * 100}%` : "50%" }} />
                <span role="tooltip" className="pointer-events-none invisible absolute top-0 left-1/2 z-10 w-max -translate-x-1/2 rounded-lg border border-border-app bg-bg-app px-3 py-2 text-xs shadow-lg group-hover:visible group-focus-visible:visible">
                  <span className="block font-semibold text-text-app tabular-nums">{formatValue(point.value)}</span>
                  <span className="text-muted-app">{point.label}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <ul aria-hidden="true" className="mt-2 flex">
          {points.map((point, index) => (
            <li key={point.key} className="min-w-0 flex-1 text-center text-[11px] text-muted-app">
              {index % 2 === points.length % 2 || points.length <= 6 ? point.label : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
