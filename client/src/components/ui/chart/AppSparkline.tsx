import { cn } from "@/utils/cn";

interface AppSparklineProps {
  values: number[];
  /** Chỉ số được vẽ thành một chấm (ví dụ tháng hiện tại); mặc định là giá trị cuối. */
  highlight?: number;
  className?: string;
}

// Đường xu hướng nhỏ trong ô số liệu
/** Đường xu hướng mang tính trang trí trong ô số liệu; con số và ghi chú của ô mới truyền đạt ý nghĩa bằng chữ. */
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
