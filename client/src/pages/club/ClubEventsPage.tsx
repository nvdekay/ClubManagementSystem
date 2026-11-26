import { useCallback, useMemo, useState } from 'react'
import { createColumnHelper, useTable } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useParams, useSearchParams } from 'react-router'

import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { AppTable, appTableFeatures, type AppTableFeatures } from '@/components/ui/table/AppTable'
import { useAuth } from '@/hooks/useAuth'
import {
  useClubEvent,
  useClubEventMutation,
  useClubEventOptions,
  useClubEvents,
} from '@/hooks/useClubEvents'
import { useNow } from '@/hooks/useNow'
import { useClubWorkspace } from '@/hooks/useWorkspacePermission'
import type { ClubEvent, EventParticipant } from '@/services/clubEvents'
import { ClubEventAttendance } from '@/pages/club/ClubEventAttendance'
import { ClubEventDetail } from '@/pages/club/ClubEventDetail'
import { ClubEventErrorMessage } from '@/pages/club/ClubEventErrorMessage'
import { ClubEventFeedback } from '@/pages/club/ClubEventFeedback'
import { ClubEventOperationDialog } from '@/pages/club/ClubEventOperationDialog'
import { ClubEventTablePager } from '@/pages/club/ClubEventTablePager'
import { stateLabel, stateTones, type ClubEventOperation } from '@/pages/club/clubEventFormat'
import { cn } from '@/utils/cn'
import { dateFormatter } from '@/utils/formatDate'

const eventsEmpty: ClubEvent[] = []
const tabClass =
  'inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium text-muted-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app'
const activeTabClass = 'bg-segment-app text-text-app shadow-xs'
const eventColumns = createColumnHelper<AppTableFeatures, ClubEvent>()

// Trang quản lý sự kiện, điểm danh và phản hồi của CLB theo mode
export function ClubEventsPage({
  mode = 'events',
}: {
  mode?: 'events' | 'attendance' | 'feedback'
}) {
  const { clubId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const workspace = useClubWorkspace(clubId)
  const canManageEvents = Boolean(workspace?.permissions.includes('club.event.manage'))
  const canManageAttendance = Boolean(workspace?.permissions.includes('club.attendance.manage'))
  const canViewFeedback = Boolean(workspace?.permissions.includes('club.feedback.view'))
  const allowed =
    mode === 'events'
      ? canManageEvents
      : mode === 'attendance'
        ? canManageAttendance
        : canViewFeedback
  const events = useClubEvents(clubId, allowed)
  const mutation = useClubEventMutation(clubId)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const selected = searchParams.get('event') ?? searchParams.get('selected') ?? ''
  const setSelected = useCallback(
    (id: string) =>
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete('selected')
          if (id) {
            next.set('event', id)
          } else {
            next.delete('event')
          }
          return next
        },
        { replace: true },
      ),
    [setSearchParams],
  )
  // Cuộn tới khung chi tiết sự kiện đang chọn
  // Khung chi tiết nằm dưới bảng, ngoài màn hình trên hầu hết laptop; cuộn nó vào vùng nhìn thấy khi chọn.
  function revealDetail() {
    requestAnimationFrame(() =>
      document
        .getElementById('club-event-detail')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }
  const [operation, setOperation] = useState<ClubEventOperation | null>(null)
  // Each open remounts the operation dialog so its form starts from the selected event's values.
  const [operationKey, setOperationKey] = useState(0)
  const [target, setTarget] = useState<EventParticipant | null>(null)
  const [success, setSuccess] = useState(false)
  const [formError, setFormError] = useState<unknown>(null)
  // Notice-window checks (24h/72h) refresh every minute instead of freezing at first render.
  const renderedAt = useNow()
  const detail = useClubEvent(clubId, selected, allowed && mode === 'events')
  const options = useClubEventOptions(clubId, allowed && mode === 'events')
  const rows = events.data ?? eventsEmpty
  const active = mode === 'events' ? detail.data?.event : rows.find((e) => e.id === selected)
  const format = useMemo(
    () => dateFormatter(i18n.language, { dateStyle: 'short', timeStyle: 'short' }),
    [i18n.language],
  )
  const filtered = useMemo(
    () =>
      rows.filter(
        (e) =>
          (!filter || e.state === filter) &&
          e.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
      ),
    [rows, filter, search],
  )
  const columns = useMemo(
    () =>
      eventColumns.columns([
        eventColumns.accessor('title', {
          header: t('clubEvents.titleField'),
          cell: (info) => (
            <button
              type="button"
              className="text-left font-medium text-text-app hover:text-primary-app"
              onClick={() => {
                setSelected(info.row.original.id)
                mutation.reset()
                setSuccess(false)
                revealDetail()
              }}
            >
              {info.getValue()}
            </button>
          ),
        }),
        eventColumns.accessor('state', {
          header: t('clubEvents.state'),
          cell: (info) => (
            <span className="inline-flex flex-wrap items-center gap-1.5">
              <AppBadge tone={stateTones[info.getValue()] ?? 'neutral'}>
                {stateLabel(t, info.getValue())}
              </AppBadge>
              {info.row.original.cancellationRequest?.state === 'Pending' && (
                <AppBadge tone="warning">{t('clubEvents.requestCancel')}</AppBadge>
              )}
            </span>
          ),
        }),
        eventColumns.accessor('startAt', {
          header: t('clubEvents.startTime'),
          cell: (info) => format.format(new Date(info.getValue())),
        }),
        eventColumns.accessor('capacity', {
          header: t('clubEvents.maxParticipants'),
          cell: (info) => `${info.row.original.confirmedRegistrationCount} / ${info.getValue()}`,
        }),
      ]),
    [t, format, mutation, setSelected],
  )
  const table = useTable({
    features: appTableFeatures,
    columns,
    data: filtered,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })
  const runAction = useCallback(
    async function runAction(action: string, body: object) {
      if (!auth.data || !selected) {
        return
      }
      setSuccess(false)
      setFormError(null)
      try {
        await mutation.mutateAsync({
          kind: 'action',
          id: selected,
          action,
          body,
          csrfToken: auth.data.csrfToken,
        })
        setSuccess(true)
        setOperation(null)
      } catch (error) {
        setFormError(error)
      }
    },
    [auth.data, selected, mutation],
  )
  // Mở form thao tác (publish, hủy, dời lịch, check-in...) với giá trị mặc định của sự kiện đang chọn
  const openOperation = useCallback(
    function openOperation(kind: ClubEventOperation, participant: EventParticipant | null = null) {
      if (!active) {
        return
      }
      mutation.reset()
      setFormError(null)
      setSuccess(false)
      setTarget(participant)
      setOperationKey((key) => key + 1)
      setOperation(kind)
    },
    [active, mutation],
  )
  if (auth.isPending) {
    return <AppSkeleton className="h-40 w-full" />
  }
  if (!allowed) {
    return <p role="alert">{t('clubEvents.noAccess')}</p>
  }
  return (
    <>
      <PageHeader
        title={t(`clubEvents.${mode === 'events' ? 'title' : mode}`)}
        description={t('clubEvents.description')}
      />
      <nav
        aria-label={t('clubEvents.title')}
        className="mb-5 inline-flex flex-wrap gap-1 rounded-lg border border-border-app bg-surface-app p-1"
      >
        {canManageEvents && (
          <NavLink
            end
            className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })}
            to={`/club/${clubId}/events${selected ? `?event=${encodeURIComponent(selected)}` : ''}`}
          >
            {t('clubEvents.title')}
          </NavLink>
        )}
        {canManageAttendance && (
          <NavLink
            end
            className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })}
            to={`/club/${clubId}/event-attendance${selected ? `?event=${encodeURIComponent(selected)}` : ''}`}
          >
            {t('clubEvents.attendance')}
          </NavLink>
        )}
        {canViewFeedback && (
          <NavLink
            end
            className={({ isActive }) => cn(tabClass, { [activeTabClass]: isActive })}
            to={`/club/${clubId}/event-feedback${selected ? `?event=${encodeURIComponent(selected)}` : ''}`}
          >
            {t('clubEvents.feedback')}
          </NavLink>
        )}
      </nav>
      <ClubEventErrorMessage error={events.error ?? formError} />
      {success && (
        <p role="status" className="mb-3 text-success-app">
          {t('clubEvents.success')}
        </p>
      )}
      {mode !== 'feedback' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <AppInput
              aria-label={t('clubEvents.search')}
              placeholder={t('clubEvents.search')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                table.setPageIndex(0)
              }}
            />
            <AppSelect
              label={t('clubEvents.state')}
              value={filter}
              onChange={(v) => {
                setFilter(v)
                table.setPageIndex(0)
              }}
              options={[
                { value: '', label: t('clubEvents.all') },
                ...[...new Set(rows.map((e) => e.state))].map((s) => ({
                  value: s,
                  label: stateLabel(t, s),
                })),
              ]}
            />
            {mode === 'events' && (
              <Link
                to={`/club/${encodeURIComponent(clubId)}/events/new`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-app px-3.5 font-heading text-sm font-medium text-on-primary-app shadow-xs transition-[opacity,scale] duration-200 hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-ring-app focus-visible:ring-offset-2 focus-visible:ring-offset-bg-app focus-visible:outline-none sm:min-h-9"
              >
                <AppIcon name="plus" className="size-4" />
                {t('clubEvents.proposeIcpdp')}
              </Link>
            )}
          </div>
          <AppTable table={table} emptyMessage={t('clubEvents.empty')} loading={events.isPending} />
          <ClubEventTablePager
            pageIndex={table.state.pagination.pageIndex}
            pageCount={table.getPageCount()}
            onChange={(v) => table.setPageIndex(v)}
          />
        </>
      )}
      {mode === 'events' && selected && (
        <ClubEventDetail
          clubId={clubId}
          eventId={selected}
          detail={detail}
          active={active}
          properties={options.data?.properties}
          format={format}
          renderedAt={renderedAt}
          actionPending={mutation.isPending}
          runAction={runAction}
          openOperation={openOperation}
        />
      )}
      {mode === 'attendance' && (
        <ClubEventAttendance
          clubId={clubId}
          eventId={selected}
          active={active}
          canManageEvents={canManageEvents}
          format={format}
          actionPending={mutation.isPending}
          runAction={runAction}
          openOperation={openOperation}
        />
      )}
      {mode === 'feedback' && (
        <ClubEventFeedback clubId={clubId} rows={rows} eventsPending={events.isPending} />
      )}
      <ClubEventOperationDialog
        key={operationKey}
        clubId={clubId}
        eventId={selected}
        operation={operation}
        target={target}
        active={active}
        canManageEvents={canManageEvents}
        participantsEnabled={allowed && mode === 'attendance'}
        properties={options.data?.properties ?? []}
        renderedAt={renderedAt}
        pending={mutation.isPending}
        formError={formError}
        runAction={runAction}
        onError={setFormError}
        onClose={() => setOperation(null)}
      />
    </>
  )
}
