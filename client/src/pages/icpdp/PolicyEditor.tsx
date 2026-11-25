import { useState, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { AppButton } from '@/components/ui/button/AppButton'
import { AppFieldError } from '@/components/ui/field/AppFieldError'
import { AppRequiredMark } from '@/components/ui/field/AppRequiredMark'
import { AppIcon } from '@/components/ui/icon/AppIcon'
import { AppInput } from '@/components/ui/input/AppInput'
import { AppSwitch } from '@/components/ui/switch/AppSwitch'
import { appToast } from '@/components/ui/toast/AppToast'
import { useCreatePolicy } from '@/hooks/usePolicy'
import { useFieldValidation } from '@/hooks/useFieldValidation'
import {
  CLUB_PROFILE_FORM_FIELDS,
  DEFAULT_FORM_REQUIREMENTS,
  FOUNDING_FORM_FIELDS,
  PolicyConflictError,
  type ClubProfileFormField,
  type CreatePolicyInput,
  type FormRequirements,
  type FoundingFormField,
  type PolicyDecisionImpact,
  type PolicyImpactReason,
  type PolicyVersion,
} from '@/services/policy'
import { cn } from '@/utils/cn'

interface PolicyEditorProps {
  latest?: PolicyVersion
  csrfToken: string
  /** Gọi sau khi tạo phiên bản thành công, để trang chuyển về phần chính sách đang hiệu lực. */
  onSaved?: () => void
}

interface DeadlineForm {
  reportType: string
  dueDaysAfterPeriodEnd: string
  remindBeforeDays: string
  overdueAfterDays: string
  escalateAfterDays: string
}

interface SemesterForm {
  code: string
  startAt: string
  endAt: string
}

interface RefundAccountForm {
  accountHolder: string
  accountNumber: string
  bankName: string
  bankBranch: string
  transferNote: string
}

interface PolicyForm {
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
const sections: readonly PolicySection[] = [
  'founding',
  'profile',
  'events',
  'calendar',
  'reports',
  'finance',
]

type DeadlineNumberField = Exclude<keyof DeadlineForm, 'reportType'>
const deadlineNumberFields: readonly DeadlineNumberField[] = [
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
function initialForm(latest?: PolicyVersion): PolicyForm {
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
class SectionError extends Error {
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
function formErrors(t: TFunction, form: PolicyForm): Record<string, string | null> {
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
function errorSection(key: string): PolicySection {
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
function payload(form: PolicyForm): CreatePolicyInput {
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
function impactReasonKey(reason: PolicyImpactReason) {
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
function impactEntityKey(entityType: PolicyDecisionImpact['entityType']) {
  switch (entityType) {
    case 'Event':
      return 'policy.impactEntityEvent' as const
    case 'PropertyBooking':
      return 'policy.impactEntityBooking' as const
    case 'Club':
      return 'policy.impactEntityClub' as const
  }
}

interface ToggleTileProps {
  label: string
  checked: boolean
  locked?: boolean
  hint?: string
  onChange?: (checked: boolean) => void
}

// Ô bật/tắt cho yêu cầu hoặc quyền của chính sách
/** Một ô kiểu "có bắt buộc / có được phép không": nhãn, ý nghĩa hiện tại và công tắc. */
function ToggleTile({ label, checked, locked, hint, onChange }: ToggleTileProps) {
  const { t } = useTranslation()
  return (
    <li
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors',
        checked ? 'border-primary-app/30 bg-primary-soft-app/60' : 'border-border-app bg-bg-app',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p
          className={cn('mt-0.5 text-xs text-muted-app', {
            'font-semibold text-primary-app': checked,
          })}
        >
          {locked
            ? t('policy.alwaysRequired')
            : checked
              ? t('policy.required')
              : t('policy.optional')}
        </p>
        {hint && <p className="mt-1 text-xs text-muted-app">{hint}</p>}
      </div>
      <AppSwitch
        checked={checked}
        disabled={locked}
        aria-label={label}
        onChange={(value) => onChange?.(value)}
      />
    </li>
  )
}

// Một dòng cài đặt số: nhãn bên trái, ô nhập bên phải
function NumberSetting({
  label,
  value,
  min,
  onChange,
  control,
  error,
}: {
  label: string
  value: string
  min: number
  onChange: (value: string) => void
  control: Pick<ComponentProps<'input'>, 'required' | 'onBlur' | 'aria-invalid'>
  error: string | null
}) {
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <label className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
        <span className="min-w-0 flex-1 basis-60 text-text-app">
          {label}
          <AppRequiredMark />
        </span>
        <AppInput
          className="w-28 text-right tabular-nums"
          type="number"
          min={min}
          value={value}
          {...control}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      <div className="text-right">
        <AppFieldError message={error} />
      </div>
    </li>
  )
}

// Tiêu đề phụ trong một nhóm chính sách
function SubHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h4 className="font-heading text-sm font-semibold">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-muted-app">{hint}</p>}
    </div>
  )
}

// Form ICPDP tạo phiên bản chính sách mới theo từng nhóm
export function PolicyEditor({ latest, csrfToken, onSaved }: PolicyEditorProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<PolicyForm>(() => initialForm(latest))
  const [section, setSection] = useState<PolicySection>('founding')
  const [localError, setLocalError] = useState<string | null>(null)
  const create = useCreatePolicy()
  const errors = formErrors(t, form)
  const field = useFieldValidation(errors)
  // Nhóm có trường sai, chỉ đánh dấu sau lần bấm lưu đầu tiên
  const invalidSections = new Set(
    localError
      ? Object.keys(errors)
          .filter((key) => errors[key])
          .map(errorSection)
      : [],
  )

  // Cập nhật một trường của hạn nộp báo cáo
  function updateDeadline(index: number, field: keyof DeadlineForm, value: string) {
    setForm((current) => ({
      ...current,
      reportDeadlines: current.reportDeadlines.map((item, position) =>
        position === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  // Cập nhật một trường của học kỳ trong lịch học thuật
  function updateSemester(index: number, field: keyof SemesterForm, value: string) {
    setForm((current) => ({
      ...current,
      academicCalendar: current.academicCalendar.map((item, position) =>
        position === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  // Bật/tắt yêu cầu của form thành lập CLB
  function setFounding(field: FoundingFormField, value: boolean) {
    setForm((current) => ({
      ...current,
      formRequirements: {
        ...current.formRequirements,
        clubFounding: { ...current.formRequirements.clubFounding, [field]: value },
      },
    }))
  }

  // Bật/tắt yêu cầu của form hồ sơ CLB
  function setProfile(field: ClubProfileFormField, value: boolean) {
    setForm((current) => ({
      ...current,
      formRequirements: {
        ...current.formRequirements,
        clubProfile: { ...current.formRequirements.clubProfile, [field]: value },
      },
    }))
  }

  // Kiểm tra form rồi tạo phiên bản chính sách mới
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLocalError(null)
    if (!field.touchAll()) {
      // Trường sai đầu tiên có thể nằm ở nhóm khác, nên mở nhóm đó và giữ dòng tóm tắt.
      const first = Object.keys(errors).find((key) => errors[key])
      if (first) {
        setSection(errorSection(first))
      }
      setLocalError(t('policy.invalidForm'))
      return
    }
    let input: CreatePolicyInput
    try {
      input = payload(form)
    } catch (error) {
      if (error instanceof SectionError) {
        setSection(error.section)
      }
      setLocalError(t('policy.invalidForm'))
      return
    }
    try {
      await create.mutateAsync({ input, csrfToken })
      appToast.success(t('policy.saveSuccess'))
      onSaved?.()
    } catch {
      /* Lỗi của mutation được hiển thị bên dưới. */
    }
  }

  const fieldLabel = 'block text-sm font-medium text-text-app'
  const fieldInput = 'mt-1.5 block w-full'

  let body: ReactNode
  if (section === 'founding') {
    body = (
      <div className="space-y-6">
        <label className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-app px-4 py-3 text-sm">
          <span>{t('policy.minFoundersBefore')}</span>
          <AppInput
            className="w-20 text-center tabular-nums"
            type="number"
            min="1"
            aria-label={t('policy.minFounders')}
            value={form.minFoundingMembers}
            {...field.control('minFoundingMembers')}
            onChange={(event) => setForm({ ...form, minFoundingMembers: event.target.value })}
          />
          <span>
            {t('policy.minFoundersAfter')}
            <AppRequiredMark />
          </span>
        </label>
        <AppFieldError message={field.error('minFoundingMembers')} />
        <div className="space-y-3">
          <SubHeading
            title={t('policy.foundingFieldsTitle')}
            hint={t('policy.foundingFieldsHint')}
          />
          <ul className="grid gap-2 sm:grid-cols-2">
            <ToggleTile label={t('policy.fieldClubName')} checked locked />
            <ToggleTile label={t('policy.fieldClubField')} checked locked />
            {FOUNDING_FORM_FIELDS.map((item) => (
              <ToggleTile
                key={item}
                label={t(foundingFieldKey(item))}
                checked={form.formRequirements.clubFounding[item]}
                onChange={(value) => setFounding(item, value)}
              />
            ))}
          </ul>
        </div>
      </div>
    )
  } else if (section === 'profile') {
    body = (
      <div className="space-y-3">
        <p className="text-xs text-muted-app">{t('policy.profileFieldsHint')}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CLUB_PROFILE_FORM_FIELDS.map((item) => (
            <ToggleTile
              key={item}
              label={t(profileFieldKey(item))}
              checked={form.formRequirements.clubProfile[item]}
              onChange={(value) => setProfile(item, value)}
            />
          ))}
        </ul>
      </div>
    )
  } else if (section === 'events') {
    body = (
      <div className="space-y-5">
        <ul className="divide-y divide-border-app rounded-xl border border-border-app px-4 py-3.5">
          <NumberSetting
            label={t('policy.feedbackWindow')}
            min={1}
            value={form.feedbackWindowHours}
            control={field.control('feedbackWindowHours')}
            error={field.error('feedbackWindowHours')}
            onChange={(value) => setForm({ ...form, feedbackWindowHours: value })}
          />
          <NumberSetting
            label={t('policy.feedbackMinimum')}
            min={2}
            value={form.feedbackMinRespondents}
            control={field.control('feedbackMinRespondents')}
            error={field.error('feedbackMinRespondents')}
            onChange={(value) => setForm({ ...form, feedbackMinRespondents: value })}
          />
          <NumberSetting
            label={t('policy.conflictMinutes')}
            min={0}
            value={form.conflictThresholdMinutes}
            control={field.control('conflictThresholdMinutes')}
            error={field.error('conflictThresholdMinutes')}
            onChange={(value) => setForm({ ...form, conflictThresholdMinutes: value })}
          />
        </ul>
        <ul>
          <ToggleTile
            label={t('policy.overbooking')}
            hint={t('policy.overbookingHint')}
            checked={form.allowOverbooking}
            onChange={(value) => setForm({ ...form, allowOverbooking: value })}
          />
        </ul>
      </div>
    )
  } else if (section === 'calendar') {
    body = (
      <div className="space-y-3">
        {form.academicCalendar.map((item, index) => (
          <div
            key={index}
            className="grid items-start gap-3 rounded-xl border border-border-app bg-surface-app p-4 sm:grid-cols-[minmax(0,10rem)_1fr_1fr_auto]"
          >
            <label className={fieldLabel}>
              {t('policy.semesterCode')}
              <AppRequiredMark />
              <AppInput
                className={fieldInput}
                value={item.code}
                {...field.control(`semesterCode${index}`)}
                onChange={(event) => updateSemester(index, 'code', event.target.value)}
              />
              <AppFieldError message={field.error(`semesterCode${index}`)} />
            </label>
            <label className={fieldLabel}>
              {t('policy.semesterStart')}
              <AppRequiredMark />
              <AppInput
                className={fieldInput}
                type="datetime-local"
                value={item.startAt}
                {...field.control(`semesterStart${index}`)}
                onChange={(event) => updateSemester(index, 'startAt', event.target.value)}
              />
              <AppFieldError message={field.error(`semesterStart${index}`)} />
            </label>
            <label className={fieldLabel}>
              {t('policy.semesterEnd')}
              <AppRequiredMark />
              <AppInput
                className={fieldInput}
                type="datetime-local"
                value={item.endAt}
                {...field.control(`semesterEnd${index}`)}
                onChange={(event) => updateSemester(index, 'endAt', event.target.value)}
              />
              <AppFieldError message={field.error(`semesterEnd${index}`)} />
            </label>
            <AppButton
              type="button"
              variant="ghost"
              className="sm:mt-7"
              disabled={form.academicCalendar.length === 1}
              onClick={() =>
                setForm({
                  ...form,
                  academicCalendar: form.academicCalendar.filter(
                    (_, position) => position !== index,
                  ),
                })
              }
            >
              <AppIcon name="close" className="size-4" />
              {t('policy.removeSemester')}
            </AppButton>
          </div>
        ))}
        <AppButton
          type="button"
          variant="secondary"
          onClick={() =>
            setForm({
              ...form,
              academicCalendar: [...form.academicCalendar, { code: '', startAt: '', endAt: '' }],
            })
          }
        >
          <AppIcon name="plus" className="size-4" />
          {t('policy.addSemester')}
        </AppButton>
      </div>
    )
  } else if (section === 'finance') {
    const refund = form.schoolRefundAccount
    const anyFilled = Boolean(
      refund.accountHolder.trim() ||
      refund.accountNumber.trim() ||
      refund.bankName.trim() ||
      refund.bankBranch.trim() ||
      refund.transferNote.trim(),
    )
    body = (
      <div className="space-y-4">
        <SubHeading title={t('policy.refundAccountTitle')} hint={t('policy.refundAccountHint')} />
        <div className="grid gap-4 rounded-xl border border-border-app p-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            {t('policy.refundAccountHolder')}
            {anyFilled ? <AppRequiredMark /> : null}
            <AppInput
              className={fieldInput}
              maxLength={200}
              value={refund.accountHolder}
              {...field.control('refundAccountHolder')}
              onChange={(event) =>
                setForm({
                  ...form,
                  schoolRefundAccount: { ...refund, accountHolder: event.target.value },
                })
              }
            />
            <AppFieldError message={field.error('refundAccountHolder')} />
          </label>
          <label className={fieldLabel}>
            {t('policy.refundAccountNumber')}
            {anyFilled ? <AppRequiredMark /> : null}
            <AppInput
              className={fieldInput}
              maxLength={50}
              value={refund.accountNumber}
              {...field.control('refundAccountNumber')}
              onChange={(event) =>
                setForm({
                  ...form,
                  schoolRefundAccount: { ...refund, accountNumber: event.target.value },
                })
              }
            />
            <AppFieldError message={field.error('refundAccountNumber')} />
          </label>
          <label className={fieldLabel}>
            {t('policy.refundBankName')}
            {anyFilled ? <AppRequiredMark /> : null}
            <AppInput
              className={fieldInput}
              maxLength={200}
              value={refund.bankName}
              {...field.control('refundBankName')}
              onChange={(event) =>
                setForm({
                  ...form,
                  schoolRefundAccount: { ...refund, bankName: event.target.value },
                })
              }
            />
            <AppFieldError message={field.error('refundBankName')} />
          </label>
          <label className={fieldLabel}>
            {t('policy.refundBankBranch')}
            <AppInput
              className={fieldInput}
              maxLength={200}
              value={refund.bankBranch}
              onChange={(event) =>
                setForm({
                  ...form,
                  schoolRefundAccount: { ...refund, bankBranch: event.target.value },
                })
              }
            />
          </label>
          <label className={cn(fieldLabel, 'sm:col-span-2')}>
            {t('policy.refundTransferNote')}
            <AppInput
              className={fieldInput}
              maxLength={500}
              value={refund.transferNote}
              onChange={(event) =>
                setForm({
                  ...form,
                  schoolRefundAccount: { ...refund, transferNote: event.target.value },
                })
              }
            />
          </label>
        </div>
      </div>
    )
  } else {
    body = (
      <div className="space-y-4">
        {form.reportDeadlines.map((item, index) => (
          <div key={index} className="rounded-xl border border-border-app bg-surface-app p-4">
            <div className="flex flex-wrap items-start gap-3">
              <label className={cn(fieldLabel, 'min-w-0 flex-1 basis-56')}>
                {t('policy.reportType')}
                <AppRequiredMark />
                <AppInput
                  className={fieldInput}
                  value={item.reportType}
                  {...field.control(`reportType${index}`)}
                  onChange={(event) => updateDeadline(index, 'reportType', event.target.value)}
                />
                <AppFieldError message={field.error(`reportType${index}`)} />
              </label>
              <AppButton
                type="button"
                variant="ghost"
                className="sm:mt-7"
                disabled={form.reportDeadlines.length === 1}
                onClick={() =>
                  setForm({
                    ...form,
                    reportDeadlines: form.reportDeadlines.filter(
                      (_, position) => position !== index,
                    ),
                  })
                }
              >
                <AppIcon name="close" className="size-4" />
                {t('policy.removeDeadline')}
              </AppButton>
            </div>
            <ul className="mt-3 divide-y divide-border-app rounded-xl bg-bg-app px-4 py-3.5">
              {deadlineNumberFields.map((name) => (
                <NumberSetting
                  key={name}
                  label={t(deadlineLabelKey(name))}
                  min={0}
                  value={item[name]}
                  control={field.control(`${name}${index}`)}
                  error={field.error(`${name}${index}`)}
                  onChange={(value) => updateDeadline(index, name, value)}
                />
              ))}
            </ul>
          </div>
        ))}
        <AppButton
          type="button"
          variant="secondary"
          onClick={() =>
            setForm({
              ...form,
              reportDeadlines: [
                ...form.reportDeadlines,
                {
                  reportType: '',
                  dueDaysAfterPeriodEnd: '',
                  remindBeforeDays: '',
                  overdueAfterDays: '',
                  escalateAfterDays: '',
                },
              ],
            })
          }
        >
          <AppIcon name="plus" className="size-4" />
          {t('policy.addDeadline')}
        </AppButton>
        <ul>
          <ToggleTile
            label={t('policy.overdueBlock')}
            checked={form.enforceOverdueReportBlock}
            onChange={(value) => setForm({ ...form, enforceOverdueReportBlock: value })}
          />
        </ul>
      </div>
    )
  }

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="space-y-5">
      <div className="rounded-2xl border border-border-app bg-bg-app px-5 py-4 shadow-xs">
        <h2 className="font-heading text-base font-semibold">{t('policy.formTitle')}</h2>
        <p className="mt-1 text-sm text-muted-app">{t('policy.formDescription')}</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <nav
          aria-label={t('policy.formTitle')}
          className="min-w-0 lg:sticky lg:top-4 lg:self-start"
        >
          <ul
            role="tablist"
            className="flex gap-1 overflow-x-auto rounded-2xl border border-border-app bg-bg-app p-1.5 shadow-xs lg:flex-col"
          >
            {sections.map((item) => (
              <li key={item} className="shrink-0">
                <button
                  type="button"
                  role="tab"
                  aria-selected={section === item}
                  onClick={() => setSection(item)}
                  className={cn(
                    'flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm font-medium whitespace-nowrap text-muted-app transition-colors hover:bg-surface-app hover:text-text-app focus-visible:outline-2 focus-visible:outline-ring-app',
                    {
                      'bg-primary-soft-app text-primary-app hover:bg-primary-soft-app hover:text-primary-app':
                        section === item,
                    },
                  )}
                >
                  <AppIcon name={sectionIcon(item)} className="size-4 shrink-0" />
                  <span className="flex-1">{t(sectionTitleKey(item))}</span>
                  {invalidSections.has(item) && (
                    <span className="size-2 rounded-full bg-danger-app" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <section
          role="tabpanel"
          className="min-w-0 rounded-2xl border border-border-app bg-bg-app p-5 shadow-xs sm:p-6"
        >
          <div className="mb-5 flex items-start gap-3 border-b border-border-app pb-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-soft-app text-primary-app">
              <AppIcon name={sectionIcon(section)} className="size-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-heading text-base font-semibold">
                {t(sectionTitleKey(section))}
              </h3>
              <p className="mt-0.5 text-sm text-muted-app">
                {t('policy.appliesTo', { flows: t(sectionAppliesKey(section)) })}
              </p>
            </div>
          </div>
          {body}
        </section>
      </div>

      <div className="rounded-2xl border border-border-app bg-bg-app/95 p-5 shadow-sm backdrop-blur lg:sticky lg:bottom-0 lg:z-10">
        <h3 className="font-heading text-sm font-semibold">{t('policy.saveSection')}</h3>
        <div className="mt-3 grid items-start gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className={fieldLabel}>
            {t('policy.effectiveFrom')}
            <AppInput
              className={fieldInput}
              type="datetime-local"
              value={form.effectiveFrom}
              onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })}
            />
            <span className="mt-1 block text-xs font-normal text-muted-app">
              {t('policy.effectiveHint')}
            </span>
          </label>
          <label className={fieldLabel}>
            {t('policy.reason')}
            <AppInput
              className={fieldInput}
              maxLength={1000}
              value={form.reason}
              onChange={(event) => setForm({ ...form, reason: event.target.value })}
            />
          </label>
          <AppButton type="submit" className="lg:mt-7" disabled={create.isPending}>
            {create.isPending ? t('policy.saving') : t('policy.save')}
          </AppButton>
        </div>
        {localError && (
          <p role="alert" className="mt-3 text-sm text-danger-app">
            {localError}
          </p>
        )}
        {create.isError && create.error instanceof PolicyConflictError ? (
          <div
            role="alert"
            className="mt-3 max-h-64 overflow-y-auto rounded-xl border-l-4 border-danger-app bg-danger-app/10 px-4 py-3 text-sm"
          >
            <p className="font-semibold text-danger-app">{t('policy.impactTitle')}</p>
            <p className="mt-1 text-text-app">{t('policy.impactDescription')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-text-app">
              {create.error.affectedRecords.map((record) => (
                <li key={`${record.entityType}:${record.entityId}`}>
                  <span className="font-medium">{t(impactEntityKey(record.entityType))}</span> ·{' '}
                  {record.entityId}:{' '}
                  {record.reasons.map((reason) => t(impactReasonKey(reason))).join(', ')}
                </li>
              ))}
            </ul>
          </div>
        ) : create.isError ? (
          <p role="alert" className="mt-3 text-sm text-danger-app">
            {t('policy.saveError')} {create.error.message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
