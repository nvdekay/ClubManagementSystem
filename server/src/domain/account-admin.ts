import type { AuthUser } from "./auth.js";

/** ICPDP_HEAD (D1) is the second approval level of UC05; it is held only together with ICPDP_OFFICER. */
export const SYSTEM_ROLE_CODES = ["ICPDP_OFFICER", "ICPDP_HEAD", "ATTENDANCE_UNLOCK"] as const;
export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

/** UC03 step 2: a club the user belongs to, with the board seats they hold there. */
export interface AdminUserClub {
  clubId: string;
  clubName: string;
  membershipState: string;
  positions: string[];
}

/** UC03 A1: the UC40 case an emergency lock was recorded under. */
export interface AdminLockCase {
  violationId: string;
  title: string;
  clubName: string;
}

export interface AdminUserPage {
  items: Array<{ user: AuthUser; systemRoles: string[]; clubs: AdminUserClub[]; lockCase?: AdminLockCase }>;
  total: number;
  page: number;
  pageSize: number;
}

export interface AccountAdminRepository {
  /** One page of users matching the search, sorted by email; `page` starts at 1. */
  listUsers(search: string, page: number, pageSize: number): Promise<AdminUserPage>;
  findUser(userId: string): Promise<AuthUser | null>;
  systemRoles(userId: string): Promise<string[]>;
  applyRoleChange(input: {
    actorId: string;
    targetId: string;
    roleCode: SystemRoleCode;
    action: "grant" | "revoke";
    reason?: string;
    now: Date;
  }): Promise<void>;
  setLock(input: {
    actorId: string;
    targetId: string;
    locked: boolean;
    reason: string;
    /** UC03 A1: an open UC40 case that requires the lock; lock and case are linked both ways. */
    violationId?: string;
    now: Date;
  }): Promise<void>;
}
