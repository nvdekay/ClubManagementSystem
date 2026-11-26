import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppInput } from '@/components/ui/input/AppInput'
import type { useFieldValidation } from '@/hooks/useFieldValidation'
import {
  deadlineLabelKey,
  deadlineNumberFields,
  type DeadlineForm,
  type PolicyForm,
} from '@/pages/icpdp/policyEditorForm'
import { PolicyNumberSetting } from '@/pages/icpdp/PolicyNumberSetting'
import { PolicyToggleTile } from '@/pages/icpdp/PolicyToggleTile'
import { cn } from '@/utils/cn'

interface PolicyReportsSectionProps {
  form: PolicyForm
  setForm: Dispatch<SetStateAction<PolicyForm>>
  field: ReturnType<typeof useFieldValidation<string>>
}

// Nhóm "báo cáo": hạn nộp từng loại báo cáo và chặn khi quá hạn
export function PolicyReportsSection({ form, setForm, field }: PolicyReportsSectionProps) {
  const { t } = useTranslation()
  const fieldLabel = 'block text-sm font-medium text-text-app'
  const fieldInput = 'mt-1.5 block w-full'
  // Cập nhật một trường của hạn nộp báo cáo
  function updateDeadline(index: number, field: keyof DeadlineForm, value: string) {
    setForm((current) => ({
      ...current,
      reportDeadlines: current.reportDeadlines.map((item, position) =>
        position === index ? { ...item, [field]: value } : item,
      ),
    }))
  }
  return (
    <div className="space-y-4">
      {form.reportDeadlines.map((item, index) => (
        <div key={index} className="rounded-xl border border-border-app bg-surface-app p-4">
          <div className="flex flex-wrap items-start gap-3">
            <label className={cn(fieldLabel, 'min-w-0 flex-1 basis-56')}>
              {t('policy.reportType')}
              <AppRequiredMark />
              <AppInput
                className={fieldInput}
                value={item.reportType}
                {...field.control(`reportType${index}`)}
                onChange={(event) => updateDeadline(index, 'reportType', event.target.value)}
              />
              <AppFieldError message={field.error(`reportType${index}`)} />
            </label>
            <AppButton
              type="button"
              variant="ghost"
              className="sm:mt-7"
              disabled={form.reportDeadlines.length === 1}
              onClick={() =>
                setForm({
                  ...form,
                  reportDeadlines: form.reportDeadlines.filter((_, position) => position !== index),
                })
              }
            >
              <AppIcon name="close" className="size-4" />
              {t('policy.removeDeadline')}
            </AppButton>
          </div>
          <ul className="mt-3 divide-y divide-border-app rounded-xl bg-bg-app px-4 py-3.5">
            {deadlineNumberFields.map((name) => (
              <PolicyNumberSetting
                key={name}
                label={t(deadlineLabelKey(name))}
                min={0}
                value={item[name]}
                control={field.control(`${name}${index}`)}
                error={field.error(`${name}${index}`)}
                onChange={(value) => updateDeadline(index, name, value)}
              />
            ))}
          </ul>
        </div>
      ))}
      <AppButton
        type="button"
        variant="secondary"
        onClick={() =>
          setForm({
            ...form,
            reportDeadlines: [
              ...form.reportDeadlines,
              {
                reportType: '',
                dueDaysAfterPeriodEnd: '',
                remindBeforeDays: '',
                overdueAfterDays: '',
                escalateAfterDays: '',
              },
            ],
          })
        }
      >
        <AppIcon name="plus" className="size-4" />
        {t('policy.addDeadline')}
      </AppButton>
      <ul>
        <PolicyToggleTile
          label={t('policy.overdueBlock')}
          checked={form.enforceOverdueReportBlock}
          onChange={(value) => setForm({ ...form, enforceOverdueReportBlock: value })}
        />
      </ul>
    </div>
  )
}
