import { useTranslation } from 'react-i18next'
import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppSkeleton } from '@/components/ui/skeleton/AppSkeleton'
import { useDownloadInvoiceFile, useInvoiceImage } from '@/hooks/useSponsoredItems'
import type { InvoiceImage } from '@/services/sponsoredItems'
import { triggerUrlDownload } from '@/utils/sponsoredItems'

export interface SponsoredItemAttachmentCardProps {
  budgetId: string
  clubId?: string
  itemId: string
  file: InvoiceImage
  editable: boolean
  busy: boolean
  onRemove: () => void
}

// Preview and download a single supporting attachment (JPG/PNG image or PDF)
export function SponsoredItemAttachmentCard({
  budgetId,
  clubId,
  itemId,
  file,
  editable,
  busy,
  onRemove,
}: SponsoredItemAttachmentCardProps) {
  const { t } = useTranslation()
  const preview = useInvoiceImage(budgetId, clubId, itemId, file.id)
  const download = useDownloadInvoiceFile(budgetId, clubId)
  const isPdf = file.mimeType === 'application/pdf'

  async function saveToDisk() {
    try {
      const result = await download.mutateAsync({ itemId, imageId: file.id })
      triggerUrlDownload(result.url, result.fileName ?? file.fileName)
    } catch {
      /* Download errors render directly below the attachment card. */
    }
  }

  return (
    <div className="flex flex-col justify-between rounded-lg border border-border-app bg-surface-app/40 p-2.5">
      <div>
        {preview.isPending ? (
          <AppSkeleton className="h-28 w-full" />
        ) : preview.isError ? (
          <p role="alert" className="text-sm text-danger-app">
            {t('sponsoredItems.imageError')}
          </p>
        ) : isPdf ? (
          <a
            href={preview.data?.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-28 flex-col items-center justify-center gap-2 rounded-md border border-border-app bg-bg-app p-3 text-center hover:bg-surface-app"
          >
            <AppIcon name="file" className="size-8 text-primary-app" />
            <span className="text-xs font-medium text-muted-app">
              {t('sponsoredItems.pdfFile')}
            </span>
          </a>
        ) : (
          <a
            href={preview.data?.url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-md bg-bg-app"
          >
            <img
              src={preview.data?.url}
              alt={file.fileName}
              className="h-28 w-full object-contain"
            />
          </a>
        )}
        <p className="mt-2 break-words text-xs font-medium text-text-app">{file.fileName}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {preview.data?.url && (
          <a
            href={preview.data.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-8 items-center gap-1 rounded-md border border-border-app bg-bg-app px-2.5 text-xs font-medium text-primary-app hover:bg-surface-app"
          >
            <AppIcon name="external" className="size-3.5" />
            {t('sponsoredItems.view')}
          </a>
        )}
        <AppButton
          type="button"
          variant="secondary"
          disabled={download.isPending}
          onClick={() => void saveToDisk()}
          className="min-h-8 px-2.5 text-xs"
        >
          <AppIcon name="download" className="size-3.5" />
          {download.isPending ? t('sponsoredItems.downloading') : t('sponsoredItems.download')}
        </AppButton>
        {editable && (
          <AppButton
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onRemove}
            className="min-h-8 px-2 text-xs"
          >
            {t('sponsoredItems.remove')}
          </AppButton>
        )}
      </div>
      {download.isError && (
        <p role="alert" className="mt-1.5 text-xs text-danger-app">
          {t('sponsoredItems.downloadError')}
        </p>
      )}
    </div>
  )
}
