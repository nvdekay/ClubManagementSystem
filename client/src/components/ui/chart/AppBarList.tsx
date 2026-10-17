import { Link } from "react-router";

import { cn } from "@/utils/cn";

import { chartToneFill, niceMax, percent, type ChartTone } from "./chartScale";

export interface AppBarListRow {
  key: string;
  label: string;
  /** One value per series; two or more draw a stacked bar. */
  values: number[];
  href?: string;
}

interface AppBarListProps {
  rows: AppBarListRow[];
  tones: ChartTone[];
  seriesLabels: string[];
  emptyLabel: string;
  formatValue?: (value: number) => string;
}

/** Horizontal bars, one row per category, value at the bar tip; a row with `href` opens it. */
export function AppBarList({ rows, tones, seriesLabels, emptyLabel, formatValue = String }: AppBarListProps) {
  const max = niceMax(Math.max(0, ...rows.map((row) => row.values.reduce((sum, value) => sum + value, 0))));
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-app">{emptyLabel}</p>;
  return (
    <ul className="space-y-1">
      {rows.map((row) => {
        const total = row.values.reduce((sum, value) => sum + value, 0);
        const summary = [row.label, ...row.values.map((value, index) => `${seriesLabels[index] ?? ""}: ${formatValue(value)}`)].join(", ");
        const body = (
          <>
            <span className="min-w-0 text-sm break-words text-text-app">{row.label}</span>
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-5 gap-0.5" style={{ width: percent(total, max) }}>
                {row.values.map((value, index) => value > 0 && (
                  <span key={index} className={cn("h-full first:rounded-l-sm last:rounded-r-[4px]", chartToneFill[tones[index] ?? "chart-1"])}
                    style={{ flexGrow: value }} />
                ))}
              </span>
              <span className="text-sm font-semibold text-text-app tabular-nums">{formatValue(total)}</span>
            </span>
            <span role="tooltip" className="pointer-events-none invisible absolute bottom-full left-1/3 z-10 mb-1 rounded-lg border border-border-app bg-bg-app px-3 py-2 text-xs shadow-lg group-hover:visible group-focus-visible:visible">
              <span className="block font-semibold text-text-app">{row.label}</span>
              {row.values.map((value, index) => (
                <span key={index} className="mt-1 flex items-center gap-2 text-muted-app">
                  <span aria-hidden="true" className={cn("h-0.5 w-3 rounded-full", chartToneFill[tones[index] ?? "chart-1"])} />
                  <span className="font-semibold text-text-app tabular-nums">{formatValue(value)}</span>{seriesLabels[index]}
                </span>
              ))}
            </span>
          </>
        );
        const className = "group relative grid grid-cols-[minmax(7rem,2fr)_3fr] items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app";
        return (
          <li key={row.key}>
            {row.href ? <Link to={row.href} aria-label={summary} className={className}>{body}</Link>
              : <div tabIndex={0} role="img" aria-label={summary} className={className}>{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}
