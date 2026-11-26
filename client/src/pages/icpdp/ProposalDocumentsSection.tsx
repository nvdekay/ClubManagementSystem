import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import type { EventProposalVersion } from '@/services/eventProposalReviews'
import { proposalDocument } from '@/pages/icpdp/eventProposalReviewFormat'
import { formatDate } from '@/utils/formatDate'
import { formatBytes } from '@/utils/proposalFile'

interface ProposalDocumentsSectionProps {
  versions: EventProposalVersion[]
  current: EventProposalVersion | undefined
  pending: boolean
  error: Error | null
  onOpen: (revisionNo: number, inline: boolean) => void
}

// Tài liệu đã nộp và các thao tác mở tài liệu của những phiên bản trước.
export function ProposalDocumentsSection({
  versions,
  current,
  pending,
  error,
  onOpen,
}: ProposalDocumentsSectionProps) {
  const { t, i18n } = useTranslation()
  const currentDocument = proposalDocument(current)
  function date(value: string) {
    return formatDate(value, i18n.language)
  }
  return (
    <section className="rounded-2xl border border-l-4 border-border-app border-l-brand-app bg-bg-app p-5 shadow-xs">
      <h2 className="font-heading text-base font-semibold">{t('eventReviews.documentTitle')}</h2>
      {currentDocument && current ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <div className="min-w-0 flex-1 basis-56">
            <p className="font-medium break-words">{currentDocument.fileName}</p>
            <p className="text-muted-app">
              {formatBytes(currentDocument.bytes)} ·{' '}
              {t('eventReviews.documentUploaded', { date: date(currentDocument.uploadedAt) })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AppButton disabled={pending} onClick={() => onOpen(current.revisionNo, false)}>
              {t('eventReviews.documentDownload')}
            </AppButton>
            {currentDocument.mimeType === 'application/pdf' && (
              <AppButton
                variant="secondary"
                disabled={pending}
                onClick={() => onOpen(current.revisionNo, true)}
              >
                {t('eventReviews.documentView')}
              </AppButton>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-app">{t('eventReviews.documentNone')}</p>
      )}
      {versions.length > 1 && (
        <div className="mt-4 border-t border-border-app pt-3">
          <h3 className="text-sm font-semibold">{t('eventReviews.documentByRevision')}</h3>
          <ul className="mt-2 divide-y divide-border-app text-sm">
            {versions.map((version) => {
              const file = proposalDocument(version)
              return (
                <li
                  key={version.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="min-w-0 break-words">
                    <span className="font-medium">
                      {t('eventReviews.revision', { number: version.revisionNo })}
                    </span>
                    {' · '}
                    {file ? (
                      `${file.fileName} · ${formatBytes(file.bytes)}`
                    ) : (
                      <span className="text-muted-app">{t('eventReviews.documentNone')}</span>
                    )}
                  </span>
                  {file && (
                    <AppButton
                      variant="ghost"
                      disabled={pending}
                      onClick={() => onOpen(version.revisionNo, false)}
                    >
                      {t('eventReviews.documentDownload')}
                    </AppButton>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger-app">
          {error.message}
        </p>
      )}
    </section>
  )
}
