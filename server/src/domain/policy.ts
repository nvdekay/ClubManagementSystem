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

export interface PolicySettings {
  allowedEmailDomains: readonly string[];
  minFoundingMembers: number;
  mandatoryApplicationDocuments: readonly string[];
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
  mandatoryApplicationDocuments: readonly string[];
}
