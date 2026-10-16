export interface ApplicationExpiryRepository { expire(now: Date): Promise<number> }
