import { useTranslation } from 'react-i18next'

import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'

// Nhãn trường kèm dấu bắt buộc hoặc ghi chú tùy chọn
export function ApplicationFieldLabel({ text, required }: { text: string; required: boolean }) {
  const { t } = useTranslation()
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span>
        {text}
        {required && <AppRequiredMark />}
      </span>
      {!required && (
        <span className="text-xs font-normal text-muted-app">{t('applications.optional')}</span>
      )}
    </span>
  )
}
