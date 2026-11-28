import { DomainError } from '../domain/errors.js'
import type { AuthRepository } from '../domain/auth.js'
import {
  CLUB_PROFILE_FORM_FIELDS,
  FOUNDING_FORM_FIELDS,
  type AcademicSemester,
  type FormRequirements,
  type FoundingRequirements,
  type PolicyManagementRepository,
  type PolicyRepository,
  type PolicySettings,
  type PolicyVersion,
  type ReportDeadline,
  type SchoolRefundAccount,
} from '../domain/policy.js'
import { requireIcpdpOfficer, type AccessActor } from './access.js'

// Ném lỗi validation cho một trường cấu hình chính sách không hợp lệ
function invalid(field: string): never {
  throw new DomainError(`invalid policy ${field}`, 'validation', { field })
}

// Kiểm đối tượng cờ bắt buộc có đủ khóa và đều là boolean
function requiredFlags<K extends string>(value: unknown, keys: readonly K[]): Record<K, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalid('formRequirements')
  }
  const record = value as Record<string, unknown>
  if (
    Object.keys(record).length !== keys.length ||
    keys.some((key) => typeof record[key] !== 'boolean')
  ) {
    invalid('formRequirements')
  }
  return Object.fromEntries(keys.map((key) => [key, record[key]])) as Record<K, boolean>
}

// Chuẩn hóa cấu hình trường bắt buộc của form lập CLB và hồ sơ CLB
function normalizeFormRequirements(value: FormRequirements): FormRequirements {
  if (!value || typeof value !== 'object') {
    invalid('formRequirements')
  }
  return {
    clubFounding: requiredFlags(value.clubFounding, FOUNDING_FORM_FIELDS),
    clubProfile: requiredFlags(value.clubProfile, CLUB_PROFILE_FORM_FIELDS),
  }
}

// Chuẩn hóa và kiểm hạn nộp, nhắc nhở, quá hạn, leo thang của báo cáo
function normalizeDeadlines(values: readonly ReportDeadline[]): ReportDeadline[] {
  if (!Array.isArray(values) || values.length === 0) {
    invalid('reportDeadlines')
  }
  const names = new Set<string>()
  return values.map((value) => {
    if (!value || typeof value.reportType !== 'string') {
      invalid('reportDeadlines')
    }
    const reportType = value.reportType.trim()
    if (!reportType || names.has(reportType.toLowerCase())) {
      invalid('reportDeadlines')
    }
    names.add(reportType.toLowerCase())
    const fields = [
      value.dueDaysAfterPeriodEnd,
      value.remindBeforeDays,
      value.overdueAfterDays,
      value.escalateAfterDays,
    ]
    if (
      fields.some((number) => !Number.isInteger(number) || number < 0) ||
      value.escalateAfterDays <= value.overdueAfterDays
    ) {
      invalid('reportDeadlines')
    }
    return { ...value, reportType }
  })
}

// Chuẩn hóa lịch học vụ: mã học kỳ duy nhất, ngày hợp lệ, không chồng lấn
function normalizeCalendar(values: readonly AcademicSemester[]): AcademicSemester[] {
  if (!Array.isArray(values) || values.length === 0) {
    invalid('academicCalendar')
  }
  const names = new Set<string>()
  const semesters = values
    .map((value) => {
      if (!value || typeof value.code !== 'string') {
        invalid('academicCalendar')
      }
      const code = value.code.trim()
      if (
        !code ||
        names.has(code.toLowerCase()) ||
        !(value.startAt instanceof Date) ||
        !(value.endAt instanceof Date) ||
        Number.isNaN(value.startAt.getTime()) ||
        Number.isNaN(value.endAt.getTime()) ||
        value.startAt >= value.endAt
      ) {
        invalid('academicCalendar')
      }
      names.add(code.toLowerCase())
      return { ...value, code }
    })
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
  for (let index = 1; index < semesters.length; index += 1) {
    if (semesters[index - 1]!.endAt > semesters[index]!.startAt) {
      invalid('academicCalendar')
    }
  }
  return semesters
}

// Chuẩn hóa thông tin tài khoản hoàn trả của nhà trường (tùy chọn)
function normalizeSchoolRefundAccount(
  value: SchoolRefundAccount | undefined,
): SchoolRefundAccount | undefined {
  if (value === undefined) {
    return undefined
  }
  if (!value || typeof value !== 'object') {
    invalid('schoolRefundAccount')
  }
  const accountHolder = typeof value.accountHolder === 'string' ? value.accountHolder.trim() : ''
  const accountNumber = typeof value.accountNumber === 'string' ? value.accountNumber.trim() : ''
  const bankName = typeof value.bankName === 'string' ? value.bankName.trim() : ''
  const bankBranch =
    typeof value.bankBranch === 'string' ? value.bankBranch.trim() || undefined : undefined
  const transferNote =
    typeof value.transferNote === 'string' ? value.transferNote.trim() || undefined : undefined
  if (
    !accountHolder ||
    accountHolder.length > 200 ||
    !accountNumber ||
    accountNumber.length > 50 ||
    !/^[0-9A-Za-z -]+$/.test(accountNumber) ||
    !bankName ||
    bankName.length > 200 ||
    (bankBranch && bankBranch.length > 200) ||
    (transferNote && transferNote.length > 500)
  ) {
    invalid('schoolRefundAccount')
  }
  return {
    accountHolder,
    accountNumber,
    bankName,
    ...(bankBranch ? { bankBranch } : {}),
    ...(transferNote ? { transferNote } : {}),
  }
}

// Kiểm và chuẩn hóa toàn bộ thiết lập chính sách
export function normalizePolicySettings(input: PolicySettings): PolicySettings {
  if (!Number.isInteger(input.minFoundingMembers) || input.minFoundingMembers < 1) {
    invalid('minFoundingMembers')
  }
  if (!Number.isInteger(input.conflictThresholdMinutes) || input.conflictThresholdMinutes < 0) {
    invalid('conflictThresholdMinutes')
  }
  if (!Number.isInteger(input.feedbackWindowHours) || input.feedbackWindowHours < 1) {
    invalid('feedbackWindowHours')
  }
  if (!Number.isInteger(input.feedbackMinRespondents) || input.feedbackMinRespondents < 2) {
    invalid('feedbackMinRespondents')
  }
  if (
    typeof input.allowOverbooking !== 'boolean' ||
    typeof input.enforceOverdueReportBlock !== 'boolean'
  ) {
    invalid('switches')
  }
  const schoolRefundAccount = normalizeSchoolRefundAccount(input.schoolRefundAccount)
  return {
    ...input,
    formRequirements: normalizeFormRequirements(input.formRequirements),
    reportDeadlines: normalizeDeadlines(input.reportDeadlines),
    academicCalendar: normalizeCalendar(input.academicCalendar),
    ...(schoolRefundAccount ? { schoolRefundAccount } : { schoolRefundAccount: undefined }),
  }
}

// Lấy phiên bản chính sách có hiệu lực tại một thời điểm
export async function resolvePolicyAt(repo: PolicyRepository, at: Date): Promise<PolicyVersion> {
  if (Number.isNaN(at.getTime())) {
    throw new DomainError('invalid policy date', 'validation')
  }
  const policy = await repo.findEffective(at)
  if (!policy) {
    throw new DomainError('policy is not configured for this date', 'unavailable')
  }
  return policy
}

// Lấy yêu cầu thành lập CLB theo chính sách tại một thời điểm
export async function foundingRequirementsAt(
  repo: PolicyRepository,
  at: Date,
): Promise<FoundingRequirements> {
  const policy = await resolvePolicyAt(repo, at)
  if (!Number.isInteger(policy.minFoundingMembers) || policy.minFoundingMembers < 1) {
    throw new DomainError('founding policy is invalid', 'unavailable')
  }
  return {
    policyVersionId: policy.id,
    minFoundingMembers: policy.minFoundingMembers,
    required: policy.formRequirements.clubFounding,
  }
}

// ICPDP xem chính sách hiện hành và các phiên bản gần đây
export async function listPolicyVersions(
  repo: PolicyManagementRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  now: Date,
): Promise<{ current: PolicyVersion | null; versions: PolicyVersion[] }> {
  await requireIcpdpOfficer(auth, actor, 'policy administration denied')
  const [current, versions] = await Promise.all([repo.findEffective(now), repo.listRecent(20)])
  return { current, versions }
}

// ICPDP tạo phiên bản chính sách mới, chặn nếu làm vô hiệu quyết định đã có
export async function createPolicyVersion(
  repo: PolicyManagementRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  settings: PolicySettings,
  requestedEffectiveFrom: Date | undefined,
  reason: string | undefined,
  now: Date,
): Promise<PolicyVersion> {
  const actorId = await requireIcpdpOfficer(auth, actor, 'policy administration denied')
  const normalized = normalizePolicySettings(settings)
  if (
    requestedEffectiveFrom &&
    (Number.isNaN(requestedEffectiveFrom.getTime()) || requestedEffectiveFrom <= now)
  ) {
    invalid('effectiveFrom')
  }
  if (reason !== undefined && (typeof reason !== 'string' || reason.trim().length > 1000)) {
    invalid('reason')
  }
  const effectiveFrom = requestedEffectiveFrom ?? now
  const impacts = await repo.findDecisionImpacts(normalized, effectiveFrom)
  if (impacts.length > 0) {
    throw new DomainError('policy would invalidate existing decisions', 'conflict', {
      affectedRecords: impacts,
    })
  }
  return repo.append({
    settings: normalized,
    effectiveFrom,
    createdBy: actorId,
    createdAt: now,
    reason: reason?.trim() || undefined,
  })
}
