export interface AuthSession {
  id: string;
  userId: string;
  tokenHash: string;
  csrfHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface SessionRepository {
  create(session: Omit<AuthSession, "id" | "revokedAt">): Promise<void>;
  findActive(tokenHash: string, now: Date): Promise<AuthSession | null>;
  revoke(tokenHash: string, now: Date): Promise<void>;
  revokeUser(userId: string, now: Date): Promise<void>;
}

export interface SessionService {
  issue(userId: string, now: Date): Promise<{ cookieValue: string; csrfToken: string; expiresAt: Date }>;
  resolve(cookieValue: string | undefined, now: Date): Promise<{ session: AuthSession; csrfToken: string } | null>;
  revoke(cookieValue: string | undefined, now: Date): Promise<void>;
  revokeUser(userId: string, now: Date): Promise<void>;
}
