import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppDialog } from '@/components/ui/dialog/AppDialog'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useAuth } from '@/hooks/useAuth'
import { useEventDefenseActions } from '@/hooks/useEventDefense'
import type { EventDefenseSession } from '@/services/eventDefense'
import { ClubEventField } from '@/pages/club/ClubEventField'
import { defenseStateTone } from '@/pages/club/clubEventFormat'

interface ClubEventDefenseCardProps {
  clubId: string
  eventId: string
  session: EventDefenseSession
  format: Intl.DateTimeFormat
  renderedAt: number
}

// Thẻ buổi bảo vệ đề xuất của CLB: xác nhận tham dự hoặc xin dời lịch (hộp thoại riêng)
export function ClubEventDefenseCard({
  clubId,
  eventId,
  session: ds,
  format,
  renderedAt,
}: ClubEventDefenseCardProps) {
  const { t } = useTranslation()
  const auth = useAuth()
  const defenseAction = useEventDefenseActions()
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [rescheduleReason, setRescheduleReason] = useState('')
  const within24h = new Date(ds.startAt).getTime() - renderedAt < 24 * 3600_000
  return (
    <>
      <div className="mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-heading text-sm font-semibold">{t('eventDefense.clubCardTitle')}</h3>
          <AppBadge tone={defenseStateTone(ds.state)}>
            {t(`eventDefense.state_${ds.state}`)}
          </AppBadge>
        </div>
        <p className="font-medium">{ds.title}</p>
        <p className="text-muted-app">
          {format.format(new Date(ds.startAt))} ·{' '}
          {t('eventDefense.durationValue', { minutes: ds.durationMinutes })} · {ds.propertyName}
        </p>
        {ds.note && <p className="whitespace-pre-wrap break-words text-muted-app">{ds.note}</p>}
        {ds.state === 'SCHEDULED' && (
          <AppNotice tone={within24h ? 'warning' : 'info'}>
            {t('eventDefense.clubConfirmNotice')}
          </AppNotice>
        )}
        {ds.confirmedAt && (
          <p className="text-xs text-success-app">
            {t('eventDefense.clubConfirmedLabel', {
              time: format.format(new Date(ds.confirmedAt)),
            })}
          </p>
        )}
        {ds.state === 'RESCHEDULE_REQUESTED' && ds.rescheduleReason && (
          <p className="text-xs text-muted-app">
            {t('eventDefense.rescheduleReasonLabel')}: {ds.rescheduleReason}
          </p>
        )}
        {ds.state === 'NO_SHOW' && (
          <AppNotice tone="danger">{t('eventDefense.clubNoShowBanner')}</AppNotice>
        )}
        {defenseAction.isError && (
          <p role="alert" className="text-danger-app">
            {defenseAction.error.message}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {ds.state === 'SCHEDULED' && auth.data && (
            <AppButton
              type="button"
              disabled={within24h || defenseAction.isPending}
              onClick={() => {
                defenseAction.reset()
                void defenseAction
                  .mutateAsync({
                    kind: 'confirmClub',
                    clubId,
                    eventId,
                    csrfToken: auth.data!.csrfToken,
                  })
                  .catch((error) =>
                    console.error('[ClubEventsPage] confirm defense failed:', error),
                  )
              }}
            >
              {t('eventDefense.clubConfirmButton')}
            </AppButton>
          )}
          {(ds.state === 'SCHEDULED' || ds.state === 'CONFIRMED') && auth.data && (
            <AppButton
              type="button"
              variant="secondary"
              disabled={within24h || defenseAction.isPending}
              onClick={() => {
                defenseAction.reset()
                setRescheduleReason('')
                setRescheduleOpen(true)
              }}
            >
              {t('eventDefense.clubRequestRescheduleButton')}
            </AppButton>
          )}
        </div>
      </div>
      <AppDialog
        open={rescheduleOpen}
        title={t('eventDefense.clubRescheduleDialogTitle')}
        closeLabel={t('clubEvents.close')}
        onClose={() => {
          if (!defenseAction.isPending) {
            setRescheduleOpen(false)
          }
        }}
        footer={
          <AppButton
            type="submit"
            form="club-defense-reschedule-form"
            disabled={defenseAction.isPending || !rescheduleReason.trim()}
          >
            {t('clubEvents.confirm')}
          </AppButton>
        }
      >
        <form
          id="club-defense-reschedule-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (!auth.data || !rescheduleReason.trim()) {
              return
            }
            defenseAction.reset()
            void defenseAction
              .mutateAsync({
                kind: 'requestReschedule',
                clubId,
                eventId,
                reason: rescheduleReason.trim(),
                csrfToken: auth.data.csrfToken,
              })
              .then(() => setRescheduleOpen(false))
              .catch((error) => console.error('[ClubEventsPage] request reschedule failed:', error))
          }}
          className="space-y-4"
        >
          <p className="text-sm text-muted-app">{t('eventDefense.clubRescheduleDeadlineHint')}</p>
          <ClubEventField label={t('eventDefense.clubRescheduleReasonLabel')} required>
            <AppTextarea
              maxLength={2000}
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
            />
          </ClubEventField>
          {defenseAction.isError && (
            <p role="alert" className="text-sm text-danger-app">
              {defenseAction.error.message}
            </p>
          )}
        </form>
      </AppDialog>
    </>
  )
}
