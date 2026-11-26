import { useTranslation } from 'react-i18next'

import { AppSwitch } from '@/components/ui/switch/AppSwitch'
import { cn } from '@/utils/cn'

interface ToggleTileProps {
  label: string
  checked: boolean
  locked?: boolean
  hint?: string
  onChange?: (checked: boolean) => void
}

// Ô bật/tắt cho yêu cầu hoặc quyền của chính sách
/** Một ô kiểu "có bắt buộc / có được phép không": nhãn, ý nghĩa hiện tại và công tắc. */
export function PolicyToggleTile({ label, checked, locked, hint, onChange }: ToggleTileProps) {
  const { t } = useTranslation()
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors',
        checked ? 'border-primary-app/30 bg-primary-soft-app/60' : 'border-border-app bg-bg-app',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p
          className={cn('mt-0.5 text-xs text-muted-app', {
            'font-semibold text-primary-app': checked,
          })}
        >
          {locked
            ? t('policy.alwaysRequired')
            : checked
              ? t('policy.required')
              : t('policy.optional')}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-app">{hint}</p>}
      </div>
      <AppSwitch
        checked={checked}
        disabled={locked}
        aria-label={label}
        onChange={(value) => onChange?.(value)}
      />
    </li>
  )
}
