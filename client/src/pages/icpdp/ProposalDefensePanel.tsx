import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

import { AppBadge, type AppBadgeTone } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppDialog } from '@/components/ui/dialog/AppDialog'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useConfirm } from '@/hooks/useConfirm'
import { useEventDefenseActions } from '@/hooks/useEventDefense'
import { useNow } from '@/hooks/useNow'
import type { EventDefenseSession } from '@/services/eventDefense'
import { resolveI18nError } from '@/pages/icpdp/eventProposalReviewFormat'
import { ScheduleDefenseDialog } from '@/pages/icpdp/ScheduleDefenseDialog'
import { formatDate } from '@/utils/formatDate'

// Màu nhãn trạng thái buổi bảo vệ trong khung xét duyệt
function reviewDefenseTone(state: string): AppBadgeTone {
  if (state === 'CONFIRMED' || state === 'IN_PROGRESS') {
    return 'success'
  }
  if (state === 'RESCHEDULE_REQUESTED') {
    return 'warning'
  }
  return state === 'DEFENDED' ? 'info' : 'neutral'
}

interface ProposalDefensePanelProps {
  eventId: string
  eventTitle: string
  activeDefenseSession: EventDefenseSession | undefined
  defenseHistory: EventDefenseSession[] | undefined
  /** Hồ sơ còn mở xét duyệt (được đặt lịch bảo vệ mới). */
  isOpen: boolean
  /** Người xem là người phụ trách hồ sơ. */
  mine: boolean
  csrfToken: string
}

// Quản lý bảo vệ: đặt lịch, xác nhận, bắt đầu, các thao tác liên quan và lịch sử buổi bảo vệ,
// cùng hộp thoại đặt/đổi lịch và hộp thoại lý do (hủy, từ chối đổi lịch, vắng mặt).
export function ProposalDefensePanel({
  eventId,
  eventTitle,
  activeDefenseSession,
  defenseHistory,
  isOpen,
  mine,
  csrfToken,
}: ProposalDefensePanelProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const askConfirm = useConfirm()
  const defenseAction = useEventDefenseActions()
  // Trạng thái hộp thoại xác định thao tác bảo vệ; duyệt hủy sự kiện có lý do và lỗi riêng.
  const [scheduleDialogMode, setScheduleDialogMode] = useState<'schedule' | 'reschedule' | null>(
    null,
  )
  const [reasonModalKind, setReasonModalKind] = useState<
    'cancel' | 'rejectReschedule' | 'noShow' | null
  >(null)
  const [modalReason, setModalReason] = useState('')
  // The 24h defense window check refreshes every minute instead of freezing at first render.
  const renderedAt = useNow()
  function date(value: string) {
    return formatDate(value, i18n.language)
  }
  // Đánh dấu buổi bảo vệ đã lên lịch khi còn dưới 24 giờ trước giờ bắt đầu.
  const confirmOverdue = Boolean(
    activeDefenseSession &&
    activeDefenseSession.state === 'SCHEDULED' &&
    new Date(activeDefenseSession.startAt).getTime() - renderedAt < 24 * 3600_000,
  )

  /** Gọi API bắt đầu buổi bảo vệ trước khi chuyển sang màn hình bảo vệ trực tiếp. */
  async function handleStartDefense() {
    defenseAction.reset()
    try {
      await defenseAction.mutateAsync({
        kind: 'start',
        eventId,
        csrfToken,
      })
      void navigate(`/workspace/event-proposals/${eventId}/defense`)
    } catch (error) {
      console.error('[EventProposalReviewPage] start defense failed:', error)
    }
  }

  /** Gửi thao tác hủy buổi bảo vệ, từ chối đổi lịch hoặc ghi nhận vắng mặt kèm lý do bắt buộc. */
  async function submitReasonModal(e: FormEvent) {
    e.preventDefault()
    if (!reasonModalKind) {
      return
    }
    const trimmedReason = modalReason.trim()
    if (!trimmedReason) {
      return
    }
    try {
      if (reasonModalKind === 'cancel') {
        await defenseAction.mutateAsync({
          kind: 'cancel',
          eventId,
          reason: trimmedReason,
          csrfToken,
        })
      } else if (reasonModalKind === 'rejectReschedule') {
        await defenseAction.mutateAsync({
          kind: 'respondReschedule',
          eventId,
          input: { accept: false, reason: trimmedReason },
          csrfToken,
        })
      } else {
        if (!(await askConfirm(t('eventDefense.noShowWarning')))) {
          return
        }
        await defenseAction.mutateAsync({
          kind: 'noShow',
          eventId,
          reason: trimmedReason,
          csrfToken,
        })
      }
      setReasonModalKind(null)
      setModalReason('')
    } catch (error) {
      console.error(
        '[EventProposalReviewPage] defense modal action failed:',
        reasonModalKind,
        error,
      )
    }
  }

  return (
    <>
      <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold">{t('eventDefense.sectionTitle')}</h2>
          {isOpen && mine && !activeDefenseSession && (
            <AppButton
              type="button"
              onClick={() => {
                defenseAction.reset()
                setScheduleDialogMode('schedule')
              }}
            >
              {t('eventDefense.scheduleButton')}
            </AppButton>
          )}
        </div>

        {activeDefenseSession ? (
          <div className="space-y-3 rounded-xl border border-border-app bg-surface-app p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold">{activeDefenseSession.title}</span>
              <AppBadge tone={reviewDefenseTone(activeDefenseSession.state)}>
                {t(`eventDefense.state_${activeDefenseSession.state}`)}
              </AppBadge>
            </div>
            <p className="text-muted-app">
              {date(activeDefenseSession.startAt)} ·{' '}
              {t('eventDefense.durationValue', {
                minutes: activeDefenseSession.durationMinutes,
              })}{' '}
              · {activeDefenseSession.propertyName}
            </p>
            {activeDefenseSession.note && (
              <p className="whitespace-pre-wrap break-words text-muted-app">
                {activeDefenseSession.note}
              </p>
            )}

            {confirmOverdue && (
              <AppNotice tone="warning">{t('eventDefense.overdueConfirmWarning')}</AppNotice>
            )}

            {activeDefenseSession.state === 'RESCHEDULE_REQUESTED' &&
              activeDefenseSession.rescheduleReason && (
                <AppNotice tone="warning" title={t('eventDefense.reschedulePendingTitle')}>
                  <p>
                    {t('eventDefense.rescheduleReasonLabel')}:{' '}
                    {activeDefenseSession.rescheduleReason}
                  </p>
                </AppNotice>
              )}

            {defenseAction.isError && (
              <p role="alert" className="text-danger-app">
                {resolveI18nError(defenseAction.error, t('eventDefense.defenseActionFailed'))}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {mine &&
                (activeDefenseSession.state === 'SCHEDULED' ||
                  activeDefenseSession.state === 'CONFIRMED') && (
                  <AppButton
                    type="button"
                    disabled={defenseAction.isPending}
                    onClick={() => void handleStartDefense()}
                  >
                    {t('eventDefense.startDefenseButton')}
                  </AppButton>
                )}
              {(activeDefenseSession.state === 'IN_PROGRESS' ||
                activeDefenseSession.state === 'DEFENDED') && (
                <Link
                  className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary-app px-3.5 font-heading text-sm font-medium text-on-primary-app shadow-xs hover:opacity-90"
                  to={`/workspace/event-proposals/${eventId}/defense`}
                >
                  {t('eventDefense.openLiveRoomButton')}
                </Link>
              )}
              {mine && activeDefenseSession.state === 'RESCHEDULE_REQUESTED' && (
                <>
                  <AppButton
                    type="button"
                    onClick={() => {
                      defenseAction.reset()
                      setScheduleDialogMode('reschedule')
                    }}
                  >
                    {t('eventDefense.acceptReschedule')}
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      defenseAction.reset()
                      setModalReason('')
                      setReasonModalKind('rejectReschedule')
                    }}
                  >
                    {t('eventDefense.rejectReschedule')}
                  </AppButton>
                </>
              )}
              {mine &&
                ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(
                  activeDefenseSession.state,
                ) && (
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      defenseAction.reset()
                      setModalReason('')
                      setReasonModalKind('cancel')
                    }}
                  >
                    {t('eventDefense.cancelButton')}
                  </AppButton>
                )}
              {mine &&
                ['SCHEDULED', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'IN_PROGRESS'].includes(
                  activeDefenseSession.state,
                ) && (
                  <AppButton
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      defenseAction.reset()
                      setModalReason('')
                      setReasonModalKind('noShow')
                    }}
                  >
                    {t('eventDefense.noShowButton')}
                  </AppButton>
                )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-app">{t('eventDefense.scheduleHint')}</p>
        )}

        {defenseHistory && defenseHistory.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold">{t('eventDefense.historyTitle')}</h3>
            <ul className="mt-2 space-y-2 text-sm">
              {defenseHistory.map((item) => (
                <li key={item.id} className="rounded-lg border border-border-app px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {item.title} · {t('eventDefense.revisionTag', { number: item.revisionNo })}
                    </span>
                    <AppBadge>{t(`eventDefense.state_${item.state}`)}</AppBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted-app">
                    {date(item.startAt)} · {item.propertyName}
                    {item.outcome ? ` · ${t(`eventDefense.outcome_${item.outcome}`)}` : ''}
                  </p>
                  {(item.cancelReason || item.outcomeReason) && (
                    <p className="mt-1 text-xs text-muted-app">
                      {item.cancelReason ?? item.outcomeReason}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      {/* Chỉ tạo hộp thoại lịch khi mở; đổi lịch loại buổi hiện tại khỏi phép kiểm tra trùng lịch. */}
      {scheduleDialogMode !== null && (
        <ScheduleDefenseDialog
          open
          mode={scheduleDialogMode}
          eventId={eventId}
          eventTitle={eventTitle}
          csrfToken={csrfToken}
          excludeDefenseId={
            scheduleDialogMode === 'reschedule' ? activeDefenseSession?.id : undefined
          }
          onClose={() => setScheduleDialogMode(null)}
        />
      )}

      {/* Dùng chung hộp thoại nhập lý do cho hủy bảo vệ, từ chối đổi lịch và ghi nhận vắng mặt. */}
      <AppDialog
        open={reasonModalKind !== null}
        title={
          reasonModalKind === 'cancel'
            ? t('eventDefense.cancelTitle')
            : reasonModalKind === 'noShow'
              ? t('eventDefense.noShowTitle')
              : t('eventDefense.rejectReschedule')
        }
        closeLabel={t('clubEvents.close')}
        onClose={() => {
          if (!defenseAction.isPending) {
            setReasonModalKind(null)
          }
        }}
        footer={
          <AppButton
            type="submit"
            form="defense-reason-modal-form"
            disabled={defenseAction.isPending || !modalReason.trim()}
          >
            {t('clubEvents.confirm')}
          </AppButton>
        }
      >
        <form
          id="defense-reason-modal-form"
          onSubmit={(e) => void submitReasonModal(e)}
          className="space-y-4"
        >
          {reasonModalKind === 'noShow' && (
            <AppNotice tone="danger">{t('eventDefense.noShowWarning')}</AppNotice>
          )}
          <label className="block text-sm font-medium text-text-app">
            {reasonModalKind === 'cancel'
              ? t('eventDefense.cancelReasonLabel')
              : reasonModalKind === 'noShow'
                ? t('eventDefense.noShowReasonLabel')
                : t('eventDefense.rejectRescheduleReasonLabel')}
            <AppRequiredMark />
            <AppTextarea
              value={modalReason}
              maxLength={2000}
              onChange={(e) => setModalReason(e.target.value)}
              className="mt-1.5 min-h-24 w-full font-normal"
            />
          </label>
          {defenseAction.isError && (
            <p role="alert" className="text-sm text-danger-app">
              {resolveI18nError(defenseAction.error, t('eventDefense.defenseActionFailed'))}
            </p>
          )}
        </form>
      </AppDialog>
    </>
  )
}
