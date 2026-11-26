import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import type { useBooking } from '@/hooks/useFacilityBookings'
import type { Property } from '@/services/properties'
import { formatDate } from '@/utils/formatDate'

type BookingDetailData = NonNullable<ReturnType<typeof useBooking>['data']>

interface BookingHistoryProps {
  decisions: BookingDetailData['decisions']
  versions: BookingDetailData['versions']
  properties: Property[] | undefined
  interval: (value: { startAt: string; endAt: string }) => string
}

// Lịch sử quyết định và các phiên bản đã gửi của một booking
export function BookingHistory({ decisions, versions, properties, interval }: BookingHistoryProps) {
  const { t, i18n } = useTranslation()
  function date(value: string) {
    return formatDate(value, i18n.language)
  }
  return (
    <>
      {!!decisions.length && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t('facilityBookings.decisions')}</h3>
          {decisions.map((item) => (
            <div
              key={item.id}
              className="space-y-2 rounded-xl border border-border-app bg-bg-app p-4 text-sm"
            >
              <p>
                {t(
                  item.outcome === 'Approve'
                    ? 'facilityBookings.approve'
                    : item.outcome === 'Reject'
                      ? 'facilityBookings.reject'
                      : 'facilityBookings.revision',
                )}{' '}
                · {date(item.at)}
              </p>
              <p className="break-words">{item.reason}</p>
              {item.reviewNote && <p className="break-words">{item.reviewNote}</p>}
              {item.overbookingReason && (
                <p className="break-words">
                  {t('facilityBookings.overbookingReason')}: {item.overbookingReason}
                </p>
              )}
              {item.alternative && (
                <>
                  <p>
                    {t('facilityBookings.alternative')}:{' '}
                    {properties?.find((value) => value.id === item.alternative?.propertyId)?.name}·{' '}
                    {interval(item.alternative)}
                  </p>
                </>
              )}
            </div>
          ))}
        </section>
      )}
      {!!versions.length && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t('facilityBookings.history')}</h3>
          {versions.map((item) => (
            <details
              key={item.versionNo}
              className="rounded-xl border border-border-app bg-bg-app p-4 text-sm"
            >
              <summary>
                {t('facilityBookings.version', { number: item.versionNo })} ·{' '}
                {date(item.submittedAt)}
              </summary>
              <div className="mt-3 space-y-2 text-sm">
                <p className="break-words">{item.payload.purpose}</p>
                <p>
                  {properties?.find((value) => value.id === item.payload.propertyId)?.name ??
                    item.payload.propertyId}
                </p>
                <p>{interval(item.payload)}</p>
                <p>
                  {t('facilityBookings.headcount')}: {item.payload.headcount}
                </p>
                <p>{item.payload.equipment.join(', ')}</p>
                {item.payload.eventId && (
                  <Link
                    className="text-primary-app hover:underline"
                    to={`/events/${item.payload.eventId}`}
                  >
                    {t('facilityBookings.eventId')}
                  </Link>
                )}
              </div>
            </details>
          ))}
        </section>
      )}
    </>
  )
}
