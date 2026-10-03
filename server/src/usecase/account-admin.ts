import { z } from "zod";
import {
  SYSTEM_ROLE_CODES, type AccountAdminRepository, type AdminUserPage, type SystemRoleCode,
} from "../domain/account-admin.js";
import { DomainError } from "../domain/errors.js";
import type { SessionService } from "../domain/session.js";
import type { AccessActor } from "./access.js";

const objectId = z.string().regex(/^[0-9a-f]{24}$/i);
const reasonSchema = z.string().trim().min(1).max(1000);
const searchSchema = z.string().trim().max(100);

async function requireAdmin(repo: AccountAdminRepository, actor: AccessActor | null): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!objectId.safeParse(actor.id).success) throw new DomainError("invalid actor", "validation");
  const roles = await repo.systemRoles(actor.id);
  if (!roles.includes("ICPDP_OFFICER") && !roles.includes("ICPDP_HEAD")) {
    throw new DomainError("account administration denied", "forbidden");
  }
  return actor.id;
}

function parseTarget(targetId: string): string {
  const parsed = objectId.safeParse(targetId);
  if (!parsed.success) throw new DomainError("invalid target user", "validation");
  return parsed.data;
}

function parseRole(roleCode: string): SystemRoleCode {
  if (!SYSTEM_ROLE_CODES.some((code) => code === roleCode)) {
    throw new DomainError("only system roles can be managed here", "validation");
  }
  return roleCode as SystemRoleCode;
}

export async function searchAdminUsers(
  repo: AccountAdminRepository, actor: AccessActor | null, rawSearch: unknown,
): Promise<AdminUserPage> {
  await requireAdmin(repo, actor);
  const parsed = searchSchema.safeParse(rawSearch ?? "");
  if (!parsed.success) throw new DomainError("invalid search", "validation");
  return repo.listUsers(parsed.data, 50);
}

export async function changeSystemRole(
  repo: AccountAdminRepository,
  sessions: SessionService,
  actor: AccessActor | null,
  targetId: string,
  roleCode: string,
  action: "grant" | "revoke",
  rawReason: unknown,
  now: Date,
): Promise<void> {
  const actorId = await requireAdmin(repo, actor);
  const target = parseTarget(targetId);
  const role = parseRole(roleCode);
  const reason = action === "revoke" ? reasonSchema.safeParse(rawReason) : null;
  if (reason && !reason.success) throw new DomainError("reason is required", "validation");
  if (!await repo.findUser(target)) throw new DomainError("user not found", "not_found");
  if (action === "revoke" && target === actorId &&
    (role === "ICPDP_OFFICER" || role === "ICPDP_HEAD")) {
    const roles = await repo.systemRoles(actorId);
    const remaining = roles.filter((code) => code !== role);
    if (!remaining.includes("ICPDP_OFFICER") && !remaining.includes("ICPDP_HEAD")) {
      throw new DomainError("cannot revoke your last admin role", "forbidden");
    }
  }
  await repo.applyRoleChange({
    actorId, targetId: target, roleCode: role, action,
    reason: reason?.success ? reason.data : undefined, now,
  });
  await sessions.revokeUser(target, now);
}

export async function setAccountLock(
  repo: AccountAdminRepository,
  sessions: SessionService,
  actor: AccessActor | null,
  targetId: string,
  locked: boolean,
  rawReason: unknown,
  now: Date,
): Promise<void> {
  const actorId = await requireAdmin(repo, actor);
  const target = parseTarget(targetId);
  const reason = reasonSchema.safeParse(rawReason);
  if (!reason.success) throw new DomainError("reason is required", "validation");
  if (!await repo.findUser(target)) throw new DomainError("user not found", "not_found");
  if (locked && target === actorId) throw new DomainError("cannot lock your own account", "forbidden");
  await repo.setLock({ actorId, targetId: target, locked, reason: reason.data, now });
  await sessions.revokeUser(target, now);
}
