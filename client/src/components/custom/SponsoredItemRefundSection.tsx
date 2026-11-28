import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useConfirm } from '@/hooks/useConfirm'
import { useDownloadInvoiceFile, useRefundAccount } from '@/hooks/useSponsoredItems'
import type { ItemAction, SponsoredItem } from '@/services/sponsoredItems'
import { isAllowedAttachment, triggerUrlDownload } from '@/utils/sponsoredItems'
import { SponsoredItemAttachmentCard } from './SponsoredItemAttachmentCard'
import { useFormat } from '@/hooks/useFormat'
import { AppField } from '@/components/ui/field/AppField'

export interface SponsoredItemRefundSectionProps {
  budgetId: string
  clubId?: string
  item: SponsoredItem
  isClub: boolean
  isOfficer: boolean
  active: boolean
  busy: boolean
  onAct: (action: ItemAction) => Promise<void>
  onUploadFiles: (
    files: File[],
    target: 'invoice' | 'refund',
    onProgress: (done: number) => void,
  ) => Promise<void>
  onError: (message: string) => void
}

// Render the 2-step advance refund flow (RefundPending, RefundSubmitted, confirmed refund) for BEFORE_EVENT items
export function SponsoredItemRefundSection({
  budgetId,
  clubId,
  item,
  isClub,
  isOfficer,
  active,
  busy,
  onAct,
  onUploadFiles,
  onError,
}: SponsoredItemRefundSectionProps) {
  const { t } = useTranslation()
  const { date: formatDateTime, money } = useFormat()
  const confirm = useConfirm()
  const downloadFile = useDownloadInvoiceFile(budgetId, clubId)

  const [refundProgress, setRefundProgress] = useState({ done: 0, total: 0 })
  const [showRefundPanel, setShowRefundPanel] = useState(false)
  const [refundNote, setRefundNote] = useState(item.refundNote ?? '')
  const [refundReason, setRefundReason] = useState('')
  const [copiedAccount, setCopiedAccount] = useState(false)
  const [downloadingRefundAll, setDownloadingRefundAll] = useState(false)

  const isBeforeEvent = item.fundingDecision === 'BEFORE_EVENT'
  const refundProofs = item.refundProofs ?? []
  const hasRefundAmount = (item.refundAmount ?? 0) > 0
  const canFetchRefundAccount =
    isClub &&
    isBeforeEvent &&
    (item.status === 'RefundPending' || item.status === 'RefundSubmitted') &&
    hasRefundAmount

  const refundAccountQuery = useRefundAccount(
    budgetId,
    clubId,
    item.id,
    canFetchRefundAccount && showRefundPanel,
  )

  if (!isBeforeEvent || !hasRefundAmount) {
    return null
  }

  async function uploadRefundProofs(files: File[]) {
    if (!isClub || !active || item.status !== 'RefundPending' || busy) {
      return
    }
    onError('')
    if (
      !files.length ||
      refundProofs.length + files.length > 5 ||
      files.some((file) => !isAllowedAttachment(file))
    ) {
      onError(t('sponsoredItems.invalidImages'))
      return
    }
    setRefundProgress({ done: 0, total: files.length })
    try {
      await onUploadFiles(files, 'refund', (done) =>
        setRefundProgress({ done, total: files.length }),
      )
    } finally {
      setRefundProgress({ done: 0, total: 0 })
    }
  }

  async function downloadAllRefundProofs() {
    if (downloadingRefundAll || !refundProofs.length) {
      return
    }
    onError('')
    setDownloadingRefundAll(true)
    try {
      for (const file of refundProofs) {
        const result = await downloadFile.mutateAsync({ itemId: item.id, imageId: file.id })
        triggerUrlDownload(result.url, result.fileName ?? file.fileName)
      }
    } catch {
      onError(t('sponsoredItems.downloadError'))
    } finally {
      setDownloadingRefundAll(false)
    }
  }

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber)
      setCopiedAccount(true)
      window.setTimeout(() => setCopiedAccount(false), 2000)
    } catch {
      /* Clipboard permission unavailable; users can manually select and copy. */
    }
  }

  return (
    <>
      {item.status === 'RefundPending' && (
        <section className="mt-4 space-y-4 rounded-xl border border-warning-app/40 bg-surface-app/60 p-4">
          <AppNotice tone="warning">
            {t(
              isClub
                ? 'sponsoredItems.refundRequiredBanner'
                : 'sponsoredItems.refundWaitingClubOfficer',
              { amount: money(item.refundAmount!) },
            )}
          </AppNotice>
          {item.refundReviewReason && (
            <AppNotice tone="danger">
              <strong>{t('sponsoredItems.refundReturnedReason')}:</strong>{' '}
              <span className="whitespace-pre-wrap">{item.refundReviewReason}</span>
            </AppNotice>
          )}
          {isClub && active && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <AppButton
                  type="button"
                  variant={showRefundPanel ? 'secondary' : 'primary'}
                  onClick={() => setShowRefundPanel((open) => !open)}
                >
                  {t(
                    showRefundPanel
                      ? 'sponsoredItems.refundHideAccount'
                      : 'sponsoredItems.refundStartButton',
                  )}
                </AppButton>
              </div>
              {showRefundPanel && (
                <div className="space-y-4 rounded-xl border border-border-app bg-bg-app p-4">
                  <div>
                    <h5 className="text-sm font-semibold text-text-app">
                      {t('sponsoredItems.refundAccountTitle')}
                    </h5>
                    <p className="mt-0.5 text-xs text-muted-app">
                      {t('sponsoredItems.refundAccountHint')}
                    </p>
                  </div>

                  {refundAccountQuery.isPending ? (
                    <AppSkeleton className="h-24 w-full" />
                  ) : refundAccountQuery.isError ? (
                    <AppNotice tone="danger" role="alert">
                      {t('sponsoredItems.refundAccountNotConfigured')}
                    </AppNotice>
                  ) : refundAccountQuery.data ? (
                    <dl className="grid gap-3 rounded-lg border border-border-app bg-surface-app/50 p-3.5 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted-app">
                          {t('sponsoredItems.refundAmountDue')}
                        </dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-warning-app">
                          {money(refundAccountQuery.data.refundAmount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-app">
                          {t('sponsoredItems.accountHolder')}
                        </dt>
                        <dd className="mt-0.5 font-medium break-words text-text-app">
                          {refundAccountQuery.data.account.accountHolder}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-app">
                          {t('sponsoredItems.accountNumber')}
                        </dt>
                        <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-semibold tabular-nums text-text-app">
                            {refundAccountQuery.data.account.accountNumber}
                          </span>
                          <AppButton
                            type="button"
                            variant="secondary"
                            className="min-h-7 px-2 text-xs"
                            onClick={() =>
                              void copyAccountNumber(refundAccountQuery.data.account.accountNumber)
                            }
                          >
                            <AppIcon
                              name={copiedAccount ? 'check' : 'clipboard'}
                              className="size-3.5"
                            />
                            {t(
                              copiedAccount
                                ? 'sponsoredItems.refundCopied'
                                : 'sponsoredItems.refundCopyAccount',
                            )}
                          </AppButton>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-app">{t('sponsoredItems.bankName')}</dt>
                        <dd className="mt-0.5 font-medium break-words text-text-app">
                          {refundAccountQuery.data.account.bankName}
                        </dd>
                      </div>
                      {refundAccountQuery.data.account.bankBranch && (
                        <div>
                          <dt className="text-xs text-muted-app">
                            {t('sponsoredItems.bankBranch')}
                          </dt>
                          <dd className="mt-0.5 break-words text-text-app">
                            {refundAccountQuery.data.account.bankBranch}
                          </dd>
                        </div>
                      )}
                      {refundAccountQuery.data.account.transferNote && (
                        <div className="sm:col-span-2">
                          <dt className="text-xs text-muted-app">
                            {t('sponsoredItems.transferNote')}
                          </dt>
                          <dd className="mt-0.5 break-words text-text-app">
                            {refundAccountQuery.data.account.transferNote}
                          </dd>
                        </div>
                      )}
                    </dl>
                  ) : null}

                  <div
                    className="rounded-xl border border-dashed border-border-app p-4"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault()
                      void uploadRefundProofs(Array.from(event.dataTransfer.files))
                    }}
                  >
                    <p className="text-sm font-medium text-text-app">
                      {t('sponsoredItems.refundProofsLabel')} · {refundProofs.length}/5
                    </p>
                    <p className="mt-1 text-xs text-muted-app">
                      {t('sponsoredItems.refundProofsHint')}
                    </p>
                    {refundProofs.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                        {refundProofs.map((file) => (
                          <SponsoredItemAttachmentCard
                            key={file.id}
                            budgetId={budgetId}
                            clubId={clubId}
                            itemId={item.id}
                            file={file}
                            editable={active}
                            busy={busy}
                            onRemove={() =>
                              void onAct({ kind: 'removeRefundImage', imageId: file.id })
                            }
                          />
                        ))}
                      </div>
                    )}
                    {refundProofs.length < 5 && (
                      <label className="relative mt-3 inline-flex min-h-10 items-center rounded-lg border border-border-app bg-surface-app px-4 text-sm font-medium text-primary-app hover:bg-surface-strong-app focus-within:outline-2 focus-within:outline-ring-app">
                        {t('sponsoredItems.refundProofsUpload')}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,application/pdf"
                          multiple
                          disabled={busy}
                          className="sr-only"
                          onChange={(event) => {
                            void uploadRefundProofs(Array.from(event.target.files ?? []))
                            event.target.value = ''
                          }}
                        />
                      </label>
                    )}
                    {refundProgress.total > 0 && (
                      <p role="status" className="mt-2 text-sm text-muted-app">
                        {t('sponsoredItems.progress', refundProgress)}
                      </p>
                    )}
                  </div>

                  <AppField label={t('sponsoredItems.refundNoteLabel')}>
                    <AppTextarea
                      value={refundNote}
                      onChange={(event) => setRefundNote(event.target.value)}
                      placeholder={t('sponsoredItems.refundNotePlaceholder')}
                      maxLength={2000}
                      disabled={busy}
                      className="mt-1 w-full font-normal"
                    />
                  </AppField>

                  <AppButton
                    type="button"
                    disabled={busy || refundProofs.length === 0}
                    onClick={async () => {
                      if (
                        await confirm(
                          t('sponsoredItems.submitRefundConfirm', {
                            amount: money(item.refundAmount!),
                          }),
                        )
                      ) {
                        await onAct({
                          kind: 'submitRefund',
                          ...(refundNote.trim() ? { note: refundNote.trim() } : {}),
                        })
                      }
                    }}
                  >
                    {t('sponsoredItems.submitRefund')}
                  </AppButton>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {item.status === 'RefundSubmitted' && (
        <section className="mt-4 space-y-4 rounded-xl border border-primary-app/30 bg-surface-app/60 p-4">
          {isClub ? (
            <>
              <AppNotice>
                {t('sponsoredItems.refundSubmittedClubNotice', {
                  amount: money(item.refundAmount!),
                  date: item.refundSubmittedAt ? formatDateTime(item.refundSubmittedAt) : '',
                })}
              </AppNotice>
              {item.refundNote && (
                <p className="text-sm text-text-app">
                  <span className="text-muted-app">{t('sponsoredItems.refundClubNote')}: </span>
                  <span className="whitespace-pre-wrap">{item.refundNote}</span>
                </p>
              )}
              {refundProofs.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-text-app">
                    {t('sponsoredItems.refundProofsLabel')} · {refundProofs.length}/5
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    {refundProofs.map((file) => (
                      <SponsoredItemAttachmentCard
                        key={file.id}
                        budgetId={budgetId}
                        clubId={clubId}
                        itemId={item.id}
                        file={file}
                        editable={false}
                        busy={busy}
                        onRemove={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div>
                <AppButton
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRefundPanel((open) => !open)}
                >
                  {t(
                    showRefundPanel
                      ? 'sponsoredItems.refundHideAccount'
                      : 'sponsoredItems.refundShowAccountAgain',
                  )}
                </AppButton>
                {showRefundPanel && (
                  <div className="mt-3">
                    {refundAccountQuery.isPending ? (
                      <AppSkeleton className="h-20 w-full" />
                    ) : refundAccountQuery.isError ? (
                      <AppNotice tone="danger" role="alert">
                        {t('sponsoredItems.refundAccountNotConfigured')}
                      </AppNotice>
                    ) : refundAccountQuery.data ? (
                      <dl className="grid gap-3 rounded-lg border border-border-app bg-bg-app p-3.5 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted-app">
                            {t('sponsoredItems.accountHolder')}
                          </dt>
                          <dd className="mt-0.5 font-medium break-words text-text-app">
                            {refundAccountQuery.data.account.accountHolder}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-app">
                            {t('sponsoredItems.accountNumber')}
                          </dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-text-app">
                            {refundAccountQuery.data.account.accountNumber}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-app">{t('sponsoredItems.bankName')}</dt>
                          <dd className="mt-0.5 break-words text-text-app">
                            {refundAccountQuery.data.account.bankName}
                          </dd>
                        </div>
                        {refundAccountQuery.data.account.bankBranch && (
                          <div>
                            <dt className="text-xs text-muted-app">
                              {t('sponsoredItems.bankBranch')}
                            </dt>
                            <dd className="mt-0.5 break-words text-text-app">
                              {refundAccountQuery.data.account.bankBranch}
                            </dd>
                          </div>
                        )}
                      </dl>
                    ) : null}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h5 className="text-sm font-semibold text-text-app">
                    {t('sponsoredItems.refundSubmittedOfficerTitle')}
                  </h5>
                  <p className="mt-0.5 text-sm tabular-nums text-muted-app">
                    {t('sponsoredItems.refundAmountDue')}:{' '}
                    <strong className="text-text-app">{money(item.refundAmount!)}</strong>
                    {item.refundSubmittedAt ? ` · ${formatDateTime(item.refundSubmittedAt)}` : ''}
                  </p>
                </div>
                {refundProofs.length > 0 && (
                  <AppButton
                    type="button"
                    variant="secondary"
                    disabled={downloadingRefundAll}
                    onClick={() => void downloadAllRefundProofs()}
                  >
                    <AppIcon name="download" className="size-4" />
                    {downloadingRefundAll
                      ? t('sponsoredItems.downloading')
                      : t('sponsoredItems.refundProofsDownloadAll')}
                  </AppButton>
                )}
              </div>
              {item.refundNote && (
                <p className="text-sm text-text-app">
                  <span className="text-muted-app">{t('sponsoredItems.refundClubNote')}: </span>
                  <span className="whitespace-pre-wrap">{item.refundNote}</span>
                </p>
              )}
              {refundProofs.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-text-app">
                    {t('sponsoredItems.refundProofsOfficerLabel')} · {refundProofs.length}/5
                  </p>
                  <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                    {refundProofs.map((file) => (
                      <SponsoredItemAttachmentCard
                        key={file.id}
                        budgetId={budgetId}
                        clubId={clubId}
                        itemId={item.id}
                        file={file}
                        editable={false}
                        busy={busy}
                        onRemove={() => {}}
                      />
                    ))}
                  </div>
                </div>
              )}
              {active && (
                <div className="space-y-3 border-t border-border-app pt-3">
                  <AppField label={t('sponsoredItems.refundReviewReasonLabel')}>
                    <AppTextarea
                      value={refundReason}
                      onChange={(event) => setRefundReason(event.target.value)}
                      maxLength={2000}
                      disabled={busy}
                      className="mt-1 w-full font-normal"
                    />
                  </AppField>
                  <div className="flex flex-wrap gap-2">
                    <AppButton
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await confirm(
                            t('sponsoredItems.confirmRefundConfirm', {
                              amount: money(item.refundAmount!),
                            }),
                          )
                        ) {
                          await onAct({
                            kind: 'confirmRefund',
                            ...(refundReason.trim() ? { reason: refundReason.trim() } : {}),
                          })
                        }
                      }}
                    >
                      {t('sponsoredItems.confirmRefund')}
                    </AppButton>
                    <AppButton
                      type="button"
                      variant="ghost"
                      disabled={busy || !refundReason.trim()}
                      onClick={() =>
                        void onAct({ kind: 'returnRefund', reason: refundReason.trim() })
                      }
                    >
                      {t('sponsoredItems.returnRefund')}
                    </AppButton>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {item.refundConfirmedAt && (
        <section className="mt-4 space-y-3 rounded-xl border border-success-app/30 bg-surface-app/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-success-app">
              {t('sponsoredItems.refundConfirmedDone', {
                amount: money(item.refundAmount!),
                date: formatDateTime(item.refundConfirmedAt),
              })}
            </p>
            {isOfficer && refundProofs.length > 0 && (
              <AppButton
                type="button"
                variant="secondary"
                disabled={downloadingRefundAll}
                onClick={() => void downloadAllRefundProofs()}
              >
                <AppIcon name="download" className="size-4" />
                {downloadingRefundAll
                  ? t('sponsoredItems.downloading')
                  : t('sponsoredItems.refundProofsDownloadAll')}
              </AppButton>
            )}
          </div>
          {item.refundReviewReason && (
            <p className="whitespace-pre-wrap text-sm text-text-app">{item.refundReviewReason}</p>
          )}
          {refundProofs.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {refundProofs.map((file) => (
                <SponsoredItemAttachmentCard
                  key={file.id}
                  budgetId={budgetId}
                  clubId={clubId}
                  itemId={item.id}
                  file={file}
                  editable={false}
                  busy={busy}
                  onRemove={() => {}}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  )
}
