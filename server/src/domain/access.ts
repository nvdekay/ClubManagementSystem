import { DomainError } from "./errors.js";

export const GRANTABLE_CLUB_PERMISSIONS = [
  "club.profile.manage",
  "club.recruitment.manage",
  "club.application.review",
  "club.member.manage",
  "club.event.manage",
  "club.attendance.manage",
  "club.report.submit",
  "club.expense.record",
  "club.booking.manage",
  "club.feedback.view",
  "club.complaint.respond",
] as const;

export const LEADER_ONLY_CLUB_PERMISSIONS = [
  "club.role.manage",
  "club.board.nominate",
  "club.transition.plan",
  "club.suspension.request",
] as const;

export type ClubPermission =
  | (typeof GRANTABLE_CLUB_PERMISSIONS)[number]
  | (typeof LEADER_ONLY_CLUB_PERMISSIONS)[number];

export interface ClubMembershipAccess {
  id: string;
  clubId: string;
  state: string;
}

export interface ClubTermAccess {
  id: string;
  clubId: string;
  state: string;
  startAt: Date;
  endAt: Date;
}

export interface ClubPositionAccess {
  id: string;
  clubId: string;
  isActive: boolean;
  isLeaderRole: boolean;
  permissionCodes: readonly string[];
}

export interface ClubAssignmentAccess {
  clubId: string;
  termId: string;
  positionId: string;
  membershipId: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  confirmedBy?: string | null;
}

export interface ClubAccessSnapshot {
  clubId: string;
  clubName: string;
  clubState: string;
  membership: ClubMembershipAccess | null;
  terms: readonly ClubTermAccess[];
  positions: readonly ClubPositionAccess[];
  assignments: readonly ClubAssignmentAccess[];
  isApprovedFounder: boolean;
}

export interface ClubAccessRepository {
  findSnapshot(userId: string, clubId: string): Promise<ClubAccessSnapshot | null>;
}

const allClubPermissions: readonly ClubPermission[] = [
  ...GRANTABLE_CLUB_PERMISSIONS,
  ...LEADER_ONLY_CLUB_PERMISSIONS,
];

export function resolveClubPermissions(snapshot: ClubAccessSnapshot, now: Date): ClubPermission[] {
  const permissions = new Set<ClubPermission>();
  const activeMembership = snapshot.membership?.state === "Active"
    && snapshot.membership.clubId === snapshot.clubId ? snapshot.membership : null;

  if (activeMembership) {
    const terms = new Map(snapshot.terms.filter((term) =>
      term.clubId === snapshot.clubId && term.state === "Active"
      && term.startAt <= now && now < term.endAt,
    ).map((term) => [term.id, term]));
    const positions = new Map(snapshot.positions.filter((position) =>
      position.clubId === snapshot.clubId && position.isActive,
    ).map((position) => [position.id, position]));

    for (const assignment of snapshot.assignments) {
      if (assignment.clubId !== snapshot.clubId
        || assignment.membershipId !== activeMembership.id
        || !terms.has(assignment.termId)
        || assignment.effectiveFrom > now
        || (assignment.effectiveTo && assignment.effectiveTo <= now)) continue;
      const position = positions.get(assignment.positionId);
      if (!position) continue;
      if (position.isLeaderRole) {
        if (assignment.confirmedBy) {
          for (const permission of allClubPermissions) permissions.add(permission);
        }
        continue;
      }
      for (const code of position.permissionCodes) {
        if (GRANTABLE_CLUB_PERMISSIONS.some((permission) => permission === code)) {
          permissions.add(code as ClubPermission);
        }
      }
    }
  }

  if (snapshot.clubState === "Pending Setup" && snapshot.isApprovedFounder) {
    permissions.add("club.profile.manage");
    permissions.add("club.board.nominate");
    permissions.add("club.role.manage");
  }
  return allClubPermissions.filter((permission) => permissions.has(permission));
}

export function requireClubPermission(
  snapshot: ClubAccessSnapshot,
  permission: ClubPermission,
  now: Date,
): void {
  if (!resolveClubPermissions(snapshot, now).includes(permission)) {
    throw new DomainError("club access denied", "forbidden");
  }
}

// Policy entry that admits any verified Google email, whatever its domain.
export const ANY_EMAIL_DOMAIN = "*";

export function normalizeAllowedGoogleEmail(
  email: string,
  verified: boolean,
  allowedDomains: readonly string[],
): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  const domain = normalized.slice(at + 1);
  if (!verified || at <= 0 || at !== normalized.indexOf("@") || !domain || !allowedDomains.some((allowed) => {
    const entry = allowed.trim().toLowerCase().replace(/^@/, "");
    return entry === ANY_EMAIL_DOMAIN || entry === domain;
  })) {
    throw new DomainError("Google account is not eligible", "forbidden");
  }
  return normalized;
}
