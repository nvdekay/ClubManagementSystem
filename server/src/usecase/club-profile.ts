import type { ClubAccessRepository } from "../domain/access.js";
import type {
  ClubDepartmentInput,
  ClubProfileInput,
  ClubProfileRepository,
} from "../domain/club-profile.js";
import { DomainError } from "../domain/errors.js";
import {
  CLUB_PROFILE_FORM_FIELDS, DEFAULT_FORM_REQUIREMENTS, type ClubProfileFormField, type PolicyRepository,
} from "../domain/policy.js";
import { assertClubAccess, type AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const defaultDepartments: readonly ClubDepartmentInput[] = [
  { name: "Ban Chủ nhiệm", description: "Điều phối và quản trị chung", sortOrder: 10 },
  { name: "Ban Chuyên môn", description: "Phụ trách hoạt động chuyên môn", sortOrder: 20 },
  { name: "Ban Truyền thông", description: "Phụ trách nội dung và truyền thông", sortOrder: 30 },
  { name: "Ban Sự kiện", description: "Phụ trách tổ chức hoạt động", sortOrder: 40 },
];

function id(value: string, label: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${label}`, "validation");
  return value;
}

function optional(value: string | undefined, max: number): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (normalized.length > max) throw new DomainError("club profile value is too long", "validation");
  return normalized;
}

function url(value: string | undefined): string | undefined {
  const normalized = optional(value, 2_000);
  if (!normalized) return undefined;
  try {
    const parsed = new URL(normalized);
    if (!new Set(["https:", "http:"]).has(parsed.protocol)) throw new Error();
    return parsed.toString();
  } catch {
    throw new DomainError("invalid club URL", "validation");
  }
}

function profileInput(input: ClubProfileInput): ClubProfileInput {
  const contactEmail = optional(input.contactEmail, 320)?.toLowerCase();
  if (contactEmail && !email.test(contactEmail)) {
    throw new DomainError("invalid club contact email", "validation");
  }
  if (input.channels.length > 20) throw new DomainError("too many club channels", "validation");
  const channels = input.channels.map((channel) => ({
    label: optional(channel.label, 100) ?? "",
    url: url(channel.url) ?? "",
  }));
  if (channels.some((channel) => !channel.label || !channel.url)) {
    throw new DomainError("club channel label and URL are required", "validation");
  }
  return {
    description: optional(input.description, 10_000), contactEmail,
    contactPhone: optional(input.contactPhone, 50), charterUrl: url(input.charterUrl),
    channels, operatingScope: optional(input.operatingScope, 2_000),
  };
}

/** Fields ICPDP marks as required for club profiles; defaults apply before any policy exists. */
async function profileRequirements(policy: PolicyRepository,
  now: Date): Promise<Readonly<Record<ClubProfileFormField, boolean>>> {
  return (await policy.findEffective(now))?.formRequirements.clubProfile
    ?? DEFAULT_FORM_REQUIREMENTS.clubProfile;
}

function assertRequiredProfileFields(input: ClubProfileInput,
  required: Readonly<Record<ClubProfileFormField, boolean>>): void {
  const missing = CLUB_PROFILE_FORM_FIELDS.filter((field) => required[field] &&
    (field === "channels" ? input.channels.length === 0 : !input[field]));
  if (missing.length) {
    throw new DomainError("required club profile fields are missing", "validation", { missing });
  }
}

function departmentInput(input: ClubDepartmentInput): ClubDepartmentInput {
  const name = input.name.trim();
  const description = optional(input.description, 2_000);
  if (!name || name.length > 120 || !Number.isInteger(input.sortOrder)
    || input.sortOrder < 0 || input.sortOrder > 10_000) {
    throw new DomainError("invalid club department", "validation");
  }
  return { name, description, sortOrder: input.sortOrder };
}

async function allowed(access: ClubAccessRepository, actor: AccessActor | null,
  clubId: string, now: Date) {
  const parsed = id(clubId, "club id");
  await assertClubAccess(access, actor, parsed, "club.profile.manage", now);
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  return { clubId: parsed, actorId: actor.id };
}

export async function getClubSettings(repo: ClubProfileRepository, access: ClubAccessRepository,
  policy: PolicyRepository, actor: AccessActor | null, clubId: string, now = new Date()) {
  await assertClubAccess(access, actor, id(clubId, "club id"), "club.role.manage", now);
  const ids = { clubId };
  const [profile, departments, requiredProfileFields] = await Promise.all([
    repo.findProfile(ids.clubId), repo.listDepartments(ids.clubId), profileRequirements(policy, now),
  ]);
  if (!profile) throw new DomainError("club not found", "not_found");
  return { profile, departments, requiredProfileFields };
}

export async function updateClubProfile(repo: ClubProfileRepository, access: ClubAccessRepository,
  policy: PolicyRepository, actor: AccessActor | null, clubId: string, input: ClubProfileInput,
  now: Date) {
  const ids = await allowed(access, actor, clubId, now);
  const normalized = profileInput(input);
  assertRequiredProfileFields(normalized, await profileRequirements(policy, now));
  return repo.updateProfile(ids.clubId, ids.actorId, normalized, now);
}

export async function applyClubDepartmentTemplate(repo: ClubProfileRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, now: Date) {
  const ids = await allowed(access, actor, clubId, now);
  return repo.applyDepartmentTemplate(ids.clubId, ids.actorId, defaultDepartments, now);
}

export async function createClubDepartment(repo: ClubProfileRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string,
  input: ClubDepartmentInput, now: Date) {
  const ids = await allowed(access, actor, clubId, now);
  return repo.createDepartment(ids.clubId, ids.actorId, departmentInput(input), now);
}

export async function updateClubDepartment(repo: ClubProfileRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, departmentId: string,
  input: ClubDepartmentInput, now: Date) {
  const ids = await allowed(access, actor, clubId, now);
  return repo.updateDepartment(ids.clubId, id(departmentId, "department id"), ids.actorId,
    departmentInput(input), now);
}

export async function deactivateClubDepartment(repo: ClubProfileRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, departmentId: string,
  now: Date) {
  const ids = await allowed(access, actor, clubId, now);
  return repo.deactivateDepartment(ids.clubId, id(departmentId, "department id"), ids.actorId, now);
}
