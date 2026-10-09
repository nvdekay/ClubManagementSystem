export interface ReportDeadline {
  reportType: string;
  dueDaysAfterPeriodEnd: number;
  remindBeforeDays: number;
  overdueAfterDays: number;
  escalateAfterDays: number;
}

export interface AcademicSemester {
  code: string;
  startAt: string;
  endAt: string;
}

export const FOUNDING_FORM_FIELDS = [
  "summary", "objectives", "proposal", "logo", "fanpageUrl", "contactEmail",
] as const;
export type FoundingFormField = (typeof FOUNDING_FORM_FIELDS)[number];

export const CLUB_PROFILE_FORM_FIELDS = [
  "description", "contactEmail", "contactPhone", "charterUrl", "channels", "operatingScope",
] as const;
export type ClubProfileFormField = (typeof CLUB_PROFILE_FORM_FIELDS)[number];

/** Which inputs of the fixed founding and club-profile forms are required (true) or optional. */
export interface FormRequirements {
  clubFounding: Record<FoundingFormField, boolean>;
  clubProfile: Record<ClubProfileFormField, boolean>;
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
  reportDeadlines: ReportDeadline[];
  conflictThresholdMinutes: number;
  feedbackWindowHours: number;
  feedbackMinRespondents: number;
  allowOverbooking: boolean;
  enforceOverdueReportBlock: boolean;
  academicCalendar: AcademicSemester[];
}

export interface PolicyVersion extends PolicySettings {
  id: string;
  effectiveFrom: string;
  createdAt: string;
  createdBy: string;
}

export interface PolicyList {
  current: PolicyVersion | null;
  versions: PolicyVersion[];
}

export interface CreatePolicyInput extends PolicySettings {
  effectiveFrom?: string;
  reason?: string;
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

export class PolicyConflictError extends Error {
  constructor(message: string, readonly affectedRecords: PolicyDecisionImpact[]) {
    super(message);
    this.name = "PolicyConflictError";
  }
}

export async function fetchPolicies(signal: AbortSignal): Promise<PolicyList> {
  const response = await fetch("/api/v1/admin/policies", { signal, credentials: "same-origin" });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: PolicyList } = await response.json();
  return body.data;
}

export async function createPolicy(input: CreatePolicyInput, csrfToken: string): Promise<PolicyVersion> {
  const response = await fetch("/api/v1/admin/policies", {
    method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      details?: { affectedRecords?: PolicyDecisionImpact[] };
    } | null;
    if (response.status === 409 && Array.isArray(body?.details?.affectedRecords)) {
      throw new PolicyConflictError(
        body.message ?? "Policy conflicts with existing decisions",
        body.details.affectedRecords,
      );
    }
    throw new Error(body?.message ?? `HTTP ${response.status}`);
  }
  const body: { data: PolicyVersion } = await response.json();
  return body.data;
}
