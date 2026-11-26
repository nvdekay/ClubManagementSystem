import type { TFunction } from 'i18next'

import {
  DEFAULT_FORM_REQUIREMENTS,
  type ClubProfileFormField,
  type CreatePolicyInput,
  type FormRequirements,
  type FoundingFormField,
  type PolicyDecisionImpact,
  type PolicyImpactReason,
  type PolicyVersion,
} from '@/services/policy'

export interface DeadlineForm {
  reportType: string
  dueDaysAfterPeriodEnd: string
  remindBeforeDays: string
  overdueAfterDays: string
  escalateAfterDays: string
}

export interface SemesterForm {
  code: string
  startAt: string
  endAt: string
}

export interface RefundAccountForm {
  accountHolder: string
  accountNumber: string
  bankName: string
  bankBranch: string
  transferNote: string
}

export interface PolicyForm {
  minFoundingMembers: string
  formRequirements: FormRequirements
  reportDeadlines: DeadlineForm[]
  conflictThresholdMinutes: string
  feedbackWindowHours: string
  feedbackMinRespondents: string
  allowOverbooking: boolean
  enforceOverdueReportBlock: boolean
  academicCalendar: SemesterForm[]
  schoolRefundAccount: RefundAccountForm
  effectiveFrom: string
  reason: string
}

export type PolicySection = 'founding' | 'profile' | 'events' | 'calendar' | 'reports' | 'finance'
export const sections: readonly PolicySection[] = [
  'founding',
  'profile',
  'events',
  'calendar',
  'reports',
  'finance',
]

export type DeadlineNumberField = Exclude<keyof DeadlineForm, 'reportType'>
export const deadlineNumberFields: readonly DeadlineNumberField[] = [
  'dueDaysAfterPeriodEnd',
  'remindBeforeDays',
  'overdueAfterDays',
  'escalateAfterDays',
]

// Ánh xạ nhóm chính sách sang key i18n của tiêu đề
export function sectionTitleKey(section: PolicySection) {
  switch (section) {
    case 'founding':
      return 'policy.sectionFounding' as const
    case 'profile':
      return 'policy.sectionProfile' as const
    case 'events':
      return 'policy.sectionEvents' as const
    case 'calendar':
      return 'policy.sectionCalendar' as const
    case 'reports':
      return 'policy.sectionReports' as const
    case 'finance':
      return 'policy.sectionFinance' as const
  }
}

// Icon đại diện của từng nhóm chính sách
export function sectionIcon(section: PolicySection) {
  switch (section) {
    case 'founding':
      return 'building' as const
    case 'profile':
      return 'idCard' as const
    case 'events':
      return 'ticket' as const
    case 'calendar':
      return 'calendar' as const
    case 'reports':
      return 'clipboardCheck' as const
    case 'finance':
      return 'wallet' as const
  }
}

// Ánh xạ nhóm chính sách sang key i18n của mô tả phạm vi áp dụng
export function sectionAppliesKey(section: PolicySection) {
  switch (section) {
    case 'founding':
      return 'policy.appliesFounding' as const
    case 'profile':
      return 'policy.appliesProfile' as const
    case 'events':
      return 'policy.appliesEvents' as const
    case 'calendar':
      return 'policy.appliesCalendar' as const
    case 'reports':
      return 'policy.appliesReports' as const
    case 'finance':
      return 'policy.appliesFinance' as const
  }
}

// Ánh xạ trường form thành lập CLB sang key i18n
export function foundingFieldKey(field: FoundingFormField) {
  switch (field) {
    case 'summary':
      return 'policy.fieldSummary' as const
    case 'objectives':
      return 'policy.fieldObjectives' as const
    case 'proposal':
      return 'policy.fieldProposal' as const
    case 'logo':
      return 'policy.fieldLogo' as const
    case 'fanpageUrl':
      return 'policy.fieldFanpage' as const
    case 'contactEmail':
      return 'policy.fieldFoundingEmail' as const
  }
}

// Ánh xạ trường form hồ sơ CLB sang key i18n
export function profileFieldKey(field: ClubProfileFormField) {
  switch (field) {
    case 'description':
      return 'policy.fieldDescription' as const
    case 'contactEmail':
      return 'policy.fieldProfileEmail' as const
    case 'contactPhone':
      return 'policy.fieldPhone' as const
    case 'charterUrl':
      return 'policy.fieldCharter' as const
    case 'channels':
      return 'policy.fieldChannels' as const
    case 'operatingScope':
      return 'policy.fieldScope' as const
  }
}

// Ánh xạ trường hạn nộp báo cáo sang key i18n
export function deadlineLabelKey(field: DeadlineNumberField) {
  switch (field) {
    case 'dueDaysAfterPeriodEnd':
      return 'policy.dueDays' as const
    case 'remindBeforeDays':
      return 'policy.remindBefore' as const
    case 'overdueAfterDays':
      return 'policy.overdueAfter' as const
    case 'escalateAfterDays':
      return 'policy.escalateAfter' as const
  }
}

// Đổi ISO sang giá trị datetime-local theo giờ địa phương
function localDateTime(value: string): string {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

// Dựng giá trị ban đầu của form từ phiên bản chính sách mới nhất
export function initialForm(latest?: PolicyVersion): PolicyForm {
  const requirements = latest?.formRequirements ?? DEFAULT_FORM_REQUIREMENTS
  return {
    minFoundingMembers: latest ? String(latest.minFoundingMembers) : '',
    formRequirements: {
      clubFounding: { ...requirements.clubFounding },
      clubProfile: { ...requirements.clubProfile },
    },
    reportDeadlines: latest?.reportDeadlines.map((item) => ({
      reportType: item.reportType,
      dueDaysAfterPeriodEnd: String(item.dueDaysAfterPeriodEnd),
      remindBeforeDays: String(item.remindBeforeDays),
      overdueAfterDays: String(item.overdueAfterDays),
      escalateAfterDays: String(item.escalateAfterDays),
    })) ?? [
      {
        reportType: '',
        dueDaysAfterPeriodEnd: '',
        remindBeforeDays: '',
        overdueAfterDays: '',
        escalateAfterDays: '',
      },
    ],
    conflictThresholdMinutes: latest ? String(latest.conflictThresholdMinutes) : '',
    feedbackWindowHours: latest ? String(latest.feedbackWindowHours) : '',
    feedbackMinRespondents: latest ? String(latest.feedbackMinRespondents) : '',
    allowOverbooking: latest?.allowOverbooking ?? false,
    enforceOverdueReportBlock: latest?.enforceOverdueReportBlock ?? false,
    academicCalendar: latest?.academicCalendar.map((item) => ({
      code: item.code,
      startAt: localDateTime(item.startAt),
      endAt: localDateTime(item.endAt),
    })) ?? [{ code: '', startAt: '', endAt: '' }],
    schoolRefundAccount: {
      accountHolder: latest?.schoolRefundAccount?.accountHolder ?? '',
      accountNumber: latest?.schoolRefundAccount?.accountNumber ?? '',
      bankName: latest?.schoolRefundAccount?.bankName ?? '',
      bankBranch: latest?.schoolRefundAccount?.bankBranch ?? '',
      transferNote: latest?.schoolRefundAccount?.transferNote ?? '',
    },
    effectiveFrom: '',
    reason: '',
  }
}

/** Được ném kèm mục chứa giá trị sai, để trình chỉnh sửa chuyển tới mục đó. */
export class SectionError extends Error {
  constructor(readonly section: PolicySection) {
    super(section)
  }
}

// Đọc số nguyên tối thiểu min, ném lỗi gắn với nhóm chính sách nếu sai
function whole(value: string, min: number, section: PolicySection): number {
  const number = Number(value)
  if (!value.trim() || !Number.isInteger(number) || number < min) {
    throw new SectionError(section)
  }
  return number
}

// Thông báo lỗi cho số nguyên không hợp lệ, null nếu hợp lệ
function wholeError(t: TFunction, value: string, min: number): string | null {
  const number = Number(value)
  if (!value.trim()) {
    return t('common.fieldRequired')
  }
  if (!Number.isInteger(number)) {
    return t('common.invalidNumber')
  }
  return number < min ? t('common.numberMin', { min }) : null
}

// Gom lỗi inline của toàn form chính sách
/** Lỗi hiển thị trực tiếp theo từng trường, kèm tab chứa mỗi key để khi submit có thể mở tab đó. */
export function formErrors(t: TFunction, form: PolicyForm): Record<string, string | null> {
  const errors: Record<string, string | null> = {
    minFoundingMembers: wholeError(t, form.minFoundingMembers, 1),
    feedbackWindowHours: wholeError(t, form.feedbackWindowHours, 1),
    feedbackMinRespondents: wholeError(t, form.feedbackMinRespondents, 2),
    conflictThresholdMinutes: wholeError(t, form.conflictThresholdMinutes, 0),
  }
  form.academicCalendar.forEach((item, index) => {
    errors[`semesterCode${index}`] = item.code.trim() ? null : t('common.fieldRequired')
    errors[`semesterStart${index}`] = item.startAt ? null : t('common.fieldRequired')
    errors[`semesterEnd${index}`] = !item.endAt
      ? t('common.fieldRequired')
      : item.startAt && item.endAt <= item.startAt
        ? t('common.endAfterStart')
        : null
  })
  form.reportDeadlines.forEach((item, index) => {
    errors[`reportType${index}`] = item.reportType.trim() ? null : t('common.fieldRequired')
    for (const field of deadlineNumberFields) {
      errors[`${field}${index}`] = wholeError(t, item[field], 0)
    }
    // Server cũng yêu cầu mốc nâng cấp phải sau mốc quá hạn.
    const overdue = Number(item.overdueAfterDays)
    if (
      !errors[`escalateAfterDays${index}`] &&
      !errors[`overdueAfterDays${index}`] &&
      Number(item.escalateAfterDays) <= overdue
    ) {
      errors[`escalateAfterDays${index}`] = t('common.numberMin', { min: overdue + 1 })
    }
  })
  const refund = form.schoolRefundAccount
  const hasAnyRefundField = Boolean(
    refund.accountHolder.trim() ||
    refund.accountNumber.trim() ||
    refund.bankName.trim() ||
    refund.bankBranch.trim() ||
    refund.transferNote.trim(),
  )
  if (hasAnyRefundField) {
    errors.refundAccountHolder = refund.accountHolder.trim() ? null : t('common.fieldRequired')
    errors.refundAccountNumber = !refund.accountNumber.trim()
      ? t('common.fieldRequired')
      : !/^[0-9A-Za-z -]+$/.test(refund.accountNumber.trim())
        ? t('policy.refundAccountNumberInvalid')
        : null
    errors.refundBankName = refund.bankName.trim() ? null : t('common.fieldRequired')
  } else {
    errors.refundAccountHolder = null
    errors.refundAccountNumber = null
    errors.refundBankName = null
  }
  return errors
}

// Xác định nhóm chính sách chứa trường bị lỗi
export function errorSection(key: string): PolicySection {
  if (key === 'minFoundingMembers') {
    return 'founding'
  }
  if (['feedbackWindowHours', 'feedbackMinRespondents', 'conflictThresholdMinutes'].includes(key)) {
    return 'events'
  }
  if (key.startsWith('semester')) {
    return 'calendar'
  }
  if (key.startsWith('refund')) {
    return 'finance'
  }
  return 'reports'
}

// Đổi giá trị ngày sang ISO, ném lỗi gắn với nhóm nếu sai
function isoDate(value: string, section: PolicySection): string {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) {
    throw new SectionError(section)
  }
  return date.toISOString()
}

// Dựng dữ liệu gửi lên tạo phiên bản chính sách từ form
export function payload(form: PolicyForm): CreatePolicyInput {
  const refund = form.schoolRefundAccount
  const accountHolder = refund.accountHolder.trim()
  const accountNumber = refund.accountNumber.trim()
  const bankName = refund.bankName.trim()
  const bankBranch = refund.bankBranch.trim()
  const transferNote = refund.transferNote.trim()
  const hasRefund = Boolean(
    accountHolder || accountNumber || bankName || bankBranch || transferNote,
  )
  let schoolRefundAccount: CreatePolicyInput['schoolRefundAccount']
  if (hasRefund) {
    if (!accountHolder || !accountNumber || !/^[0-9A-Za-z -]+$/.test(accountNumber) || !bankName) {
      throw new SectionError('finance')
    }
    schoolRefundAccount = {
      accountHolder,
      accountNumber,
      bankName,
      ...(bankBranch ? { bankBranch } : {}),
      ...(transferNote ? { transferNote } : {}),
    }
  }
  return {
    minFoundingMembers: whole(form.minFoundingMembers, 1, 'founding'),
    formRequirements: form.formRequirements,
    reportDeadlines: form.reportDeadlines.map((item) => {
      if (!item.reportType.trim()) {
        throw new SectionError('reports')
      }
      return {
        reportType: item.reportType.trim(),
        dueDaysAfterPeriodEnd: whole(item.dueDaysAfterPeriodEnd, 0, 'reports'),
        remindBeforeDays: whole(item.remindBeforeDays, 0, 'reports'),
        overdueAfterDays: whole(item.overdueAfterDays, 0, 'reports'),
        escalateAfterDays: whole(item.escalateAfterDays, 0, 'reports'),
      }
    }),
    conflictThresholdMinutes: whole(form.conflictThresholdMinutes, 0, 'events'),
    feedbackWindowHours: whole(form.feedbackWindowHours, 1, 'events'),
    feedbackMinRespondents: whole(form.feedbackMinRespondents, 2, 'events'),
    allowOverbooking: form.allowOverbooking,
    enforceOverdueReportBlock: form.enforceOverdueReportBlock,
    academicCalendar: form.academicCalendar.map((item) => {
      if (!item.code.trim()) {
        throw new SectionError('calendar')
      }
      return {
        code: item.code.trim(),
        startAt: isoDate(item.startAt, 'calendar'),
        endAt: isoDate(item.endAt, 'calendar'),
      }
    }),
    ...(schoolRefundAccount ? { schoolRefundAccount } : {}),
    ...(form.effectiveFrom ? { effectiveFrom: new Date(form.effectiveFrom).toISOString() } : {}),
    ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
  }
}

// Ánh xạ lý do ảnh hưởng của chính sách sang key i18n
export function impactReasonKey(reason: PolicyImpactReason) {
  switch (reason) {
    case 'EVENT_OUTSIDE_ACADEMIC_CALENDAR':
      return 'policy.impactEventCalendar' as const
    case 'BOOKING_OUTSIDE_ACADEMIC_CALENDAR':
      return 'policy.impactBookingCalendar' as const
    case 'DISSOLUTION_SEMESTER_REMOVED':
      return 'policy.impactDissolutionSemester' as const
    case 'APPROVED_OVERBOOKING_DISALLOWED':
      return 'policy.impactOverbooking' as const
  }
}

// Ánh xạ loại thực thể bị ảnh hưởng sang key i18n
export function impactEntityKey(entityType: PolicyDecisionImpact['entityType']) {
  switch (entityType) {
    case 'Event':
      return 'policy.impactEntityEvent' as const
    case 'PropertyBooking':
      return 'policy.impactEntityBooking' as const
    case 'Club':
      return 'policy.impactEntityClub' as const
  }
}
