import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import type { ViolationDetail, ViolationStep } from '@/services/violations'
import { actionStateLabel, actionStateTone } from '@/pages/icpdp/violationFormat'
import { documentHref } from '@/utils/documentLinks'
import { formatDay } from '@/utils/formatDate'

interface ViolationActionsSectionProps {
  item: ViolationDetail
  pending: boolean
  run: (next: ViolationStep, confirmText?: string) => Promise<boolean>
}

// Các hành động khắc phục đã giao: minh chứng CLB nộp và nút xác nhận đạt / không đạt
export function ViolationActionsSection({ item, pending, run }: ViolationActionsSectionProps) {
  const { t, i18n } = useTranslation()
  function day(value: string) {
    return formatDay(value, i18n.language)
  }
  return (
    <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{t('violations.actions')}</h2>
      {item.actions.length ? (
        <ul className="mt-4 divide-y divide-border-app overflow-hidden rounded-2xl border border-border-app bg-bg-app shadow-xs">
          {item.actions.map((action) => (
            <li key={action.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1 basis-56">
                <p className="font-medium break-words">{action.description}</p>
                {action.submission && (
                  <div className="my-2 rounded-lg bg-surface-app p-3">
                    <p className="whitespace-pre-wrap break-words">{action.submission.note}</p>
                    {action.submission.evidence.map((e, n) => (
                      <p key={n} className="break-words">
                        {e.note !== e.url && e.note}{' '}
                        {e.url && (
                          <a
                            href={documentHref(e.url) ?? undefined}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary-app hover:underline"
                          >
                            {e.url}
                          </a>
                        )}
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-app">
                  {t('violations.actionDue')}: {day(action.dueAt)}
                  {action.linkedLifecycleAction &&
                    ` · ${action.linkedLifecycleAction === 'SUSPEND' ? t('violations.actionLinkSUSPEND') : t('violations.actionLinkDISSOLVE')}`}
                </p>
              </div>
              {action.state === 'Pending' && item.state === 'Corrective Action' ? (
                action.submission || new Date(action.dueAt) <= new Date() ? (
                  <div className="flex flex-wrap gap-2">
                    {action.submission && (
                      <AppButton
                        variant="secondary"
                        disabled={pending}
                        onClick={() =>
                          void run({
                            type: 'verifyAction',
                            actionId: action.id,
                            outcome: 'Verified',
                          })
                        }
                      >
                        {t('violations.markVerified')}
                      </AppButton>
                    )}
                    <AppButton
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        void run({
                          type: 'verifyAction',
                          actionId: action.id,
                          outcome: 'Failed',
                        })
                      }
                    >
                      {t('violations.markFailed')}
                    </AppButton>
                  </div>
                ) : (
                  <p className="text-sm text-muted-app">{t('violations.awaitingEvidence')}</p>
                )
              ) : (
                <AppBadge tone={actionStateTone(action.state)}>
                  {actionStateLabel(t, action.state)}
                </AppBadge>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <AppEmptyState message={t('violations.noActions')} />
        </div>
      )}
      {item.actions.some((action) => action.linkedLifecycleAction) && (
        <Link
          to="/icpdp/clubs"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary-app hover:underline"
        >
          {t('violations.manageClub')}
          <AppIcon name="external" className="size-3.5" />
        </Link>
      )}
    </section>
  )
}
