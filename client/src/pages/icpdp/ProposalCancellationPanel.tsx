import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { AppBadge } from '@/components/ui/badge/AppBadge'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useConfirm } from '@/hooks/useConfirm'
import { useEventProposalAction } from '@/hooks/useEventProposalReviews'
import type { EventCancellationReviewInfo } from '@/services/eventProposalReviews'
import { resolveI18nError } from '@/pages/icpdp/eventProposalReviewFormat'
import { formatDate } from '@/utils/formatDate'

interface ProposalCancellationPanelProps {
  id: string
  cancellationRequest: EventCancellationReviewInfo
  /** Người phụ trách xét yêu cầu huỷ đang chờ. */
  canDecide: boolean
  csrfToken: string
}

// Yêu cầu hủy sự kiện có form xét duyệt riêng dành cho ICPDP được phân công.
export function ProposalCancellationPanel({
  id,
  cancellationRequest,
  canDecide,
  csrfToken,
}: ProposalCancellationPanelProps) {
  const { t, i18n } = useTranslation()
  const askConfirm = useConfirm()
  const action = useEventProposalAction()
  const [cancelApprove, setCancelApprove] = useState(true)
  const [cancelReviewReason, setCancelReviewReason] = useState('')
  const [cancelReviewError, setCancelReviewError] = useState<string | null>(null)
  function date(value: string) {
    return formatDate(value, i18n.language)
  }

  /** Kiểm tra lý do khi từ chối hủy, yêu cầu xác nhận rồi gửi quyết định duyệt hủy sự kiện. */
  async function submitCancellationDecision(e: FormEvent) {
    e.preventDefault()
    setCancelReviewError(null)
    const trimmed = cancelReviewReason.trim()
    if (!cancelApprove && !trimmed) {
      setCancelReviewError(t('eventReviews.reasonRequired'))
      return
    }
    const prompt = cancelApprove
      ? t('eventReviews.cancellationConfirmApprove')
      : t('eventReviews.cancellationConfirmReject')
    if (!(await askConfirm(prompt))) {
      return
    }
    try {
      await action.mutateAsync({
        kind: 'decideCancellation',
        id,
        input: { approve: cancelApprove, ...(trimmed ? { reason: trimmed } : {}) },
        csrfToken,
      })
      setCancelReviewReason('')
    } catch (error) {
      console.error('[EventProposalReviewPage] decideCancellation failed:', error)
    }
  }

  return (
    <section className="rounded-2xl border border-l-4 border-border-app border-l-warning-app bg-bg-app p-5 shadow-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold">
          {t('eventReviews.cancellationPanel')}
        </h2>
        <AppBadge
          tone={
            cancellationRequest.state === 'Approved'
              ? 'success'
              : cancellationRequest.state === 'Rejected'
                ? 'danger'
                : 'warning'
          }
        >
          {cancellationRequest.state === 'Approved'
            ? t('eventReviews.stateApproved')
            : cancellationRequest.state === 'Rejected'
              ? t('eventReviews.stateRejected')
              : t('eventReviews.statePendingApproval')}
        </AppBadge>
      </div>
      <p className="text-xs text-muted-app">
        {t('eventReviews.cancellationRequestedAt', {
          date: date(cancellationRequest.requestedAt),
        })}
      </p>
      <div className="rounded-xl border border-border-app bg-surface-app p-3 text-sm">
        <p className="text-xs font-medium text-muted-app">
          {t('eventReviews.cancellationClubReason')}
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words">{cancellationRequest.reason}</p>
      </div>
      {cancellationRequest.state === 'Pending' && (
        <p className="text-xs text-muted-app">{t('eventReviews.cancellationPendingHint')}</p>
      )}
      {cancellationRequest.state !== 'Pending' && cancellationRequest.decidedAt && (
        <div className="border-t border-border-app pt-2 text-xs text-muted-app space-y-1">
          <p className="font-medium text-text-app">
            {t(
              cancellationRequest.state === 'Approved'
                ? 'eventReviews.cancellationDecidedApproved'
                : 'eventReviews.cancellationDecidedRejected',
              {
                date: date(cancellationRequest.decidedAt),
              },
            )}
          </p>
          {cancellationRequest.reviewReason && (
            <p className="whitespace-pre-wrap break-words">{cancellationRequest.reviewReason}</p>
          )}
        </div>
      )}
      {canDecide && (
        <form
          onSubmit={(e) => void submitCancellationDecision(e)}
          className="space-y-3 border-t border-border-app pt-3 text-sm"
        >
          <div className="grid grid-cols-2 gap-2">
            <AppButton
              type="button"
              variant={cancelApprove ? 'primary' : 'secondary'}
              onClick={() => {
                setCancelApprove(true)
                setCancelReviewError(null)
              }}
            >
              {t('eventReviews.cancellationApprove')}
            </AppButton>
            <AppButton
              type="button"
              variant={!cancelApprove ? 'primary' : 'secondary'}
              onClick={() => {
                setCancelApprove(false)
                setCancelReviewError(null)
              }}
            >
              {t('eventReviews.cancellationReject')}
            </AppButton>
          </div>
          <label className="block font-medium text-text-app">
            {t('eventReviews.reason')}
            {!cancelApprove && <AppRequiredMark />}
            <span className="mt-0.5 block text-xs font-normal text-muted-app">
              {t('eventReviews.cancellationRejectionReasonHint')}
            </span>
            <AppTextarea
              value={cancelReviewReason}
              maxLength={2000}
              onChange={(e) => {
                setCancelReviewReason(e.target.value)
                if (cancelReviewError) {
                  setCancelReviewError(null)
                }
              }}
              className="mt-1.5 min-h-20 w-full font-normal"
            />
          </label>
          {(cancelReviewError || action.isError) && (
            <p role="alert" className="text-sm text-danger-app">
              {cancelReviewError ?? resolveI18nError(action.error, t('eventReviews.actionError'))}
            </p>
          )}
          <AppButton type="submit" className="w-full" disabled={action.isPending}>
            {action.isPending ? t('eventReviews.submitting') : t('eventReviews.cancellationSubmit')}
          </AppButton>
        </form>
      )}
    </section>
  )
}
