import { DomainError } from "../domain/errors.js";
import type { AuthRepository } from "../domain/auth.js";
import {
  CLUB_PROFILE_FORM_FIELDS, FOUNDING_FORM_FIELDS,
  type AcademicSemester, type ClubProfileFormField, type FormRequirements, type FoundingRequirements,
  type PolicyManagementRepository, type PolicyRepository, type PolicySettings, type PolicyVersion,
  type ReportDeadline,
} from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function invalid(field: string): never {
  throw new DomainError(`invalid policy ${field}`, "validation", { field });
}

function requiredFlags<K extends string>(value: unknown, keys: readonly K[]): Record<K, boolean> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("formRequirements");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== keys.length ||
    keys.some((key) => typeof record[key] !== "boolean")) invalid("formRequirements");
  return Object.fromEntries(keys.map((key) => [key, record[key]])) as Record<K, boolean>;
}

function normalizeFormRequirements(value: FormRequirements): FormRequirements {
  if (!value || typeof value !== "object") invalid("formRequirements");
  return {
    clubFounding: requiredFlags(value.clubFounding, FOUNDING_FORM_FIELDS),
    clubProfile: requiredFlags(value.clubProfile, CLUB_PROFILE_FORM_FIELDS),
  };
}

function normalizeDeadlines(values: readonly ReportDeadline[]): ReportDeadline[] {
  if (!Array.isArray(values) || values.length === 0) invalid("reportDeadlines");
  const names = new Set<string>();
  return values.map((value) => {
    if (!value || typeof value.reportType !== "string") invalid("reportDeadlines");
    const reportType = value.reportType.trim();
    if (!reportType || names.has(reportType.toLowerCase())) invalid("reportDeadlines");
    names.add(reportType.toLowerCase());
    const fields = [value.dueDaysAfterPeriodEnd, value.remindBeforeDays,
      value.overdueAfterDays, value.escalateAfterDays];
    if (fields.some((number) => !Number.isInteger(number) || number < 0) ||
      value.escalateAfterDays <= value.overdueAfterDays) invalid("reportDeadlines");
    return { ...value, reportType };
  });
}

function normalizeCalendar(values: readonly AcademicSemester[]): AcademicSemester[] {
  if (!Array.isArray(values) || values.length === 0) invalid("academicCalendar");
  const names = new Set<string>();
  const semesters = values.map((value) => {
    if (!value || typeof value.code !== "string") invalid("academicCalendar");
    const code = value.code.trim();
    if (!code || names.has(code.toLowerCase()) || !(value.startAt instanceof Date) ||
      !(value.endAt instanceof Date) || Number.isNaN(value.startAt.getTime()) ||
      Number.isNaN(value.endAt.getTime()) || value.startAt >= value.endAt) invalid("academicCalendar");
    names.add(code.toLowerCase());
    return { ...value, code };
  }).sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
  for (let index = 1; index < semesters.length; index += 1) {
    if (semesters[index - 1]!.endAt > semesters[index]!.startAt) invalid("academicCalendar");
  }
  return semesters;
}

export function normalizePolicySettings(input: PolicySettings): PolicySettings {
  if (!Number.isInteger(input.minFoundingMembers) || input.minFoundingMembers < 1) {
    invalid("minFoundingMembers");
  }
  if (!Number.isInteger(input.conflictThresholdMinutes) || input.conflictThresholdMinutes < 0) {
    invalid("conflictThresholdMinutes");
  }
  if (!Number.isInteger(input.feedbackWindowHours) || input.feedbackWindowHours < 1) {
    invalid("feedbackWindowHours");
  }
  if (!Number.isInteger(input.feedbackMinRespondents) || input.feedbackMinRespondents < 2) {
    invalid("feedbackMinRespondents");
  }
  if (typeof input.allowOverbooking !== "boolean" ||
    typeof input.enforceOverdueReportBlock !== "boolean") invalid("switches");
  return {
    ...input, formRequirements: normalizeFormRequirements(input.formRequirements),
    reportDeadlines: normalizeDeadlines(input.reportDeadlines),
    academicCalendar: normalizeCalendar(input.academicCalendar),
  };
}

async function requirePolicyOfficer(
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null,
): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  const roles = await auth.systemRoleCodes(actor.id);
  if (!roles.includes("ICPDP_OFFICER")) {
    throw new DomainError("policy administration denied", "forbidden");
  }
  return actor.id;
}

export async function resolvePolicyAt(repo: PolicyRepository, at: Date): Promise<PolicyVersion> {
  if (Number.isNaN(at.getTime())) throw new DomainError("invalid policy date", "validation");
  const policy = await repo.findEffective(at);
  if (!policy) throw new DomainError("policy is not configured for this date", "unavailable");
  return policy;
}

export async function foundingRequirementsAt(
  repo: PolicyRepository, at: Date,
): Promise<FoundingRequirements> {
  const policy = await resolvePolicyAt(repo, at);
  if (!Number.isInteger(policy.minFoundingMembers) || policy.minFoundingMembers < 1) {
    throw new DomainError("founding policy is invalid", "unavailable");
  }
  return {
    policyVersionId: policy.id,
    minFoundingMembers: policy.minFoundingMembers,
    required: policy.formRequirements.clubFounding,
  };
}

export async function clubProfileRequirementsAt(
  repo: PolicyRepository, at: Date,
): Promise<Readonly<Record<ClubProfileFormField, boolean>>> {
  return (await resolvePolicyAt(repo, at)).formRequirements.clubProfile;
}

export async function listPolicyVersions(
  repo: PolicyManagementRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  now: Date,
): Promise<{ current: PolicyVersion | null; versions: PolicyVersion[] }> {
  await requirePolicyOfficer(auth, actor);
  const [current, versions] = await Promise.all([repo.findEffective(now), repo.listRecent(20)]);
  return { current, versions };
}

export async function createPolicyVersion(
  repo: PolicyManagementRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
  settings: PolicySettings,
  requestedEffectiveFrom: Date | undefined,
  reason: string | undefined,
  now: Date,
): Promise<PolicyVersion> {
  const actorId = await requirePolicyOfficer(auth, actor);
  const normalized = normalizePolicySettings(settings);
  if (requestedEffectiveFrom &&
    (Number.isNaN(requestedEffectiveFrom.getTime()) || requestedEffectiveFrom <= now)) {
    invalid("effectiveFrom");
  }
  if (reason !== undefined && (typeof reason !== "string" || reason.trim().length > 1000)) {
    invalid("reason");
  }
  const effectiveFrom = requestedEffectiveFrom ?? now;
  const impacts = await repo.findDecisionImpacts(normalized, effectiveFrom);
  if (impacts.length > 0) {
    throw new DomainError("policy would invalidate existing decisions", "conflict", {
      affectedRecords: impacts,
    });
  }
  return repo.append({ settings: normalized, effectiveFrom,
    createdBy: actorId, createdAt: now, reason: reason?.trim() || undefined });
}
