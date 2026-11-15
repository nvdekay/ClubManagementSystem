import { DomainError } from "./errors.js";

/**
 * Danh mục permission cố định của CLB (SRS §2.3). Quyền truy cập phía CLB đến từ hai vai trò cố định
 * duy nhất (BR47, BR54, BR55): Club Leader — Chủ nhiệm hoặc Phó chủ nhiệm đã được xác nhận của nhiệm kỳ hiện tại
 * — giữ mọi mã; mọi thành viên Active giữ hai mã mặc định. Các chức danh khác trong
 * cơ cấu CLB chỉ để hiển thị và không bao giờ cấp permission. Không có chỉnh sửa vai trò theo từng CLB.
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

/** Mọi thành viên Active của CLB đều có (BR54). */
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
  /** Ghế ban chủ nhiệm mà người giữ được ICPDP xác nhận (UC08/UC11/UC13). */
  isBoardSeat?: boolean;
}

// Kiểm tra ghế chức vụ có phải ghế Club Leader hay không
/** Người đã được xác nhận giữ ghế này là Club Leader (BR47). */
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

// Lấy membership `Active` của người dùng trong đúng CLB đang xét, nếu có
function activeMembershipOf(snapshot: ClubAccessSnapshot): ClubMembershipAccess | null {
  return snapshot.membership?.state === "Active" && snapshot.membership.clubId === snapshot.clubId
    ? snapshot.membership : null;
}

// Kiểm tra người dùng đang là Club Leader của CLB tại thời điểm hiện tại
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

// Tính danh sách permission của người dùng trong CLB theo vai trò và trạng thái membership
/** BR47 / BR54: Club Leader → mọi mã; thành viên Active → hai mã mặc định; không có gì khác cấp quyền truy cập. */
export function resolveClubPermissions(snapshot: ClubAccessSnapshot, now: Date): ClubPermission[] {
  if (isClubLeader(snapshot, now)) return [...CLUB_PERMISSIONS];
  const permissions = new Set<ClubPermission>(activeMembershipOf(snapshot) ? DEFAULT_MEMBER_PERMISSIONS : []);
  if (snapshot.clubState === "Pending Setup" && snapshot.isApprovedFounder) {
    permissions.add("club.profile.manage");
    permissions.add("club.board.nominate");
  }
  return CLUB_PERMISSIONS.filter((permission) => permissions.has(permission));
}

// Ném lỗi forbidden nếu người dùng thiếu permission yêu cầu trong CLB
export function requireClubPermission(
  snapshot: ClubAccessSnapshot,
  permission: ClubPermission,
  now: Date,
): void {
  if (!resolveClubPermissions(snapshot, now).includes(permission)) {
    throw new DomainError("club access denied", "forbidden", { requiredPermission: permission });
  }
}

// Mục chính sách cho phép mọi email Google đã xác thực, bất kể tên miền.
export const ANY_EMAIL_DOMAIN = "*";

// Chuẩn hoá email Google và chỉ chấp nhận email đã xác minh thuộc domain được phép
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
