import { ApiError } from '@/services/apiError'
import { apiRequest, type ApiFailure } from '@/services/apiRequest'
export interface ReportDeadline {
  reportType: string
  dueDaysAfterPeriodEnd: number
  remindBeforeDays: number
  overdueAfterDays: number
  escalateAfterDays: number
}

export interface AcademicSemester {
  code: string
  startAt: string
  endAt: string
}

export interface SchoolRefundAccount {
  accountHolder: string
  accountNumber: string
  bankName: string
  bankBranch?: string
  transferNote?: string
}

export const FOUNDING_FORM_FIELDS = [
  'summary',
  'objectives',
  'proposal',
  'logo',
  'fanpageUrl',
  'contactEmail',
] as const
export type FoundingFormField = (typeof FOUNDING_FORM_FIELDS)[number]

export const CLUB_PROFILE_FORM_FIELDS = [
  'description',
  'contactEmail',
  'contactPhone',
  'charterUrl',
  'channels',
  'operatingScope',
] as const
export type ClubProfileFormField = (typeof CLUB_PROFILE_FORM_FIELDS)[number]

/** Các ô nhập của form thành lập và form hồ sơ CLB cố định nào là bắt buộc (true) hay tuỳ chọn. */
export interface FormRequirements {
  clubFounding: Record<FoundingFormField, boolean>
  clubProfile: Record<ClubProfileFormField, boolean>
}

export const DEFAULT_FORM_REQUIREMENTS: FormRequirements = {
  clubFounding: {
    summary: true,
    objectives: true,
    proposal: true,
    logo: true,
    fanpageUrl: false,
    contactEmail: false,
  },
  clubProfile: {
    description: false,
    contactEmail: false,
    contactPhone: false,
    charterUrl: false,
    channels: false,
    operatingScope: false,
  },
}

export interface PolicySettings {
  minFoundingMembers: number
  formRequirements: FormRequirements
  reportDeadlines: ReportDeadline[]
  conflictThresholdMinutes: number
  feedbackWindowHours: number
  feedbackMinRespondents: number
  allowOverbooking: boolean
  enforceOverdueReportBlock: boolean
  academicCalendar: AcademicSemester[]
  schoolRefundAccount?: SchoolRefundAccount
}

export interface PolicyVersion extends PolicySettings {
  id: string
  effectiveFrom: string
  createdAt: string
  createdBy: string
}

export interface PolicyList {
  current: PolicyVersion | null
  versions: PolicyVersion[]
}

export interface CreatePolicyInput extends PolicySettings {
  effectiveFrom?: string
  reason?: string
}

export type PolicyImpactReason =
  | 'EVENT_OUTSIDE_ACADEMIC_CALENDAR'
  | 'BOOKING_OUTSIDE_ACADEMIC_CALENDAR'
  | 'DISSOLUTION_SEMESTER_REMOVED'
  | 'APPROVED_OVERBOOKING_DISALLOWED'

export interface PolicyDecisionImpact {
  entityType: 'Event' | 'PropertyBooking' | 'Club'
  entityId: string
  reasons: PolicyImpactReason[]
}

export class PolicyConflictError extends ApiError {
  constructor(
    message: string,
    readonly affectedRecords: PolicyDecisionImpact[],
  ) {
    super(message, 409)
    this.name = 'PolicyConflictError'
  }
}

// GET /admin/policies: các chính sách và phiên bản
export async function fetchPolicies(signal: AbortSignal): Promise<PolicyList> {
  return apiRequest<PolicyList>('/api/v1/admin/policies', { signal })
}

// POST /admin/policies: tạo phiên bản chính sách mới
export async function createPolicy(
  input: CreatePolicyInput,
  csrfToken: string,
): Promise<PolicyVersion> {
  return apiRequest<PolicyVersion>('/api/v1/admin/policies', {
    method: 'POST',
    csrfToken,
    body: input,
    toError: toPolicyError,
  })
}

// A 409 that lists affected records becomes PolicyConflictError; other failures stay ApiError
function toPolicyError(failure: ApiFailure): Error {
  const affected = (failure.details as { affectedRecords?: PolicyDecisionImpact[] } | undefined)
    ?.affectedRecords
  if (failure.status === 409 && Array.isArray(affected)) {
    const message = typeof failure.body?.message === 'string' ? failure.body.message : undefined
    return new PolicyConflictError(message ?? 'Policy conflicts with existing decisions', affected)
  }
  return new ApiError(failure.message, failure.status)
}
