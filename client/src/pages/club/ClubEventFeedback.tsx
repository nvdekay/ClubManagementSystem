import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useClubEventFeedback } from '@/hooks/useClubEvents'
import type { ClubEvent } from '@/services/clubEvents'
import { ClubEventErrorMessage } from '@/pages/club/ClubEventErrorMessage'

interface ClubEventFeedbackProps {
  clubId: string
  rows: ClubEvent[]
  eventsPending: boolean
}

// So sánh phản hồi của tối đa 20 sự kiện (mode "feedback", UC49)
export function ClubEventFeedback({ clubId, rows, eventsPending }: ClubEventFeedbackProps) {
  const { t, i18n } = useTranslation()
  const [compare, setCompare] = useState<string[]>([])
  const feedback = useClubEventFeedback(clubId, compare, true)
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
        <h2 className="font-heading text-base font-semibold">{t('clubEvents.compare')}</h2>
        {eventsPending && <AppSkeleton className="mt-4 h-32" />}
        <div className="mt-4 flex flex-wrap gap-2">
          {rows.map((e) => (
            <label
              key={e.id}
              className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-lg border border-border-app bg-bg-app px-3 py-1.5 text-sm break-words transition-colors hover:bg-surface-app has-checked:border-brand-app has-checked:bg-primary-soft-app has-disabled:opacity-50"
            >
              <input
                type="checkbox"
                className="accent-primary-app"
                checked={compare.includes(e.id)}
                disabled={!compare.includes(e.id) && compare.length >= 20}
                onChange={(change) =>
                  setCompare(
                    change.target.checked
                      ? [...compare, e.id]
                      : compare.filter((id) => id !== e.id),
                  )
                }
              />
              <span className="min-w-0">{e.title}</span>
            </label>
          ))}
        </div>
        {!eventsPending && !rows.length && (
          <div className="mt-4">
            <AppEmptyState variant="boxed" message={t('clubEvents.empty')} />
          </div>
        )}
      </div>
      <ClubEventErrorMessage error={feedback.error} />
      {feedback.isPending && compare.length > 0 && <AppSkeleton className="h-40" />}
      <div className="grid gap-4 md:grid-cols-2">
        {feedback.data?.map((f) => (
          <article
            key={f.eventId}
            className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"
          >
            <h3 className="font-heading text-base font-semibold break-words">{f.title}</h3>
            <p className="mt-1 text-sm text-muted-app">
              {t('clubEvents.responses')}: {f.respondents}
            </p>
            {!f.visible ? (
              <p className="mt-3 text-muted-app">{t('clubEvents.noFeedback')}</p>
            ) : (
              <>
                <p className="mt-3">
                  {t('clubEvents.average')}:{' '}
                  <strong>{f.averageRating?.toLocaleString(i18n.language)} / 5</strong>
                </p>
                <div className="mt-3 space-y-2">
                  {[1, 2, 3, 4, 5].map((score) => (
                    <div key={score} className="flex items-center gap-3">
                      <span>{score} ★</span>
                      <div
                        role="meter"
                        aria-label={`${score} / 5`}
                        aria-valuemin={0}
                        aria-valuemax={f.respondents || 1}
                        aria-valuenow={f.distribution?.[score] ?? 0}
                        className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-app"
                      >
                        <div
                          className="h-full rounded-full bg-primary-app"
                          style={{
                            width: `${(100 * (f.distribution?.[score] ?? 0)) / (f.respondents || 1)}%`,
                          }}
                        />
                      </div>
                      <span>{f.distribution?.[score] ?? 0}</span>
                    </div>
                  ))}
                </div>
                <h4 className="mt-4 text-sm font-semibold">{t('clubEvents.comments')}</h4>
                {f.comments?.map((c, index) => (
                  <p key={index} className="mt-2 whitespace-pre-wrap break-words text-muted-app">
                    {c}
                  </p>
                ))}
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
