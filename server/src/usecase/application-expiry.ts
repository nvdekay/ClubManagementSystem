import type { ApplicationExpiryRepository } from "../domain/application-expiry.js";
export async function expireClubApplications(repo: ApplicationExpiryRepository, now: Date): Promise<number> { return repo.expire(now); }
