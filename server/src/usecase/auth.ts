import {
  normalizeAllowedGoogleEmail, resolveClubPermissions,
  type ClubAccessRepository, type ClubPermission,
} from "../domain/access.js";
import type { AuthRepository, AuthUser } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import type { GoogleIdentity } from "../domain/google-identity.js";
import type { SessionService } from "../domain/session.js";

export async function completeGoogleLogin(
  repo: AuthRepository,
  sessions: SessionService,
  identity: GoogleIdentity,
  now: Date,
): Promise<{ user: AuthUser; cookieValue: string; csrfToken: string; expiresAt: Date }> {
  const domains = await repo.allowedDomains(now);
  let email: string;
  try {
    email = normalizeAllowedGoogleEmail(identity.email, identity.emailVerified, domains);
  } catch (error) {
    await repo.auditLogin({
      action: "LOGIN_DENIED_DOMAIN", email: identity.email, reason: "unverified or disallowed domain",
    }, now);
    throw error;
  }

  const user = await repo.findOrCreateGoogleUser(identity, email, now);
  if (user.accountState === "Locked") {
    await repo.auditLogin({
      action: "LOGIN_DENIED_LOCKED", userId: user.id, reason: user.lockReason,
    }, now);
    throw new DomainError(user.lockReason || "account locked", "locked");
  }
  const session = await sessions.issue(user.id, now);
  await repo.auditLogin({ action: "LOGIN_SUCCESS", userId: user.id }, now);
  return { user, ...session };
}

export async function currentUser(
  repo: AuthRepository,
  accessRepo: ClubAccessRepository,
  sessions: SessionService,
  cookieValue: string | undefined,
  now: Date,
): Promise<{ user: AuthUser; csrfToken: string; systemRoles: string[]; workspaces: Array<{
  kind: "student" | "icpdp" | "club";
  clubId?: string;
  clubName?: string;
  role?: "leader" | "member" | "founder";
  permissions: ClubPermission[];
}> }> {
  const resolved = await sessions.resolve(cookieValue, now);
  if (!resolved) throw new DomainError("authentication required", "unauthorized");
  const user = await repo.findUserById(resolved.session.userId);
  if (!user) throw new DomainError("authentication required", "unauthorized");
  if (user.accountState === "Locked") {
    throw new DomainError(user.lockReason || "account locked", "locked");
  }
  const [systemRoles, clubIds] = await Promise.all([
    repo.systemRoleCodes(user.id), repo.clubIds(user.id),
  ]);
  const snapshots = await Promise.all(clubIds.map((clubId) => accessRepo.findSnapshot(user.id, clubId)));
  const workspaces: Array<{
    kind: "student" | "icpdp" | "club";
    clubId?: string;
    clubName?: string;
    role?: "leader" | "member" | "founder";
    permissions: ClubPermission[];
  }> = [{ kind: "student", permissions: [] }];
  if (systemRoles.includes("ICPDP_OFFICER")) {
    workspaces.push({ kind: "icpdp", permissions: [] });
  }
  for (const snapshot of snapshots) {
    if (!snapshot) continue;
    const isActiveMember = snapshot.membership?.state === "Active"
      && snapshot.membership.clubId === snapshot.clubId;
    const isPendingFounder = snapshot.clubState === "Pending Setup"
      && snapshot.isApprovedFounder;
    if (!isActiveMember && !isPendingFounder) continue;
    const permissions = resolveClubPermissions(snapshot, now);
    workspaces.push({
      kind: "club", clubId: snapshot.clubId, clubName: snapshot.clubName,
      role: isPendingFounder ? "founder"
        : permissions.includes("club.role.manage") ? "leader" : "member",
      permissions,
    });
  }
  return { user, csrfToken: resolved.csrfToken, systemRoles, workspaces };
}
