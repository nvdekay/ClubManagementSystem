import type { TFunction } from 'i18next'

import type { AppBadgeTone } from '@/components/ui/badge/AppBadge'
import type { Classification } from '@/services/evaluations'

// Dịch xếp loại đánh giá sang nhãn hiển thị
export function ratingLabel(t: TFunction, value: Classification): string {
  return t(`evaluations.rating${value}`)
}

// Chọn màu badge theo xếp loại đánh giá
export function ratingTone(value: Classification): AppBadgeTone {
  return value === 'EXCELLENT'
    ? 'success'
    : value === 'GOOD'
      ? 'info'
      : value === 'FAIR'
        ? 'warning'
        : 'danger'
}

// Dịch trạng thái vòng đời CLB sang nhãn hiển thị; trạng thái lạ giữ nguyên
export function clubStateLabel(t: TFunction, state: string): string {
  switch (state) {
    case 'Active':
      return t('clubLifecycle.state_Active')
    case 'Suspended':
      return t('clubLifecycle.state_Suspended')
    case 'Dissolving':
      return t('clubLifecycle.state_Dissolving')
    case 'Dissolved':
      return t('clubLifecycle.state_Dissolved')
    case 'Pending Setup':
      return t('clubLifecycle.state_Pending Setup')
    default:
      return state
  }
}
