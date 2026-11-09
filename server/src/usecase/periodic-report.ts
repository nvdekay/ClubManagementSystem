import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import {
  normalizedPeriodicCampaign, normalizedPeriodicDecision, periodicDueAt, periodicDueDays,
  type PeriodicCampaign, type PeriodicCampaignInput, type PeriodicDecisionInput,
  type PeriodicOverview, type PeriodicReportRepository,
} from "../domain/periodic-report.js";
import type { PolicyRepository } from "../domain/policy.js";
import { VIOLATION_SEVERITIES, type ViolationSeverity } from "../domain/violation.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

export interface PeriodicReportDeps {
  repo: PeriodicReportRepository;
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

async function calendar(policy: PolicyRepository, now: Date) {
  const effective = await policy.findEffective(now);
  return { periods: [...(effective?.academicCalendar ?? [])], dueDays: periodicDueDays(effective?.reportDeadlines) };
}

/** Defaults to the latest semester that has ended — the one whose report is due — or the first one. */
export async function periodicReportOverview(deps: PeriodicReportDeps, actor: AccessActor | null,
  periodCode: string | undefined, now: Date): Promise<PeriodicOverview> {
  await officer(deps.auth, actor);
  const { periods, dueDays } = await calendar(deps.policy, now);
  const listed = periods.map((item) => ({ code: item.code, startAt: item.startAt, endAt: item.endAt }));
  const chosen = periodCode ? periods.find((item) => item.code === periodCode)
    : [...periods].reverse().find((item) => item.endAt <= now) ?? periods.find((item) => item.startAt <= now) ?? periods[0];
  if (periodCode && !chosen) {
    throw new DomainError("this period is not in the academic calendar", "validation", { field: "period" });
  }
  if (!chosen) return { periods: listed, rows: [] };
  const campaign = await deps.repo.getCampaign?.(chosen.code) ?? undefined;
  const dueAt = campaign?.dueAt ?? periodicDueAt(chosen, dueDays);
  return {
    periods: listed,
    periodCode: chosen.code,
    dueAt,
    ...(campaign ? { campaign } : {}),
    rows: await deps.repo.overview(chosen.code, dueAt, now),
  };
}

export async function savePeriodicCampaign(deps: PeriodicReportDeps, actor: AccessActor | null,
  input: PeriodicCampaignInput, now: Date): Promise<PeriodicCampaign> {
  const officerId = await officer(deps.auth, actor);
  const normalized = normalizedPeriodicCampaign(input);
  const { periods } = await calendar(deps.policy, now);
  if (!periods.some((item) => item.code === normalized.periodCode)) {
    throw new DomainError("this period is not in the academic calendar", "validation", { field: "periodCode" });
  }
  if (!deps.repo.saveCampaign) {
    throw new DomainError("campaign configuration is not supported", "conflict");
  }
  return deps.repo.saveCampaign(officerId, normalized, now);
}

export async function getPeriodicReport(deps: PeriodicReportDeps, actor: AccessActor | null, id: string) {
  await officer(deps.auth, actor);
  const found = await deps.repo.find(checkedId(id, "report"));
  if (!found) throw new DomainError("periodic report not found", "not_found");
  return found;
}

export async function decidePeriodicReport(deps: PeriodicReportDeps, actor: AccessActor | null, id: string,
  input: PeriodicDecisionInput, now: Date) {
  const officerId = await officer(deps.auth, actor);
  return deps.repo.decide(checkedId(id, "report"), officerId, normalizedPeriodicDecision(input), now);
}

/** UC39 E1: the club did not submit on time — recorded as an overdue-report case for BR21 and the evaluation. */
export async function recordMissingPeriodicReport(deps: PeriodicReportDeps, actor: AccessActor | null,
  input: { clubId: string; periodCode: string; severity: ViolationSeverity; note?: string }, now: Date) {
  const officerId = await officer(deps.auth, actor);
  checkedId(input.clubId, "club");
  if (!VIOLATION_SEVERITIES.includes(input.severity)) throw new DomainError("invalid severity", "validation", { field: "severity" });
  const note = input.note?.trim() || undefined;
  if (note && note.length > 2_000) throw new DomainError("note is too long", "validation", { field: "note" });
  const { periods, dueDays } = await calendar(deps.policy, now);
  const period = periods.find((item) => item.code === input.periodCode);
  if (!period) throw new DomainError("this period is not in the academic calendar", "validation", { field: "periodCode" });
  const campaign = await deps.repo.getCampaign?.(input.periodCode);
  if (campaign && !campaign.isOpen) throw new DomainError("reporting is not open for this period", "conflict");
  const dueAt = campaign?.dueAt ?? periodicDueAt(period, dueDays);
  if (dueAt > now) throw new DomainError("the report is not due yet", "conflict");
  return deps.repo.recordMissing(input.clubId, input.periodCode, dueAt, officerId, { severity: input.severity, note }, now);
}
