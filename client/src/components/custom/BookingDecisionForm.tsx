import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import type { useBooking } from '@/hooks/useFacilityBookings'
import type { BookingAction, BookingDecisionInput, BookingSlot } from '@/services/facilityBookings'
import { bookingLocalTime, slotInterval, slotNumber } from '@/utils/facilityBooking'
import { AppField } from '@/components/ui/field/AppField'

type BookingCheck = NonNullable<ReturnType<typeof useBooking>['data']>['check']

interface BookingDecisionFormProps {
  bookingId: string
  check: BookingCheck
  slots: BookingSlot[]
  propertyOptions: { value: string; label: string }[]
  pending: boolean
  onConfirm: (message: string, run: () => void) => void
  onSubmit: (value: BookingAction) => void
}

// Form quyết định của ICPDP: duyệt (có thể cho vượt sức chứa), từ chối hoặc yêu cầu sửa kèm phương án thay thế
export function BookingDecisionForm({
  bookingId,
  check,
  slots,
  propertyOptions,
  pending,
  onConfirm,
  onSubmit,
}: BookingDecisionFormProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [overbookingReason, setOverbookingReason] = useState('')
  const [permitOverbooking, setPermitOverbooking] = useState(false)
  const [outcome, setOutcome] = useState<BookingDecisionInput['outcome']>('Approve')
  const [suggest, setSuggest] = useState(false)
  const [alternative, setAlternative] = useState({ propertyId: '', startAt: '', endAt: '' })
  const alternativeNeeded = outcome === 'Request revision' && suggest
  const decisionField = useFieldValidation({
    reason: reason.trim() ? null : t('common.fieldRequired'),
    overbookingReason:
      outcome === 'Approve' && permitOverbooking && !overbookingReason.trim()
        ? t('common.fieldRequired')
        : null,
    altPropertyId: alternativeNeeded && !alternative.propertyId ? t('common.chooseRequired') : null,
    altDate: alternativeNeeded && !alternative.startAt ? t('common.fieldRequired') : null,
    altSlot:
      alternativeNeeded && alternative.startAt && !slotNumber(alternative, slots)
        ? t('common.chooseRequired')
        : null,
  })
  const slotOptions = [
    { value: '', label: t('facilityBookings.selectSlot') },
    ...slots.map((slot) => ({
      value: String(slot.number),
      label: `${t('facilityBookings.slot', { number: slot.number })} · ${slot.start}–${slot.end}`,
    })),
  ]
  // Kiểm tra hợp lệ và xin xác nhận trước khi ICPDP quyết định booking
  function decide(event: FormEvent) {
    event.preventDefault()
    if (!decisionField.touchAll()) {
      return
    }
    onConfirm(t('facilityBookings.confirmDecision'), () =>
      onSubmit({
        kind: 'decision',
        id: bookingId,
        input: {
          outcome,
          reason,
          reviewNote,
          ...(outcome === 'Approve' && permitOverbooking ? { overbookingReason } : {}),
          ...(outcome === 'Request revision' && suggest ? { alternative } : {}),
        },
      }),
    )
  }
  return (
    <form
      noValidate
      onSubmit={decide}
      className="space-y-4 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs"
    >
      <div className="block text-sm font-medium text-text-app">
        <span>{t('facilityBookings.outcome')}</span>
        <AppSelect<BookingDecisionInput['outcome']>
          className="mt-1.5 block w-full font-normal"
          label={t('facilityBookings.outcome')}
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: 'Approve', label: t('facilityBookings.approve') },
            { value: 'Reject', label: t('facilityBookings.reject') },
            { value: 'Request revision', label: t('facilityBookings.revision') },
          ]}
        />
      </div>
      <AppField label={t('facilityBookings.reason')} required error={decisionField.error('reason')}>
        <AppInput
          className="mt-1.5 block w-full font-normal"
          {...decisionField.control('reason')}
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </AppField>
      <AppField label={t('facilityBookings.reviewNote')}>
        <AppInput
          className="mt-1.5 block w-full font-normal"
          maxLength={2000}
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
        />
      </AppField>
      {outcome === 'Approve' && !!check?.conflicts.length && check.conflictResult === 'Warning' && (
        <div className="space-y-3">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={permitOverbooking}
              onChange={(event) => setPermitOverbooking(event.target.checked)}
            />
            {t('facilityBookings.permitOverbooking')}
          </label>
          {permitOverbooking && (
            <AppField
              label={t('facilityBookings.overbookingReason')}
              required
              error={decisionField.error('overbookingReason')}
            >
              <AppInput
                {...decisionField.control('overbookingReason')}
                maxLength={2000}
                className="mt-1.5 block w-full font-normal"
                value={overbookingReason}
                onChange={(event) => setOverbookingReason(event.target.value)}
              />
            </AppField>
          )}
        </div>
      )}
      {outcome === 'Request revision' && (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={suggest}
              onChange={(event) => setSuggest(event.target.checked)}
            />
            {t('facilityBookings.alternative')}
          </label>
          {suggest && (
            <div className="space-y-3">
              <div className="block text-sm font-medium text-text-app">
                <span>
                  {t('facilityBookings.property')}
                  <AppRequiredMark />
                </span>
                <AppSelect
                  className="mt-1.5 block w-full font-normal"
                  label={t('facilityBookings.property')}
                  required
                  invalid={Boolean(decisionField.error('altPropertyId'))}
                  value={alternative.propertyId}
                  onChange={(value) => {
                    setAlternative({ ...alternative, propertyId: value })
                    decisionField.touch('altPropertyId')
                  }}
                  options={propertyOptions}
                />
                <AppFieldError message={decisionField.error('altPropertyId')} />
              </div>
              <AppField
                label={t('facilityBookings.bookingDate')}
                required
                error={decisionField.error('altDate')}
              >
                <AppInput
                  type="date"
                  className="mt-1.5 block w-full font-normal"
                  {...decisionField.control('altDate')}
                  value={bookingLocalTime(alternative.startAt).slice(0, 10)}
                  onChange={(event) =>
                    setAlternative({
                      ...alternative,
                      ...slotInterval(
                        event.target.value,
                        slotNumber(alternative, slots) || '1',
                        slots,
                      ),
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
                  required
                  invalid={Boolean(decisionField.error('altSlot'))}
                  value={slotNumber(alternative, slots)}
                  disabled={!alternative.startAt}
                  onChange={(value) => {
                    setAlternative({
                      ...alternative,
                      ...slotInterval(
                        bookingLocalTime(alternative.startAt).slice(0, 10),
                        value,
                        slots,
                      ),
                    })
                    decisionField.touch('altSlot')
                  }}
                  options={slotOptions}
                />
                <AppFieldError message={decisionField.error('altSlot')} />
              </div>
            </div>
          )}
        </>
      )}
      <AppButton type="submit" disabled={pending}>
        {t('facilityBookings.decide')}
      </AppButton>
    </form>
  )
}
