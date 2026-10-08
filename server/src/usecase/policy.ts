import { ANY_EMAIL_DOMAIN } from "../domain/access.js";
import { DomainError } from "../domain/errors.js";
import type { AuthRepository } from "../domain/auth.js";
import type {
  AcademicSemester, FoundingRequirements, PolicyManagementRepository, PolicyRepository,
  PolicySettings, PolicyVersion, ReportDeadline,
} from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
const domainPattern = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

function invalid(field: string): never {
  throw new DomainError(`invalid policy ${field}`, "validation", { field });
}

function uniqueStrings(values: readonly string[], field: string, allowEmpty = false): string[] {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) invalid(field);
  const normalized = values.map((value) => typeof value === "string" ? value.trim() : "");
  if (normalized.some((value) => !value) ||
    new Set(normalized.map((value) => value.toLowerCase())).size !== normalized.length) invalid(field);
  return normalized;
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
  const domains = uniqueStrings(input.allowedEmailDomains, "allowedEmailDomains")
    .map((domain) => domain.toLowerCase());
  // "*" admits every domain, so it must stand alone rather than hide a narrower list.
  if (domains.includes(ANY_EMAIL_DOMAIN) ? domains.length > 1
    : domains.some((domain) => !domainPattern.test(domain))) invalid("allowedEmailDomains");
  const documents = uniqueStrings(input.mandatoryApplicationDocuments,
    "mandatoryApplicationDocuments", true);
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
    ...input, allowedEmailDomains: domains, mandatoryApplicationDocuments: documents,
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
  if (!Number.isInteger(policy.minFoundingMembers) || policy.minFoundingMembers < 1 ||
    !Array.isArray(policy.mandatoryApplicationDocuments) ||
    policy.mandatoryApplicationDocuments.some((name) => typeof name !== "string" || !name.trim())) {
    throw new DomainError("founding policy is invalid", "unavailable");
  }
  return {
    policyVersionId: policy.id,
    minFoundingMembers: policy.minFoundingMembers,
    mandatoryApplicationDocuments: policy.mandatoryApplicationDocuments,
  };
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
  return repo.append({ settings: normalized, effectiveFrom: requestedEffectiveFrom ?? now,
    createdBy: actorId, createdAt: now, reason: reason?.trim() || undefined });
}
