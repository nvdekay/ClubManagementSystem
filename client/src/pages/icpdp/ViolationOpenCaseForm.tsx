import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useClubLifecycles } from '@/hooks/useClubLifecycle'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import { useOpenViolation, useViolationSources } from '@/hooks/useViolations'
import {
  VIOLATION_ORIGINS,
  VIOLATION_SEVERITIES,
  type ViolationOrigin,
  type ViolationSeverity,
} from '@/services/violations'
import { evidenceLines, originLabel, severityLabel } from '@/pages/icpdp/violationFormat'
import { cn } from '@/utils/cn'
import { formatDay } from '@/utils/formatDate'

// Chọn mức nghiêm trọng bằng ba nút
function SeverityPicker({
  value,
  onChange,
}: {
  value: ViolationSeverity
  onChange: (value: ViolationSeverity) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg border border-border-app bg-surface-app p-1">
      {VIOLATION_SEVERITIES.map((item) => (
        <button
          key={item}
          type="button"
          aria-pressed={value === item}
          onClick={() => onChange(item)}
          className={cn(
            'min-h-11 rounded-md px-2 text-xs font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app sm:min-h-9',
            {
              'bg-segment-app text-text-app shadow-xs hover:text-text-app': value === item,
            },
          )}
        >
          {severityLabel(t, item)}
        </button>
      ))}
    </div>
  )
}

// Form ICPDP mở ca vi phạm mới cho một CLB
export function ViolationOpenCaseForm({
  csrfToken,
  onCancel,
}: {
  csrfToken: string
  onCancel: () => void
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const clubs = useClubLifecycles(true)
  const open = useOpenViolation()
  const [clubId, setClubId] = useState('')
  const [originType, setOriginType] = useState<ViolationOrigin>('OTHER')
  const [severity, setSeverity] = useState<ViolationSeverity>('MINOR')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [related, setRelated] = useState('')
  const [evidence, setEvidence] = useState('')
  const sources = useViolationSources(clubId)
  const field = useFieldValidation({
    clubId: clubId ? null : t('common.chooseRequired'),
    title: title.trim() ? null : t('common.fieldRequired'),
  })

  const relatedOptions = [
    { value: '', label: t('violations.relatedNone') },
    ...(sources.data?.events ?? []).map((event) => ({
      value: event.id,
      label: t('violations.relatedEvent', {
        title: `${event.title} (${formatDay(event.startAt, i18n.language)})`,
      }),
    })),
    ...(sources.data?.budgets ?? []).map((budget) => ({
      value: budget.id,
      label: t('violations.relatedBudget', { title: budget.eventTitle }),
    })),
  ]

  // Kiểm tra form rồi mở ca vi phạm và chuyển tới trang chi tiết
  async function submit() {
    if (!field.touchAll()) {
      return
    }
    try {
      const created = await open.mutateAsync({
        csrfToken,
        input: {
          clubId,
          originType,
          severity,
          title: title.trim(),
          description: description.trim() || undefined,
          originRefId: related || undefined,
          evidence: evidenceLines(evidence),
        },
      })
      navigate(`/workspace/violations/${created.id}`)
    } catch {
      /* Trạng thái mutation được hiển thị bên dưới. */
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{t('violations.openCase')}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="block text-sm font-medium text-text-app">
          {t('violations.club')}
          <AppRequiredMark />
          <AppSelect
            className="mt-1.5 w-full"
            label={t('violations.club')}
            value={clubId}
            required
            invalid={Boolean(field.error('clubId'))}
            onChange={(value) => {
              setClubId(value)
              setRelated('')
              field.touch('clubId')
            }}
            options={[
              { value: '', label: t('violations.chooseClub') },
              ...(clubs.data?.clubs ?? []).map((club) => ({ value: club.id, label: club.name })),
            ]}
          />
          <AppFieldError message={field.error('clubId')} />
        </div>
        <div className="block text-sm font-medium text-text-app">
          {t('violations.origin')}
          <AppSelect
            className="mt-1.5 w-full"
            label={t('violations.origin')}
            value={originType}
            onChange={setOriginType}
            options={VIOLATION_ORIGINS.map((origin) => ({
              value: origin,
              label: originLabel(t, origin),
            }))}
          />
        </div>
        <div className="block text-sm font-medium text-text-app md:col-span-2">
          {t('violations.severity')}
          <SeverityPicker value={severity} onChange={setSeverity} />
        </div>
        <label className="block text-sm md:col-span-2 font-medium text-text-app">
          {t('violations.caseTitle')}
          <AppRequiredMark />
          <AppInput
            className="mt-1.5 w-full font-normal"
            value={title}
            maxLength={200}
            placeholder={t('violations.caseTitleHint')}
            {...field.control('title')}
            onChange={(e) => setTitle(e.target.value)}
          />
          <AppFieldError message={field.error('title')} />
        </label>
        <label className="block text-sm md:col-span-2 font-medium text-text-app">
          {t('violations.caseDescription')}
          <AppTextarea
            className="mt-1.5 min-h-24 w-full font-normal"
            value={description}
            maxLength={5000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        {clubId && (
          <div className="block text-sm font-medium text-text-app md:col-span-2">
            {t('violations.related')}
            <AppSelect
              className="mt-1.5 w-full"
              label={t('violations.related')}
              value={related}
              onChange={setRelated}
              options={relatedOptions}
            />
          </div>
        )}
        <label className="block text-sm md:col-span-2 font-medium text-text-app">
          {t('violations.evidence')}
          <AppTextarea
            className="mt-1.5 min-h-20 w-full font-normal"
            value={evidence}
            placeholder={t('violations.decisionEvidenceHint')}
            onChange={(e) => setEvidence(e.target.value)}
          />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <AppButton disabled={open.isPending} onClick={() => void submit()}>
          {open.isPending ? t('violations.saving') : t('violations.submitOpen')}
        </AppButton>
        <AppButton variant="secondary" onClick={onCancel}>
          {t('violations.cancel')}
        </AppButton>
      </div>
      {open.isError && (
        <p role="alert" className="mt-3 text-sm text-danger-app">
          {open.error.message}
        </p>
      )}
    </section>
  )
}
