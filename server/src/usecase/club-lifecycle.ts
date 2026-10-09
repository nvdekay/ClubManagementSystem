import type { AuthRepository } from "../domain/auth.js";
import {
  nextSemester, validateLifecycleReason, type ClubLifecycleRepository,
} from "../domain/club-lifecycle.js";
import { DomainError } from "../domain/errors.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

async function officer(auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  if (!(await auth.systemRoleCodes(actor.id)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actor.id;
}

async function club(repo: ClubLifecycleRepository, clubId: string, now: Date) {
  if (!objectId.test(clubId)) throw new DomainError("invalid club id", "validation");
  const found = await repo.detail(clubId, now);
  if (!found) throw new DomainError("club not found", "not_found");
  return found;
}

async function semesterAfter(policy: PolicyRepository, now: Date) {
  return nextSemester((await policy.findEffective(now))?.academicCalendar ?? [], now);
}

export async function listClubLifecycles(repo: ClubLifecycleRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, now: Date) {
  await officer(auth, actor);
  const clubs = await repo.list();
  return { clubs, expiringSuspensions: clubs.filter((item) => item.state === "Suspended"
    && item.suspension?.until && item.suspension.until.getTime() - now.getTime() <= 7 * 24 * 60 * 60 * 1000) };
}

export async function getClubLifecycle(repo: ClubLifecycleRepository, policy: PolicyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, clubId: string, now: Date) {
  await officer(auth, actor);
  const [detail, semester] = await Promise.all([club(repo, clubId, now), semesterAfter(policy, now)]);
  return { club: detail, nextSemester: semester };
}

export async function suspendClub(repo: ClubLifecycleRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, clubId: string,
  input: { reason: string; until?: Date }, now: Date) {
  const actorId = await officer(auth, actor);
  const reason = validateLifecycleReason(input.reason);
  if (input.until && (Number.isNaN(input.until.getTime()) || input.until <= now)) {
    throw new DomainError("the suspension must end in the future", "validation", { field: "until" });
  }
  const current = await club(repo, clubId, now);
  if (current.state !== "Active") throw new DomainError("only an active club can be suspended", "conflict");
  return repo.suspend(current.id, { reason, until: input.until ?? null }, actorId, now);
}

export async function reactivateClub(repo: ClubLifecycleRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, clubId: string,
  input: { reason: string }, now: Date) {
  const actorId = await officer(auth, actor);
  const reason = validateLifecycleReason(input.reason);
  const current = await club(repo, clubId, now);
  if (current.state !== "Suspended") throw new DomainError("only a suspended club can be reactivated", "conflict");
  await repo.reactivate(current.id, reason, actorId, now);
  return { reactivated: true as const };
}

/** FR-06: dissolution takes effect from the next semester; nothing changes state today. */
export async function dissolveClub(repo: ClubLifecycleRepository, policy: PolicyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, clubId: string,
  input: { reason: string }, now: Date) {
  const actorId = await officer(auth, actor);
  const reason = validateLifecycleReason(input.reason);
  const current = await club(repo, clubId, now);
  if (!["Active", "Suspended"].includes(current.state) || current.dissolution) {
    throw new DomainError("this club cannot be scheduled for dissolution", "conflict");
  }
  const semester = await semesterAfter(policy, now);
  if (!semester) {
    throw new DomainError("the academic calendar has no next semester", "validation", { field: "semester" });
  }
  const result = await repo.decideDissolution(current.id, { decidedAt: now, decidedBy: actorId, reason,
    effectiveSemester: semester.code, effectiveFrom: semester.startAt, effectiveTo: semester.endAt }, now);
  return { ...result, effectiveSemester: semester.code };
}

/**
 * The lifecycle job (FR-09/10, timed suspensions): reminders, automatic reactivation and dissolution
 * steps. Every step is idempotent, so running it again — or after downtime — is safe.
 */
export async function runClubLifecycleJob(repo: ClubLifecycleRepository, now: Date) {
  const officers = await repo.officerIds();
  const reminders = await repo.suspensionsDueForReminder(now);
  for (const item of reminders) await repo.markReminded(item.id, officers, now);
  const expired = await repo.expiredSuspensions(now);
  for (const item of expired) {
    await repo.reactivate(item.id, "Hết thời hạn tạm ngừng", null, now);
  }
  const dissolving = await repo.startDissolving(now);
  const dissolved = await repo.completeDissolutions(now);
  return { reminded: reminders.length, reactivated: expired.length, dissolving: dissolving.length,
    dissolved: dissolved.length };
}
