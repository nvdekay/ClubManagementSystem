/**
 * Các màu chuỗi mà một thành phần biểu đồ được dùng. chart-1/chart-2 là cặp màu phân loại đã được kiểm chứng; các tone trạng thái
 * (success, warning, danger) chỉ dùng để đánh dấu trạng thái như "quá hạn" hoặc vòng đời CLB, và luôn kèm nhãn chữ.
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

// Làm tròn giá trị lớn nhất của trục lên số đẹp
/** Làm tròn lên giá trị lớn nhất của trục thành 1, 2 hoặc 5 lần một luỹ thừa của 10 để các vạch chia là số đẹp. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((item) => item * power >= value) ?? 10;
  return step * power;
}

// Đổi giá trị so với max thành chuỗi phần trăm trong khoảng 0-100
export function percent(value: number, max: number): string {
  return `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
}
