import { useMemo, useState } from 'react'
import { createColumnHelper, useTable } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppTable, appTableFeatures, type AppTableFeatures } from '@/components/ui/table/AppTable'
import { useAuth } from '@/hooks/useAuth'
import { useEventParticipants } from '@/hooks/useClubEvents'
import { useConfirm } from '@/hooks/useConfirm'
import { useNow } from '@/hooks/useNow'
import type { ClubEvent, EventParticipant } from '@/services/clubEvents'
import { ClubEventErrorMessage } from '@/pages/club/ClubEventErrorMessage'
import { ClubEventTablePager } from '@/pages/club/ClubEventTablePager'
import { isInternalState, type ClubEventOperation } from '@/pages/club/clubEventFormat'

const participantsEmpty: EventParticipant[] = []
const participantColumns = createColumnHelper<AppTableFeatures, EventParticipant>()

interface ClubEventAttendanceProps {
  clubId: string
  /** Id trong URL; danh sách người tham gia tải ngay theo id này, kể cả khi danh sách sự kiện chưa về. */
  eventId: string
  active: ClubEvent | undefined
  canManageEvents: boolean
  format: Intl.DateTimeFormat
  actionPending: boolean
  runAction: (action: string, body: object) => Promise<void>
  openOperation: (kind: ClubEventOperation, participant?: EventParticipant | null) => void
}

// Điểm danh của sự kiện đang chọn (mode "attendance", UC31/UC32): thống kê, thao tác và bảng người tham gia
export function ClubEventAttendance({
  clubId,
  eventId,
  active,
  canManageEvents,
  format,
  actionPending,
  runAction,
  openOperation,
}: ClubEventAttendanceProps) {
  const { t } = useTranslation()
  const auth = useAuth()
  const askConfirm = useConfirm()
  // The member check-in window is re-evaluated every 30 seconds; leaders are not limited by it.
  const clockMs = useNow(30_000, !canManageEvents)
  const participants = useEventParticipants(clubId, eventId, true)
  const people = participants.data ?? participantsEmpty
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'checked' | 'missing'>('all')
  // Điểm danh mở khi sự kiện đã công khai và đang diễn ra, cho đến khi chốt danh sách tham dự (UC31, UC32).
  // Sự kiện nội bộ cũ (FINISH…) chỉ để đọc: vẫn tính trong thống kê nhưng không đổi được điểm danh (BR53).
  const legacy = Boolean(active && isInternalState(active.state))
  const published = active?.state === 'Upcoming'
  const finished = active?.state === 'Completed'
  const canCheckIn = Boolean(
    active &&
    !active.attendanceFinalized &&
    ['Upcoming', 'Ongoing', 'Completed'].includes(active.state),
  )
  const checkInStartsAt = active ? Date.parse(active.checkInOpenAt ?? active.startAt) : NaN
  const checkInEndsAt = active ? Date.parse(active.checkInCloseAt ?? active.endAt) : NaN
  const withinCheckInWindow = Boolean(
    active &&
    Number.isFinite(checkInStartsAt) &&
    Number.isFinite(checkInEndsAt) &&
    clockMs >= checkInStartsAt &&
    clockMs < checkInEndsAt,
  )
  const actorCanCheckIn = canCheckIn && (canManageEvents || withinCheckInWindow)
  const confirmedPeople = people.filter((p) => p.state === 'Confirmed' || p.attendanceId)
  const checkedCount = people.filter(
    (p) => p.attendanceId && !p.abnormalFlags.includes('no-show'),
  ).length
  const shownPeople =
    attendanceFilter === 'all'
      ? people
      : attendanceFilter === 'checked'
        ? people.filter((p) => p.attendanceId && !p.abnormalFlags.includes('no-show'))
        : people.filter(
            (p) =>
              p.state === 'Confirmed' && (!p.attendanceId || p.abnormalFlags.includes('no-show')),
          )
  const pcolumns = useMemo(
    () =>
      participantColumns.columns([
        participantColumns.accessor('name', {
          header: t('clubEvents.name'),
          cell: (info) => (
            <span className="block min-w-40 font-medium break-words">
              {info.getValue()}
              <span className="block text-xs font-normal whitespace-nowrap text-muted-app">
                {info.row.original.email}
              </span>
            </span>
          ),
        }),
        participantColumns.accessor('state', {
          header: t('clubEvents.state'),
          cell: (info) => (
            <span>
              {info.getValue()
                ? t(`clubEvents.${info.getValue()}`, { defaultValue: info.getValue() ?? '' })
                : '—'}
              {info.row.original.waitlistPosition ? ` #${info.row.original.waitlistPosition}` : ''}
            </span>
          ),
        }),
        participantColumns.accessor('checkedInAt', {
          header: t('clubEvents.checkInColumn'),
          cell: (info) => {
            const row = info.row.original
            if (!row.attendanceId) {
              return <span className="text-muted-app">{t('clubEvents.notCheckedIn')}</span>
            }
            if (row.abnormalFlags.includes('no-show')) {
              return <span className="text-danger-app">{t('clubEvents.noShow')}</span>
            }
            return (
              <span className="text-success-app">
                {row.checkedInAt ? format.format(new Date(row.checkedInAt)) : '✓'}
                <br />
                <span className="text-muted-app">
                  {row.method === 'self'
                    ? t('clubEvents.methodSelf')
                    : t('clubEvents.methodManual')}
                </span>
              </span>
            )
          },
        }),
        participantColumns.accessor('abnormalFlags', {
          header: t('clubEvents.flags'),
          cell: (info) => (
            <div className="flex flex-col gap-1">
              {info.getValue().map((flag) => (
                <span key={flag}>{t(`clubEvents.${flag}`, { defaultValue: flag })}</span>
              ))}
              {info.row.original.correctionReason && (
                <p className="text-muted-app">{info.row.original.correctionReason}</p>
              )}
            </div>
          ),
        }),
        participantColumns.display({
          id: 'actions',
          header: t('clubEvents.action'),
          cell: (info) => (
            <div className="flex flex-wrap gap-2">
              {actorCanCheckIn &&
                info.row.original.state === 'Confirmed' &&
                !info.row.original.attendanceId && (
                  <AppButton onClick={() => openOperation('check-in', info.row.original)}>
                    {t('clubEvents.checkInRow')}
                  </AppButton>
                )}
              {canManageEvents && info.row.original.state === 'Waitlisted' && published && (
                <AppButton
                  disabled={actionPending}
                  onClick={() =>
                    void runAction('promote', { registrationId: info.row.original.registrationId })
                  }
                >
                  {t('clubEvents.promote')}
                </AppButton>
              )}
              {canManageEvents && finished && !active?.attendanceFinalized && (
                <AppButton onClick={() => openOperation('correct', info.row.original)}>
                  {t('clubEvents.correct')}
                </AppButton>
              )}
            </div>
          ),
        }),
      ]),
    [
      t,
      active,
      actionPending,
      runAction,
      openOperation,
      actorCanCheckIn,
      canManageEvents,
      published,
      finished,
      format,
    ],
  )
  const ptable = useTable({
    features: appTableFeatures,
    columns: pcolumns,
    data: shownPeople,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })
  if (!active) {
    return null
  }
  return (
    <section
      id="club-event-detail"
      className="mt-6 scroll-mt-24 space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 text-sm shadow-xs"
    >
      <h2 className="font-heading text-base font-semibold break-words">{active.title}</h2>
      <p>
        {t('clubEvents.registeredOfCapacity', {
          count: active.confirmedRegistrationCount,
          capacity: active.capacity,
        })}
        {' · '}
        <strong>
          {t('clubEvents.checkInStats', {
            checked: checkedCount,
            confirmed: confirmedPeople.length,
          })}
        </strong>
      </p>
      {active.checkInOpenAt && active.checkInCloseAt && (
        <p className="text-sm text-muted-app">
          {t('clubEvents.checkInWindow')}: {format.format(new Date(active.checkInOpenAt))} –{' '}
          {format.format(new Date(active.checkInCloseAt))}
        </p>
      )}
      {legacy && <AppNotice tone="info">{t('clubEvents.legacyAttendanceReadOnly')}</AppNotice>}
      {!legacy && !canCheckIn && !active.attendanceFinalized && (
        <AppNotice tone="warning">
          {active.state === 'Approved' && active.publishedAt
            ? t('clubEvents.checkInRepublish')
            : t('clubEvents.checkInNotOpen')}
        </AppNotice>
      )}
      {canCheckIn && !canManageEvents && !withinCheckInWindow && (
        <AppNotice tone="info">{t('clubEvents.memberCheckInOutsideWindow')}</AppNotice>
      )}
      {active.checkInCode && (
        <p>
          {t('clubEvents.code')}: <strong>{active.checkInCode}</strong>
        </p>
      )}
      {active.attendanceFinalized && <p>{t('clubEvents.attendanceLocked')}</p>}
      <ClubEventErrorMessage error={participants.error} />
      <div className="flex flex-wrap gap-2">
        {canManageEvents && published && (
          <AppButton onClick={() => openOperation('capacity')}>
            {t('clubEvents.maxParticipants')}
          </AppButton>
        )}
        {actorCanCheckIn && (
          <AppButton onClick={() => openOperation('check-in')}>{t('clubEvents.checkin')}</AppButton>
        )}
        {canManageEvents && finished && !active.attendanceFinalized && (
          <AppButton
            disabled={actionPending}
            onClick={async () => {
              if (await askConfirm(t('clubEvents.confirmFinalize'))) {
                void runAction('attendance/finalize', {})
              }
            }}
          >
            {t('clubEvents.finalize')}
          </AppButton>
        )}
        {!legacy &&
          active.attendanceFinalized &&
          auth.data?.systemRoles.includes('ICPDP_OFFICER') && (
            <AppButton onClick={() => openOperation('unlock')}>{t('clubEvents.unlock')}</AppButton>
          )}
      </div>
      <div className="w-full sm:w-64">
        <AppSelect
          label={t('clubEvents.attendanceFilter')}
          value={attendanceFilter}
          onChange={(value) => {
            setAttendanceFilter(value as typeof attendanceFilter)
            ptable.setPageIndex(0)
          }}
          options={[
            { value: 'all', label: t('clubEvents.filterAll') },
            { value: 'checked', label: t('clubEvents.filterChecked') },
            { value: 'missing', label: t('clubEvents.filterMissing') },
          ]}
        />
      </div>
      <AppTable
        table={ptable}
        emptyMessage={t('clubEvents.noParticipants')}
        loading={participants.isPending}
      />
      <ClubEventTablePager
        pageIndex={ptable.state.pagination.pageIndex}
        pageCount={ptable.getPageCount()}
        onChange={(v) => ptable.setPageIndex(v)}
      />
    </section>
  )
}
