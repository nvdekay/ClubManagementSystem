import { useTranslation } from 'react-i18next'

import type { EventProposalVersion } from '@/services/eventProposalReviews'
import { formatDate } from '@/utils/formatDate'
import { formatMoney } from '@/utils/formatMoney'

// Lịch sử nộp ghi số phiên bản, người nộp, thời gian và tổng kinh phí đề nghị.
export function ProposalSubmissionHistory({ versions }: { versions: EventProposalVersion[] }) {
  const { t, i18n } = useTranslation()
  function date(value: string) {
    return formatDate(value, i18n.language)
  }
  function money(value: number) {
    return formatMoney(value, i18n.language)
  }
  return (
    <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      {/* Lịch sử nộp ghi số phiên bản, người nộp, thời gian và tổng kinh phí đề nghị. */}
      <h2 className="font-heading text-base font-semibold">{t('eventReviews.history')}</h2>
      <ol className="mt-4 ml-1 space-y-4 border-l-2 border-border-app pl-5">
        {versions.map((version) => (
          <li key={version.id} className="relative">
            <span
              aria-hidden="true"
              className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full bg-brand-app"
            />
            <p className="font-medium">
              {t('eventReviews.revision', { number: version.revisionNo })}
              {version.requestedBudgetTotal > 0 && (
                <span className="font-normal text-muted-app">
                  {' '}
                  · {money(version.requestedBudgetTotal)}
                </span>
              )}
            </p>
            <p className="text-sm text-muted-app">
              {t('eventReviews.submittedBy', {
                name: version.submittedByName ?? version.submittedBy,
                date: date(version.submittedAt),
              })}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
