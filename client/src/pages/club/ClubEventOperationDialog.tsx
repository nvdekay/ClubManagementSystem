import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppDialog } from '@/components/ui/dialog/AppDialog'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSelect } from '@/components/ui/select/AppSelect'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useEventParticipants } from '@/hooks/useClubEvents'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import type { ClubEvent, EventParticipant } from '@/services/clubEvents'
import { ClubEventErrorMessage } from '@/pages/club/ClubEventErrorMessage'
import { ClubEventField } from '@/pages/club/ClubEventField'
import {
  iso,
  localTime,
  numberError,
  operationTitle,
  type ClubEventOperation,
} from '@/pages/club/clubEventFormat'

const participantsEmpty: EventParticipant[] = []

interface ClubEventOperationDialogProps {
  clubId: string
  /** Sự kiện đang chọn; danh sách người tham gia (cho check-in) đọc theo id này. */
  eventId: string
  operation: ClubEventOperation | null
  /** Người tham gia của thao tác check-in/sửa điểm danh theo dòng. */
  target: EventParticipant | null
  active: ClubEvent | undefined
  canManageEvents: boolean
  participantsEnabled: boolean
  properties: { id: string; name: string }[]
  renderedAt: number
  pending: boolean
  formError: unknown
  runAction: (action: string, body: object) => Promise<void>
  onError: (error: unknown) => void
  onClose: () => void
}

// Hộp thoại thao tác (publish, huỷ, dời lịch, sức chứa, check-in, sửa/mở khoá điểm danh).
// Được mount lại mỗi lần mở (key ở trang), nên form tự nạp giá trị mặc định từ sự kiện đang chọn.
export function ClubEventOperationDialog({
  clubId,
  eventId,
  operation,
  target,
  active,
  canManageEvents,
  participantsEnabled,
  properties,
  renderedAt,
  pending,
  formError,
  runAction,
  onError,
  onClose,
}: ClubEventOperationDialogProps) {
  const { t } = useTranslation()
  const participants = useEventParticipants(clubId, eventId, participantsEnabled)
  const people = participants.data ?? participantsEmpty
  const [reason, setReason] = useState('')
  const [studentId, setStudentId] = useState(target?.studentId ?? '')
  const [capacity, setCapacity] = useState(active?.capacity ?? 40)
  const [newStart, setNewStart] = useState(active ? localTime(active.startAt) : '')
  const [newEnd, setNewEnd] = useState(active ? localTime(active.endAt) : '')
  const [venue, setVenue] = useState(active?.venueText ?? '')
  const [property, setProperty] = useState(active?.propertyId ?? '')
  const [noRegistration, setNoRegistration] = useState(false)
  const [walkIn, setWalkIn] = useState(active?.allowWalkIn ?? false)
  const [waitlist, setWaitlist] = useState(active?.waitlistEnabled ?? true)
  const [registrationOpen, setRegistrationOpen] = useState(() =>
    active ? localTime(new Date().toISOString()) : '',
  )
  const [registrationClose, setRegistrationClose] = useState(
    active ? localTime(active.startAt) : '',
  )
  const [checkOpen, setCheckOpen] = useState(
    active ? localTime(active.checkInOpenAt ?? active.startAt) : '',
  )
  const [checkClose, setCheckClose] = useState(
    active ? localTime(active.checkInCloseAt ?? active.endAt) : '',
  )
  const [corrected, setCorrected] = useState('')
  const [absent, setAbsent] = useState(target?.abnormalFlags.includes('no-show') ?? false)

  const required = t('common.fieldRequired')
  const publishing = operation === 'publish' && !noRegistration
  const opField = useFieldValidation({
    registrationOpen: publishing && !registrationOpen ? required : null,
    registrationClose: !publishing
      ? null
      : !registrationClose
        ? required
        : registrationOpen && registrationClose <= registrationOpen
          ? t('common.endAfterStart')
          : null,
    checkOpen: operation === 'publish' && !checkOpen ? required : null,
    checkClose:
      operation !== 'publish'
        ? null
        : !checkClose
          ? required
          : checkOpen && checkClose <= checkOpen
            ? t('common.endAfterStart')
            : null,
    newStart:
      operation !== 'reschedule'
        ? null
        : !newStart
          ? required
          : active?.state === 'CREATED' &&
              iso(newStart) !== active.startAt &&
              Date.parse(iso(newStart)) - renderedAt < 24 * 3600_000
            ? t('clubEvents.notice24h')
            : null,
    newEnd:
      operation !== 'reschedule'
        ? null
        : !newEnd
          ? required
          : newStart && newEnd <= newStart
            ? t('common.endAfterStart')
            : null,
    capacity: operation === 'capacity' ? numberError(t, capacity, 1, 100000) : null,
    studentId: operation === 'check-in' && !studentId ? t('common.chooseRequired') : null,
    reason:
      ['cancel', 'reschedule', 'unlock', 'correct'].includes(operation ?? '') && !reason.trim()
        ? required
        : null,
  })

  // Gửi thao tác đang chọn lên server sau khi kiểm tra form
  async function execute(event: FormEvent) {
    event.preventDefault()
    if (!active || !operation || !opField.touchAll()) {
      return
    }
    opField.reset() // đã hợp lệ; lỗi về sau là lỗi từ server, hiển thị phía trên form
    try {
      const version = { expectedVersion: active.version }
      if (operation === 'publish') {
        await runAction('publish', {
          ...version,
          ...(!noRegistration
            ? {
                registrationOpenAt: iso(registrationOpen),
                registrationCloseAt: iso(registrationClose),
              }
            : {}),
          checkInOpenAt: iso(checkOpen),
          checkInCloseAt: iso(checkClose),
          allowWalkIn: noRegistration || walkIn,
          waitlistEnabled: !noRegistration && waitlist,
        })
      } else if (operation === 'reschedule') {
        await runAction('reschedule', {
          ...version,
          reason,
          startAt: iso(newStart),
          endAt: iso(newEnd),
          venueText: venue,
          ...(property ? { propertyId: property } : {}),
        })
      } else if (operation === 'cancel') {
        await runAction('cancel', { ...version, reason })
      } else if (operation === 'capacity') {
        await runAction('capacity', { capacity })
      } else if (operation === 'check-in') {
        await runAction('check-ins', { studentId, ...(reason.trim() ? { reason } : {}) })
      } else if (operation === 'correct') {
        await runAction('attendance/correct', {
          studentId: target!.studentId,
          reason,
          absent,
          ...(corrected ? { checkedInAt: iso(corrected) } : {}),
        })
      } else {
        await runAction('attendance/unlock', { reason })
      }
    } catch (error) {
      onError(error)
    }
  }
  const roomOptions = [
    { value: '', label: t('clubEvents.none') },
    ...properties.map((p) => ({ value: p.id, label: p.name })),
  ]
  return (
    <AppDialog
      open={operation !== null}
      title={operationTitle(t, operation, active?.state)}
      closeLabel={t('clubEvents.close')}
      onClose={() => {
        if (!pending) {
          onClose()
        }
      }}
      footer={
        <AppButton type="submit" form="club-event-operation-form" disabled={pending}>
          {t('clubEvents.confirm')}
        </AppButton>
      }
    >
      <form
        id="club-event-operation-form"
        noValidate
        onSubmit={(event) => void execute(event)}
        className="space-y-4"
      >
        <ClubEventErrorMessage error={formError} />
        {operation === 'cancel' &&
          active &&
          ['Approved', 'Upcoming', 'Ongoing'].includes(active.state) && (
            <AppNotice tone="info">{t('clubEvents.cancelApprovedHint')}</AppNotice>
          )}
        {operation === 'publish' && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={noRegistration}
                onChange={(e) => setNoRegistration(e.target.checked)}
              />
              {t('clubEvents.noRegistration')}
            </label>
            {!noRegistration && (
              <>
                <ClubEventField
                  label={t('clubEvents.registrationOpen')}
                  required
                  error={opField.error('registrationOpen')}
                >
                  <AppInput
                    {...opField.control('registrationOpen')}
                    type="datetime-local"
                    value={registrationOpen}
                    onChange={(e) => setRegistrationOpen(e.target.value)}
                  />
                </ClubEventField>
                <ClubEventField
                  label={t('clubEvents.registrationClose')}
                  required
                  error={opField.error('registrationClose')}
                >
                  <AppInput
                    {...opField.control('registrationClose')}
                    type="datetime-local"
                    value={registrationClose}
                    onChange={(e) => setRegistrationClose(e.target.value)}
                  />
                </ClubEventField>
              </>
            )}
            <ClubEventField
              label={t('clubEvents.checkInOpen')}
              required
              error={opField.error('checkOpen')}
            >
              <AppInput
                {...opField.control('checkOpen')}
                type="datetime-local"
                value={checkOpen}
                onChange={(e) => setCheckOpen(e.target.value)}
              />
            </ClubEventField>
            <ClubEventField
              label={t('clubEvents.checkInClose')}
              required
              error={opField.error('checkClose')}
            >
              <AppInput
                {...opField.control('checkClose')}
                type="datetime-local"
                value={checkClose}
                onChange={(e) => setCheckClose(e.target.value)}
              />
            </ClubEventField>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={noRegistration || walkIn}
                disabled={noRegistration}
                onChange={(e) => setWalkIn(e.target.checked)}
              />
              {t('clubEvents.walkIn')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={waitlist}
                onChange={(e) => setWaitlist(e.target.checked)}
              />
              {t('clubEvents.waitlist')}
            </label>
          </>
        )}
        {operation === 'reschedule' && (
          <>
            <ClubEventField
              label={t('clubEvents.startTime')}
              required
              error={opField.error('newStart')}
            >
              <AppInput
                {...opField.control('newStart')}
                type="datetime-local"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
            </ClubEventField>
            <ClubEventField
              label={t('clubEvents.endTime')}
              required
              error={opField.error('newEnd')}
            >
              <AppInput
                {...opField.control('newEnd')}
                type="datetime-local"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
              />
            </ClubEventField>
            <AppSelect
              label={t('clubEvents.property')}
              value={property}
              options={roomOptions}
              onChange={setProperty}
            />
            <ClubEventField label={t('clubEvents.venue')}>
              <AppInput value={venue} onChange={(e) => setVenue(e.target.value)} />
            </ClubEventField>
          </>
        )}
        {operation === 'capacity' && (
          <ClubEventField
            label={t('clubEvents.maxParticipants')}
            required
            error={opField.error('capacity')}
          >
            <AppInput
              {...opField.control('capacity')}
              type="number"
              min={1}
              max={100000}
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </ClubEventField>
        )}
        {operation === 'check-in' && (
          <>
            <ClubEventField
              label={t('clubEvents.studentId')}
              required
              error={opField.error('studentId')}
            >
              <AppSelect
                required
                invalid={Boolean(opField.error('studentId'))}
                label={t('clubEvents.studentId')}
                value={studentId}
                onChange={(value) => {
                  setStudentId(value)
                  opField.touch('studentId')
                }}
                options={[
                  { value: '', label: t('clubEvents.none') },
                  ...people
                    .filter((p) => p.state === 'Confirmed' && !p.attendanceId)
                    .map((p) => ({ value: p.studentId, label: `${p.name} · ${p.email}` })),
                ]}
              />
            </ClubEventField>
            {canManageEvents && (
              <p className="text-sm text-muted-app">{t('clubEvents.manualReason')}</p>
            )}
          </>
        )}
        {operation === 'correct' && (
          <>
            <p>{target?.name}</p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={absent}
                disabled={Boolean(
                  target?.attendanceId && !target.abnormalFlags.includes('no-show'),
                )}
                onChange={(e) => setAbsent(e.target.checked)}
              />
              {t('clubEvents.absent')}
            </label>
            {!absent && (
              <ClubEventField label={t('clubEvents.correctedTime')}>
                <AppInput
                  type="datetime-local"
                  value={corrected}
                  onChange={(e) => setCorrected(e.target.value)}
                />
              </ClubEventField>
            )}
          </>
        )}
        {[
          'cancel',
          'reschedule',
          'unlock',
          'correct',
          ...(canManageEvents ? ['check-in'] : []),
        ].includes(operation ?? '') && (
          <ClubEventField
            label={t('clubEvents.reason')}
            required={operation !== 'check-in'}
            error={opField.error('reason')}
          >
            <AppTextarea
              {...opField.control('reason', operation !== 'check-in')}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </ClubEventField>
        )}
      </form>
    </AppDialog>
  )
}
