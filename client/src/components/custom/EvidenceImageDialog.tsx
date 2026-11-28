import { useTranslation } from 'react-i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppDialog } from '@/components/ui/dialog/AppDialog'
import { saveImageUrl } from '@/utils/saveFile'

interface EvidenceImageDialogProps {
  /** Ảnh đang xem; null thì hộp thoại đóng. */
  image: { url: string; title: string } | null
  onClose: () => void
}

// Hộp xem ảnh minh chứng báo cáo định kỳ kèm nút lưu ảnh (dùng ở trang CLB và ICPDP)
export function EvidenceImageDialog({ image, onClose }: EvidenceImageDialogProps) {
  const { t } = useTranslation()
  return (
    <AppDialog
      open={Boolean(image)}
      title={image?.title ?? ''}
      closeLabel={t('periodicReports.closeImagePreview')}
      onClose={onClose}
      className="w-[min(100%-2rem,56rem)]"
      footer={
        image && (
          <AppButton variant="secondary" onClick={() => void saveImageUrl(image.url, image.title)}>
            {t('periodicReports.saveImage')}
          </AppButton>
        )
      }
    >
      {image && (
        <img
          src={image.url}
          alt={image.title}
          className="max-h-[70dvh] w-full rounded-xl border border-border-app bg-surface-app object-contain"
        />
      )}
    </AppDialog>
  )
}
