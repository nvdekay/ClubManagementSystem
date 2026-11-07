import { DomainError } from "./errors.js";

/**
 * The fixed club permission catalogue (BR55). A Club Leader holds every code. Every Active member
 * holds the two default codes without any role assignment (BR54). The four reserved codes belong
 * to the Club Leader only and can never be granted through a role.
 */
export const CLUB_PERMISSIONS = [
  "club.profile.manage",
  "club.role.manage",
  "club.recruitment.manage",
  "club.application.review",
  "club.member.manage",
  "club.event.manage",
  "club.attendance.manage",
  "club.report.submit",
  "club.expense.record",
  "club.booking.manage",
  "club.room.view",
  "club.feedback.view",
  "club.complaint.respond",
  "club.board.nominate",
  "club.transition.plan",
  "club.suspension.request",
] as const;

export type ClubPermission = (typeof CLUB_PERMISSIONS)[number];

/** Held by every Active member of the club, whatever roles they hold (BR54, BR47 c). */
export const DEFAULT_MEMBER_PERMISSIONS: readonly ClubPermission[] = ["club.attendance.manage", "club.room.view"];

/** Held only by the Club Leader; never stored on or granted through another role (BR55). */
export const LEADER_RESERVED_PERMISSIONS: readonly ClubPermission[] = [
  "club.role.manage", "club.board.nominate", "club.transition.plan", "club.suspension.request",
];

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

/** Role grantable through UC23: the catalogue minus the four leader-reserved codes. */
export const ROLE_GRANTABLE_PERMISSIONS: readonly ClubPermission[] = CLUB_PERMISSIONS
  .filter((code) => !LEADER_RESERVED_PERMISSIONS.includes(code));

/** Codes of the Phó chủ nhiệm seat: UC07/UC08 write VICE_LEADER, older data uses VICE. */
export const VICE_LEADER_SEAT_CODES: readonly string[] = ["VICE_LEADER", "VICE"];

export interface ClubPositionAccess {
  id: string;
  clubId: string;
  code?: string;
  isActive: boolean;
  /** The Chủ nhiệm seat. */
  isLeaderRole: boolean;
  /** Board seat whose holder ICPDP confirms (UC08/UC11/UC13). */
  isBoardSeat?: boolean;
  /** The default Members role: never held through an assignment, grants nothing itself. */
  isDefaultMemberRole?: boolean;
  permissionCodes?: readonly string[];
}

/** A confirmed holder of this seat is a Club Leader (BR47 a). */
export function isClubLeaderSeat(position: Pick<ClubPositionAccess, "isLeaderRole" | "isBoardSeat" | "code">): boolean {
  return position.isLeaderRole
    || (position.isBoardSeat === true && VICE_LEADER_SEAT_CODES.includes(position.code ?? ""));
}

/** Keeps only catalogued codes a role may carry (BR55): unknown and reserved codes are dropped. */
export function grantablePermissions(codes: readonly string[]): ClubPermission[] {
  return ROLE_GRANTABLE_PERMISSIONS.filter((code) => codes.includes(code));
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

function activeMembershipOf(snapshot: ClubAccessSnapshot): ClubMembershipAccess | null {
  return snapshot.membership?.state === "Active" && snapshot.membership.clubId === snapshot.clubId
    ? snapshot.membership : null;
}

/** Positions the caller holds right now: running assignment, current Active term, active position. */
function heldPositions(snapshot: ClubAccessSnapshot, now: Date): Array<{ position: ClubPositionAccess; confirmed: boolean }> {
  const membership = activeMembershipOf(snapshot);
  if (!membership) return [];
  const terms = new Set(snapshot.terms.filter((term) =>
    term.clubId === snapshot.clubId && term.state === "Active" && term.startAt <= now && now < term.endAt,
  ).map((term) => term.id));
  const positions = new Map(snapshot.positions.filter((position) =>
    position.clubId === snapshot.clubId && position.isActive && !position.isDefaultMemberRole,
  ).map((position) => [position.id, position]));
  return snapshot.assignments.flatMap((assignment) => {
    const position = positions.get(assignment.positionId);
    if (!position || assignment.clubId !== snapshot.clubId || assignment.membershipId !== membership.id
      || !terms.has(assignment.termId) || assignment.effectiveFrom > now
      || (assignment.effectiveTo && assignment.effectiveTo <= now)) return [];
    return [{ position, confirmed: Boolean(assignment.confirmedBy) }];
  });
}

/** BR47 a: holds a confirmed Chủ nhiệm or Phó chủ nhiệm seat in the current term. */
export function isClubLeader(snapshot: ClubAccessSnapshot, now: Date): boolean {
  return heldPositions(snapshot, now).some(({ position, confirmed }) => confirmed && isClubLeaderSeat(position));
}

/**
 * BR47: a Club Leader holds every code; a confirmed board seat or a UC23 role grants its own codes
 * (never a reserved one); every Active member holds the two defaults (BR54). Several roles add up.
 */
export function resolveClubPermissions(snapshot: ClubAccessSnapshot, now: Date): ClubPermission[] {
  const permissions = new Set<ClubPermission>();
  if (activeMembershipOf(snapshot)) {
    for (const permission of DEFAULT_MEMBER_PERMISSIONS) permissions.add(permission);
  }
  for (const { position, confirmed } of heldPositions(snapshot, now)) {
    if (isClubLeaderSeat(position)) {
      if (confirmed) for (const permission of CLUB_PERMISSIONS) permissions.add(permission);
      continue;
    }
    if (position.isBoardSeat && !confirmed) continue;
    for (const permission of grantablePermissions(position.permissionCodes ?? [])) permissions.add(permission);
  }
  if (snapshot.clubState === "Pending Setup" && snapshot.isApprovedFounder) {
    permissions.add("club.profile.manage");
    permissions.add("club.board.nominate");
  }
  return CLUB_PERMISSIONS.filter((permission) => permissions.has(permission));
}

export function requireClubPermission(
  snapshot: ClubAccessSnapshot,
  permission: ClubPermission,
  now: Date,
): void {
  if (!resolveClubPermissions(snapshot, now).includes(permission)) {
    throw new DomainError("club access denied", "forbidden", { requiredPermission: permission });
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
