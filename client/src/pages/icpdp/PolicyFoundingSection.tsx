import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'

import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'
import { FOUNDING_FORM_FIELDS, type FoundingFormField } from '@/services/policy'
import type { useFieldValidation } from '@/hooks/useFieldValidation'
import type { PolicyForm } from '@/pages/icpdp/policyEditorForm'
import { foundingFieldKey } from '@/pages/icpdp/policyEditorForm'
import { PolicySubHeading } from '@/pages/icpdp/PolicySubHeading'
import { PolicyToggleTile } from '@/pages/icpdp/PolicyToggleTile'

interface PolicyFoundingSectionProps {
  form: PolicyForm
  setForm: Dispatch<SetStateAction<PolicyForm>>
  field: ReturnType<typeof useFieldValidation<string>>
}

// Nhóm "thành lập CLB": số sáng lập viên tối thiểu và các trường bắt buộc của hồ sơ
export function PolicyFoundingSection({ form, setForm, field }: PolicyFoundingSectionProps) {
  const { t } = useTranslation()
  // Bật/tắt yêu cầu của form thành lập CLB
  function setFounding(field: FoundingFormField, value: boolean) {
    setForm((current) => ({
      ...current,
      formRequirements: {
        ...current.formRequirements,
        clubFounding: { ...current.formRequirements.clubFounding, [field]: value },
      },
    }))
  }
  return (
    <div className="space-y-6">
      <label className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-app px-4 py-3 text-sm">
        <span>{t('policy.minFoundersBefore')}</span>
        <AppInput
          className="w-20 text-center tabular-nums"
          type="number"
          min="1"
          aria-label={t('policy.minFounders')}
          value={form.minFoundingMembers}
          {...field.control('minFoundingMembers')}
          onChange={(event) => setForm({ ...form, minFoundingMembers: event.target.value })}
        />
        <span>
          {t('policy.minFoundersAfter')}
          <AppRequiredMark />
        </span>
      </label>
      <AppFieldError message={field.error('minFoundingMembers')} />
      <div className="space-y-3">
        <PolicySubHeading
          title={t('policy.foundingFieldsTitle')}
          hint={t('policy.foundingFieldsHint')}
        />
        <ul className="grid gap-2 sm:grid-cols-2">
          <PolicyToggleTile label={t('policy.fieldClubName')} checked locked />
          <PolicyToggleTile label={t('policy.fieldClubField')} checked locked />
          {FOUNDING_FORM_FIELDS.map((item) => (
            <PolicyToggleTile
              key={item}
              label={t(foundingFieldKey(item))}
              checked={form.formRequirements.clubFounding[item]}
              onChange={(value) => setFounding(item, value)}
            />
          ))}
        </ul>
      </div>
    </div>
  )
}
