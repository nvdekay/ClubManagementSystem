import { useEffect, useRef, type ReactNode } from "react";
import { AppIcon } from "@/components/ui/icon/AppIcon";
import { cn } from "@/utils/cn";

interface AppDialogProps {
  open: boolean;
  title: string;
  /** Called on Esc or the close button; the parent owns `open`. */
  onClose: () => void;
  closeLabel: string;
  className?: string;
  children?: ReactNode;
}

/** Modal on the native <dialog>: focus trap, Esc and top layer come from the browser. */
export function AppDialog({ open, title, onClose, closeLabel, className, children }: AppDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }}
      className={cn("m-auto max-h-[90dvh] w-[min(100%-2rem,36rem)] overflow-y-auto rounded-2xl border border-border-app bg-bg-app p-0 text-text-app backdrop:bg-black/40", className)}>
      {open && (
        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="min-w-0 font-heading text-lg font-bold break-words">{title}</h2>
            <button type="button" aria-label={closeLabel} onClick={onClose}
              className="-m-2 rounded-lg p-2 text-muted-app hover:bg-surface-app hover:text-text-app">
              <AppIcon name="close" className="size-5" />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
