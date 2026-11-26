import { useTranslation } from 'react-i18next'

import type { ApplicationDocument, DraftInput, FounderProfile } from '@/services/applications'
import { ApplicationFounderRow } from '@/pages/student/ApplicationFounderRow'

interface ApplicationSummaryProps {
  value: DraftInput & { field?: string }
  fields: { id: string; name: string }[]
  documents: ApplicationDocument[]
  meId: string | undefined
  profileOf: (userId: string) => FounderProfile | undefined
  onDownload: (documentId: string) => void
}

// Bảng tóm tắt thông tin đơn ở bước xem lại
/** Nội dung đã nhập, hiển thị ở bước xem lại và làm bản chỉ xem sau khi nộp. */
export function ApplicationSummary({
  value,
  fields,
  documents,
  meId,
  profileOf,
  onDownload,
}: ApplicationSummaryProps) {
  const { t } = useTranslation()
  const fieldName = fields.find((field) => field.id === value.fieldId)?.name ?? value.field ?? ''
  const rows: [string, string][] = [
    [t('applications.clubName'), value.clubName],
    [t('applications.field'), fieldName],
    [t('applications.summary'), value.summary],
    [t('applications.objectives'), value.objectives],
    [t('applications.fanpageUrl'), value.fanpageUrl],
    [t('applications.contactEmail'), value.contactEmail],
  ]
  return (
    <div className="space-y-6">
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
        {rows.map(([term, text]) => (
          <div key={term} className="contents">
            <dt className="text-sm font-medium text-muted-app">{term}</dt>
            <dd className="text-sm break-words whitespace-pre-wrap">{text || '—'}</dd>
          </div>
        ))}
      </dl>
      <div>
        <h3 className="font-heading text-sm font-semibold">{t('applications.founders')}</h3>
        <ul className="mt-2 divide-y divide-border-app rounded-xl border border-border-app">
          {value.founders.map((founder) => (
            <ApplicationFounderRow
              key={founder.userId}
              userId={founder.userId}
              role={founder.role}
              profile={profileOf(founder.userId)}
              isMe={founder.userId === meId}
              readOnly
            />
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-6">
        {(['PROPOSAL', 'LOGO'] as const).map((type) => {
          const current = documents.find((item) => item.documentType === type)
          return (
            <div key={type} className="min-w-0 flex-1 basis-56">
              <h3 className="font-heading text-sm font-semibold">
                {type === 'PROPOSAL' ? t('applications.proposal') : t('applications.logo')}
              </h3>
              {current ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {type === 'LOGO' && current.publicUrl && (
                    <img
                      src={current.publicUrl}
                      alt={t('applications.logoPreview')}
                      className="size-14 rounded-lg border border-border-app object-cover"
                    />
                  )}
                  <button
                    type="button"
                    className="text-left text-sm font-medium break-all text-primary-app hover:underline"
                    onClick={() => onDownload(current.id)}
                  >
                    {current.fileName}
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-app">—</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
