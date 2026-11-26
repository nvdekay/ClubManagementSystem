import { DomainError } from './errors.js'
import type { AcademicSemester, ReportDeadline } from './policy.js'
import type { ViolationSeverity } from './violation.js'

/** `reportType` trong `reportDeadlines[]` của policy dùng để đặt hạn nộp báo cáo định kỳ (BR20). */
export const PERIODIC_REPORT_TYPE = 'PERIODIC'
export const DEFAULT_PERIODIC_DUE_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

export const RETURN_SECTIONS = [
  'members',
  'events',
  'achievements',
  'customFields',
  'narrative',
  'nextPlan',
  'figures',
  'evidence',
  'other',
] as const
export type ReturnSection = (typeof RETURN_SECTIONS)[number]
export type PeriodicOutcome = 'Accept' | 'Return'

export const CUSTOM_FIELD_TYPES = ['text', 'number', 'evidence'] as const
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number]

export interface PeriodicCustomField {
  id: string
  label: string
  description?: string
  type: CustomFieldType
  required: boolean
}

export interface PeriodicCampaign {
  periodCode: string
  isOpen: boolean
  dueAt: Date
  announcement?: string
  customFields: PeriodicCustomField[]
  updatedAt?: Date
}

export interface PeriodicCampaignInput {
  periodCode: string
  isOpen: boolean
  dueAt: Date
  announcement?: string
  customFields?: PeriodicCustomField[]
}

export interface PeriodicMemberEntry {
  userId?: string
  fullName: string
  studentCode: string
  email: string
  activityScore: number
  source?: 'SYSTEM' | 'MANUAL'
}

export interface PeriodicEventEntry {
  eventId?: string
  title: string
  description: string
  heldAt: string
  participantCount: number
  evidenceUrl?: string
  evidenceNote?: string
  source?: 'SYSTEM' | 'MANUAL'
}

export interface PeriodicAchievementEntry {
  title: string
  description: string
  evidenceUrl?: string
  evidenceNote?: string
}

export interface PeriodicCustomAnswer {
  fieldId: string
  label?: string
  type?: CustomFieldType
  textValue?: string
  numberValue?: number
  evidenceUrl?: string
}

export interface PeriodicSystemSnapshot {
  members: PeriodicMemberEntry[]
  events: PeriodicEventEntry[]
}

/** Số liệu do chính hệ thống tính cho một CLB và một học kỳ (FR-UC39-01). CLB đóng băng đúng cấu trúc này. */
export interface PeriodFigures {
  events?: { completed?: number; cancelled?: number }
  members?: { active?: number }
  attendance?: { total?: number }
  finance?: { budgets?: number; approvedTotal?: number; disbursedTotal?: number }
  capturedAt?: Date
  systemData?: PeriodicSystemSnapshot
}

export interface PeriodicReportRow {
  clubId: string
  clubName: string
  clubState: string
  dueAt: Date
  reportId?: string
  state?: string
  versionNo?: number
  lateFlag?: boolean
  submittedAt?: Date
  /** Đã quá hạn mà chưa nộp gì. */
  overdue: boolean
  /** Hồ sơ OVERDUE_REPORT mà ICPDP đã mở cho CLB và kỳ này (E1). */
  violationId?: string
}

export interface PeriodicOverview {
  periods: { code: string; startAt: Date; endAt: Date }[]
  periodCode?: string
  dueAt?: Date
  campaign?: PeriodicCampaign
  rows: PeriodicReportRow[]
}

export interface PeriodicReportVersion {
  versionNo: number
  narrative: string
  nextPlan: string
  evidence: { note?: string; url?: string }[]
  members?: PeriodicMemberEntry[]
  events?: PeriodicEventEntry[]
  achievements?: PeriodicAchievementEntry[]
  customAnswers?: PeriodicCustomAnswer[]
  preloadedFigures: PeriodFigures
  submittedAt: Date
  decision?: {
    outcome: string
    reason?: string
    sections?: string[]
    observation?: string
    resubmitDueAt?: Date
    decidedAt: Date
  }
}

export interface PeriodicReportDetail {
  revision?: number
  versions?: PeriodicReportVersion[]
  id: string
  clubId: string
  clubName: string
  periodCode: string
  periodType: string
  state: string
  versionNo: number
  lateFlag: boolean
  dueAt: Date
  resubmitDueAt?: Date
  submittedAt?: Date
  narrative?: string
  nextPlan?: string
  evidence: { note?: string; url?: string }[]
  members?: PeriodicMemberEntry[]
  events?: PeriodicEventEntry[]
  achievements?: PeriodicAchievementEntry[]
  customAnswers?: PeriodicCustomAnswer[]
  campaign?: PeriodicCampaign
  systemData?: PeriodicSystemSnapshot
  preloadedFigures: PeriodFigures
  live: Required<Omit<PeriodFigures, 'capturedAt' | 'systemData'>>
  decision?: {
    outcome: PeriodicOutcome
    observation?: string
    reason?: string
    sections: ReturnSection[]
    resubmitDueAt?: Date
    decidedByName?: string
    decidedAt: Date
  }
  history: { action: string; at: Date; actorName?: string; reason?: string }[]
}

export interface PeriodicDecisionInput {
  outcome: PeriodicOutcome
  /** Chỉ khi Accept: ghi chú được giữ lại cho kỳ đánh giá (A1). */
  observation?: string
  /** Chỉ khi Return: bắt buộc, kèm các phần CLB phải sửa. */
  reason?: string
  sections?: ReturnSection[]
  /** Chỉ khi Return: hạn mới (tuỳ chọn) để CLB nộp lại. */
  resubmitDueAt?: Date
}

export interface PeriodicReportRepository {
  overview(periodCode: string, dueAt: Date, now: Date): Promise<PeriodicReportRow[]>
  getCampaign?(periodCode: string): Promise<PeriodicCampaign | null>
  saveCampaign?(officerId: string, input: PeriodicCampaign, now: Date): Promise<PeriodicCampaign>
  find(id: string): Promise<PeriodicReportDetail | null>
  decide(
    id: string,
    officerId: string,
    input: PeriodicDecisionInput,
    now: Date,
  ): Promise<PeriodicReportDetail>
  /** E1: mở hồ sơ OVERDUE_REPORT cho CLB không nộp đúng hạn. */
  recordMissing(
    clubId: string,
    periodCode: string,
    dueAt: Date,
    officerId: string,
    input: { severity: ViolationSeverity; note?: string },
    now: Date,
  ): Promise<{ violationId: string }>
}

// Lấy số ngày hạn nộp báo cáo định kỳ sau khi kỳ kết thúc từ chính sách
export function periodicDueDays(deadlines: readonly ReportDeadline[] | undefined): number {
  const entry = deadlines?.find(
    (item) => item.reportType.trim().toUpperCase() === PERIODIC_REPORT_TYPE,
  )
  return entry ? entry.dueDaysAfterPeriodEnd : DEFAULT_PERIODIC_DUE_DAYS
}

// Tính hạn nộp báo cáo định kỳ từ ngày kết thúc kỳ
export function periodicDueAt(period: Pick<AcademicSemester, 'endAt'>, dueDays: number): Date {
  return new Date(period.endAt.getTime() + dueDays * DAY_MS)
}

// Cắt khoảng trắng chuỗi, giữ undefined nếu không có
function trimmed(value: string | undefined): string | undefined {
  return value?.trim() || undefined
}

/** Độ dài tối đa của một link hoặc tham chiếu minh chứng khi ghi báo cáo. */
export const EVIDENCE_LINK_MAX_LENGTH = 2_000
/** Tiền tố tham chiếu ảnh minh chứng đã upload: `ucms-evidence:{clubId}:{assetId}`. */
export const EVIDENCE_REFERENCE_PREFIX = 'ucms-evidence:'
/** Ảnh minh chứng tối đa 5 MiB; chỉ PNG, JPEG, WebP (không SVG vì SVG chạy được script). */
export const EVIDENCE_IMAGE_MAX_BYTES = 5 * 1024 * 1024
export const EVIDENCE_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export type EvidenceImageMimeType = (typeof EVIDENCE_IMAGE_MIME_TYPES)[number]

const evidenceReferencePattern = /^ucms-evidence:([0-9a-f]{24}):([0-9a-f]{32})$/i

/** Kho ảnh minh chứng báo cáo định kỳ; ảnh là asset riêng tư, chỉ đọc qua signed URL ngắn hạn. */
export interface PeriodicEvidenceStorage {
  upload(input: {
    clubId: string
    mimeType: EvidenceImageMimeType
    bytes: Buffer
  }): Promise<{ assetId: string }>
  accessUrl(assetId: string): Promise<string>
  remove(assetId: string): Promise<void>
}

/** Ảnh minh chứng chưa được báo cáo nào tham chiếu sau ngần này giờ thì bị job dọn dẹp xoá. */
export const EVIDENCE_ORPHAN_GRACE_HOURS = 24

export interface UploadedEvidence {
  assetId: string
  /** Lower-case hex id of the owning club, as in `evidenceReference`. */
  clubId: string
}

/** Sổ theo dõi ảnh minh chứng đã upload, để dọn ảnh không được tham chiếu (feat-upload-orphan-cleanup). */
export interface UploadedEvidenceRepository {
  record(input: UploadedEvidence & { uploadedAt: Date }): Promise<void>
  /** Ảnh upload trước `before` mà chưa từng thấy được tham chiếu, cũ nhất trước. */
  unconfirmed(before: Date, limit: number): Promise<UploadedEvidence[]>
  /** Asset id trong `assets` được một báo cáo của CLB sở hữu tham chiếu (bản nháp hoặc phiên bản đã nộp). */
  referenced(assets: readonly UploadedEvidence[]): Promise<Set<string>>
  markReferenced(assetIds: readonly string[], now: Date): Promise<void>
  forget(assetId: string): Promise<void>
}

// Dựng tham chiếu ảnh minh chứng gắn với CLB sở hữu
export function evidenceReference(clubId: string, assetId: string): string {
  return `${EVIDENCE_REFERENCE_PREFIX}${clubId}:${assetId}`
}

// Tách clubId và assetId từ tham chiếu ảnh minh chứng, sai định dạng thì trả null
export function parseEvidenceReference(value: string): { clubId: string; assetId: string } | null {
  const match = evidenceReferencePattern.exec(value)
  return match ? { clubId: match[1]!.toLowerCase(), assetId: match[2]!.toLowerCase() } : null
}

// Kiểm tra link minh chứng khi ghi: chỉ http(s) hoặc tham chiếu ảnh đã upload, không nhận data: URL
export function isValidEvidenceLink(url: string): boolean {
  if (!url || url.length > EVIDENCE_LINK_MAX_LENGTH) {
    return false
  }
  if (url.startsWith(EVIDENCE_REFERENCE_PREFIX)) {
    return parseEvidenceReference(url) !== null
  }
  try {
    const parsed = new URL(url)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

// Kiểm nội dung ảnh khớp magic bytes của loại MIME khai báo
export function evidenceImageSignatureMatches(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === 'image/png') {
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  }
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mimeType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString('latin1') === 'RIFF' &&
      bytes.subarray(8, 12).toString('latin1') === 'WEBP'
    )
  }
  return false
}

interface EvidenceCarrier {
  evidence?: { url?: string }[]
  events?: { evidenceUrl?: string }[]
  achievements?: { evidenceUrl?: string }[]
  customAnswers?: { evidenceUrl?: string }[]
  systemData?: { events?: { evidenceUrl?: string }[] }
  versions?: EvidenceCarrier[]
}

// Gom mọi link minh chứng của báo cáo (kể cả các phiên bản cũ)
export function evidenceLinks(report: EvidenceCarrier): string[] {
  const links = [
    ...(report.evidence ?? []).map((item) => item.url),
    ...(report.events ?? []).map((item) => item.evidenceUrl),
    ...(report.achievements ?? []).map((item) => item.evidenceUrl),
    ...(report.customAnswers ?? []).map((item) => item.evidenceUrl),
    ...(report.systemData?.events ?? []).map((item) => item.evidenceUrl),
    ...(report.versions ?? []).flatMap((version) => evidenceLinks(version)),
  ]
  return links.filter((link): link is string => typeof link === 'string' && link.length > 0)
}

// Kiểm tra và chuẩn hoá đợt báo cáo định kỳ do ICPDP mở
export function normalizedPeriodicCampaign(input: PeriodicCampaignInput): PeriodicCampaign {
  const periodCode = input.periodCode.trim()
  if (!periodCode || periodCode.length > 100) {
    throw new DomainError('invalid reporting period', 'validation', { field: 'periodCode' })
  }
  if (!(input.dueAt instanceof Date) || Number.isNaN(input.dueAt.getTime())) {
    throw new DomainError('invalid deadline', 'validation', { field: 'dueAt' })
  }
  const announcement = trimmed(input.announcement)
  if (announcement && announcement.length > 5_000) {
    throw new DomainError('announcement is too long', 'validation', { field: 'announcement' })
  }
  const rawFields = input.customFields ?? []
  if (rawFields.length > 30) {
    throw new DomainError('too many custom fields', 'validation', { field: 'customFields' })
  }
  const seenIds = new Set<string>()
  const customFields = rawFields.map((field, index) => {
    const id = field.id.trim() || `field_${index + 1}`
    const label = field.label.trim()
    const description = trimmed(field.description)
    if (!label || label.length > 200) {
      throw new DomainError(
        'custom field label is required and must be under 200 characters',
        'validation',
        { field: 'customFields' },
      )
    }
    if (description && description.length > 1_000) {
      throw new DomainError('custom field description is too long', 'validation', {
        field: 'customFields',
      })
    }
    if (!CUSTOM_FIELD_TYPES.includes(field.type)) {
      throw new DomainError('invalid custom field type', 'validation', { field: 'customFields' })
    }
    if (seenIds.has(id)) {
      throw new DomainError('duplicate custom field identifier', 'validation', {
        field: 'customFields',
      })
    }
    seenIds.add(id)
    return {
      id,
      label,
      ...(description ? { description } : {}),
      type: field.type,
      required: Boolean(field.required),
    }
  })
  return {
    periodCode,
    isOpen: Boolean(input.isOpen),
    dueAt: input.dueAt,
    ...(announcement ? { announcement } : {}),
    customFields,
  }
}

// Kiểm tra và chuẩn hoá quyết định duyệt báo cáo định kỳ
export function normalizedPeriodicDecision(input: PeriodicDecisionInput): PeriodicDecisionInput {
  const observation = trimmed(input.observation)
  const reason = trimmed(input.reason)
  const sections = [...new Set(input.sections ?? [])]
  if ((observation && observation.length > 2_000) || (reason && reason.length > 5_000)) {
    throw new DomainError('review text is too long', 'validation')
  }
  if (sections.some((item) => !RETURN_SECTIONS.includes(item))) {
    throw new DomainError('invalid section', 'validation', { field: 'sections' })
  }
  if (input.outcome === 'Accept') {
    if (reason || sections.length || input.resubmitDueAt) {
      throw new DomainError('a reason and sections only go with a return', 'validation')
    }
    return { outcome: 'Accept', ...(observation ? { observation } : {}) }
  }
  if (observation) {
    throw new DomainError('an observation only goes with an acceptance', 'validation', {
      field: 'observation',
    })
  }
  if (!reason) {
    throw new DomainError('a reason is required to return a report', 'validation', {
      field: 'reason',
    })
  }
  if (!sections.length) {
    throw new DomainError('say which parts must be corrected', 'validation', { field: 'sections' })
  }
  if (input.resubmitDueAt && Number.isNaN(input.resubmitDueAt.getTime())) {
    throw new DomainError('invalid resubmission deadline', 'validation', { field: 'resubmitDueAt' })
  }
  return {
    outcome: 'Return',
    reason,
    sections,
    ...(input.resubmitDueAt ? { resubmitDueAt: input.resubmitDueAt } : {}),
  }
}
