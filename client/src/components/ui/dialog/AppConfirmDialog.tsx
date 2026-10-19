import { AppButton } from "@/components/ui/button/AppButton";
import { AppDialog } from "@/components/ui/dialog/AppDialog";

interface AppConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Replaces `window.confirm`: same yes/no question, in the app's theme and language. */
export function AppConfirmDialog({ open, title, message, confirmLabel, cancelLabel, pending = false,
  onConfirm, onCancel }: AppConfirmDialogProps) {
  return (
    <AppDialog open={open} title={title} closeLabel={cancelLabel} onClose={() => { if (!pending) onCancel(); }}>
      <p className="text-sm text-muted-app">{message}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <AppButton variant="ghost" disabled={pending} onClick={onCancel}>{cancelLabel}</AppButton>
        <AppButton disabled={pending} onClick={onConfirm}>{confirmLabel}</AppButton>
      </div>
    </AppDialog>
  );
}
