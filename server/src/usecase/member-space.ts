import { DomainError } from "../domain/errors.js";
import { canUseMemberSpace, type MemberSpaceRepository } from "../domain/member-space.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

/** UC24: member space of one club, plus feedback still owed (FR-05) derived from the BR36 window. */
export async function getMemberSpace(repo: MemberSpaceRepository, policy: PolicyRepository,
  actor: AccessActor | null, clubId: string, now: Date) {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!objectId.test(actor.id) || !objectId.test(clubId)) throw new DomainError("invalid identifier", "validation");
  const space = await repo.find(actor.id, clubId, now);
  // E1: Left/Banned members fall back to the public club page (UC06).
  if (!space || !canUseMemberSpace(space.membership.state)) {
    throw new DomainError("member space is only available to current members", "forbidden");
  }
  const hours = (await policy.findEffective(now))?.feedbackWindowHours ?? null;
  const feedbackToSend = space.attendance.flatMap((item) => {
    if (item.feedbackSubmitted) return [];
    const closesAt = hours === null ? null : new Date(item.eventEndAt.getTime() + hours * 3_600_000);
    return closesAt === null || now < closesAt ? [{ eventId: item.eventId, eventTitle: item.eventTitle, closesAt }] : [];
  });
  return { ...space, feedbackToSend };
}
