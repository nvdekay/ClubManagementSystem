import { useTranslation } from 'react-i18next'

import { AppBadge, type AppBadgeTone } from '@/components/ui/badge/AppBadge'
import type { EventProposalDetail, EventProposalVersion } from '@/services/eventProposalReviews'
import { occurrenceSummary, text } from '@/pages/icpdp/eventProposalReviewFormat'
import { useFormat } from '@/hooks/useFormat'

interface ProposalOverviewSectionProps {
  event: EventProposalDetail['event']
  bookings: EventProposalDetail['bookings']
  current: EventProposalVersion | undefined
}

const label = 'text-xs text-muted-app'

// Tổng quan lịch, địa điểm, đối tượng, rủi ro, xung đột và nội dung thuyết minh đề xuất.
export function ProposalOverviewSection({
  event,
  bookings,
  current,
}: ProposalOverviewSectionProps) {
  const { t, i18n } = useTranslation()
  const { date } = useFormat()
  // Lấy dữ liệu chỉ đọc từ lần nộp được chọn, chấp nhận trường không có trong hồ sơ cũ.
  const payload = current?.payload ?? {}
  const occurrences = Array.isArray(payload.occurrences)
    ? (payload.occurrences as {
        startAt?: string
        endAt?: string
        propertyId?: string
        venueText?: string
      }[])
    : []
  const conflictMessage =
    event.conflictDetail && typeof event.conflictDetail === 'object'
      ? text((event.conflictDetail as Record<string, unknown>).message)
      : undefined
  const conflictTone: AppBadgeTone =
    event.conflictResult === 'Blocking Conflict'
      ? 'danger'
      : event.conflictResult === 'Warning'
        ? 'warning'
        : 'success'
  return (
    <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      {/* Tổng quan lịch, địa điểm, đối tượng, rủi ro, xung đột và nội dung thuyết minh đề xuất. */}
      <h2 className="font-heading text-base font-semibold">{t('eventReviews.overview')}</h2>
      <dl className="mt-4 grid gap-5 sm:grid-cols-2">
        <div>
          <dt className={label}>{t('eventReviews.when')}</dt>
          <dd className="mt-1 font-medium">
            {date(event.startAt)} – {date(event.endAt)}
          </dd>
        </div>
        <div>
          <dt className={label}>{t('eventReviews.where')}</dt>
          <dd className="mt-1 font-medium break-words">
            {event.property
              ? `${event.property.code} · ${event.property.name}`
              : (event.venueText ?? '—')}
          </dd>
        </div>
        <div>
          <dt className={label}>{t('eventReviews.audience')}</dt>
          <dd className="mt-1 font-medium">
            {event.audienceScope === 'MEMBERS_ONLY'
              ? t('eventReviews.audienceMembers')
              : t('eventReviews.audiencePublic')}
          </dd>
        </div>
        <div>
          <dt className={label}>{t('eventReviews.capacity')}</dt>
          <dd className="mt-1 font-medium">
            {t('eventReviews.capacityValue', { count: event.capacity })}
          </dd>
        </div>

        <div>
          <dt className={label}>{t('eventReviews.conflict')}</dt>
          <dd className="mt-1 space-y-1">
            <AppBadge tone={conflictTone}>
              {event.conflictResult === 'Blocking Conflict'
                ? t('eventReviews.conflictBlocking')
                : event.conflictResult === 'Warning'
                  ? t('eventReviews.conflictWarning')
                  : t('eventReviews.conflictNone')}
            </AppBadge>
            {conflictMessage && <p className="text-sm text-muted-app">{conflictMessage}</p>}
          </dd>
        </div>
        {(
          [
            ['objective', text(payload.objective) ?? event.objective],
            ['plan', text(payload.plan)],
            ['riskNote', text(payload.riskNote)],
            ['facilityNeeds', text(payload.facilityNeeds)],
          ] as const
        )
          .filter(([, value]) => value)
          .map(([key, value]) => (
            <div key={key} className="sm:col-span-2">
              <dt className={label}>
                {key === 'objective'
                  ? t('eventReviews.objective')
                  : key === 'plan'
                    ? t('eventReviews.plan')
                    : key === 'riskNote'
                      ? t('eventReviews.riskNote')
                      : t('eventReviews.facilityNeeds')}
              </dt>
              <dd className="mt-2 leading-7 break-words whitespace-pre-wrap">{value}</dd>
            </div>
          ))}
        {occurrences.length > 0 && (
          <div className="sm:col-span-2">
            <dt className={label}>{t('eventReviews.occurrences')}</dt>
            <dd className="mt-2">
              <ul className="space-y-1 text-sm">
                {occurrences.map((item, index) => (
                  <li key={index}>{occurrenceSummary(t, i18n.language, event, bookings, item)}</li>
                ))}
              </ul>
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
