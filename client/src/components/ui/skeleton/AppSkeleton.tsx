import { cn } from "@/utils/cn";

export function AppSkeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded bg-border-app", className)} />;
}
