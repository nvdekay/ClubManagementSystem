import { useTranslation } from 'react-i18next'

import { AppPagination } from '@/components/ui/pagination/AppPagination'

// Thanh phân trang cho bảng của trang sự kiện
export function ClubEventTablePager({
  pageIndex,
  pageCount,
  onChange,
}: {
  pageIndex: number
  pageCount: number
  onChange: (value: number) => void
}) {
  const { t } = useTranslation()
  return (
    <AppPagination
      pageIndex={pageIndex}
      pageCount={pageCount}
      onPageChange={onChange}
      prevLabel={t('clubEvents.previous')}
      nextLabel={t('clubEvents.next')}
      pageLabel={(page) => t('clubEvents.page', { page })}
      navLabel={t('clubEvents.pagination')}
    />
  )
}
