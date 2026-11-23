import { cn } from "@/utils/cn";

import { chartToneFill, niceMax, percent, type ChartTone } from "./chartScale";

export interface AppColumnPoint {
  key: string;
  label: string;
  values: number[];
  /** Đánh dấu cột là trọng tâm; các cột còn lại chuyển sang màu xám nhạt. */
  emphasized?: boolean;
  /** Tên dài hơn cho tooltip và nhãn cho trình đọc màn hình. */
  title?: string;
}

interface AppColumnChartProps {
  points: AppColumnPoint[];
  tones: ChartTone[];
  seriesLabels: string[];
  formatValue?: (value: number) => string;
}

// Biểu đồ cột dọc, nhóm cột khi có hai chuỗi
/** Các cột dọc trên cùng một đường nền, nhóm lại khi có hai chuỗi; hover hoặc focus vào cột để xem giá trị. */
export function AppColumnChart({ points, tones, seriesLabels, formatValue = String }: AppColumnChartProps) {
  const max = niceMax(Math.max(0, ...points.flatMap((point) => point.values)));
  const emphasis = points.some((point) => point.emphasized);
  return (
    <div className="flex gap-2">
      <div aria-hidden="true" className="flex h-44 flex-col justify-between pb-0 text-right text-[0.6875rem] text-muted-app tabular-nums">
        <span>{formatValue(max)}</span><span>{formatValue(max / 2)}</span><span>0</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative h-44">
          <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
            <span className="border-t border-chart-grid-app" /><span className="border-t border-chart-grid-app" /><span className="border-t border-border-app" />
          </div>
          <ul className="relative flex h-full items-end">
            {points.map((point, pointIndex) => {
              // Các cột ở mép neo tooltip vào phía trong để không bao giờ tràn ra ngoài mép màn hình (điện thoại cuộn ngang).
              const edge = pointIndex < 2 ? "start" : pointIndex >= points.length - 2 ? "end" : "middle";
              const summary = [point.title ?? point.label, ...point.values.map((value, index) => `${seriesLabels[index] ?? ""}: ${formatValue(value)}`)].join(", ");
              const top = Math.max(...point.values);
              return (
                <li key={point.key} tabIndex={0} aria-label={summary}
                  className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-0.5 rounded-md px-0.5 hover:bg-surface-app focus-visible:outline-2 focus-visible:outline-ring-app">
                  {point.values.map((value, index) => (
                    <span key={index} className={cn("relative w-full max-w-6 rounded-t-[4px]", chartToneFill[tones[index] ?? "chart-1"],
                      { "bg-chart-muted-app": emphasis && !point.emphasized && point.values.length === 1 })}
                    style={{ height: percent(value, max) }}>
                      {point.emphasized && value === top && (
                        <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-xs font-semibold text-text-app">{formatValue(value)}</span>
                      )}
                    </span>
                  ))}
                  <span role="tooltip" className={cn("pointer-events-none invisible absolute bottom-full z-10 mb-2 w-max max-w-56 rounded-lg border border-border-app bg-bg-app px-3 py-2 text-xs shadow-lg group-hover:visible group-focus-visible:visible", { "left-0": edge === "start", "right-0": edge === "end", "left-1/2 -translate-x-1/2": edge === "middle" })}>
                    <span className="block font-semibold break-words text-text-app">{point.title ?? point.label}</span>
                    {point.values.map((value, index) => (
                      <span key={index} className="mt-1 flex items-center gap-2 text-muted-app">
                        <span aria-hidden="true" className={cn("h-0.5 w-3 rounded-full", chartToneFill[tones[index] ?? "chart-1"])} />
                        <span className="font-semibold text-text-app tabular-nums">{formatValue(value)}</span>{seriesLabels[index]}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <ul aria-hidden="true" className="mt-2 flex">
          {points.map((point) => (
            <li key={point.key} className={cn("min-w-0 flex-1 px-0.5 text-center text-[0.6875rem] break-words text-muted-app", { "font-semibold text-text-app": point.emphasized })}>
              {point.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
