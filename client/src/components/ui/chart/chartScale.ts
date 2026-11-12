/**
 * Series colors a chart mark may wear. chart-1/chart-2 are the validated categorical pair; the status tones
 * (success, warning, danger) only mark a state such as "past due" or a club's lifecycle, always with a label.
 */
export type ChartTone = "chart-1" | "chart-2" | "muted" | "success" | "warning" | "danger";

export const chartToneFill: Record<ChartTone, string> = {
  "chart-1": "bg-chart-1-app",
  "chart-2": "bg-chart-2-app",
  muted: "bg-chart-muted-app",
  success: "bg-success-app",
  warning: "bg-warning-app",
  danger: "bg-danger-app",
};

export const chartToneStroke: Record<ChartTone, string> = {
  "chart-1": "stroke-chart-1-app",
  "chart-2": "stroke-chart-2-app",
  muted: "stroke-chart-muted-app",
  success: "stroke-success-app",
  warning: "stroke-warning-app",
  danger: "stroke-danger-app",
};

/** Rounds an axis maximum up to 1, 2 or 5 times a power of ten so ticks land on clean numbers. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((item) => item * power >= value) ?? 10;
  return step * power;
}

export function percent(value: number, max: number): string {
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
}
