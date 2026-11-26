import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'

import type { useFieldValidation } from '@/hooks/useFieldValidation'
import type { PolicyForm } from '@/pages/icpdp/policyEditorForm'
import { PolicyNumberSetting } from '@/pages/icpdp/PolicyNumberSetting'
import { PolicyToggleTile } from '@/pages/icpdp/PolicyToggleTile'

interface PolicyEventsSectionProps {
  form: PolicyForm
  setForm: Dispatch<SetStateAction<PolicyForm>>
  field: ReturnType<typeof useFieldValidation<string>>
}

// Nhóm "sự kiện": cửa sổ phản hồi, ngưỡng trùng lịch và cho phép vượt sức chứa
export function PolicyEventsSection({ form, setForm, field }: PolicyEventsSectionProps) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <ul className="divide-y divide-border-app rounded-xl border border-border-app px-4 py-3.5">
        <PolicyNumberSetting
          label={t('policy.feedbackWindow')}
          min={1}
          value={form.feedbackWindowHours}
          control={field.control('feedbackWindowHours')}
          error={field.error('feedbackWindowHours')}
          onChange={(value) => setForm({ ...form, feedbackWindowHours: value })}
        />
        <PolicyNumberSetting
          label={t('policy.feedbackMinimum')}
          min={2}
          value={form.feedbackMinRespondents}
          control={field.control('feedbackMinRespondents')}
          error={field.error('feedbackMinRespondents')}
          onChange={(value) => setForm({ ...form, feedbackMinRespondents: value })}
        />
        <PolicyNumberSetting
          label={t('policy.conflictMinutes')}
          min={0}
          value={form.conflictThresholdMinutes}
          control={field.control('conflictThresholdMinutes')}
          error={field.error('conflictThresholdMinutes')}
          onChange={(value) => setForm({ ...form, conflictThresholdMinutes: value })}
        />
      </ul>
      <ul>
        <PolicyToggleTile
          label={t('policy.overbooking')}
          hint={t('policy.overbookingHint')}
          checked={form.allowOverbooking}
          onChange={(value) => setForm({ ...form, allowOverbooking: value })}
        />
      </ul>
    </div>
  )
}
