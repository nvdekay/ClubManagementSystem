import type { ApplicationExpiryRepository } from '../domain/application-expiry.js'
// Cho hết hạn các đơn lập CLB quá thời hạn, trả số đơn đã hết hạn
export async function expireClubApplications(
  repo: ApplicationExpiryRepository,
  now: Date,
): Promise<number> {
  return repo.expire(now)
}
