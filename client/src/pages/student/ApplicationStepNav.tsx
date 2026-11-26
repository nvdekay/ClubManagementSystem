import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { cn } from '@/utils/cn'

interface ApplicationStepNavProps {
  steps: string[]
  step: number
  /** Các bước chứa phần ICPDP yêu cầu chỉnh sửa. */
  flaggedSteps: Set<number>
  /** Hồ sơ đã được lưu ít nhất một lần; trước đó chỉ bước đầu mở được. */
  isSaved: boolean
  pending: boolean
  onGoTo: (step: number) => void
}

// Thanh các bước của form hồ sơ thành lập CLB
export function ApplicationStepNav({
  steps,
  step,
  flaggedSteps,
  isSaved,
  pending,
  onGoTo,
}: ApplicationStepNavProps) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t('applications.stepOf', { current: step + 1, total: steps.length })}
      className="mb-5"
    >
      <ol className="flex flex-wrap gap-2">
        {steps.map((name, index) => (
          <li key={name}>
            <button
              type="button"
              aria-current={index === step ? 'step' : undefined}
              disabled={pending || (!isSaved && index > 0)}
              onClick={() => onGoTo(index)}
              className={cn(
                'group flex min-h-11 items-center gap-2 rounded-lg border border-border-app bg-bg-app px-3 text-sm font-medium text-muted-app shadow-xs hover:bg-surface-app sm:min-h-9',
                { 'text-text-app': index === step },
              )}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border border-border-app text-xs font-semibold',
                  { 'border-brand-app text-brand-app': index === step },
                )}
              >
                {index + 1}
              </span>
              {name}
              {flaggedSteps.has(index) && (
                <AppBadge tone="warning">{t('common.revisionFlagged')}</AppBadge>
              )}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}
