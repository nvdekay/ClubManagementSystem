import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppInput } from '@/components/ui/input/AppInput'
import { appToast } from '@/components/ui/toast/AppToast'
import { useCreatePolicy } from '@/hooks/usePolicy'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard'
import { PolicyConflictError, type CreatePolicyInput, type PolicyVersion } from '@/services/policy'
import {
  errorSection,
  formErrors,
  impactEntityKey,
  impactReasonKey,
  initialForm,
  payload,
  sectionAppliesKey,
  sectionIcon,
  sections,
  sectionTitleKey,
  SectionError,
  type PolicyForm,
  type PolicySection,
} from '@/pages/icpdp/policyEditorForm'
import { PolicyCalendarSection } from '@/pages/icpdp/PolicyCalendarSection'
import { PolicyEventsSection } from '@/pages/icpdp/PolicyEventsSection'
import { PolicyFinanceSection } from '@/pages/icpdp/PolicyFinanceSection'
import { PolicyFoundingSection } from '@/pages/icpdp/PolicyFoundingSection'
import { PolicyProfileSection } from '@/pages/icpdp/PolicyProfileSection'
import { PolicyReportsSection } from '@/pages/icpdp/PolicyReportsSection'
import { cn } from '@/utils/cn'

interface PolicyEditorProps {
  latest?: PolicyVersion
  csrfToken: string
  /** Gọi sau khi tạo phiên bản thành công, để trang chuyển về phần chính sách đang hiệu lực. */
  onSaved?: () => void
}

// Form ICPDP tạo phiên bản chính sách mới theo từng nhóm
export function PolicyEditor({ latest, csrfToken, onSaved }: PolicyEditorProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<PolicyForm>(() => initialForm(latest))
  const [section, setSection] = useState<PolicySection>('founding')
  const [localError, setLocalError] = useState<string | null>(null)
  const create = useCreatePolicy()
  // Snapshot of the form as opened, to warn before leaving the page with unsaved edits.
  const [initialSnapshot] = useState(() => JSON.stringify(form))
  const { allowNavigation } = useUnsavedChangesGuard(JSON.stringify(form) !== initialSnapshot)
  const errors = formErrors(t, form)
  const field = useFieldValidation(errors)
  // Nhóm có trường sai, chỉ đánh dấu sau lần bấm lưu đầu tiên
  const invalidSections = new Set(
    localError
      ? Object.keys(errors)
          .filter((key) => errors[key])
          .map(errorSection)
      : [],
  )

  // Kiểm tra form rồi tạo phiên bản chính sách mới
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)
    if (!field.touchAll()) {
      // Trường sai đầu tiên có thể nằm ở nhóm khác, nên mở nhóm đó và giữ dòng tóm tắt.
      const first = Object.keys(errors).find((key) => errors[key])
      if (first) {
        setSection(errorSection(first))
      }
      setLocalError(t('policy.invalidForm'))
      return
    }
    let input: CreatePolicyInput
    try {
      input = payload(form)
    } catch (error) {
      if (error instanceof SectionError) {
        setSection(error.section)
      }
      setLocalError(t('policy.invalidForm'))
      return
    }
    try {
      await create.mutateAsync({ input, csrfToken })
      appToast.success(t('policy.saveSuccess'))
      allowNavigation()
      onSaved?.()
    } catch {
      /* Lỗi của mutation được hiển thị bên dưới. */
    }
  }

  const fieldLabel = 'block text-sm font-medium text-text-app'
  const fieldInput = 'mt-1.5 block w-full'

  const sectionProps = { form, setForm, field }
  const body =
    section === 'founding' ? (
      <PolicyFoundingSection {...sectionProps} />
    ) : section === 'profile' ? (
      <PolicyProfileSection {...sectionProps} />
    ) : section === 'events' ? (
      <PolicyEventsSection {...sectionProps} />
    ) : section === 'calendar' ? (
      <PolicyCalendarSection {...sectionProps} />
    ) : section === 'finance' ? (
      <PolicyFinanceSection {...sectionProps} />
    ) : (
      <PolicyReportsSection {...sectionProps} />
    )

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
      <div className="rounded-2xl border border-border-app bg-bg-app px-5 py-4 shadow-xs">
        <h2 className="font-heading text-base font-semibold">{t('policy.formTitle')}</h2>
        <p className="mt-1 text-sm text-muted-app">{t('policy.formDescription')}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label={t('policy.formTitle')}
          className="min-w-0 lg:sticky lg:top-4 lg:self-start"
        >
          <ul
            role="tablist"
            className="flex gap-1 overflow-x-auto rounded-2xl border border-border-app bg-bg-app p-1.5 shadow-xs lg:flex-col"
          >
            {sections.map((item) => (
              <li key={item} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={section === item}
                  onClick={() => setSection(item)}
                  className={cn(
                    'flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium whitespace-nowrap text-muted-app transition-colors hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app',
                    {
                      'bg-primary-soft-app text-primary-app hover:bg-primary-soft-app hover:text-primary-app':
                        section === item,
                    },
                  )}
                >
                  <AppIcon name={sectionIcon(item)} className="size-4 shrink-0" />
                  <span className="flex-1">{t(sectionTitleKey(item))}</span>
                  {invalidSections.has(item) && (
                    <span className="size-2 rounded-full bg-danger-app" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section
          role="tabpanel"
          className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6"
        >
          <div className="mb-5 flex items-start gap-3 border-b border-border-app pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft-app text-primary-app">
              <AppIcon name={sectionIcon(section)} className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-heading text-base font-semibold">
                {t(sectionTitleKey(section))}
              </h3>
              <p className="mt-0.5 text-sm text-muted-app">
                {t('policy.appliesTo', { flows: t(sectionAppliesKey(section)) })}
              </p>
            </div>
          </div>
          {body}
        </section>
      </div>

      <div className="rounded-2xl border border-border-app bg-bg-app/95 p-5 shadow-sm backdrop-blur lg:sticky lg:bottom-0 lg:z-10">
        <h3 className="font-heading text-sm font-semibold">{t('policy.saveSection')}</h3>
        <div className="mt-3 grid items-start gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className={fieldLabel}>
            {t('policy.effectiveFrom')}
            <AppInput
              className={fieldInput}
              type="datetime-local"
              value={form.effectiveFrom}
              onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })}
            />
            <span className="mt-1 block text-xs font-normal text-muted-app">
              {t('policy.effectiveHint')}
            </span>
          </label>
          <label className={fieldLabel}>
            {t('policy.reason')}
            <AppInput
              className={fieldInput}
              maxLength={1000}
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </label>
          <AppButton type="submit" className="lg:mt-7" disabled={create.isPending}>
            {create.isPending ? t('policy.saving') : t('policy.save')}
          </AppButton>
        </div>
        {localError && (
          <p role="alert" className="mt-3 text-sm text-danger-app">
            {localError}
          </p>
        )}
        {create.isError && create.error instanceof PolicyConflictError ? (
          <div
            role="alert"
            className="mt-3 max-h-64 overflow-y-auto rounded-xl border-l-4 border-danger-app bg-danger-app/10 px-4 py-3 text-sm"
          >
            <p className="font-semibold text-danger-app">{t('policy.impactTitle')}</p>
            <p className="mt-1 text-text-app">{t('policy.impactDescription')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-text-app">
              {create.error.affectedRecords.map((record) => (
                <li key={`${record.entityType}:${record.entityId}`}>
                  <span className="font-medium">{t(impactEntityKey(record.entityType))}</span> ·{' '}
                  {record.entityId}:{' '}
                  {record.reasons.map((reason) => t(impactReasonKey(reason))).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        ) : create.isError ? (
          <p role="alert" className="mt-3 text-sm text-danger-app">
            {t('policy.saveError')} {create.error.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
