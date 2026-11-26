import { useTranslation } from 'react-i18next'

import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import type { useFieldValidation } from '@/hooks/useFieldValidation'
import type { DraftInput, FoundingField } from '@/services/applications'
import { ApplicationFieldLabel } from '@/pages/student/ApplicationFieldLabel'

type ClubStepField =
  'clubName' | 'fieldId' | 'summary' | 'objectives' | 'fanpageUrl' | 'contactEmail'

interface ApplicationClubStepProps {
  currentDraft: DraftInput
  field: ReturnType<typeof useFieldValidation<ClubStepField>>
  required: Record<FoundingField, boolean>
  fieldOptions: { value: string; label: string }[]
  change: <K extends keyof DraftInput>(key: K, value: DraftInput[K]) => void
}

// Bước 1: thông tin công khai của CLB (tên, lĩnh vực, giới thiệu, mục tiêu, fanpage, email liên hệ)
export function ApplicationClubStep({
  currentDraft,
  field,
  required,
  fieldOptions,
  change,
}: ApplicationClubStepProps) {
  const { t } = useTranslation()
  return (
    <section className="grid gap-5 sm:grid-cols-2 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6">
      <p className="text-sm text-muted-app sm:col-span-2">{t('applications.publicHint')}</p>
      <label className="text-sm font-medium text-text-app">
        <ApplicationFieldLabel text={t('applications.clubName')} required={true} />
        <AppInput
          className="mt-1.5 block w-full"
          maxLength={200}
          value={currentDraft.clubName}
          {...field.control('clubName')}
          onChange={(event) => change('clubName', event.target.value)}
        />
        <AppFieldError message={field.error('clubName')} />
        <span className="mt-1 block text-xs font-normal text-muted-app">
          {t('applications.clubNameHint')}
        </span>
      </label>
      <div className="text-sm font-medium">
        <ApplicationFieldLabel text={t('applications.field')} required={true} />
        {fieldOptions.length ? (
          <AppSelect
            className="mt-1.5 w-full"
            label={t('applications.field')}
            required
            invalid={Boolean(field.error('fieldId'))}
            value={currentDraft.fieldId}
            onChange={(value) => {
              change('fieldId', value)
              field.touch('fieldId')
            }}
            options={[{ value: '', label: t('applications.fieldPlaceholder') }, ...fieldOptions]}
          />
        ) : (
          <p className="mt-2 text-sm font-normal text-danger-app">{t('applications.noFields')}</p>
        )}
        <AppFieldError message={field.error('fieldId')} />
      </div>
      <label className="text-sm font-medium text-text-app sm:col-span-2">
        <ApplicationFieldLabel text={t('applications.summary')} required={required.summary} />
        <AppTextarea
          className="mt-1.5 block w-full"
          maxLength={1000}
          rows={2}
          value={currentDraft.summary}
          {...field.control('summary', required.summary)}
          onChange={(event) => change('summary', event.target.value)}
        />
        <AppFieldError message={field.error('summary')} />
        <span className="mt-1 block text-xs font-normal text-muted-app">
          {t('applications.summaryHint')}
        </span>
      </label>
      <label className="text-sm font-medium text-text-app sm:col-span-2">
        <ApplicationFieldLabel text={t('applications.objectives')} required={required.objectives} />
        <AppTextarea
          className="mt-1.5 block w-full"
          maxLength={5000}
          value={currentDraft.objectives}
          {...field.control('objectives', required.objectives)}
          onChange={(event) => change('objectives', event.target.value)}
        />
        <AppFieldError message={field.error('objectives')} />
        <span className="mt-1 block text-xs font-normal text-muted-app">
          {t('applications.objectivesHint')}
        </span>
      </label>
      <label className="text-sm font-medium text-text-app">
        <ApplicationFieldLabel text={t('applications.fanpageUrl')} required={required.fanpageUrl} />
        <AppInput
          className="mt-1.5 block w-full"
          type="url"
          maxLength={2000}
          value={currentDraft.fanpageUrl}
          placeholder={t('applications.fanpagePlaceholder')}
          {...field.control('fanpageUrl', required.fanpageUrl)}
          onChange={(event) => change('fanpageUrl', event.target.value)}
        />
        <AppFieldError message={field.error('fanpageUrl')} />
      </label>
      <label className="text-sm font-medium text-text-app">
        <ApplicationFieldLabel
          text={t('applications.contactEmail')}
          required={required.contactEmail}
        />
        <AppInput
          className="mt-1.5 block w-full"
          type="email"
          maxLength={320}
          value={currentDraft.contactEmail}
          {...field.control('contactEmail', required.contactEmail)}
          onChange={(event) => change('contactEmail', event.target.value)}
        />
        <AppFieldError message={field.error('contactEmail')} />
      </label>
    </section>
  )
}
