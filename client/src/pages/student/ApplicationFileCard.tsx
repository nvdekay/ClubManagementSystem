import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import type { ApplicationDocument, ApplicationDocumentType } from '@/services/applications'
import { fileRules } from '@/pages/student/applicationEditorFormat'
import { ApplicationFieldLabel } from '@/pages/student/ApplicationFieldLabel'

interface ApplicationFileCardProps {
  type: ApplicationDocumentType
  title: string
  hint: string
  required: boolean
  current: ApplicationDocument | undefined
  editable: boolean
  /** Hồ sơ đã được lưu (có id) và còn sửa được, nên tải tệp lên được. */
  canUpload: boolean
  pending: boolean
  uploading: boolean
  onDownload: (documentId: string) => void
  onRemove: (documentId: string) => void
  onUpload: (file: File | undefined) => void
}

// Thẻ tải lên, xem và xóa một loại tài liệu
export function ApplicationFileCard({
  type,
  title,
  hint,
  required,
  current,
  editable,
  canUpload,
  pending,
  uploading,
  onDownload,
  onRemove,
  onUpload,
}: ApplicationFileCardProps) {
  const { t } = useTranslation()
  const fileInput = useRef<HTMLInputElement>(null)
  const rule = fileRules[type]
  return (
    <section className="space-y-3 rounded-xl border border-border-app bg-bg-app p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 basis-60">
          <h3 className="font-heading text-sm font-semibold">
            <ApplicationFieldLabel text={title} required={required} />
          </h3>
          <p className="mt-1 text-sm text-muted-app">{hint}</p>
        </div>
        {type === 'LOGO' && current?.publicUrl && (
          <img
            src={current.publicUrl}
            alt={t('applications.logoPreview')}
            className="size-20 shrink-0 rounded-xl border border-border-app object-cover"
          />
        )}
      </div>
      {current && (
        <div className="flex flex-wrap items-center gap-3">
          <AppIcon name="file" className="text-muted-app" />
          <span className="min-w-0 flex-1 basis-40 break-words text-sm">{current.fileName}</span>
          <div className="flex flex-wrap gap-2">
            <AppButton type="button" variant="secondary" onClick={() => onDownload(current.id)}>
              {t('applications.download')}
            </AppButton>
            {editable && (
              <AppButton
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => onRemove(current.id)}
              >
                {t('applications.remove')}
              </AppButton>
            )}
          </div>
        </div>
      )}
      {canUpload && (
        <>
          <input
            ref={fileInput}
            type="file"
            accept={rule.accept}
            className="hidden"
            onChange={(event) => {
              onUpload(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          <AppButton
            type="button"
            variant={current ? 'secondary' : 'primary'}
            disabled={pending}
            onClick={() => fileInput.current?.click()}
          >
            <AppIcon name="plus" className="size-4" />
            {uploading
              ? t('applications.uploading')
              : current
                ? t('applications.replace')
                : t('applications.choose')}
          </AppButton>
        </>
      )}
    </section>
  )
}
