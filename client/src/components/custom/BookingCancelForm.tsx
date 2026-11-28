import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppInput } from '@/components/ui/input/AppInput'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import type { BookingAction } from '@/services/facilityBookings'
import { AppField } from '@/components/ui/field/AppField'

interface BookingCancelFormProps {
  clubId: string
  bookingId: string
  pending: boolean
  onConfirm: (message: string, run: () => void) => void
  onSubmit: (value: BookingAction) => void
}

// Form CLB huỷ booking đã gửi hoặc đã duyệt, bắt buộc nêu lý do
export function BookingCancelForm({
  clubId,
  bookingId,
  pending,
  onConfirm,
  onSubmit,
}: BookingCancelFormProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const cancelField = useFieldValidation({
    reason: reason.trim() ? null : t('common.fieldRequired'),
  })
  return (
    <form
      noValidate
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!cancelField.touchAll()) {
          return
        }
        onConfirm(t('facilityBookings.confirmCancel'), () =>
          onSubmit({ kind: 'cancel', clubId, id: bookingId, reason }),
        )
      }}
    >
      <p className="text-sm text-muted-app">{t('facilityBookings.cancelNotice')}</p>
      <AppField
        label={t('facilityBookings.cancelReason')}
        required
        error={cancelField.error('reason')}
      >
        <AppInput
          className="mt-1.5 block w-full font-normal"
          {...cancelField.control('reason')}
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </AppField>
      <AppButton type="submit" variant="secondary" disabled={pending}>
        {t('facilityBookings.cancel')}
      </AppButton>
    </form>
  )
}
