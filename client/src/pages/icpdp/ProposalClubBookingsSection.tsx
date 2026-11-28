import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppEmptyState } from '@/components/ui/empty-state/AppEmptyState'
import type { EventProposalDetail } from '@/services/eventProposalReviews'
import { obligationLabel } from '@/pages/icpdp/eventProposalReviewFormat'
import { useFormat } from '@/hooks/useFormat'

interface ProposalClubBookingsSectionProps {
  club: EventProposalDetail['club']
  bookings: EventProposalDetail['bookings']
}

// Tình trạng CLB và các booking cơ sở vật chất cung cấp thông tin để xét duyệt.
export function ProposalClubBookingsSection({ club, bookings }: ProposalClubBookingsSectionProps) {
  const { t } = useTranslation()
  const { date } = useFormat()
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
        <h2 className="font-heading text-base font-semibold">{t('eventReviews.clubSection')}</h2>
        <p className="mt-3 text-sm">
          <span className="text-muted-app">{t('eventReviews.clubState')}: </span>
          <span className="font-semibold">{club.name}</span> · {club.state}
        </p>
        {club.obligations.length ? (
          <ul className="mt-3 space-y-2">
            {club.obligations.map((item) => (
              <li key={item}>
                <AppBadge tone="danger">{obligationLabel(t, item)}</AppBadge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <AppEmptyState message={t('eventReviews.noObligations')} />
          </div>
        )}
      </section>
      <section className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
        <h2 className="font-heading text-base font-semibold">{t('eventReviews.bookings')}</h2>
        {bookings.length ? (
          <ul className="mt-3 divide-y divide-border-app text-sm">
            {bookings.map((booking) => (
              <li
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="min-w-0">
                  <span className="block font-medium break-words">
                    {[booking.propertyCode, booking.propertyName].filter(Boolean).join(' · ') ||
                      '—'}
                  </span>
                  <span className="block text-xs text-muted-app">
                    {date(booking.startAt)} – {date(booking.endAt)}
                  </span>
                </span>
                <AppBadge>{booking.state}</AppBadge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3">
            <AppEmptyState message={t('eventReviews.noBookings')} />
          </div>
        )}
        <p className="mt-3 text-xs text-muted-app">{t('eventReviews.bookingsHint')}</p>
      </section>
    </div>
  )
}
