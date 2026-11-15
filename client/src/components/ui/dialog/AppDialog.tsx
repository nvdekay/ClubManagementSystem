import { useEffect, useRef, type ReactNode } from "react";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { cn } from "@/utils/cn";

interface AppDialogProps {
  open: boolean;
  title: string;
  /** Được gọi khi nhấn Esc hoặc nút đóng; `open` do component cha quản lý. */
  onClose: () => void;
  closeLabel: string;
  className?: string;
  children?: ReactNode;
  /** Các nút thao tác; ghim ở mép dưới để form dài không bao giờ che mất nút gửi. */
  footer?: ReactNode;
}

// Hộp thoại modal dựa trên thẻ dialog
/** Modal dựa trên thẻ <dialog> gốc: giữ focus, phím Esc và lớp trên cùng do trình duyệt đảm nhiệm. */
export function AppDialog({ open, title, onClose, closeLabel, className, children, footer }: AppDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}
      className={cn("m-auto max-h-[90dvh] w-[min(100%-2rem,36rem)] overflow-y-auto rounded-2xl border border-border-app bg-bg-app p-0 text-text-app shadow-xl backdrop:bg-backdrop-app transition-[opacity,scale] duration-200 ease-out starting:open:scale-[0.97] starting:open:opacity-0 backdrop:transition-opacity backdrop:duration-200 starting:open:backdrop:opacity-0", className)}>
      {open && <>
        {/* Tiêu đề và nút đóng được ghim cố định trong khi phần thân dài cuộn bên dưới. */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 bg-bg-app px-5 pt-5 pb-4 sm:px-6 sm:pt-6">
          <h2 className="min-w-0 font-heading text-lg font-semibold break-words">{title}</h2>
          <button type="button" aria-label={closeLabel} onClick={onClose}
            className="-m-2 rounded-lg p-2 text-muted-app hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app">
            <AppIcon name="close" className="size-5" />
          </button>
        </div>
        <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", { "pb-4 sm:pb-4": footer })}>{children}</div>
        {footer && <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-border-app bg-bg-app px-5 py-4 sm:px-6">
          {footer}
        </div>}
      </>}
    </dialog>
  );
}
