import { useTranslation } from 'react-i18next'

import { formatDate, formatDay } from '@/utils/formatDate'
import { formatMoney } from '@/utils/formatMoney'

// Bộ định dạng ngày giờ / tiền gắn sẵn ngôn ngữ giao diện hiện tại
export function useFormat() {
  const { i18n } = useTranslation()
  const language = i18n.language
  return {
    /** Ngày + giờ, giờ Việt Nam (`formatDate`). */
    date(value: string | number | Date): string {
      return formatDate(value, language)
    },
    /** Chỉ ngày, giờ Việt Nam (`formatDay`). */
    day(value: string | number | Date | undefined): string {
      return formatDay(value, language)
    },
    /** Số tiền VND không phần thập phân (`formatMoney`). */
    money(value: number): string {
      return formatMoney(value, language)
    },
  }
}
