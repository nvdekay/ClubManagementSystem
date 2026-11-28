/** Khung soạn quyết định dùng chung cho xét duyệt đề xuất và xét duyệt sau bảo vệ. */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useConfirm } from '@/hooks/useConfirm'
import { appToast } from '@/components/ui/toast/AppToast'
import { useEventDefenseActions } from '@/hooks/useEventDefense'
import { useEventProposalAction } from '@/hooks/useEventProposalReviews'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import { formatMoney } from '@/utils/formatMoney'
import { outcomeLabel, resolveI18nError } from '@/pages/icpdp/eventProposalReviewFormat'
import { type EventProposalDetail, type EventReviewOutcome } from '@/services/eventProposalReviews'
import { cn } from '@/utils/cn'
import { DIRECT_VENDOR_THRESHOLD_VND, type FundingDecision } from '@/services/sponsoredItems'

interface ProposalDecisionPanelProps {
  detail: EventProposalDetail
  csrfToken: string
  postDefense?: boolean
  onSuccess?: () => void
  reasonDraft?: { value: string; onChange: (value: string) => void }
}

const ACTIVE_DEFENSE_STATES = new Set([
  'SCHEDULED',
  'CONFIRMED',
  'RESCHEDULE_REQUESTED',
  'IN_PROGRESS',
])

/** Kiểm tra nhận xét, hạn chỉnh sửa và tài trợ trước khi xác nhận quyết định. */
export function ProposalDecisionPanel({
  detail,
  csrfToken,
  postDefense = false,
  onSuccess,
  reasonDraft,
}: ProposalDecisionPanelProps) {
  const { t, i18n } = useTranslation()
  const askConfirm = useConfirm()
  const reviewAction = useEventProposalAction()
  const defenseAction = useEventDefenseActions()

  // Xác định các quyết định được phép theo trạng thái bảo vệ trước khi khởi tạo form.
  const { event, budget, versions, activeDefenseSession } = detail
  const hasBlockingDefense = Boolean(
    activeDefenseSession && ACTIVE_DEFENSE_STATES.has(activeDefenseSession.state),
  )
  const outcomes: EventReviewOutcome[] = postDefense
    ? ['Reject', 'Approve', 'Request revision', 'Re-defense']
    : ['Request revision', 'Approve', 'Reject']

  // Dữ liệu quyết định đang nhập được giữ riêng với hồ sơ đã nộp cho đến khi xác nhận.
  const [outcome, setOutcome] = useState<EventReviewOutcome>(
    hasBlockingDefense ? 'Request revision' : 'Approve',
  )
  const [localReason, setLocalReason] = useState('')
  const reason = reasonDraft?.value ?? localReason
  const setReason = reasonDraft?.onChange ?? setLocalReason
  const [reviewNote, setReviewNote] = useState('')
  const [deadline, setDeadline] = useState('')
  const [conditions, setConditions] = useState('')
  const [amounts, setAmounts] = useState<Record<number, { reason?: string }>>({})
  const [funding, setFunding] = useState<Record<number, FundingDecision>>({})

  // Quyết định tài trợ căn cứ ngân sách đã nộp, không lấy bản nháp được sửa về sau.
  const current =
    versions.find((version) => version.revisionNo === event.currentRevisionNo) ?? versions.at(-1)
  const lines = current?.budgetLines ?? []
  // Giao diện duyệt toàn bộ số tiền đề nghị của từng dòng, hoặc bằng 0 nếu không tài trợ.
  const approvedAmounts = lines.map((line, index) =>
    funding[index] === 'NOT_SPONSORED' ? 0 : line.amount,
  )

  // Hạn chỉnh sửa phải ở tương lai và cách giờ bảo vệ đang có lịch ít nhất 12 giờ.
  const defenseCutoffMessage = (() => {
    if (outcome !== 'Request revision' || !deadline) {
      return null
    }
    const deadlineDate = new Date(deadline)
    if (deadlineDate <= new Date()) {
      return t('eventReviews.deadlineRequired')
    }
    if (hasBlockingDefense && activeDefenseSession) {
      const gapMs = new Date(activeDefenseSession.startAt).getTime() - deadlineDate.getTime()
      if (gapMs < 12 * 60 * 60 * 1000) {
        return t('eventDefense.revisionBeforeDefenseHint')
      }
    }
    return null
  })()

  // Chỉ kiểm tra các trường cần cho quyết định đang chọn, gồm lý do tài trợ theo từng dòng.
  const field = useFieldValidation<string>({
    reason: outcome !== 'Approve' && !reason.trim() ? t('eventReviews.reasonRequired') : null,
    deadline:
      outcome === 'Request revision'
        ? !deadline
          ? t('eventReviews.deadlineRequired')
          : defenseCutoffMessage
        : null,
    ...Object.fromEntries(
      lines.flatMap((line, index) => {
        const value = approvedAmounts[index]!
        const approve = outcome === 'Approve'
        return [
          [`funding${index}`, approve && !funding[index] ? t('sponsoredItems.choose') : null],
          [
            `amount${index}`,
            approve &&
            (!Number.isInteger(value) ||
              value < 0 ||
              value > line.amount ||
              (funding[index] === 'NOT_SPONSORED' ? value !== 0 : value === 0))
              ? t('eventReviews.amountInvalid')
              : null,
          ],
          [
            `amountReason${index}`,
            approve &&
            value < line.amount &&
            !(amounts[index]?.reason?.trim() || budget?.lines[index]?.reason?.trim())
              ? t('eventReviews.amountReasonRequired')
              : null,
          ],
        ]
      }),
    ),
  })

  // Lưu giải thích của ICPDP cho dòng kinh phí không được tài trợ.
  function editLine(index: number, change: { reason?: string }) {
    setAmounts((prev) => ({ ...prev, [index]: { ...prev[index], ...change } }))
  }

  // Lấy trạng thái phản hồi từ API tương ứng với chế độ xét duyệt hiện tại của khung.
  const isPending = reviewAction.isPending || defenseAction.isPending
  const mutationError = postDefense ? defenseAction.error : reviewAction.error
  const isSuccess = postDefense
    ? defenseAction.isSuccess && defenseAction.variables?.kind === 'decideAfter'
    : reviewAction.isSuccess && reviewAction.variables?.kind === 'decide'

  const approvedTotal = approvedAmounts.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? value : 0),
    0,
  )

  /** Kiểm tra dữ liệu, yêu cầu xác nhận rồi chỉ gửi các trường phù hợp với quyết định đã chọn. */
  async function submitDecision() {
    if (!field.touchAll()) {
      return
    }
    const prompt =
      outcome === 'Approve'
        ? t('eventReviews.confirmApprove')
        : outcome === 'Reject'
          ? t('eventReviews.confirmReject')
          : outcome === 'Re-defense'
            ? t('eventDefense.confirmReDefense')
            : t('eventReviews.confirmRevision')
    if (!(await askConfirm(prompt))) {
      return
    }

    const input = {
      outcome,
      reason: reason.trim() || undefined,
      reviewNote: reviewNote.trim() || undefined,
      ...(outcome === 'Request revision'
        ? { revisionDeadlineAt: new Date(deadline).toISOString() }
        : {}),
      ...(outcome === 'Approve'
        ? {
            conditions: conditions
              .split('\n')
              .map((item) => item.trim())
              .filter(Boolean),
            budgetLines: approvedAmounts.map((approvedAmount, index) => ({
              approvedAmount,
              fundingDecision: funding[index]!,
              ...(approvedAmount < lines[index]!.amount
                ? { reason: amounts[index]?.reason?.trim() || budget?.lines[index]?.reason }
                : {}),
            })),
          }
        : {}),
    }

    try {
      // Quyết định sau bảo vệ dùng API bảo vệ với các kiểm tra trạng thái riêng.
      if (postDefense) {
        defenseAction.reset()
        await defenseAction.mutateAsync({
          kind: 'decideAfter',
          eventId: event.id,
          input,
          csrfToken,
        })
      } else {
        reviewAction.reset()
        await reviewAction.mutateAsync({ kind: 'decide', id: event.id, csrfToken, input })
      }
      appToast.success(t('eventReviews.success'))
      onSuccess?.()
    } catch (error) {
      console.error('[ProposalDecisionPanel] submit decision failed:', error)
    }
  }

  return (
    <section className="rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">
        {postDefense ? t('eventDefense.postDecisionTitle') : t('eventReviews.decisionPanel')}
      </h2>
      <p className="mt-1 text-sm text-muted-app">
        {postDefense ? t('eventDefense.postDecisionHint') : t('eventReviews.decisionHint')}
      </p>

      {/* Khi đang có buổi bảo vệ, chỉ cho yêu cầu sửa và khóa lựa chọn duyệt hoặc từ chối thông thường. */}
      {hasBlockingDefense && !postDefense && (
        <div className="mt-4">
          <AppNotice tone="warning">{t('eventDefense.confirmDecisionLockedNotice')}</AppNotice>
        </div>
      )}

      {/* Bộ chọn quyết định xóa phản hồi thao tác cũ khi chuyển sang quyết định khác. */}
      <div
        className={cn('mt-5 grid gap-1 rounded-lg border border-border-app bg-surface-app p-1', {
          'grid-cols-2 sm:grid-cols-4': outcomes.length === 4,
          'grid-cols-3': outcomes.length === 3,
        })}
      >
        {outcomes.map((value) => {
          const disabledByDefense =
            !postDefense && hasBlockingDefense && value !== 'Request revision'
          return (
            <button
              key={value}
              type="button"
              disabled={disabledByDefense}
              aria-pressed={outcome === value}
              onClick={() => {
                setOutcome(value)
                reviewAction.reset()
                defenseAction.reset()
              }}
              className={cn(
                'min-h-11 rounded-md px-2 py-1.5 text-xs font-medium text-muted-app transition-colors hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app disabled:opacity-40 sm:min-h-9',
                { 'bg-segment-app text-text-app shadow-xs': outcome === value },
              )}
            >
              {outcomeLabel(t, value)}
            </button>
          )
        })}
      </div>

      {/* Revision requests require a resubmission deadline. */}
      {outcome === 'Request revision' && (
        <fieldset className="mt-5">
          <label className="mt-4 block text-sm font-medium text-text-app">
            {t('eventReviews.deadline')}
            <AppRequiredMark />
            <AppInput
              type="datetime-local"
              value={deadline}
              {...field.control('deadline')}
              onChange={(e) => setDeadline(e.target.value)}
              className="mt-1.5 block w-full font-normal"
            />
            <AppFieldError message={field.error('deadline')} />
          </label>
          {hasBlockingDefense && (
            <p className="mt-2 text-xs text-muted-app">
              {t('eventDefense.revisionBeforeDefenseHint')}
            </p>
          )}
        </fieldset>
      )}

      {/* Phê duyệt ghi thời điểm tài trợ từng khoản và lý do đối với khoản không được tài trợ. */}
      {outcome === 'Approve' && lines.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-text-app">
            {t('eventReviews.approveAmounts')}
          </legend>
          <p className="mt-1 text-xs text-muted-app">{t('eventReviews.approveAmountsHint')}</p>
          <div className="mt-3 space-y-4">
            {lines.map((line, index) => {
              const lowered = approvedAmounts[index]! < line.amount
              return (
                <div key={index}>
                  <label className="mb-3 block text-sm font-medium">
                    {t('sponsoredItems.funding')}
                    <select
                      className="mt-1 block w-full rounded-lg border border-border-app bg-bg-app p-2 text-text-app"
                      value={funding[index] ?? ''}
                      onChange={(event) => {
                        const value = event.target.value as FundingDecision
                        setFunding((previous) => ({ ...previous, [index]: value }))
                      }}
                    >
                      <option value="">{t('sponsoredItems.choose')}</option>
                      {(['NOT_SPONSORED', 'BEFORE_EVENT', 'AFTER_EVENT'] as const).map((value) => (
                        <option key={value} value={value}>
                          {t(`sponsoredItems.${value}`)}
                        </option>
                      ))}
                    </select>
                    <AppFieldError message={field.error(`funding${index}`)} />
                  </label>
                  {funding[index] === 'BEFORE_EVENT' && (
                    <p className="mb-2 text-xs text-muted-app">
                      {t('sponsoredItems.decisionHintBefore')}
                    </p>
                  )}
                  {funding[index] === 'AFTER_EVENT' && (
                    <p className="mb-2 text-xs text-muted-app">
                      {t(
                        line.amount >= DIRECT_VENDOR_THRESHOLD_VND
                          ? 'sponsoredItems.decisionHintAfterDirect'
                          : 'sponsoredItems.decisionHintAfterFlexible',
                      )}
                    </p>
                  )}
                  <label className="block text-sm font-medium text-text-app">
                    <span className="flex flex-wrap justify-between gap-2">
                      <span className="font-medium break-words">{line.category}</span>
                      <span className="text-xs text-muted-app">
                        {t('eventReviews.requestedAmount')}:{' '}
                        {formatMoney(line.amount, i18n.language)}
                      </span>
                    </span>
                    <AppInput
                      readOnly
                      value={formatMoney(approvedAmounts[index]!, i18n.language)}
                      className="mt-1.5 w-full bg-surface-app tabular-nums"
                    />
                    <AppFieldError message={field.error(`amount${index}`)} />
                  </label>
                  {lowered && (
                    <>
                      <AppInput
                        aria-label={t('eventReviews.reductionReason')}
                        placeholder={t('eventReviews.reductionReason')}
                        value={amounts[index]?.reason ?? budget?.lines[index]?.reason ?? ''}
                        maxLength={500}
                        {...field.control(`amountReason${index}`)}
                        onChange={(e) => editLine(index, { reason: e.target.value })}
                        className="mt-2 w-full"
                      />
                      <AppFieldError message={field.error(`amountReason${index}`)} />
                    </>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-sm font-semibold">
            {t('eventReviews.approvedTotal', { amount: formatMoney(approvedTotal, i18n.language) })}
          </p>
        </fieldset>
      )}

      {/* Điều kiện phê duyệt không bắt buộc, nhập mỗi dòng một điều kiện và chuẩn hóa khi gửi. */}
      {outcome === 'Approve' && (
        <label className="mt-4 block text-sm font-medium text-text-app">
          {t('eventReviews.conditions')}
          <AppTextarea
            className="mt-1.5 min-h-24 w-full font-normal"
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder={t('eventReviews.conditionsHint')}
          />
        </label>
      )}

      {/* Lý do quyết định là bắt buộc với mọi lựa chọn trừ phê duyệt. */}
      <label className="mt-4 block text-sm font-medium text-text-app">
        {t('eventReviews.reason')}
        {outcome !== 'Approve' && <AppRequiredMark />}
        <AppTextarea
          className="mt-1.5 min-h-24 w-full font-normal"
          value={reason}
          maxLength={5000}
          {...field.control('reason', outcome !== 'Approve')}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('eventReviews.reasonHint')}
        />
        <AppFieldError message={field.error('reason')} />
      </label>

      <label className="mt-4 block text-sm font-medium text-text-app">
        {/* Ghi chú xét duyệt bổ sung được gửi riêng với lý do quyết định. */}
        {t('eventReviews.reviewNote')}
        <AppTextarea
          className="mt-1.5 min-h-24 w-full font-normal"
          value={reviewNote}
          maxLength={10000}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder={t('eventReviews.reviewNoteHint')}
        />
      </label>

      {/* Xác nhận trước khi ghi quyết định, chặn gửi trùng trong lúc chờ và hiển thị phản hồi từ API. */}
      <AppButton className="mt-6 w-full" disabled={isPending} onClick={() => void submitDecision()}>
        {isPending ? t('eventReviews.submitting') : t('eventReviews.submit')}
      </AppButton>

      {mutationError && (
        <p role="alert" className="mt-3 text-sm text-danger-app">
          {resolveI18nError(mutationError, t('eventReviews.actionError'))}
        </p>
      )}
      {isSuccess && (
        <div className="mt-3">
          <AppNotice role="status">{t('eventReviews.success')}</AppNotice>
        </div>
      )}
    </section>
  )
}
