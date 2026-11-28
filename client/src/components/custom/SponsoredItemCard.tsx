import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppMoneyInput } from '@/components/ui/money-input/AppMoneyInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useConfirm } from '@/hooks/useConfirm'
import { useSponsoredItemAction } from '@/hooks/useSponsoredItems'
import {
  DIRECT_VENDOR_THRESHOLD_VND,
  resolvePaymentChannel,
  type ItemAction,
  type SponsoredBudget,
  type SponsoredItem,
} from '@/services/sponsoredItems'
import { cn } from '@/utils/cn'
import { SponsoredItemInvoiceSection } from './SponsoredItemInvoiceSection'
import { SponsoredItemRefundSection } from './SponsoredItemRefundSection'
import { formatDate } from '@/utils/formatDate'
import { useFormat } from '@/hooks/useFormat'
import { AppField } from '@/components/ui/field/AppField'

export interface SponsoredItemCardProps {
  budget: SponsoredBudget
  item: SponsoredItem
  clubId?: string
  csrfToken: string
}

// Card for a single sponsored budget item across advance, invoice review, refund, and payout phases
export function SponsoredItemCard({ budget, item, clubId, csrfToken }: SponsoredItemCardProps) {
  const { t, i18n } = useTranslation()
  const { date: formatDateTime, money } = useFormat()
  const confirm = useConfirm()
  const mutation = useSponsoredItemAction(budget.id, clubId, csrfToken)

  const resolvedChannel = resolvePaymentChannel(item)
  const [selectedChannel, setSelectedChannel] = useState<'VIA_OFFICER_REIMBURSE' | 'DIRECT_VENDOR'>(
    resolvedChannel === 'DIRECT_VENDOR' ? 'DIRECT_VENDOR' : 'VIA_OFFICER_REIMBURSE',
  )
  const [valid, setValid] = useState(String(item.amount))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const isClub = Boolean(clubId)
  const isOfficer = !isClub
  const deadline = new Date(new Date(item.eventEndAt).getTime() + 14 * 86_400_000)
  const now = new Date()
  const active = [
    'Approved',
    'Upcoming',
    'Ongoing',
    'Completed',
    'Report Submitted',
    'Closed',
  ].includes(budget.eventState)
  const isBeforeEvent = item.fundingDecision === 'BEFORE_EVENT'
  const isAfterEvent = item.fundingDecision === 'AFTER_EVENT'
  const isNotSponsored = item.fundingDecision === 'NOT_SPONSORED'
  const requiresDirectVendor = isAfterEvent && item.approvedAmount >= DIRECT_VENDOR_THRESHOLD_VND
  const activeChannel = isBeforeEvent
    ? 'VIA_OFFICER_ADVANCE'
    : isAfterEvent
      ? requiresDirectVendor
        ? 'DIRECT_VENDOR'
        : selectedChannel
      : undefined
  const usesDirectVendor = activeChannel === 'DIRECT_VENDOR'

  const editable =
    isClub && active && ['Draft', 'Returned'].includes(item.status) && now <= deadline
  const expired = ['Draft', 'Returned'].includes(item.status) && now > deadline
  const showInvoiceSection =
    !isNotSponsored &&
    (!isBeforeEvent ||
      Boolean(item.advanceReceivedAt) ||
      !['AwaitingAdvance', 'AdvanceSent'].includes(item.status))
  const officerDraftHidden = isOfficer && !isNotSponsored && item.status === 'Draft'

  async function act(action: ItemAction) {
    setError('')
    try {
      await mutation.mutateAsync({ itemId: item.id, revision: budget.revision, action })
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('sponsoredItems.error'))
    }
  }

  async function uploadFiles(
    files: File[],
    target: 'invoice' | 'refund',
    onProgress: (done: number) => void,
  ) {
    setError('')
    try {
      await mutation.mutateAsync({
        itemId: item.id,
        revision: budget.revision,
        files,
        ...(target === 'refund' ? { target: 'refund' as const } : {}),
        onProgress,
      })
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : t('sponsoredItems.error'))
    }
  }

  return (
    <article className="rounded-xl border border-border-app bg-bg-app p-4 sm:p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="font-semibold text-text-app break-words">{item.category}</h4>
          <p className="mt-1 text-sm text-primary-app">
            {t(`sponsoredItems.${item.fundingDecision}`)}
          </p>
          {activeChannel && (
            <p className="mt-0.5 text-xs text-muted-app">
              {t(`sponsoredItems.channel_${activeChannel}`)}
            </p>
          )}
        </div>
        <span className="rounded-full bg-primary-app/10 px-3 py-1 text-sm font-medium text-primary-app">
          {t(`sponsoredItems.${expired ? 'Expired' : item.status}`)}
        </span>
      </header>

      <p className="mt-3 text-sm">
        {t('sponsoredItems.cap')}:{' '}
        <strong className="tabular-nums">{money(item.approvedAmount)}</strong>
      </p>
      {item.reason && <p className="mt-1 text-sm text-muted-app">{item.reason}</p>}

      {!isNotSponsored && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-app">
          <p>
            {t('sponsoredItems.opens')}: {formatDateTime(item.eventEndAt)}
          </p>
          <p>
            {t('sponsoredItems.deadline')}: {formatDate(deadline, i18n.language)}
          </p>
        </div>
      )}

      {isBeforeEvent && item.status === 'AwaitingAdvance' && (
        <div className="mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app p-4">
          <p className="text-sm text-text-app">{t('sponsoredItems.advancePendingOfficer')}</p>
          {isOfficer && active && (
            <AppButton
              type="button"
              disabled={mutation.isPending}
              onClick={async () => {
                if (
                  await confirm(
                    t('sponsoredItems.recordAdvanceConfirm', {
                      amount: money(item.approvedAmount),
                    }),
                  )
                ) {
                  await act({ kind: 'recordAdvance' })
                }
              }}
            >
              {t('sponsoredItems.recordAdvance')}
            </AppButton>
          )}
        </div>
      )}

      {isBeforeEvent && item.status === 'AdvanceSent' && (
        <div className="mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app p-4">
          <p className="text-sm text-text-app">
            {t(
              isClub ? 'sponsoredItems.advanceSentNotice' : 'sponsoredItems.advanceSentWaitingClub',
              {
                amount: money(item.advanceAmount ?? item.approvedAmount),
                date: item.advancedAt ? formatDateTime(item.advancedAt) : '',
              },
            )}
          </p>
          {isClub && active && (
            <AppButton
              type="button"
              disabled={mutation.isPending}
              onClick={async () => {
                if (
                  await confirm(
                    t('sponsoredItems.confirmAdvanceReceivedConfirm', {
                      amount: money(item.advanceAmount ?? item.approvedAmount),
                    }),
                  )
                ) {
                  await act({ kind: 'confirmAdvanceReceived' })
                }
              }}
            >
              {t('sponsoredItems.confirmAdvanceReceived')}
            </AppButton>
          )}
        </div>
      )}

      {isBeforeEvent && item.advanceReceivedAt && (
        <div className="mt-4">
          <AppNotice>
            {t('sponsoredItems.advanceReceivedSummary', {
              amount: money(item.advanceAmount ?? item.approvedAmount),
              date: formatDateTime(item.advanceReceivedAt),
            })}
          </AppNotice>
        </div>
      )}

      <SponsoredItemInvoiceSection
        budgetId={budget.id}
        clubId={clubId}
        item={item}
        isClub={isClub}
        isOfficer={isOfficer}
        isBeforeEvent={isBeforeEvent}
        isAfterEvent={isAfterEvent}
        isNotSponsored={isNotSponsored}
        requiresDirectVendor={requiresDirectVendor}
        usesDirectVendor={usesDirectVendor}
        resolvedChannel={resolvedChannel}
        activeChannel={activeChannel}
        selectedChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
        editable={editable}
        showInvoiceSection={showInvoiceSection}
        officerDraftHidden={officerDraftHidden}
        now={now}
        busy={mutation.isPending}
        onAct={act}
        onUploadFiles={uploadFiles}
        onError={setError}
      />

      {item.reviewReason && (
        <p className="mt-4 whitespace-pre-wrap text-sm text-text-app">{item.reviewReason}</p>
      )}
      {item.payable !== undefined && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-semibold tabular-nums">
            {t(isBeforeEvent ? 'sponsoredItems.acceptedAfterAdvance' : 'sponsoredItems.payable')}:{' '}
            {money(item.payable)}
          </p>
          {isBeforeEvent && item.reconciliationDelta !== undefined && (
            <p
              className={cn('text-sm', {
                'text-warning-app': item.reconciliationDelta < 0,
                'text-success-app': item.reconciliationDelta >= 0,
              })}
            >
              {item.reconciliationDelta < 0
                ? t('sponsoredItems.reconciliationDeltaShort', {
                    amount: money(Math.abs(item.reconciliationDelta)),
                  })
                : t('sponsoredItems.reconciliationDeltaExact')}
            </p>
          )}
        </div>
      )}

      {isOfficer && active && item.status === 'Submitted' && (
        <div className="mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app/40 p-4">
          <AppField label={t('sponsoredItems.valid')}>
            <AppMoneyInput
              value={valid}
              onValueChange={setValid}
              className="mt-1 w-full font-normal"
            />
          </AppField>
          <AppField label={t('sponsoredItems.reason')}>
            <AppTextarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={2000}
              className="mt-1 w-full font-normal"
            />
          </AppField>
          <div className="flex flex-wrap gap-2">
            <AppButton
              type="button"
              disabled={mutation.isPending || !reason.trim()}
              onClick={() => void act({ kind: 'review', validAmount: Number(valid), reason })}
            >
              {t('sponsoredItems.review')}
            </AppButton>
            <AppButton
              type="button"
              variant="ghost"
              disabled={mutation.isPending || !reason.trim() || now >= deadline}
              onClick={() => void act({ kind: 'return', reason })}
            >
              {t('sponsoredItems.return')}
            </AppButton>
          </div>
        </div>
      )}

      <SponsoredItemRefundSection
        budgetId={budget.id}
        clubId={clubId}
        item={item}
        isClub={isClub}
        isOfficer={isOfficer}
        active={active}
        busy={mutation.isPending}
        onAct={act}
        onUploadFiles={uploadFiles}
        onError={setError}
      />

      {active &&
        item.status === 'Accepted' &&
        activeChannel === 'VIA_OFFICER_REIMBURSE' &&
        (isClub ? (
          <AppButton
            type="button"
            className="mt-4"
            disabled={mutation.isPending}
            onClick={async () => {
              if (await confirm(t('sponsoredItems.payConfirm', { amount: money(item.payable!) }))) {
                await act({ kind: 'pay' })
              }
            }}
          >
            {t('sponsoredItems.pay')}
          </AppButton>
        ) : (
          <div className="mt-4">
            <AppNotice>
              {t('sponsoredItems.officerReimburseWaitingClub', {
                amount: money(item.payable ?? 0),
              })}
            </AppNotice>
          </div>
        ))}

      {active &&
        item.status === 'Accepted' &&
        activeChannel === 'DIRECT_VENDOR' &&
        (isOfficer ? (
          <AppButton
            type="button"
            className="mt-4"
            disabled={mutation.isPending}
            onClick={async () => {
              if (
                await confirm(
                  t('sponsoredItems.confirmVendorPaidConfirm', {
                    amount: money(item.payable!),
                    vendor: item.vendorBankInfo?.vendorName ?? '',
                  }),
                )
              ) {
                await act({ kind: 'confirmVendorPaid' })
              }
            }}
          >
            {t('sponsoredItems.confirmVendorPaid')}
          </AppButton>
        ) : (
          <div className="mt-4">
            <AppNotice>{t('sponsoredItems.vendorWaitingSchool')}</AppNotice>
          </div>
        ))}

      {item.status === 'Paid' && activeChannel === 'DIRECT_VENDOR' && item.paidAt && (
        <p className="mt-3 text-sm text-success-app">
          {t('sponsoredItems.vendorPaidDone', {
            amount: money(item.payable ?? 0),
            date: formatDateTime(item.paidAt),
          })}
        </p>
      )}

      {!active && <p className="mt-3 text-sm text-warning-app">{t('sponsoredItems.paused')}</p>}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-app">
          {error}
        </p>
      )}
    </article>
  )
}
