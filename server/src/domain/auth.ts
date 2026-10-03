import type { GoogleIdentity } from "./google-identity.js";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  accountState: "Active" | "Locked";
  lockReason?: string;
}

export interface LoginAudit {
  action: "LOGIN_SUCCESS" | "LOGIN_DENIED_DOMAIN" | "LOGIN_DENIED_LOCKED" | "LOGIN_FAILED_GOOGLE";
  userId?: string;
  email?: string;
  reason?: string;
}

export interface AuthRepository {
  allowedDomains(now: Date): Promise<readonly string[]>;
  findOrCreateGoogleUser(identity: GoogleIdentity, email: string, now: Date): Promise<AuthUser>;
  findUserById(userId: string): Promise<AuthUser | null>;
  systemRoleCodes(userId: string): Promise<string[]>;
  clubIds(userId: string): Promise<string[]>;
  auditLogin(attempt: LoginAudit, now: Date): Promise<void>;
}
