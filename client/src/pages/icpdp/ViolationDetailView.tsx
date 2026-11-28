import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useConfirm } from '@/hooks/useConfirm'
import { useViolation, useViolationStep } from '@/hooks/useViolations'
import type { ViolationStep } from '@/services/violations'
import { ViolationActionsSection } from '@/pages/icpdp/ViolationActionsSection'
import { ViolationEvidenceList } from '@/pages/icpdp/ViolationEvidenceList'
import { ViolationNextSteps } from '@/pages/icpdp/ViolationNextSteps'
import {
  historyLabel,
  originLabel,
  severityLabel,
  severityTone,
  stateLabel,
  stateTone,
} from '@/pages/icpdp/violationFormat'
import { useFormat } from '@/hooks/useFormat'
import { AppErrorNotice } from '@/components/ui/notice/AppErrorNotice'
import { AppPanel } from '@/components/ui/panel/AppPanel'

// Chi tiết ca vi phạm và các bước xử lý theo quy trình
export function ViolationDetailView({ id, csrfToken }: { id: string; csrfToken: string }) {
  const { t } = useTranslation()
  const { day } = useFormat()
  const askConfirm = useConfirm()
  const query = useViolation(id, true)
  const step = useViolationStep()
  const [evidenceNote, setEvidenceNote] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const back = { to: '/workspace/violations', label: t('violations.back') }

  if (query.isPending) {
    return (
      <div className="space-y-4">
        <AppSkeleton className="h-10 w-1/2" />
        <AppSkeleton className="h-96 w-full" />
      </div>
    )
  }
  if (query.isError) {
    return (
      <>
        <PageHeader title={t('violations.case')} back={back} />
        <AppErrorNotice
          title={query.error.message || t('violations.loadError')}
          onRetry={() => void query.refetch()}
        />
      </>
    )
  }
  const item = query.data
  const final = item.state === 'Resolved' || item.state === 'Closed'
  const response = item.clubResponse
  const responseOverdue = Boolean(
    response && !response.source && new Date(response.dueAt) < new Date(),
  )
  const decided = item.state === 'Decision Issued' || item.state === 'Corrective Action'
  const label = 'text-xs text-muted-app'

  // Chạy một bước xử lý vi phạm sau khi xác nhận nếu cần
  async function run(next: ViolationStep, confirmText?: string): Promise<boolean> {
    if (confirmText && !(await askConfirm(confirmText))) {
      return false
    }
    try {
      await step.mutateAsync({ id, csrfToken, step: next })
      return true
    } catch {
      return false
    }
  }

  return (
    <>
      <PageHeader
        title={item.title}
        back={back}
        description={`${item.clubName} · ${originLabel(t, item.originType)} · ${t('violations.openedOn', { date: day(item.openedAt) })}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <AppBadge tone={severityTone(item.severity)}>
              {severityLabel(t, item.severity)}
            </AppBadge>
            <AppBadge tone={stateTone(item.state)}>{stateLabel(t, item.state)}</AppBadge>
          </div>
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
            <dl className="grid gap-5 sm:grid-cols-2">
              <div>
                <dt className={label}>{t('violations.club')}</dt>
                <dd className="mt-1 font-medium">
                  {item.clubName} · {item.clubState}
                </dd>
              </div>
              <div>
                <dt className={label}>{t('violations.related')}</dt>
                <dd className="mt-1 font-medium break-words">
                  {item.source
                    ? item.source.kind === 'event'
                      ? t('violations.relatedEvent', { title: item.source.label })
                      : t('violations.relatedBudget', { title: item.source.label })
                    : t('violations.relatedNone')}
                </dd>
              </div>
              {item.description && (
                <div className="sm:col-span-2">
                  <dt className={label}>{t('violations.caseDescription')}</dt>
                  <dd className="mt-2 leading-7 break-words whitespace-pre-wrap">
                    {item.description}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <AppPanel title={t('violations.evidence')}>
            <ViolationEvidenceList items={item.evidence} names={item.names} />
            {!final && (
              <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <AppInput
                  aria-label={t('violations.evidenceNote')}
                  placeholder={t('violations.evidenceNote')}
                  value={evidenceNote}
                  maxLength={1000}
                  onChange={(e) => setEvidenceNote(e.target.value)}
                />
                <AppInput
                  aria-label={t('violations.evidenceUrl')}
                  placeholder={t('violations.evidenceUrl')}
                  value={evidenceUrl}
                  maxLength={500}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                />
                <AppButton
                  variant="secondary"
                  disabled={step.isPending || (!evidenceNote.trim() && !evidenceUrl.trim())}
                  onClick={() =>
                    void run({
                      type: 'addEvidence',
                      evidence: { note: evidenceNote.trim(), url: evidenceUrl.trim() || undefined },
                    }).then((done) => {
                      if (done) {
                        setEvidenceNote('')
                        setEvidenceUrl('')
                      }
                    })
                  }
                >
                  {t('violations.addEvidence')}
                </AppButton>
              </div>
            )}
          </AppPanel>

          {response && (
            <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
              <h2 className="font-heading text-base font-semibold">
                {t('violations.clubResponse')}
              </h2>
              <p className="mt-2 text-sm text-muted-app">
                {t('violations.requestedOn', {
                  date: day(response.requestedAt),
                  due: day(response.dueAt),
                })}
              </p>
              <p className="mt-2 text-sm break-words whitespace-pre-wrap">
                {response.requestMessage}
              </p>
              {response.source ? (
                <div className="mt-4 rounded-2xl border border-border-app bg-bg-app p-4 shadow-xs">
                  <AppBadge tone={response.source === 'NO_RESPONSE' ? 'danger' : 'info'}>
                    {response.source === 'CLUB'
                      ? t('violations.responseByClub')
                      : response.source === 'RECORDED_BY_ICPDP'
                        ? t('violations.responseRecorded')
                        : t('violations.responseNone')}
                  </AppBadge>
                  {response.text && (
                    <p className="mt-3 leading-7 break-words whitespace-pre-wrap">
                      {response.text}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-app">
                  {responseOverdue
                    ? t('violations.responseOverdue')
                    : t('violations.waitingForClub')}
                </p>
              )}
            </section>
          )}

          {item.decisionReason && (
            <AppPanel title={t('violations.decide')}>
              {item.decidedAt && (
                <p className="mt-2 text-sm text-muted-app">
                  {t('violations.decisionOn', { date: day(item.decidedAt) })}
                </p>
              )}
              <p className="mt-2 leading-7 break-words whitespace-pre-wrap">
                {item.decisionReason}
              </p>
              {item.decisionEvidence.length > 0 && (
                <ViolationEvidenceList items={item.decisionEvidence} names={item.names} />
              )}
            </AppPanel>
          )}

          {(decided || item.actions.length > 0) && (
            <ViolationActionsSection item={item} pending={step.isPending} run={run} />
          )}

          <AppPanel title={t('violations.history')}>
            <ol className="mt-5 space-y-4 border-l-2 border-border-app pl-5">
              {item.history.map((entry, index) => (
                <li key={index} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand-app"
                  />
                  <p className="font-semibold">{historyLabel(t, entry.action)}</p>
                  <p className="text-sm text-muted-app">
                    {entry.actorName ? `${entry.actorName} · ` : ''}
                    {day(entry.at)}
                  </p>
                  {entry.reason && <p className="mt-1 text-sm break-words">{entry.reason}</p>}
                </li>
              ))}
            </ol>
          </AppPanel>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
          {final ? (
            <AppNotice role="status">
              {stateLabel(t, item.state)}
              {item.resolvedAt &&
                ` · ${t('violations.resolvedOn', { date: day(item.resolvedAt) })}`}
            </AppNotice>
          ) : (
            <ViolationNextSteps item={item} pending={step.isPending} error={step.error} run={run} />
          )}
          {step.isSuccess && <AppNotice role="status">{t('violations.success')}</AppNotice>}
        </aside>
      </div>
    </>
  )
}
