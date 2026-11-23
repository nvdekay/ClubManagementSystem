import { cn } from "@/utils/cn";

// Khối xương giả khi đang tải dữ liệu
export function AppSkeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded bg-border-app", className)} />;
}
