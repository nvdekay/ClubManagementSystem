import type { AppBadgeTone } from '@/components/ui/badge/AppBadge'
import type { RecruitmentApplication } from '@/services/recruitmentApplications'

// Màu badge theo trạng thái hồ sơ ứng tuyển (dùng chung cho danh sách và trang chi tiết)
export function recruitmentStateTone(state: RecruitmentApplication['state']): AppBadgeTone {
  if (state === 'Accepted' || state === 'Onboarded') {
    return 'success'
  }
  if (state === 'Rejected' || state === 'Declined') {
    return 'danger'
  }
  if (state === 'Waitlisted') {
    return 'warning'
  }
  if (state === 'Draft' || state === 'Withdrawn') {
    return 'neutral'
  }
  return 'info'
}
