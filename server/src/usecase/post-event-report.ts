import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import type { PolicyRepository } from "../domain/policy.js";
import {
  normalizedPostEventDecision, postEventDueDays,
  type PostEventDecisionInput, type PostEventReportRepository,
} from "../domain/post-event-report.js";
import { VIOLATION_SEVERITIES, type ViolationSeverity } from "../domain/violation.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

export interface PostEventReportDeps {
  repo: PostEventReportRepository;
  policy: PolicyRepository;
  auth: Pick<AuthRepository, "systemRoleCodes">;
}

async function officer(auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") {
    throw new DomainError(actor.lockReason || "account locked", "locked");
  }
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  if (!(await auth.systemRoleCodes(actor.id)).includes("ICPDP_OFFICER")) {
    throw new DomainError("ICPDP officer role required", "forbidden");
  }
  return actor.id;
}

function checkedId(value: string, what: string): string {
  if (!objectId.test(value)) throw new DomainError(`invalid ${what} id`, "validation");
  return value;
}

async function dueDays(policy: PolicyRepository, now: Date): Promise<number> {
  return postEventDueDays((await policy.findEffective(now))?.reportDeadlines);
}

export async function postEventReportQueue(deps: PostEventReportDeps, actor: AccessActor | null, now: Date) {
  await officer(deps.auth, actor);
  return deps.repo.queue(now, await dueDays(deps.policy, now));
}

export async function getPostEventReport(deps: PostEventReportDeps, actor: AccessActor | null, id: string, now: Date) {
  await officer(deps.auth, actor);
  const found = await deps.repo.find(checkedId(id, "report"), now, await dueDays(deps.policy, now));
  if (!found) throw new DomainError("post-event report not found", "not_found");
  return found;
}

export async function decidePostEventReport(deps: PostEventReportDeps, actor: AccessActor | null, id: string,
  input: PostEventDecisionInput, now: Date) {
  const officerId = await officer(deps.auth, actor);
  return deps.repo.decide(checkedId(id, "report"), officerId, normalizedPostEventDecision(input), now,
    await dueDays(deps.policy, now));
}

/** UC34 A1: the club never submitted — recorded as an overdue-report case that feeds BR21 and the evaluation. */
export async function recordMissingPostEventReport(deps: PostEventReportDeps, actor: AccessActor | null, eventId: string,
  input: { severity: ViolationSeverity; note?: string }, now: Date) {
  const officerId = await officer(deps.auth, actor);
  if (!VIOLATION_SEVERITIES.includes(input.severity)) {
    throw new DomainError("invalid severity", "validation", { field: "severity" });
  }
  const note = input.note?.trim() || undefined;
  if (note && note.length > 2_000) throw new DomainError("note is too long", "validation", { field: "note" });
  return deps.repo.recordMissing(checkedId(eventId, "event"), officerId, { severity: input.severity, note }, now,
    await dueDays(deps.policy, now));
}
