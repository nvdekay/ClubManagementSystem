import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'

import { CLUB_PROFILE_FORM_FIELDS, type ClubProfileFormField } from '@/services/policy'
import type { PolicyForm } from '@/pages/icpdp/policyEditorForm'
import { profileFieldKey } from '@/pages/icpdp/policyEditorForm'
import { PolicyToggleTile } from '@/pages/icpdp/PolicyToggleTile'
import type { useFieldValidation } from '@/hooks/useFieldValidation'

interface PolicyProfileSectionProps {
  form: PolicyForm
  setForm: Dispatch<SetStateAction<PolicyForm>>
  field: ReturnType<typeof useFieldValidation<string>>
}

// Nhóm "hồ sơ CLB": các trường bắt buộc của form hồ sơ vận hành
export function PolicyProfileSection({ form, setForm }: PolicyProfileSectionProps) {
  const { t } = useTranslation()
  // Bật/tắt yêu cầu của form hồ sơ CLB
  function setProfile(field: ClubProfileFormField, value: boolean) {
    setForm((current) => ({
      ...current,
      formRequirements: {
        ...current.formRequirements,
        clubProfile: { ...current.formRequirements.clubProfile, [field]: value },
      },
    }))
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-app">{t('policy.profileFieldsHint')}</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {CLUB_PROFILE_FORM_FIELDS.map((item) => (
          <PolicyToggleTile
            key={item}
            label={t(profileFieldKey(item))}
            checked={form.formRequirements.clubProfile[item]}
            onChange={(value) => setProfile(item, value)}
          />
        ))}
      </ul>
    </div>
  )
}
