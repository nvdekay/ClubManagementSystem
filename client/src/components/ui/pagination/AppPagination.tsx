import { AppButton } from "@/components/ui/button/AppButton";
import { cn } from "@/utils/cn";

interface AppPaginationProps {
  /** Trang hiện tại, đánh số từ 0. */
  pageIndex: number;
  pageCount: number;
  onPageChange: (pageIndex: number) => void;
  /** aria-label đã dịch theo ngôn ngữ — bản thân các mũi tên chỉ là icon. */
  prevLabel: string;
  nextLabel: string;
  /** aria-label cho nút số trang, nhận số trang tính từ 1. */
  pageLabel: (page: number) => string;
  /** aria-label cho landmark <nav>, ví dụ "Pagination". */
  navLabel: string;
  className?: string;
}

const GAP = "gap";

// Chọn các số trang cần hiển thị, chèn dấu ... khi bỏ qua
/**
 * Trang đầu, trang cuối và trang hiện tại ±1 — chèn dấu ngắt ở chỗ các số bị bỏ qua.
 * Giới hạn tối đa 7 số trên một hàng, để trang 1 trên 500 vẫn nằm trong một dòng ở điện thoại.
 */
function pageItems(pageIndex: number, pageCount: number): (number | typeof GAP)[] {
  const wanted = [0, pageIndex - 1, pageIndex, pageIndex + 1, pageCount - 1];
  const shown = [...new Set(wanted)].filter((p) => p >= 0 && p < pageCount).sort((a, b) => a - b);
  return shown.flatMap((p, i) => (i > 0 && p - shown[i - 1] > 1 ? [GAP, p] : [p]));
}

// Mũi tên chuyển trang trái hoặc phải
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

// AppButton đã đặt chiều cao 44px cho thiết bị cảm ứng; ở đây chỉ cố định chiều rộng và chữ số.
const CONTROL = "min-w-11 px-2 text-sm tabular-nums sm:min-w-9";

// Thanh phân trang
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
  // Không có gì để chuyển trang — một nút "1 / 1" bị vô hiệu đứng một mình chỉ gây nhiễu, không phải control.
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
            variant="secondary"
            aria-label={pageLabel(item + 1)}
            aria-current={item === pageIndex ? "page" : undefined}
            onClick={() => onPageChange(item)}
            className={cn(CONTROL, { "border-text-app font-semibold": item === pageIndex })}
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
