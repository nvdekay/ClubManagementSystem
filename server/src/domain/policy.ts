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

export interface PolicyRepository {
  findEffective(at: Date): Promise<PolicyVersion | null>;
}

export interface PolicyManagementRepository extends PolicyRepository {
  listRecent(limit: number): Promise<PolicyVersion[]>;
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
