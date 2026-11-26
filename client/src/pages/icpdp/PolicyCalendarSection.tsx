import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppInput } from '@/components/ui/input/AppInput'
import type { useFieldValidation } from '@/hooks/useFieldValidation'
import type { PolicyForm, SemesterForm } from '@/pages/icpdp/policyEditorForm'

interface PolicyCalendarSectionProps {
  form: PolicyForm
  setForm: Dispatch<SetStateAction<PolicyForm>>
  field: ReturnType<typeof useFieldValidation<string>>
}

// Nhóm "lịch học thuật": danh sách học kỳ (mã, bắt đầu, kết thúc)
export function PolicyCalendarSection({ form, setForm, field }: PolicyCalendarSectionProps) {
  const { t } = useTranslation()
  const fieldLabel = 'block text-sm font-medium text-text-app'
  const fieldInput = 'mt-1.5 block w-full'
  // Cập nhật một trường của học kỳ trong lịch học thuật
  function updateSemester(index: number, field: keyof SemesterForm, value: string) {
    setForm((current) => ({
      ...current,
      academicCalendar: current.academicCalendar.map((item, position) =>
        position === index ? { ...item, [field]: value } : item,
      ),
    }))
  }
  return (
    <div className="space-y-3">
      {form.academicCalendar.map((item, index) => (
        <div
          key={index}
          className="grid items-start gap-3 rounded-xl border border-border-app bg-surface-app p-4 sm:grid-cols-[minmax(0,10rem)_1fr_1fr_auto]"
        >
          <label className={fieldLabel}>
            {t('policy.semesterCode')}
            <AppRequiredMark />
            <AppInput
              className={fieldInput}
              value={item.code}
              {...field.control(`semesterCode${index}`)}
              onChange={(event) => updateSemester(index, 'code', event.target.value)}
            />
            <AppFieldError message={field.error(`semesterCode${index}`)} />
          </label>
          <label className={fieldLabel}>
            {t('policy.semesterStart')}
            <AppRequiredMark />
            <AppInput
              className={fieldInput}
              type="datetime-local"
              value={item.startAt}
              {...field.control(`semesterStart${index}`)}
              onChange={(event) => updateSemester(index, 'startAt', event.target.value)}
            />
            <AppFieldError message={field.error(`semesterStart${index}`)} />
          </label>
          <label className={fieldLabel}>
            {t('policy.semesterEnd')}
            <AppRequiredMark />
            <AppInput
              className={fieldInput}
              type="datetime-local"
              value={item.endAt}
              {...field.control(`semesterEnd${index}`)}
              onChange={(event) => updateSemester(index, 'endAt', event.target.value)}
            />
            <AppFieldError message={field.error(`semesterEnd${index}`)} />
          </label>
          <AppButton
            type="button"
            variant="ghost"
            className="sm:mt-7"
            disabled={form.academicCalendar.length === 1}
            onClick={() =>
              setForm({
                ...form,
                academicCalendar: form.academicCalendar.filter((_, position) => position !== index),
              })
            }
          >
            <AppIcon name="close" className="size-4" />
            {t('policy.removeSemester')}
          </AppButton>
        </div>
      ))}
      <AppButton
        type="button"
        variant="secondary"
        onClick={() =>
          setForm({
            ...form,
            academicCalendar: [...form.academicCalendar, { code: '', startAt: '', endAt: '' }],
          })
        }
      >
        <AppIcon name="plus" className="size-4" />
        {t('policy.addSemester')}
      </AppButton>
    </div>
  )
}
