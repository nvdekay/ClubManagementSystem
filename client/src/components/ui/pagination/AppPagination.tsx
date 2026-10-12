import { AppButton } from "@/components/ui/button/AppButton";
import { cn } from "@/utils/cn";

interface AppPaginationProps {
  /** Zero-based current page. */
  pageIndex: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  /** Localized aria-labels — the arrows themselves are icons. */
  prevLabel: string;
  nextLabel: string;
  /** aria-label for a numbered button, given the one-based page number. */
  pageLabel: (page: number) => string;
  /** aria-label for the <nav> landmark, e.g. "Pagination". */
  navLabel: string;
  className?: string;
}

const GAP = "gap";

/**
 * First, last and current ±1 — a gap marker wherever numbers were skipped.
 * Caps the row at 7 numbers, so page 1 of 500 stays one line on mobile.
 */
function pageItems(pageIndex: number, pageCount: number): (number | typeof GAP)[] {
  const wanted = [0, pageIndex - 1, pageIndex, pageIndex + 1, pageCount - 1];
  const shown = [...new Set(wanted)].filter((p) => p >= 0 && p < pageCount).sort((a, b) => a - b);
  return shown.flatMap((p, i) => (i > 0 && p - shown[i - 1] > 1 ? [GAP, p] : [p]));
}

function ChevronIcon({ left }: { left?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d={left ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6"} />
    </svg>
  );
}

// AppButton already sets the 44px-on-touch height; this only pins the width and digits.
const CONTROL = "min-w-11 px-2 text-sm tabular-nums";

export function AppPagination({
  pageIndex,
  pageCount,
  onPageChange,
  prevLabel,
  nextLabel,
  pageLabel,
  navLabel,
  className,
}: AppPaginationProps) {
  // Nothing to navigate — a lone disabled "1 / 1" is noise, not a control.
  if (pageCount <= 1) return null;

  return (
    <nav aria-label={navLabel} className={cn("flex flex-wrap items-center gap-1", className)}>
      <AppButton
        variant="secondary"
        aria-label={prevLabel}
        disabled={pageIndex <= 0}
        onClick={() => onPageChange(pageIndex - 1)}
        className={CONTROL}
      >
        <ChevronIcon left />
      </AppButton>
      {pageItems(pageIndex, pageCount).map((item, i) =>
        item === GAP ? (
          <span key={`${GAP}-${i}`} aria-hidden className={cn(CONTROL, "text-muted-app")}>
            …
          </span>
        ) : (
          <AppButton
            key={item}
            variant={item === pageIndex ? "primary" : "secondary"}
            aria-label={pageLabel(item + 1)}
            aria-current={item === pageIndex ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={CONTROL}
          >
            {item + 1}
          </AppButton>
        ),
      )}
      <AppButton
        variant="secondary"
        aria-label={nextLabel}
        disabled={pageIndex + 1 >= pageCount}
        onClick={() => onPageChange(pageIndex + 1)}
        className={CONTROL}
      >
        <ChevronIcon />
      </AppButton>
    </nav>
  );
}
