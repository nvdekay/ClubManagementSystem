import { AppButton } from "@/components/ui/button/AppButton";
import { cn } from "@/utils/cn";

interface AppPaginationProps {
  /** Zero-based current page. */
  pageIndex: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  /** Localized aria-labels — the buttons themselves show ‹ / ›. */
  prevLabel: string;
  nextLabel: string;
  className?: string;
}

export function AppPagination({
  pageIndex,
  pageCount,
  onPageChange,
  prevLabel,
  nextLabel,
  className,
}: AppPaginationProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <AppButton
        variant="secondary"
        aria-label={prevLabel}
        disabled={pageIndex <= 0}
        onClick={() => onPageChange(pageIndex - 1)}
      >
        ‹
      </AppButton>
      <span className="text-sm text-muted-app">
        {pageIndex + 1} / {Math.max(1, pageCount)}
      </span>
      <AppButton
        variant="secondary"
        aria-label={nextLabel}
        disabled={pageIndex + 1 >= pageCount}
        onClick={() => onPageChange(pageIndex + 1)}
      >
        ›
      </AppButton>
    </div>
  );
}
