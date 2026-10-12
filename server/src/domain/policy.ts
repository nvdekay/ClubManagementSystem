export interface ReportDeadline {
  reportType: string;
  dueDaysAfterPeriodEnd: number;
  remindBeforeDays: number;
  overdueAfterDays: number;
  escalateAfterDays: number;
}

export interface AcademicSemester {
  code: string;
  startAt: Date;
  endAt: Date;
}

export const FOUNDING_FORM_FIELDS = [
  "summary", "objectives", "proposal", "logo", "fanpageUrl", "contactEmail",
] as const;
export type FoundingFormField = (typeof FOUNDING_FORM_FIELDS)[number];

export const CLUB_PROFILE_FORM_FIELDS = [
  "description", "contactEmail", "contactPhone", "charterUrl", "channels", "operatingScope",
] as const;
export type ClubProfileFormField = (typeof CLUB_PROFILE_FORM_FIELDS)[number];

/** Which inputs of the fixed, system-owned forms ICPDP marks as required, per business flow. */
export interface FormRequirements {
  clubFounding: Readonly<Record<FoundingFormField, boolean>>;
  clubProfile: Readonly<Record<ClubProfileFormField, boolean>>;
}

export const DEFAULT_FORM_REQUIREMENTS: FormRequirements = {
  clubFounding: { summary: true, objectives: true, proposal: true, logo: true,
    fanpageUrl: false, contactEmail: false },
  clubProfile: { description: false, contactEmail: false, contactPhone: false,
    charterUrl: false, channels: false, operatingScope: false },
};

export interface PolicySettings {
  minFoundingMembers: number;
  formRequirements: FormRequirements;
  reportDeadlines: readonly ReportDeadline[];
  conflictThresholdMinutes: number;
  feedbackWindowHours: number;
  feedbackMinRespondents: number;
  allowOverbooking: boolean;
  enforceOverdueReportBlock: boolean;
  academicCalendar: readonly AcademicSemester[];
}

export interface PolicyVersion extends PolicySettings {
  id: string;
  effectiveFrom: Date;
  createdBy: string;
  createdAt: Date;
}

export type PolicyImpactReason =
  | "EVENT_OUTSIDE_ACADEMIC_CALENDAR"
  | "BOOKING_OUTSIDE_ACADEMIC_CALENDAR"
  | "DISSOLUTION_SEMESTER_REMOVED"
  | "APPROVED_OVERBOOKING_DISALLOWED";

export interface PolicyDecisionImpact {
  entityType: "Event" | "PropertyBooking" | "Club";
  entityId: string;
  reasons: PolicyImpactReason[];
}

export interface PolicyRepository {
  findEffective(at: Date): Promise<PolicyVersion | null>;
}

export interface PolicyManagementRepository extends PolicyRepository {
  listRecent(limit: number): Promise<PolicyVersion[]>;
  findDecisionImpacts(
    settings: PolicySettings, effectiveFrom: Date,
  ): Promise<PolicyDecisionImpact[]>;
  append(input: {
    settings: PolicySettings;
    effectiveFrom: Date;
    createdBy: string;
    createdAt: Date;
    reason?: string;
  }): Promise<PolicyVersion>;
}

export interface FoundingRequirements {
  policyVersionId: string;
  minFoundingMembers: number;
  required: Readonly<Record<FoundingFormField, boolean>>;
}
