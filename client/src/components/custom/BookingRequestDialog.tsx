import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppDialog } from '@/components/ui/dialog/AppDialog'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import { useBookingAvailability, useBookingEvents } from '@/hooks/useFacilityBookings'
import type { Booking, BookingAction, BookingInput, BookingSlot } from '@/services/facilityBookings'
import type { Property } from '@/services/properties'
import { bookingLocalTime, slotInterval, slotNumber } from '@/utils/facilityBooking'
import { AppField } from '@/components/ui/field/AppField'

const emptyInput: BookingInput = {
  propertyId: '',
  purpose: '',
  startAt: '',
  endAt: '',
  headcount: 1,
  equipment: [],
}

// Chỉ lấy các trường được phép sửa: schema lưu của server là strict và sẽ từ chối các trường vốn có của booking.
function editableInput(current: Booking | undefined): BookingInput {
  return current
    ? {
        propertyId: current.propertyId,
        purpose: current.purpose,
        startAt: current.startAt,
        endAt: current.endAt,
        headcount: current.headcount,
        equipment: current.equipment,
        ...(current.eventId ? { eventId: current.eventId } : {}),
      }
    : emptyInput
}

interface BookingRequestDialogProps {
  clubId: string
  /** Booking đang sửa; không có thì là yêu cầu mới. */
  current: Booking | undefined
  expectedVersion: number
  slots: BookingSlot[]
  properties: Property[] | undefined
  pending: boolean
  error: Error | null
  interval: (value: { startAt: string; endAt: string }) => string
  onSubmit: (value: BookingAction) => void
  onClose: () => void
}

// Hộp thoại tạo/sửa yêu cầu booking của CLB; mount lại mỗi lần mở nên form nạp sẵn từ booking đang sửa
export function BookingRequestDialog({
  clubId,
  current,
  expectedVersion,
  slots,
  properties,
  pending,
  error,
  interval,
  onSubmit,
  onClose,
}: BookingRequestDialogProps) {
  const { t } = useTranslation()
  // Các nút của hộp thoại yêu cầu nằm ở footer cố định, ngoài <form>, liên kết với form qua form={id}.
  const bookingFormId = useId()
  const editingId = current?.id ?? null
  const [form, setForm] = useState<BookingInput>(() => editableInput(current))
  const events = useBookingEvents(clubId, true)
  const availability = useBookingAvailability(clubId, form.propertyId, form.startAt, form.endAt)
  const property = properties?.find((item) => item.id === form.propertyId)
  // Phòng do ICPDP phân bổ mỗi học kỳ (UC58); yêu cầu booking áp dụng cho mọi loại cơ sở vật chất còn lại.
  const requestProperties = (properties ?? []).filter(
    (item) => item.isActive && item.type !== 'ROOM',
  )
  const bookingField = useFieldValidation({
    date: form.startAt ? null : t('common.fieldRequired'),
    slot: form.startAt && !slotNumber(form, slots) ? t('common.chooseRequired') : null,
    propertyId: requestProperties.some((item) => item.id === form.propertyId)
      ? null
      : t('common.chooseRequired'),
    purpose: form.purpose.trim() ? null : t('common.fieldRequired'),
    headcount: !Number.isInteger(form.headcount)
      ? t('common.invalidNumber')
      : form.headcount < 1
        ? t('common.numberMin', { min: 1 })
        : form.headcount > 10000
          ? t('common.numberMax', { max: 10000 })
          : null,
  })
  const propertyOptions = [
    { value: '', label: t('facilityBookings.select') },
    ...requestProperties.map((item) => ({
      value: item.id,
      label: `${item.name} · ${item.location}`,
    })),
  ]
  const slotOptions = [
    { value: '', label: t('facilityBookings.selectSlot') },
    ...slots.map((slot) => ({
      value: String(slot.number),
      label: `${t('facilityBookings.slot', { number: slot.number })} · ${slot.start}–${slot.end}`,
    })),
  ]
  // Kiểm tra hợp lệ và lưu booking của CLB
  function save(event: FormEvent) {
    event.preventDefault()
    if (!bookingField.touchAll()) {
      return
    }
    onSubmit({
      kind: 'save',
      clubId,
      ...(editingId ? { id: editingId } : {}),
      input: form,
      expectedVersion,
    })
  }
  return (
    <AppDialog
      open
      title={t(editingId ? 'facilityBookings.edit' : 'facilityBookings.newRequest')}
      closeLabel={t('facilityBookings.close')}
      onClose={onClose}
      footer={
        <>
          <AppButton type="submit" form={bookingFormId} disabled={pending}>
            {t('facilityBookings.save')}
          </AppButton>
          <AppButton type="button" variant="secondary" onClick={onClose}>
            {t('facilityBookings.close')}
          </AppButton>
        </>
      }
    >
      <form id={bookingFormId} noValidate onSubmit={save} className="space-y-4">
        {error && (
          <AppNotice tone="danger" role="alert">
            {error.message}
          </AppNotice>
        )}
        {!requestProperties.length && <AppNotice>{t('facilityBookings.noProperties')}</AppNotice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <AppField
            label={t('facilityBookings.bookingDate')}
            required
            error={bookingField.error('date')}
          >
            <AppInput
              type="date"
              className="mt-1.5 block w-full min-w-0 font-normal"
              {...bookingField.control('date')}
              value={bookingLocalTime(form.startAt).slice(0, 10)}
              onChange={(event) =>
                setForm({
                  ...form,
                  propertyId: '',
                  equipment: [],
                  ...slotInterval(event.target.value, slotNumber(form, slots) || '1', slots),
                })
              }
            />
          </AppField>
          <div className="block text-sm font-medium text-text-app">
            <span>
              {t('facilityBookings.slotLabel')}
              <AppRequiredMark />
            </span>
            <AppSelect
              className="mt-1.5 block w-full font-normal"
              label={t('facilityBookings.slotLabel')}
              value={slotNumber(form, slots)}
              required
              invalid={Boolean(bookingField.error('slot'))}
              disabled={!form.startAt}
              onChange={(value) => {
                setForm({
                  ...form,
                  propertyId: '',
                  equipment: [],
                  ...slotInterval(bookingLocalTime(form.startAt).slice(0, 10), value, slots),
                })
                bookingField.touch('slot')
              }}
              options={slotOptions}
            />
            <AppFieldError message={bookingField.error('slot')} />
          </div>
        </div>
        <div className="block text-sm font-medium text-text-app">
          <span>
            {t('facilityBookings.property')}
            <AppRequiredMark />
          </span>
          <AppSelect
            className="mt-1.5 block w-full font-normal"
            label={t('facilityBookings.property')}
            value={form.propertyId}
            required
            invalid={Boolean(bookingField.error('propertyId'))}
            onChange={(value) => {
              setForm({ ...form, propertyId: value, equipment: [] })
              bookingField.touch('propertyId')
            }}
            disabled={!form.startAt || !form.endAt}
            options={propertyOptions}
          />
          <AppFieldError message={bookingField.error('propertyId')} />
        </div>
        {property && (
          <div className="space-y-2 text-sm text-muted-app">
            <p>{property.location}</p>
            <details>
              <summary>{t('facilityBookings.hours')}</summary>
              <p>
                {t('facilityBookings.hours')}:{' '}
                {property.bookableHours
                  .map(
                    (item) =>
                      `${t(`properties.day${item.day as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)}: ${item.open}–${item.close}`,
                  )
                  .join('; ')}
              </p>
              {property.blackouts.map((item, index) => (
                <p key={index}>
                  {t('facilityBookings.blackout')}: {interval(item)} · {item.reason}
                </p>
              ))}
            </details>
          </div>
        )}
        <AppField
          label={t('facilityBookings.purpose')}
          required
          error={bookingField.error('purpose')}
        >
          <AppInput
            {...bookingField.control('purpose')}
            maxLength={2000}
            className="mt-1.5 block w-full font-normal"
            value={form.purpose}
            onChange={(event) => setForm({ ...form, purpose: event.target.value })}
          />
        </AppField>
        <AppField
          label={t('facilityBookings.headcount')}
          required
          error={bookingField.error('headcount')}
        >
          <AppInput
            {...bookingField.control('headcount')}
            type="number"
            min={1}
            max={10000}
            className="mt-1.5 block w-full font-normal"
            value={form.headcount}
            onChange={(event) => setForm({ ...form, headcount: Number(event.target.value) })}
          />
        </AppField>
        <details>
          <summary>{t('facilityBookings.optionalFields')}</summary>
          <div className="mt-3 space-y-3">
            {property?.equipment.map((item) => (
              <label key={item} className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.equipment.includes(item)}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      equipment: event.target.checked
                        ? [...form.equipment, item]
                        : form.equipment.filter((value) => value !== item),
                    })
                  }
                />
                {item}
              </label>
            ))}
            {events.isPending ? (
              <AppSkeleton className="h-12" />
            ) : events.isError ? (
              <AppNotice tone="danger">
                {events.error.message}
                <AppButton type="button" onClick={() => void events.refetch()}>
                  {t('facilityBookings.retry')}
                </AppButton>
              </AppNotice>
            ) : (
              <AppSelect
                label={t('facilityBookings.eventId')}
                value={form.eventId ?? ''}
                onChange={(value) => setForm({ ...form, eventId: value || undefined })}
                options={[
                  { value: '', label: t('facilityBookings.noEvent') },
                  ...(events.data ?? []).map((item) => ({
                    value: item.id,
                    label: item.title,
                  })),
                ]}
              />
            )}
          </div>
        </details>
        {property?.capacity !== undefined && form.headcount > property.capacity && (
          <AppNotice tone="warning">{t('facilityBookings.capacityWarning')}</AppNotice>
        )}
        <p className="text-sm text-muted-app">{t('facilityBookings.requestRule')}</p>
        <p className="text-sm text-muted-app">{t('facilityBookings.noticeRule')}</p>
        {form.propertyId && form.startAt && form.endAt && (
          <div role="status">
            {availability.isFetching ? (
              <p>{t('facilityBookings.checking')}</p>
            ) : availability.isError ? (
              <AppNotice tone="danger">{availability.error.message}</AppNotice>
            ) : (
              availability.data && (
                <AppNotice tone={availability.data.conflicts.length ? 'danger' : 'success'}>
                  {t(
                    availability.data.conflicts.length
                      ? 'facilityBookings.blocking'
                      : 'facilityBookings.available',
                  )}
                  {availability.data.conflicts.map((item) => (
                    <p key={item.id}>{interval(item)}</p>
                  ))}
                </AppNotice>
              )
            )}
          </div>
        )}
      </form>
    </AppDialog>
  )
}
