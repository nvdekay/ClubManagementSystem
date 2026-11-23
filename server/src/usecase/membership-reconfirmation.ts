import { DomainError } from "../domain/errors.js";
import { RECONFIRMATION_DAYS, type MembershipReconfirmationRepository } from "../domain/membership-reconfirmation.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";
function active(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState !== "Active") throw new DomainError("account locked", "locked");
  if (!/^[0-9a-f]{24}$/i.test(actor.id)) throw new DomainError("invalid user id", "validation");
  return actor.id;
}
export async function myReconfirmations(repo: MembershipReconfirmationRepository, actor: AccessActor | null) { return repo.listMine(active(actor)); }
export async function confirmMembership(repo: MembershipReconfirmationRepository, actor: AccessActor | null, id: string, now: Date) {
  const userId = active(actor); if (!/^[0-9a-f]{24}$/i.test(id)) throw new DomainError("invalid request id", "validation");
  return repo.confirm(id, userId, now);
}
export async function runMembershipReconfirmation(repo: MembershipReconfirmationRepository, policy: PolicyRepository, now: Date) {
  const calendar = (await policy.findEffective(now))?.academicCalendar ?? [];
  const periods = calendar.filter((p) => p.startAt <= now && now < p.endAt);
  const result = { opened: 0, expired: 0, exempt: 0 };
  for (const period of periods) {
    const changes = await repo.run(period, new Date(period.startAt.getTime() + RECONFIRMATION_DAYS * 86400000), now);
    result.opened += changes.opened; result.expired += changes.expired; result.exempt += changes.exempt;
  }
  // A restart after the semester ended must still expire that semester's overdue requests.
  const overdue = await repo.expireOverdue(now);
  result.expired += overdue.expired; result.exempt += overdue.exempt;
  return result;
}
