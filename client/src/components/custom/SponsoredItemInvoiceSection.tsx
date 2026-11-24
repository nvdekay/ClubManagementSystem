import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppMoneyInput } from '@/components/ui/money-input/AppMoneyInput'
import { AppNotice } from '@/components/ui/notice/AppNotice'
import { AppTextarea } from '@/components/ui/textarea/AppTextarea'
import { useConfirm } from '@/hooks/useConfirm'
import { useDownloadInvoiceFile } from '@/hooks/useSponsoredItems'
import type {
  ItemAction,
  PaymentChannel,
  SponsoredItem,
  VendorBankInfo,
} from '@/services/sponsoredItems'
import { cn } from '@/utils/cn'
import {
  EMPTY_VENDOR,
  formatSponsoredMoney,
  isAllowedAttachment,
  isVendorInfoComplete,
  sameVendorInfo,
  triggerUrlDownload,
} from '@/utils/sponsoredItems'
import { SponsoredItemAttachmentCard } from './SponsoredItemAttachmentCard'

export interface SponsoredItemInvoiceSectionProps {
  budgetId: string
  clubId?: string
  item: SponsoredItem
  isClub: boolean
  isOfficer: boolean
  isBeforeEvent: boolean
  isAfterEvent: boolean
  isNotSponsored: boolean
  requiresDirectVendor: boolean
  usesDirectVendor: boolean
  resolvedChannel?: PaymentChannel
  activeChannel?: PaymentChannel
  selectedChannel: 'VIA_OFFICER_REIMBURSE' | 'DIRECT_VENDOR'
  onSelectChannel: (channel: 'VIA_OFFICER_REIMBURSE' | 'DIRECT_VENDOR') => void
  editable: boolean
  showInvoiceSection: boolean
  officerDraftHidden: boolean
  now: Date
  busy: boolean
  onAct: (action: ItemAction) => Promise<void>
  onUploadFiles: (
    files: File[],
    target: 'invoice' | 'refund',
    onProgress: (done: number) => void,
  ) => Promise<void>
  onError: (message: string) => void
}

// Render club expense/vendor inputs, attachment dropzone, officer read-only view, and submit buttons
export function SponsoredItemInvoiceSection({
  budgetId,
  clubId,
  item,
  isClub,
  isOfficer,
  isBeforeEvent,
  isAfterEvent,
  isNotSponsored,
  requiresDirectVendor,
  usesDirectVendor,
  resolvedChannel,
  activeChannel,
  selectedChannel,
  onSelectChannel,
  editable,
  showInvoiceSection,
  officerDraftHidden,
  now,
  busy,
  onAct,
  onUploadFiles,
  onError,
}: SponsoredItemInvoiceSectionProps) {
  const { t, i18n } = useTranslation()
  const confirm = useConfirm()
  const downloadFile = useDownloadInvoiceFile(budgetId, clubId)

  const [amount, setAmount] = useState(String(item.amount))
  const [description, setDescription] = useState(item.description)
  const [vendor, setVendor] = useState<VendorBankInfo>(() => ({
    ...EMPTY_VENDOR,
    ...(item.vendorBankInfo ?? {}),
  }))
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [downloadingAll, setDownloadingAll] = useState(false)

  const vendorReady = !usesDirectVendor || isVendorInfoComplete(item.vendorBankInfo)
  const canSubmit =
    editable &&
    !isNotSponsored &&
    (!isBeforeEvent || Boolean(item.advanceReceivedAt)) &&
    now >= new Date(item.eventEndAt) &&
    item.images.length > 0 &&
    item.amount > 0 &&
    vendorReady

  const channelDirty =
    isAfterEvent &&
    !requiresDirectVendor &&
    selectedChannel !== (resolvedChannel ?? 'VIA_OFFICER_REIMBURSE')
  const vendorDirty = usesDirectVendor && !sameVendorInfo(item.vendorBankInfo, vendor)
  const dirty =
    Number(amount) !== item.amount ||
    description !== item.description ||
    channelDirty ||
    vendorDirty

  async function saveDraft() {
    if (usesDirectVendor && !isVendorInfoComplete(vendor)) {
      onError(t('sponsoredItems.vendorRequiredError'))
      return
    }
    const vendorPayload: VendorBankInfo | undefined = usesDirectVendor
      ? {
          vendorName: vendor.vendorName.trim(),
          accountHolder: vendor.accountHolder.trim(),
          accountNumber: vendor.accountNumber.trim(),
          bankName: vendor.bankName.trim(),
          ...(vendor.bankBranch?.trim() ? { bankBranch: vendor.bankBranch.trim() } : {}),
          ...(vendor.transferNote?.trim() ? { transferNote: vendor.transferNote.trim() } : {}),
        }
      : undefined
    await onAct({
      kind: 'save',
      amount: Number(amount),
      description,
      ...(isAfterEvent
        ? { paymentChannel: requiresDirectVendor ? 'DIRECT_VENDOR' : selectedChannel }
        : {}),
      ...(vendorPayload ? { vendorBankInfo: vendorPayload } : {}),
    })
  }

  async function upload(files: File[]) {
    if (!editable || busy) {
      return
    }
    onError('')
    if (
      !files.length ||
      item.images.length + files.length > 5 ||
      files.some((file) => !isAllowedAttachment(file))
    ) {
      onError(t('sponsoredItems.invalidImages'))
      return
    }
    setProgress({ done: 0, total: files.length })
    try {
      await onUploadFiles(files, 'invoice', (done) => setProgress({ done, total: files.length }))
    } finally {
      setProgress({ done: 0, total: 0 })
    }
  }

  async function downloadAllFiles() {
    if (downloadingAll || !item.images.length) {
      return
    }
    onError('')
    setDownloadingAll(true)
    try {
      for (const file of item.images) {
        const result = await downloadFile.mutateAsync({ itemId: item.id, imageId: file.id })
        triggerUrlDownload(result.url, result.fileName ?? file.fileName)
      }
    } catch {
      onError(t('sponsoredItems.downloadError'))
    } finally {
      setDownloadingAll(false)
    }
  }

  return (
    <>
      {isClub && isAfterEvent && !requiresDirectVendor && (
        <fieldset className="mt-4 rounded-xl border border-border-app bg-surface-app/60 p-3.5">
          <legend className="px-1 text-xs font-semibold text-text-app">
            {t('sponsoredItems.channelSelectLabel')}
          </legend>
          <div className="mt-2 space-y-2 text-sm">
            {(['VIA_OFFICER_REIMBURSE', 'DIRECT_VENDOR'] as const).map((option) => (
              <label
                key={option}
                className={cn('flex items-start gap-2.5 rounded-lg p-2', {
                  'bg-bg-app': activeChannel === option,
                  'opacity-75': !editable,
                })}
              >
                <input
                  type="radio"
                  name={`channel-${item.id}`}
                  value={option}
                  checked={selectedChannel === option}
                  disabled={!editable || busy}
                  onChange={() => onSelectChannel(option)}
                  className="mt-0.5 size-4 accent-primary-app"
                />
                <span className="text-text-app">
                  {t(
                    option === 'VIA_OFFICER_REIMBURSE'
                      ? 'sponsoredItems.channelSelfPaidOption'
                      : 'sponsoredItems.channelDirectVendorOption',
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {showInvoiceSection &&
        (officerDraftHidden ? (
          <div className="mt-4">
            <AppNotice>{t('sponsoredItems.draftHiddenOfficer')}</AppNotice>
          </div>
        ) : (
          <>
            {isClub ? (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-text-app">
                    {t('sponsoredItems.amount')}
                    <AppMoneyInput
                      value={amount}
                      onValueChange={setAmount}
                      disabled={!editable || busy}
                      className="mt-1 w-full font-normal"
                    />
                  </label>
                  <label className="text-sm font-medium text-text-app">
                    {t('sponsoredItems.description')}
                    <AppTextarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      disabled={!editable || busy}
                      maxLength={2000}
                      className="mt-1 w-full font-normal"
                    />
                  </label>
                </div>

                {usesDirectVendor && (
                  <section className="mt-4 space-y-3 rounded-xl border border-border-app bg-surface-app/50 p-4">
                    <div>
                      <h5 className="text-sm font-semibold text-text-app">
                        {t('sponsoredItems.vendorSectionTitle')}
                      </h5>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm text-text-app">
                        {t('sponsoredItems.vendorName')}
                        <AppInput
                          value={vendor.vendorName}
                          maxLength={200}
                          disabled={!editable || busy}
                          onChange={(event) =>
                            setVendor((prev) => ({ ...prev, vendorName: event.target.value }))
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                      <label className="text-sm text-text-app">
                        {t('sponsoredItems.accountHolder')}
                        <AppInput
                          value={vendor.accountHolder}
                          maxLength={200}
                          disabled={!editable || busy}
                          onChange={(event) =>
                            setVendor((prev) => ({ ...prev, accountHolder: event.target.value }))
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                      <label className="text-sm text-text-app">
                        {t('sponsoredItems.accountNumber')}
                        <AppInput
                          value={vendor.accountNumber}
                          maxLength={50}
                          disabled={!editable || busy}
                          onChange={(event) =>
                            setVendor((prev) => ({ ...prev, accountNumber: event.target.value }))
                          }
                          className="mt-1 w-full tabular-nums"
                        />
                      </label>
                      <label className="text-sm text-text-app">
                        {t('sponsoredItems.bankName')}
                        <AppInput
                          value={vendor.bankName}
                          maxLength={200}
                          disabled={!editable || busy}
                          onChange={(event) =>
                            setVendor((prev) => ({ ...prev, bankName: event.target.value }))
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                      <label className="text-sm text-text-app">
                        {t('sponsoredItems.bankBranch')}
                        <AppInput
                          value={vendor.bankBranch ?? ''}
                          maxLength={200}
                          disabled={!editable || busy}
                          onChange={(event) =>
                            setVendor((prev) => ({ ...prev, bankBranch: event.target.value }))
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                      <label className="text-sm text-text-app">
                        {t('sponsoredItems.transferNote')}
                        <AppInput
                          value={vendor.transferNote ?? ''}
                          maxLength={500}
                          disabled={!editable || busy}
                          onChange={(event) =>
                            setVendor((prev) => ({ ...prev, transferNote: event.target.value }))
                          }
                          className="mt-1 w-full"
                        />
                      </label>
                    </div>
                  </section>
                )}
              </>
            ) : (
              <>
                <dl className="mt-4 grid gap-3 rounded-xl border border-border-app bg-surface-app/40 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-app">{t('sponsoredItems.amount')}</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-text-app">
                      {item.amount > 0
                        ? formatSponsoredMoney(item.amount, i18n.language)
                        : t('sponsoredItems.notEntered')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-app">{t('sponsoredItems.description')}</dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words text-text-app">
                      {item.description || t('sponsoredItems.notEntered')}
                    </dd>
                  </div>
                </dl>

                {usesDirectVendor && (
                  <section className="mt-4 space-y-2 rounded-xl border border-border-app bg-surface-app/50 p-4">
                    <div>
                      <h5 className="text-sm font-semibold text-text-app">
                        {t('sponsoredItems.vendorSectionTitle')}
                      </h5>
                    </div>
                    {item.vendorBankInfo ? (
                      <dl className="grid gap-3 pt-1 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted-app">
                            {t('sponsoredItems.vendorName')}
                          </dt>
                          <dd className="mt-0.5 font-medium break-words text-text-app">
                            {item.vendorBankInfo.vendorName}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-app">
                            {t('sponsoredItems.accountHolder')}
                          </dt>
                          <dd className="mt-0.5 font-medium break-words text-text-app">
                            {item.vendorBankInfo.accountHolder}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-app">
                            {t('sponsoredItems.accountNumber')}
                          </dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-text-app">
                            {item.vendorBankInfo.accountNumber}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-app">{t('sponsoredItems.bankName')}</dt>
                          <dd className="mt-0.5 font-medium break-words text-text-app">
                            {item.vendorBankInfo.bankName}
                          </dd>
                        </div>
                        {item.vendorBankInfo.bankBranch && (
                          <div>
                            <dt className="text-xs text-muted-app">
                              {t('sponsoredItems.bankBranch')}
                            </dt>
                            <dd className="mt-0.5 break-words text-text-app">
                              {item.vendorBankInfo.bankBranch}
                            </dd>
                          </div>
                        )}
                        {item.vendorBankInfo.transferNote && (
                          <div>
                            <dt className="text-xs text-muted-app">
                              {t('sponsoredItems.transferNote')}
                            </dt>
                            <dd className="mt-0.5 break-words text-text-app">
                              {item.vendorBankInfo.transferNote}
                            </dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className="text-sm text-muted-app">{t('sponsoredItems.notEntered')}</p>
                    )}
                  </section>
                )}
              </>
            )}

            <div
              className={cn('mt-5 rounded-xl border border-border-app p-4', {
                'border-dashed': editable,
                'bg-surface-app/30': !editable,
              })}
              onDragOver={editable ? (event) => event.preventDefault() : undefined}
              onDrop={
                editable
                  ? (event) => {
                      event.preventDefault()
                      void upload(Array.from(event.dataTransfer.files))
                    }
                  : undefined
              }
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-text-app">
                    {t(isOfficer ? 'sponsoredItems.officerImages' : 'sponsoredItems.images')} ·{' '}
                    {item.images.length}/5
                  </p>
                  {editable && (
                    <p className="mt-1 text-xs text-muted-app">{t('sponsoredItems.imageHint')}</p>
                  )}
                </div>
                {isOfficer && item.images.length > 0 && (
                  <AppButton
                    type="button"
                    variant="secondary"
                    disabled={downloadingAll}
                    onClick={() => void downloadAllFiles()}
                  >
                    <AppIcon name="download" className="size-4" />
                    {downloadingAll
                      ? t('sponsoredItems.downloading')
                      : t('sponsoredItems.downloadAll')}
                  </AppButton>
                )}
              </div>
              {item.images.length > 0 ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
                  {item.images.map((file) => (
                    <SponsoredItemAttachmentCard
                      key={file.id}
                      budgetId={budgetId}
                      clubId={clubId}
                      itemId={item.id}
                      file={file}
                      editable={editable}
                      busy={busy}
                      onRemove={() => void onAct({ kind: 'removeImage', imageId: file.id })}
                    />
                  ))}
                </div>
              ) : !editable ? (
                <p className="mt-2 text-sm text-muted-app">
                  {t('sponsoredItems.noAttachmentsYet')}
                </p>
              ) : null}
              {editable && item.images.length < 5 && (
                <label className="relative mt-3 inline-flex min-h-10 items-center rounded-lg border border-border-app bg-surface-app px-4 text-sm font-medium text-primary-app hover:bg-surface-strong-app focus-within:outline-2 focus-within:outline-ring-app">
                  {t('sponsoredItems.upload')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    multiple
                    disabled={busy}
                    className="sr-only"
                    onChange={(event) => {
                      void upload(Array.from(event.target.files ?? []))
                      event.target.value = ''
                    }}
                  />
                </label>
              )}
              {editable && progress.total > 0 && (
                <p role="status" className="mt-2 text-sm text-muted-app">
                  {t('sponsoredItems.progress', progress)}
                </p>
              )}
            </div>

            {editable && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <AppButton
                  type="button"
                  variant="secondary"
                  disabled={busy || !dirty || Number(amount) <= 0}
                  onClick={() => void saveDraft()}
                >
                  {t('sponsoredItems.save')}
                </AppButton>
                <AppButton
                  type="button"
                  disabled={!canSubmit || dirty || busy}
                  onClick={async () => {
                    if (await confirm(t('sponsoredItems.submitConfirm'))) {
                      await onAct({ kind: 'submit' })
                    }
                  }}
                >
                  {t('sponsoredItems.submit')}
                </AppButton>
              </div>
            )}
          </>
        ))}
    </>
  )
}
