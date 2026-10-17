import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

import { chartToneFill, type ChartTone } from "./chartScale";

interface AppChartFrameProps {
  title: string;
  description?: string;
  /** Shown for two or more series; a single series is named by the title. */
  legend?: { label: string; tone: ChartTone }[];
  action?: ReactNode;
  /** The same numbers as a table, so no value depends on hovering. */
  table?: { label: string; columns: string[]; rows: (string | number)[][] };
  className?: string;
  children: ReactNode;
}

/** Card around one chart: heading, legend, the chart, and a collapsible table view. */
export function AppChartFrame({ title, description, legend, action, table, className, children }: AppChartFrameProps) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-border-app bg-bg-app p-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="font-heading text-base font-bold text-text-app">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-muted-app">{description}</p>}
        </div>
        {action}
      </div>
      {legend && legend.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-app">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span aria-hidden="true" className={cn("size-2.5 rounded-sm", chartToneFill[item.tone])} />{item.label}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex-1">{children}</div>
      {table && table.rows.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="w-fit text-xs font-semibold text-muted-app hover:text-text-app">{table.label}</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-app"><tr>{table.columns.map((column) => <th key={column} className="py-1 pr-3 font-medium">{column}</th>)}</tr></thead>
              <tbody className="tabular-nums">
                {table.rows.map((row, index) => (
                  <tr key={index} className="border-t border-border-app">{row.map((cell, cellIndex) => <td key={cellIndex} className="py-1 pr-3">{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
