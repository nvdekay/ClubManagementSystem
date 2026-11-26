import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppButton } from '@/components/ui/button/AppButton'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useAuth } from '@/hooks/useAuth'
import { usePolicies } from '@/hooks/usePolicy'
import {
  CLUB_PROFILE_FORM_FIELDS,
  FOUNDING_FORM_FIELDS,
  type PolicyVersion,
} from '@/services/policy'
import { cn } from '@/utils/cn'
import { PolicyEditor } from '@/pages/icpdp/PolicyEditor'
import {
  deadlineLabelKey,
  foundingFieldKey,
  profileFieldKey,
  sectionAppliesKey,
  sectionIcon,
  sectionTitleKey,
  type PolicySection,
} from '@/pages/icpdp/policyEditorForm'
import { formatDate } from '@/utils/formatDate'

const deadlineFields = [
  'dueDaysAfterPeriodEnd',
  'remindBeforeDays',
  'overdueAfterDays',
  'escalateAfterDays',
] as const

type PolicyView = 'current' | 'edit' | 'history'

// Thẻ một nhóm chính sách: icon, tiêu đề, phạm vi áp dụng và nội dung
function OverviewCard({ section, children }: { section: PolicySection; children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft-app text-primary-app">
          <AppIcon name={sectionIcon(section)} className="size-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-semibold">{t(sectionTitleKey(section))}</h3>
          <p className="mt-0.5 text-xs text-muted-app">
            {t('policy.appliesTo', { flows: t(sectionAppliesKey(section)) })}
          </p>
        </div>
      </div>
      <div className="mt-4 flex-1 space-y-3 text-sm">{children}</div>
    </section>
  )
}

// Một dòng nhãn – giá trị trong thẻ tổng quan
function ValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border-app pb-2 last:border-b-0 last:pb-0">
      <span className="text-muted-app">{label}</span>
      <span className="shrink-0 text-right font-semibold text-text-app tabular-nums">{value}</span>
    </div>
  )
}

// Danh sách mục bắt buộc / không bắt buộc dưới dạng nhãn nhỏ
function RequirementChips({ items }: { items: { label: string; required: boolean }[] }) {
  const { t } = useTranslation()
  const groups = [
    { key: 'required', title: t('policy.required'), list: items.filter((i) => i.required) },
    { key: 'optional', title: t('policy.optional'), list: items.filter((i) => !i.required) },
  ]
  return (
    <div className="space-y-3">
      {groups.map(
        (group) =>
          group.list.length > 0 && (
            <div key={group.key}>
              <p className="text-xs font-medium tracking-wide text-muted-app uppercase">
                {group.title}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {group.list.map((item) => (
                  <li
                    key={item.label}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs',
                      group.key === 'required'
                        ? 'border-primary-app/25 bg-primary-soft-app font-medium text-primary-app'
                        : 'border-border-app text-muted-app',
                    )}
                  >
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          ),
      )}
    </div>
  )
}

// Tổng quan các quy định của một phiên bản chính sách, chia thẻ theo nhóm
function PolicyOverview({ version, language }: { version: PolicyVersion; language: string }) {
  const { t } = useTranslation()
  // Nhãn có/không dạng badge
  function yesNo(value: boolean) {
    return (
      <AppBadge tone={value ? 'success' : 'neutral'}>
        {t(value ? 'policy.yes' : 'policy.no')}
      </AppBadge>
    )
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <OverviewCard section="founding">
        <ValueRow label={t('policy.minFounders')} value={version.minFoundingMembers} />
        <RequirementChips
          items={[
            { label: t('policy.fieldClubName'), required: true },
            { label: t('policy.fieldClubField'), required: true },
            ...FOUNDING_FORM_FIELDS.map((field) => ({
              label: t(foundingFieldKey(field)),
              required: version.formRequirements.clubFounding[field],
            })),
          ]}
        />
      </OverviewCard>

      <OverviewCard section="profile">
        <RequirementChips
          items={CLUB_PROFILE_FORM_FIELDS.map((field) => ({
            label: t(profileFieldKey(field)),
            required: version.formRequirements.clubProfile[field],
          }))}
        />
      </OverviewCard>

      <OverviewCard section="events">
        <ValueRow label={t('policy.feedbackWindow')} value={version.feedbackWindowHours} />
        <ValueRow label={t('policy.feedbackMinimum')} value={version.feedbackMinRespondents} />
        <ValueRow label={t('policy.conflictMinutes')} value={version.conflictThresholdMinutes} />
        <ValueRow label={t('policy.overbooking')} value={yesNo(version.allowOverbooking)} />
      </OverviewCard>

      <OverviewCard section="calendar">
        <ul className="space-y-2">
          {version.academicCalendar.map((item) => (
            <li
              key={item.code}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-surface-app px-3 py-2"
            >
              <span className="rounded-md bg-bg-app px-2 py-0.5 text-xs font-semibold shadow-xs">
                {item.code}
              </span>
              <span className="text-muted-app">
                {formatDate(item.startAt, language)} – {formatDate(item.endAt, language)}
              </span>
            </li>
          ))}
        </ul>
      </OverviewCard>

      <OverviewCard section="reports">
        {version.reportDeadlines.map((item) => (
          <div key={item.reportType} className="rounded-xl bg-surface-app p-3">
            <p className="font-semibold">
              {item.reportType === 'PERIODIC'
                ? t('common.navPeriodicReports')
                : item.reportType === 'POST_EVENT'
                  ? t('common.navEventReports')
                  : item.reportType}
            </p>
            <dl className="mt-2 space-y-1.5">
              {deadlineFields.map((field) => (
                <div key={field} className="flex items-baseline justify-between gap-4">
                  <dt className="text-xs text-muted-app">{t(deadlineLabelKey(field))}</dt>
                  <dd className="shrink-0 font-semibold tabular-nums">{item[field]}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <ValueRow
          label={t('policy.overdueBlock')}
          value={yesNo(version.enforceOverdueReportBlock)}
        />
      </OverviewCard>

      <OverviewCard section="finance">
        {version.schoolRefundAccount ? (
          <>
            <ValueRow
              label={t('policy.refundAccountHolder')}
              value={version.schoolRefundAccount.accountHolder}
            />
            <ValueRow
              label={t('policy.refundAccountNumber')}
              value={version.schoolRefundAccount.accountNumber}
            />
            <ValueRow
              label={t('policy.refundBankName')}
              value={version.schoolRefundAccount.bankName}
            />
            {version.schoolRefundAccount.bankBranch && (
              <ValueRow
                label={t('policy.refundBankBranch')}
                value={version.schoolRefundAccount.bankBranch}
              />
            )}
            {version.schoolRefundAccount.transferNote && (
              <ValueRow
                label={t('policy.refundTransferNote')}
                value={version.schoolRefundAccount.transferNote}
              />
            )}
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-border-app px-3 py-4 text-center text-muted-app">
            {t('policy.refundAccountNotConfigured')}
          </p>
        )}
      </OverviewCard>
    </div>
  )
}

// Trang xem chính sách hiện hành, tạo phiên bản mới và lịch sử các phiên bản
export function PolicyPage() {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const isOfficer = auth.data?.systemRoles.includes('ICPDP_OFFICER') ?? false
  const policies = usePolicies(isOfficer)
  const [chosenView, setView] = useState<PolicyView | null>(null)
  const view: PolicyView = chosenView ?? (policies.data?.current ? 'current' : 'edit')
  // Định dạng ngày giờ theo ngôn ngữ hiện tại
  function date(value: string): string {
    return formatDate(value, i18n.language)
  }
  const views: { key: PolicyView; label: string; icon: 'shield' | 'filePlus' | 'history' }[] = [
    { key: 'current', label: t('policy.current'), icon: 'shield' },
    { key: 'edit', label: t('policy.formTitle'), icon: 'filePlus' },
    { key: 'history', label: t('policy.history'), icon: 'history' },
  ]

  return (
    <>
      <PageHeader title={t('policy.title')} description={t('policy.description')} />

      {auth.isPending ? (
        <AppSkeleton className="h-44 w-full" />
      ) : auth.isError ? (
        <AppNotice tone="danger" role="alert" title={auth.error.message}>
          <AppButton onClick={() => void auth.refetch()}>{t('policy.retry')}</AppButton>
        </AppNotice>
      ) : !auth.data ? (
        <AppNotice>
          <p>{t('policy.signIn')}</p>
          <Link
            className="font-semibold text-primary-app"
            to="/login?returnTo=%2Fworkspace%2Fpolicy"
          >
            {t('policy.signInLink')}
          </Link>
        </AppNotice>
      ) : !isOfficer ? (
        <AppNotice tone="danger" role="alert">
          {t('policy.forbidden')}
        </AppNotice>
      ) : policies.isPending ? (
        <AppSkeleton className="h-44 w-full" />
      ) : policies.isError ? (
        <AppNotice
          tone="danger"
          role="alert"
          title={`${t('policy.loadError')} ${policies.error.message}`}
        >
          <AppButton onClick={() => void policies.refetch()}>{t('policy.retry')}</AppButton>
        </AppNotice>
      ) : (
        <div className="space-y-5">
          <div
            role="tablist"
            aria-label={t('policy.title')}
            className="flex w-full max-w-full gap-1 overflow-x-auto rounded-xl border border-border-app bg-surface-app p-1 sm:w-fit"
          >
            {views.map((item) => (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={view === item.key}
                onClick={() => setView(item.key)}
                className={cn(
                  'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-medium whitespace-nowrap text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app',
                  { 'bg-segment-app text-text-app shadow-xs': view === item.key },
                )}
              >
                <AppIcon name={item.icon} className="size-4" />
                {item.label}
                {item.key === 'history' && policies.data.versions.length > 0 && (
                  <span className="rounded-full bg-surface-strong-app px-1.5 text-xs tabular-nums">
                    {policies.data.versions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {view === 'current' &&
            (policies.data.current ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border-app bg-bg-app px-5 py-4 shadow-xs">
                  <span className="grid size-9 place-items-center rounded-xl bg-mint-soft-app text-success-app">
                    <AppIcon name="check" className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-sm font-semibold">{t('policy.current')}</p>
                    <p className="text-xs text-muted-app">
                      {t('policy.currentFrom', { date: date(policies.data.current.effectiveFrom) })}
                    </p>
                  </div>
                  <AppButton variant="secondary" onClick={() => setView('edit')}>
                    <AppIcon name="filePlus" className="size-4" />
                    {t('policy.formTitle')}
                  </AppButton>
                </div>
                <PolicyOverview version={policies.data.current} language={i18n.language} />
              </div>
            ) : (
              <AppEmptyState message={t('policy.noCurrent')} />
            ))}

          {view === 'edit' && (
            <PolicyEditor
              key={policies.data.versions[0]?.id ?? 'first'}
              latest={policies.data.versions[0]}
              csrfToken={auth.data.csrfToken}
              onSaved={() => setView('current')}
            />
          )}

          {view === 'history' &&
            (policies.data.versions.length === 0 ? (
              <AppEmptyState message={t('policy.noHistory')} />
            ) : (
              <ol className="space-y-3">
                {policies.data.versions.map((version) => {
                  const scheduled = new Date(version.effectiveFrom) > new Date()
                  return (
                    <li
                      key={version.id}
                      className="rounded-2xl border border-border-app bg-bg-app shadow-xs"
                    >
                      <details className="group">
                        <summary className="flex list-none flex-wrap items-center gap-3 px-5 py-4">
                          <AppIcon
                            name="chevronRight"
                            className="size-4 text-muted-app transition-transform group-open:rotate-90"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{date(version.effectiveFrom)}</p>
                            <p className="mt-0.5 text-xs text-muted-app">
                              {t('policy.created', { date: date(version.createdAt) })} ·{' '}
                              {t('policy.minFounders')}: {version.minFoundingMembers}
                            </p>
                          </div>
                          <AppBadge tone={scheduled ? 'info' : 'success'}>
                            {scheduled ? t('policy.scheduled') : t('policy.effective')}
                          </AppBadge>
                          <span className="text-sm font-semibold text-primary-app">
                            {t('policy.showDetails')}
                          </span>
                        </summary>
                        <div className="border-t border-border-app p-5">
                          <PolicyOverview version={version} language={i18n.language} />
                        </div>
                      </details>
                    </li>
                  )
                })}
              </ol>
            ))}
        </div>
      )}
    </>
  )
}
