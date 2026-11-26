import type { TFunction } from 'i18next'

import type { AppBadgeTone } from '@/components/ui/badge/AppBadge'
import type {
  ApplicationDocumentType,
  ApplicationDraft,
  DraftInput,
  FounderRole,
  FoundingIssue,
} from '@/services/applications'

// Màu badge theo trạng thái đơn
export function applicationStateTone(state: string): AppBadgeTone {
  if (state === 'Approved') {
    return 'success'
  }
  if (state === 'Rejected' || state === 'Expired') {
    return 'danger'
  }
  if (state === 'Revision Requested') {
    return 'warning'
  }
  if (state === 'Draft' || state === 'Withdrawn') {
    return 'neutral'
  }
  return 'info'
}

export const sectionTitleClass = 'font-heading text-base font-semibold'
export const founderRoles: FounderRole[] = ['LEADER', 'VICE_LEADER', 'MEMBER']
export const fileRules: Record<
  ApplicationDocumentType,
  { accept: string; types: string[]; maxBytes: number; size: string }
> = {
  PROPOSAL: {
    accept: '.pdf,.docx',
    maxBytes: 10 * 1024 * 1024,
    size: '10 MB',
    types: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  LOGO: {
    accept: '.png,.jpg,.jpeg',
    maxBytes: 2 * 1024 * 1024,
    size: '2 MB',
    types: ['image/png', 'image/jpeg'],
  },
}
/** Bước nào sửa được từng lỗi khi nộp, để bước xem lại có thể nhảy thẳng tới đó. */
export const issueStep: Record<FoundingIssue, number> = {
  clubName: 0,
  field: 0,
  fieldUnavailable: 0,
  summary: 0,
  objectives: 0,
  fanpageUrl: 0,
  contactEmail: 0,
  foundersTooFew: 1,
  applicantNotFounder: 1,
  duplicateFounder: 1,
  leaderCount: 1,
  viceLeaderCount: 1,
  leaderHoldsAnotherClub: 1,
  proposal: 2,
  logo: 2,
}

// Chuyển đơn đã lưu thành dữ liệu form nháp
export function inputFrom(draft: ApplicationDraft): DraftInput {
  return {
    clubName: draft.clubName,
    fieldId: draft.fieldId,
    summary: draft.summary,
    objectives: draft.objectives,
    fanpageUrl: draft.fanpageUrl,
    contactEmail: draft.contactEmail,
    founders: draft.founders,
  }
}

// Nhãn đã dịch của trạng thái đơn
export function applicationStateLabel(t: TFunction, value: string): string {
  switch (value) {
    case 'Draft':
      return t('applications.statusDraft')
    case 'Submitted':
      return t('applications.statusSubmitted')
    case 'Under Review':
      return t('applications.statusUnderReview')
    case 'Revision Requested':
      return t('applications.statusRevisionRequested')
    case 'Approved':
      return t('applications.statusApproved')
    case 'Rejected':
      return t('applications.statusRejected')
    case 'Withdrawn':
      return t('applications.statusWithdrawn')
    case 'Expired':
      return t('applications.statusExpired')
    default:
      return value
  }
}

// Nhãn mục đơn bị yêu cầu chỉnh sửa
export function applicationSectionLabel(t: TFunction, section: string): string {
  switch (section) {
    case 'club-information':
      return t('reviews.sectionClub')
    case 'founders':
      return t('reviews.sectionFounders')
    case 'documents':
      return t('reviews.sectionDocuments')
    case 'role-structure':
      return t('reviews.sectionRoles')
    case 'other':
      return t('reviews.sectionOther')
    default:
      return section
  }
}
