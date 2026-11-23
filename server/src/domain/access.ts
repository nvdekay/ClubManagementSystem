import { DomainError } from "./errors.js";

/**
 * The fixed club permission catalogue (SRS §2.3). Access on the club side comes from two fixed roles
 * only (BR47, BR54, BR55): a Club Leader — the confirmed Chủ nhiệm or Phó chủ nhiệm of the current
 * term — holds every code; every Active member holds the two default codes. Other titles in the
 * club structure are for display and never grant a permission. There is no per-club role editing.
 */
export const CLUB_PERMISSIONS = [
  "club.profile.manage",
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

/** Held by every Active member of the club (BR54). */
export const DEFAULT_MEMBER_PERMISSIONS: readonly ClubPermission[] = ["club.attendance.manage", "club.room.view"];

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
}

/** A confirmed holder of this seat is a Club Leader (BR47). */
export function isClubLeaderSeat(position: Pick<ClubPositionAccess, "isLeaderRole" | "isBoardSeat" | "code">): boolean {
  return position.isLeaderRole
    || (position.isBoardSeat === true && VICE_LEADER_SEAT_CODES.includes(position.code ?? ""));
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

/** BR47: holds a confirmed Chủ nhiệm or Phó chủ nhiệm seat, in effect inside the current Active term. */
export function isClubLeader(snapshot: ClubAccessSnapshot, now: Date): boolean {
  const membership = activeMembershipOf(snapshot);
  if (!membership) return false;
  const terms = new Set(snapshot.terms.filter((term) =>
    term.clubId === snapshot.clubId && term.state === "Active" && term.startAt <= now && now < term.endAt,
  ).map((term) => term.id));
  const seats = new Set(snapshot.positions.filter((position) =>
    position.clubId === snapshot.clubId && position.isActive && isClubLeaderSeat(position),
  ).map((position) => position.id));
  return snapshot.assignments.some((assignment) => assignment.clubId === snapshot.clubId
    && assignment.membershipId === membership.id && terms.has(assignment.termId) && seats.has(assignment.positionId)
    && Boolean(assignment.confirmedBy) && assignment.effectiveFrom <= now
    && (!assignment.effectiveTo || assignment.effectiveTo > now));
}

/** BR47 / BR54: Club Leader → every code; Active member → the two defaults; nothing else grants access. */
export function resolveClubPermissions(snapshot: ClubAccessSnapshot, now: Date): ClubPermission[] {
  if (isClubLeader(snapshot, now)) return [...CLUB_PERMISSIONS];
  const permissions = new Set<ClubPermission>(activeMembershipOf(snapshot) ? DEFAULT_MEMBER_PERMISSIONS : []);
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
