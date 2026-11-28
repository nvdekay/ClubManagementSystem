import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppNotice } from '@/components/ui/notice/AppNotice'

interface AppErrorNoticeProps {
  title?: string
  /** Nội dung thêm nằm trên nút thử lại (thường là thông báo lỗi). */
  children?: ReactNode
  onRetry: () => void
  /** Mặc định `common.retry` ("Thử lại"). */
  retryLabel?: string
  retryVariant?: 'primary' | 'secondary'
  className?: string
}

// Thông báo lỗi tải dữ liệu kèm nút thử lại
export function AppErrorNotice({
  title,
  children,
  onRetry,
  retryLabel,
  retryVariant = 'secondary',
  className,
}: AppErrorNoticeProps) {
  const { t } = useTranslation()
  return (
    <AppNotice tone="danger" role="alert" title={title} className={className}>
      {children}
      <AppButton variant={retryVariant} onClick={onRetry}>
        {retryLabel ?? t('common.retry')}
      </AppButton>
    </AppNotice>
  )
}
