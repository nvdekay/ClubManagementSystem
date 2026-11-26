import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import type { EventReviewDecision } from '@/services/eventProposalReviews'
import { outcomeLabel, reviewSectionLabel } from '@/pages/icpdp/eventProposalReviewFormat'
import { formatDate } from '@/utils/formatDate'

// Quyết định mới nhất hiển thị trước, kèm các mục yêu cầu sửa và lý do đã ghi nhận.
export function ProposalDecisionHistory({ decisions }: { decisions: EventReviewDecision[] }) {
  const { t, i18n } = useTranslation()
  function date(value: string) {
    return formatDate(value, i18n.language)
  }
  return (
    <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      {/* Quyết định mới nhất hiển thị trước, kèm các mục yêu cầu sửa và lý do đã ghi nhận. */}
      <h2 className="font-heading text-base font-semibold">{t('eventReviews.decisions')}</h2>
      {decisions.length ? (
        <ol className="mt-4 space-y-4">
          {[...decisions].reverse().map((decision) => (
            <li key={decision.id} className="border-l-2 border-brand-app pl-3">
              <p className="font-medium">{outcomeLabel(t, decision.outcome)}</p>
              <p className="mt-1 text-xs text-muted-app">
                {t('eventReviews.decidedAt', { date: date(decision.at) })}
              </p>
              {decision.sections.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {decision.sections.map((section) => (
                    <AppBadge key={section} tone="warning">
                      {reviewSectionLabel(t, section)}
                    </AppBadge>
                  ))}
                </div>
              )}
              {decision.reason && <p className="mt-2 text-sm break-words">{decision.reason}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-3">
          <AppEmptyState message={t('eventReviews.noDecisions')} />
        </div>
      )}
    </section>
  )
}
