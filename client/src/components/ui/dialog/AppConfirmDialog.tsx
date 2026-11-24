import { AppButton } from '@/components/ui/button/AppButton'
import { AppDialog } from '@/components/ui/dialog/AppDialog'

interface AppConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

// Hộp thoại xác nhận có/không thay cho window.confirm
/** Thay thế `window.confirm`: vẫn là câu hỏi có/không, nhưng theo theme và ngôn ngữ của ứng dụng. */
export function AppConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  pending = false,
  onConfirm,
  onCancel,
}: AppConfirmDialogProps) {
  return (
    <AppDialog
      open={open}
      title={title}
      closeLabel={cancelLabel}
      onClose={() => {
        if (!pending) {
          onCancel()
        }
      }}
      footer={
        <>
          <AppButton variant="ghost" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </AppButton>
          <AppButton disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </AppButton>
        </>
      }
    >
      <p className="text-sm text-muted-app">{message}</p>
    </AppDialog>
  )
}
