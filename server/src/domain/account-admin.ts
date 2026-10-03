import type { AuthUser } from "./auth.js";

export const SYSTEM_ROLE_CODES = ["ICPDP_OFFICER", "ICPDP_HEAD", "ATTENDANCE_UNLOCK"] as const;
export type SystemRoleCode = (typeof SYSTEM_ROLE_CODES)[number];

export interface AdminUserPage {
  items: Array<{ user: AuthUser; systemRoles: string[] }>;
  total: number;
}

export interface AccountAdminRepository {
  listUsers(search: string, limit: number): Promise<AdminUserPage>;
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
    now: Date;
  }): Promise<void>;
}
