import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AppConfirmDialog } from '@/components/ui/dialog/AppConfirmDialog'
import { ConfirmContext, type ConfirmOptions } from '@/hooks/useConfirm'

interface AppConfirmProviderProps {
  children: ReactNode
}

interface PendingConfirm extends ConfirmOptions {
  message: string
}

// Provider cung cấp hộp thoại xác nhận cho hook useConfirm
/** Chứa modal xác nhận duy nhất phía sau `useConfirm()`; mỗi lúc chỉ mở một câu hỏi. */
export function AppConfirmProvider({ children }: AppConfirmProviderProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const resolver = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    resolver.current?.(false)
    setPending({ message, ...options })
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  // Trả kết quả xác nhận cho nơi gọi và đóng hộp thoại
  function settle(value: boolean) {
    resolver.current?.(value)
    resolver.current = null
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AppConfirmDialog
        open={pending !== null}
        title={pending?.title ?? t('common.confirmTitle')}
        message={pending?.message ?? ''}
        confirmLabel={pending?.confirmLabel ?? t('common.confirmOk')}
        cancelLabel={t('common.confirmCancel')}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </ConfirmContext.Provider>
  )
}
