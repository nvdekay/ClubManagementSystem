import type { TFunction } from 'i18next'

import type { AppBadgeTone } from '@/components/ui/badge/AppBadge'
import { apiErrors } from '@/i18n/apiErrors'
import type { EventProposalDocumentInfo } from '@/services/clubEvents'
import type {
  ClubObligation,
  EventProposalDetail,
  EventProposalVersion,
  EventReviewOutcome,
} from '@/services/eventProposalReviews'
import { formatDate } from '@/utils/formatDate'
import { formatMoney } from '@/utils/formatMoney'
import { formatBytes } from '@/utils/proposalFile'
import type { DiffField } from '@/utils/revisionDiff'

// Đọc an toàn trường văn bản không bắt buộc trong dữ liệu phiên bản đã lưu.
export function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

/** Lấy tài liệu đã chốt trong phiên bản được nộp; hồ sơ cũ có thể chưa có tài liệu này. */
export function proposalDocument(
  version: EventProposalVersion | undefined,
): EventProposalDocumentInfo | undefined {
  const value = version?.payload.proposalDocument
  return value && typeof value === 'object' ? (value as EventProposalDocumentInfo) : undefined
}

// Thay lỗi API chung bằng thông báo phù hợp với màn hình xét duyệt.
export function resolveI18nError(error: Error | null | undefined, fallback: string): string {
  if (!error) {
    return fallback
  }
  if (error.message === apiErrors.vi.unknown || error.message === apiErrors.en.unknown) {
    return fallback
  }
  return error.message || fallback
}

/** Dịch trạng thái vòng đời sự kiện để hiển thị trên nhãn trạng thái của trang. */
export function reviewStateLabel(t: TFunction, value: string) {
  switch (value) {
    case 'Pending Approval':
      return t('eventReviews.statePendingApproval')
    case 'Under Review':
      return t('eventReviews.stateUnderReview')
    case 'Revision Requested':
      return t('eventReviews.stateRevisionRequested')
    case 'Re-defense Pending':
      return t('eventDefense.stateReDefensePending')
    case 'Approved':
      return t('eventReviews.stateApproved')
    case 'Upcoming':
      return t('eventReviews.stateUpcoming')
    case 'Ongoing':
      return t('eventReviews.stateOngoing')
    case 'Rejected':
      return t('eventReviews.stateRejected')
    case 'Expired':
      return t('eventReviews.stateExpired')
    case 'Cancelled':
      return t('eventReviews.stateCancelled')
    default:
      return value
  }
}

// Màu nhãn trạng thái hồ sơ đề xuất
export function reviewStateTone(state: string): AppBadgeTone {
  if (['Approved', 'Upcoming', 'Ongoing'].includes(state)) {
    return 'success'
  }
  if (['Rejected', 'Expired', 'Cancelled'].includes(state)) {
    return 'danger'
  }
  return state === 'Revision Requested' ? 'warning' : 'info'
}

/** Dịch mã các mục cần chỉnh sửa trong yêu cầu sửa và lịch sử xét duyệt. */
export function reviewSectionLabel(t: TFunction, value: string) {
  switch (value) {
    case 'schedule':
      return t('eventReviews.sectionschedule')
    case 'venue':
      return t('eventReviews.sectionvenue')
    case 'content':
      return t('eventReviews.sectioncontent')
    case 'risk':
      return t('eventReviews.sectionrisk')
    case 'budget':
      return t('eventReviews.sectionbudget')
    default:
      return t('eventReviews.sectionother')
  }
}

/** Hiển thị tên nghĩa vụ quyết toán, hoàn tiền hoặc báo cáo còn tồn đọng của CLB. */
export function obligationLabel(t: TFunction, value: ClubObligation) {
  return value === 'overdueSettlement'
    ? t('eventReviews.overdueSettlement')
    : value === 'overdueRefund'
      ? t('eventReviews.overdueRefund')
      : t('eventReviews.overdueReport')
}

/** Dịch quyết định trong lịch sử, bao gồm yêu cầu bảo vệ lại. */
export function outcomeLabel(t: TFunction, value: EventReviewOutcome) {
  return value === 'Approve'
    ? t('eventReviews.approve')
    : value === 'Reject'
      ? t('eventReviews.reject')
      : value === 'Re-defense'
        ? t('eventDefense.outcomeReDefense')
        : t('eventReviews.requestRevision')
}

type ReviewEvent = EventProposalDetail['event']
type ReviewBookings = EventProposalDetail['bookings']

export interface OccurrenceInput {
  startAt?: unknown
  endAt?: unknown
  propertyId?: unknown
  venueText?: unknown
}

/** Chỉ định dạng khoảng thời gian của phiên bản khi cả hai giá trị lưu trữ đều là chuỗi. */
export function versionRange(language: string, start: unknown, end: unknown) {
  return typeof start === 'string' && typeof end === 'string'
    ? `${formatDate(start, language)} – ${formatDate(end, language)}`
    : ''
}

/** Tra tên địa điểm từ thông tin sự kiện hoặc booking thay vì hiển thị mã thô. */
export function propertyLabel(
  t: TFunction,
  event: ReviewEvent,
  bookings: ReviewBookings,
  propertyId: string | undefined,
) {
  if (!propertyId) {
    return undefined
  }
  if (event.property?.id === propertyId) {
    return `${event.property.code} · ${event.property.name}`
  }
  const booking = bookings.find((b) => b.propertyId === propertyId)
  if (booking) {
    return [booking.propertyCode, booking.propertyName].filter(Boolean).join(' · ') || undefined
  }
  return t('eventReviews.otherProperty')
}

/** Ghép thời gian và địa điểm từng buổi để dùng trong tổng quan và so sánh phiên bản. */
export function occurrenceSummary(
  t: TFunction,
  language: string,
  event: ReviewEvent,
  bookings: ReviewBookings,
  item: OccurrenceInput,
) {
  const timeRange = versionRange(language, item.startAt, item.endAt)
  const location = [propertyLabel(t, event, bookings, text(item.propertyId)), text(item.venueText)]
    .filter(Boolean)
    .join(' · ')
  return location ? `${timeRange} (${location})` : timeRange
}

// Khai báo các trường so sánh tập trung để phần khác biệt dùng thống nhất cách định dạng.
export function versionFields(
  t: TFunction,
  language: string,
  event: ReviewEvent,
  bookings: ReviewBookings,
): DiffField<EventProposalVersion>[] {
  return [
    { key: 'title', label: t('eventReviews.fieldTitle'), read: (v) => text(v.payload.title) ?? '' },
    {
      key: 'when',
      label: t('eventReviews.when'),
      read: (v) => versionRange(language, v.payload.startAt, v.payload.endAt),
    },
    {
      key: 'property',
      label: t('eventReviews.fieldProperty'),
      read: (v) => {
        const id = text(v.payload.propertyId)
        return !id
          ? ''
          : id === event.property?.id
            ? event.property.name
            : t('eventReviews.otherProperty')
      },
    },
    { key: 'venue', label: t('eventReviews.where'), read: (v) => text(v.payload.venueText) ?? '' },
    {
      key: 'audience',
      label: t('eventReviews.audience'),
      read: (v) =>
        v.payload.audienceScope === 'MEMBERS_ONLY'
          ? t('eventReviews.audienceMembers')
          : t('eventReviews.audiencePublic'),
    },
    {
      key: 'capacity',
      label: t('eventReviews.capacity'),
      read: (v) => String(v.payload.capacity ?? ''),
    },
    {
      key: 'objective',
      label: t('eventReviews.objective'),
      read: (v) => text(v.payload.objective) ?? '',
    },
    { key: 'plan', label: t('eventReviews.plan'), read: (v) => text(v.payload.plan) ?? '' },
    {
      key: 'riskNote',
      label: t('eventReviews.riskNote'),
      read: (v) => text(v.payload.riskNote) ?? '',
    },
    {
      key: 'facilityNeeds',
      label: t('eventReviews.facilityNeeds'),
      read: (v) => text(v.payload.facilityNeeds) ?? '',
    },
    {
      key: 'occurrences',
      label: t('eventReviews.occurrences'),
      read: (v) =>
        (Array.isArray(v.payload.occurrences) ? (v.payload.occurrences as OccurrenceInput[]) : [])
          .map((item) => occurrenceSummary(t, language, event, bookings, item))
          .join('\n'),
    },
    {
      key: 'budget',
      label: t('eventReviews.budget'),
      read: (v) =>
        v.budgetLines
          .map(
            (line) =>
              `${line.category}: ${formatMoney(line.amount, language)} — ${line.purpose}${line.plannedItems ? `\n  ${line.plannedItems}` : ''}`,
          )
          .join('\n'),
    },
    {
      key: 'form',
      label: t('eventReviews.fieldForm'),
      read: (v) =>
        (Array.isArray(v.payload.registrationForm)
          ? (v.payload.registrationForm as { label?: string; required?: boolean }[])
          : []
        )
          .map((field) => `${field.label ?? ''}${field.required ? ' *' : ''}`)
          .join('\n'),
    },
    {
      key: 'proposalDocument',
      label: t('eventReviews.fieldDocument'),
      read: (v) => {
        const file = proposalDocument(v)
        return file
          ? `${file.fileName} · ${formatBytes(file.bytes)} · ${formatDate(file.uploadedAt, language)}`
          : ''
      },
    },
  ]
}
