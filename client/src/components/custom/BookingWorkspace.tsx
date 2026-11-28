import { useCallback, useMemo, useState } from 'react'
import { createColumnHelper, useTable } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { BookingCancelForm } from '@/components/custom/BookingCancelForm'
import { BookingDecisionForm } from '@/components/custom/BookingDecisionForm'
import { BookingHistory } from '@/components/custom/BookingHistory'
import { BookingRequestDialog } from '@/components/custom/BookingRequestDialog'
import { PageHeader } from '@/components/layout/PageHeader'
import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppConfirmDialog } from '@/components/ui/dialog/AppConfirmDialog'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppPagination } from '@/components/ui/pagination/AppPagination'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { AppTable, appTableFeatures, type AppTableFeatures } from '@/components/ui/table/AppTable'
import { AppTableLimitSelect } from '@/components/ui/table/AppTableLimitSelect'
import { appToast } from '@/components/ui/toast/AppToast'
import { useAuth } from '@/hooks/useAuth'
import {
  useBooking,
  useBookingAction,
  useBookingProperties,
  useBookingSlots,
  useBookings,
} from '@/hooks/useFacilityBookings'
import { useWorkspacePermission } from '@/hooks/useWorkspacePermission'
import type { Booking, BookingAction } from '@/services/facilityBookings'
import { cn } from '@/utils/cn'
import { BOOKING_STATES, bookingTone, slotNumber } from '@/utils/facilityBooking'
import { formatDate } from '@/utils/formatDate'
import { AppErrorNotice } from '@/components/ui/notice/AppErrorNotice'

interface BookingWorkspaceProps {
  clubId: string | null
}
const emptyBookings: Booking[] = []
const column = createColumnHelper<AppTableFeatures, Booking>()

// Workspace booking cơ sở vật chất: danh sách, form yêu cầu, huỷ và xét duyệt (CLB hoặc ICPDP)
export function BookingWorkspace({ clubId }: BookingWorkspaceProps) {
  const { t, i18n } = useTranslation()
  const auth = useAuth()
  const canManageClubBookings = useWorkspacePermission(clubId, 'club.booking.manage')
  const can = clubId
    ? canManageClubBookings
    : Boolean(auth.data?.systemRoles.includes('ICPDP_OFFICER'))
  const slots = useBookingSlots(can)
  const list = useBookings(clubId, can)
  const properties = useBookingProperties(clubId, can)
  const [searchParams, setSearchParams] = useSearchParams()
  const selected = searchParams.get('id')
  // Chọn booking đang xem và lưu id vào query string
  function setSelected(value: string | null) {
    setSearchParams(value ? { id: value } : {}, { replace: true })
  }
  const detail = useBooking(clubId, can ? selected : null)
  const action = useBookingAction(auth.data?.csrfToken ?? '')
  const resetAction = action.reset
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState(false)
  // Booking being edited in the request dialog (undefined: a new request); each open remounts it.
  const [editingBooking, setEditingBooking] = useState<Booking | undefined>(undefined)
  const [dialogKey, setDialogKey] = useState(0)
  // Bumped after a successful action so the cancel/decision forms start empty again.
  const [formKey, setFormKey] = useState(0)
  const [confirming, setConfirming] = useState<{ message: string; run: () => void } | null>(null)
  const booking = detail.data?.booking
  // Phòng do ICPDP phân bổ mỗi học kỳ (UC58); yêu cầu booking áp dụng cho mọi loại cơ sở vật chất còn lại.
  const requestProperties = (properties.data ?? []).filter(
    (item) => item.isActive && item.type !== 'ROOM',
  )
  // Mở form tạo hoặc sửa booking, nạp sẵn các trường được phép sửa
  function openForm(current?: Booking) {
    setEditingBooking(current)
    setDialogKey((key) => key + 1)
    if (!current) {
      setSelected(null)
    }
    setEditing(true)
    action.reset()
  }
  // Hỏi xác nhận trước khi chạy một thao tác booking
  function confirm(message: string, run: () => void) {
    setConfirming({ message, run })
  }
  const stateLabel = useCallback(
    (state: string) => t(`facilityBookings.states.${state as (typeof BOOKING_STATES)[number]}`),
    [t],
  )
  const date = useCallback((value: string) => formatDate(value, i18n.language), [i18n.language])
  const interval = useCallback(
    (value: { startAt: string; endAt: string }) => {
      const number = slotNumber(value, slots.data ?? [])
      return `${number ? `${t('facilityBookings.slot', { number })} · ` : ''}${date(value.startAt)} – ${date(value.endAt)}`
    },
    [slots.data, t, date],
  )
  // Gửi thao tác booking lên server rồi đóng form và báo kết quả
  async function mutate(value: BookingAction) {
    try {
      const result = await action.mutateAsync(value)
      setSelected(result.booking.id)
      setEditing(false)
      setFormKey((key) => key + 1)
      appToast.success(t('facilityBookings.changed'))
    } catch {
      /* action.error được hiển thị bên dưới. */
    }
  }
  const propertyOptions = [
    { value: '', label: t('facilityBookings.select') },
    ...requestProperties.map((item) => ({
      value: item.id,
      label: `${item.name} · ${item.location}`,
    })),
  ]
  const filteredBookings = useMemo(
    () => (list.data ?? emptyBookings).filter((item) => !filter || item.state === filter),
    [list.data, filter],
  )
  const columns = useMemo(
    () =>
      column.columns([
        column.accessor('purpose', {
          header: t('facilityBookings.property'),
          cell: (cell) => (
            <button
              type="button"
              aria-pressed={selected === cell.row.original.id}
              className={cn(
                'text-left font-medium break-words text-text-app hover:text-primary-app',
                {
                  'text-primary-app': selected === cell.row.original.id,
                },
              )}
              onClick={() => {
                setSearchParams({ id: cell.row.original.id }, { replace: true })
                setEditing(false)
                resetAction()
              }}
            >
              {!clubId && (
                <span className="block text-sm text-muted-app">{cell.row.original.clubName}</span>
              )}
              {properties.data?.find((item) => item.id === cell.row.original.propertyId)?.name ??
                cell.getValue()}
            </button>
          ),
        }),
        column.accessor('startAt', {
          header: t('facilityBookings.slotLabel'),
          cell: (cell) => interval(cell.row.original),
        }),
        column.accessor('state', {
          header: t('facilityBookings.status'),
          cell: (cell) => (
            <span className="flex flex-col items-start gap-1">
              <AppBadge tone={bookingTone(cell.getValue())}>{stateLabel(cell.getValue())}</AppBadge>
              {cell.row.original.isLateCancellation && (
                <span className="block text-xs text-warning-app">{t('facilityBookings.late')}</span>
              )}
            </span>
          ),
        }),
      ]),
    [t, selected, clubId, properties.data, setSearchParams, resetAction, interval, stateLabel],
  )
  const table = useTable({
    features: appTableFeatures,
    columns,
    data: filteredBookings,
    initialState: { pagination: { pageIndex: 0, pageSize: 10 } },
  })
  if (auth.isPending) {
    return <AppSkeleton className="h-64 w-full" />
  }
  if (!can) {
    return (
      <AppNotice tone="danger" role="alert">
        {t('facilityBookings.denied')}
      </AppNotice>
    )
  }
  return (
    <>
      <PageHeader
        title={t('facilityBookings.title')}
        description={t(
          clubId ? 'facilityBookings.description' : 'facilityBookings.officerDescription',
        )}
        actions={
          clubId ? (
            <AppButton onClick={() => openForm()}>{t('facilityBookings.newRequest')}</AppButton>
          ) : undefined
        }
      />
      <p className="mb-5 text-sm text-muted-app">{t('facilityBookings.timeZone')}</p>
      {slots.isPending || list.isPending || properties.isPending ? (
        <AppSkeleton className="h-48 w-full" />
      ) : slots.isError || list.isError || properties.isError ? (
        <AppNotice tone="danger" role="alert" title={t('facilityBookings.loadError')}>
          <p>{slots.error?.message ?? list.error?.message ?? properties.error?.message}</p>
          <AppButton
            onClick={() => {
              void slots.refetch()
              void list.refetch()
              void properties.refetch()
            }}
          >
            {t('facilityBookings.retry')}
          </AppButton>
        </AppNotice>
      ) : (
        <div className="min-w-0 space-y-8">
          <section className="min-w-0 space-y-3">
            <h2 className="font-heading text-base font-semibold">
              {t('facilityBookings.bookingHistory')}
            </h2>
            <AppSelect
              className="w-full sm:max-w-xs"
              label={t('facilityBookings.status')}
              value={filter}
              onChange={(value) => {
                setFilter(value)
                table.setPageIndex(0)
              }}
              options={[
                { value: '', label: t('facilityBookings.all') },
                ...BOOKING_STATES.map((state) => ({ value: state, label: stateLabel(state) })),
              ]}
            />
            <AppTable table={table} emptyMessage={t('facilityBookings.empty')} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-app">
                {t('facilityBookings.bookingCount', { count: filteredBookings.length })}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <AppTableLimitSelect
                  value={table.state.pagination.pageSize}
                  onChange={(size) => table.setPageSize(size)}
                  label={t('facilityBookings.rowsPerPage')}
                  options={[5, 10, 20, 50]}
                />
                <AppPagination
                  pageIndex={table.state.pagination.pageIndex}
                  pageCount={table.getPageCount()}
                  onPageChange={(index) => table.setPageIndex(index)}
                  navLabel={t('facilityBookings.pages')}
                />
              </div>
            </div>
          </section>
          <section className="min-w-0 space-y-5">
            {!editing && action.isError && (
              <AppNotice tone="danger" role="alert">
                {action.error.message}
              </AppNotice>
            )}
            {editing && clubId ? (
              <BookingRequestDialog
                key={dialogKey}
                clubId={clubId}
                current={editingBooking}
                expectedVersion={booking?.currentVersionNo ?? 0}
                slots={slots.data ?? []}
                properties={properties.data}
                pending={action.isPending}
                error={action.error}
                interval={interval}
                onSubmit={(value) => void mutate(value)}
                onClose={() => setEditing(false)}
              />
            ) : selected && detail.isPending ? (
              <AppSkeleton className="h-64 w-full" />
            ) : detail.isError ? (
              <AppErrorNotice onRetry={() => void detail.refetch()} retryVariant="primary">
                {detail.error.message}
              </AppErrorNotice>
            ) : (
              booking &&
              detail.data && (
                <div className="space-y-5 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
                  <h2 className="font-heading text-lg font-semibold break-words">
                    {booking.purpose}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-app">
                    <AppBadge tone={bookingTone(booking.state)}>
                      {stateLabel(booking.state)}
                    </AppBadge>
                    <span>
                      {t('facilityBookings.version', { number: booking.currentVersionNo })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-app">{interval(booking)}</p>
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm text-muted-app">{t('facilityBookings.property')}</dt>
                      <dd>
                        {detail.data.property?.name} · {detail.data.property?.location}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-app">{t('facilityBookings.headcount')}</dt>
                      <dd>{booking.headcount}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-app">{t('facilityBookings.startAt')}</dt>
                      <dd>{date(booking.startAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-app">{t('facilityBookings.endAt')}</dt>
                      <dd>{date(booking.endAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-app">{t('facilityBookings.equipment')}</dt>
                      <dd>{booking.equipment.join(', ') || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-muted-app">{t('facilityBookings.clubState')}</dt>
                      <dd>
                        {detail.data.club?.name} ·{' '}
                        {t(
                          `clubLifecycle.state_${detail.data.club?.state as 'Active' | 'Suspended' | 'Dissolving' | 'Dissolved' | 'Pending Setup'}`,
                        )}
                      </dd>
                    </div>
                  </dl>
                  {booking.decisionReason && <AppNotice>{booking.decisionReason}</AppNotice>}
                  {booking.cancelReason && <AppNotice>{booking.cancelReason}</AppNotice>}
                  {detail.data.check?.capacityWarning && (
                    <AppNotice tone="warning">{t('facilityBookings.capacityWarning')}</AppNotice>
                  )}
                  {!!detail.data.check?.conflicts.length && (
                    <AppNotice tone="warning" title={t('facilityBookings.conflicts')}>
                      {detail.data.check.conflicts.map((item) => (
                        <p key={item.id}>{interval(item)}</p>
                      ))}
                    </AppNotice>
                  )}
                  {!clubId && !!detail.data.obligations.length && (
                    <AppNotice tone="warning" title={t('facilityBookings.obligations')}>
                      {detail.data.obligations.map((item) => (
                        <p key={item}>
                          {t(
                            `facilityBookings.${item as 'overdueReport' | 'overduePostEventReport' | 'overdueSettlement' | 'overdueRefund'}`,
                          )}
                        </p>
                      ))}
                    </AppNotice>
                  )}
                  {clubId && ['Draft', 'Revision Requested'].includes(booking.state) && (
                    <div className="flex flex-wrap gap-3">
                      <AppButton onClick={() => openForm(booking)}>
                        {t('facilityBookings.edit')}
                      </AppButton>
                      <AppButton
                        disabled={action.isPending}
                        onClick={() =>
                          confirm(
                            t('facilityBookings.confirmSubmit'),
                            () =>
                              void mutate({
                                kind: 'submit',
                                clubId,
                                id: booking.id,
                                expectedVersion: booking.currentVersionNo,
                              }),
                          )
                        }
                      >
                        {t('facilityBookings.submit')}
                      </AppButton>
                    </div>
                  )}
                  {clubId && ['Requested', 'Approved'].includes(booking.state) && (
                    <BookingCancelForm
                      key={`${booking.id}:${formKey}`}
                      clubId={clubId}
                      bookingId={booking.id}
                      pending={action.isPending}
                      onConfirm={confirm}
                      onSubmit={(value) => void mutate(value)}
                    />
                  )}
                  {!clubId &&
                    (booking.state === 'Requested' ||
                      (booking.state === 'Under Review' &&
                        detail.data.task &&
                        !detail.data.task.assigneeId)) && (
                      <AppButton
                        disabled={action.isPending}
                        onClick={() => void mutate({ kind: 'claim', id: booking.id })}
                      >
                        {t('facilityBookings.claim')}
                      </AppButton>
                    )}
                  {!clubId &&
                    booking.state === 'Under Review' &&
                    detail.data.task?.assigneeId &&
                    detail.data.task.assigneeId !== auth.data?.user.id && (
                      <AppNotice>{t('facilityBookings.assigned')}</AppNotice>
                    )}
                  {!clubId &&
                    booking.state === 'Under Review' &&
                    detail.data.task?.assigneeId === auth.data?.user.id && (
                      <BookingDecisionForm
                        key={`${booking.id}:${formKey}`}
                        bookingId={booking.id}
                        check={detail.data.check}
                        slots={slots.data ?? []}
                        propertyOptions={propertyOptions}
                        pending={action.isPending}
                        onConfirm={confirm}
                        onSubmit={(value) => void mutate(value)}
                      />
                    )}
                  <BookingHistory
                    decisions={detail.data.decisions}
                    versions={detail.data.versions}
                    properties={properties.data}
                    interval={interval}
                  />
                </div>
              )
            )}
          </section>
        </div>
      )}
      <AppConfirmDialog
        open={confirming !== null}
        title={t('facilityBookings.confirmTitle')}
        message={confirming?.message ?? ''}
        confirmLabel={t('facilityBookings.confirmYes')}
        cancelLabel={t('facilityBookings.confirmBack')}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          confirming?.run()
          setConfirming(null)
        }}
      />
    </>
  )
}
