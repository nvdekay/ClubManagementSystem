import type { ClubAccessRepository } from "../domain/access.js";
import { normalizePeriodicDraft, type ClubPeriodicReportRepository, type PeriodicDraftInput } from "../domain/club-periodic-report.js";
import { DomainError } from "../domain/errors.js";
import { periodicDueAt, periodicDueDays } from "../domain/periodic-report.js";
import type { PolicyRepository } from "../domain/policy.js";
import { assertClubAccess, type AccessActor } from "./access.js";

export async function listClubPeriodicReports(repo: ClubPeriodicReportRepository, policy: PolicyRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.report.submit", now);
  const effective = await policy.findEffective(now);
  const calendar = (effective?.academicCalendar ?? []).filter((p) => p.startAt <= now);
  const periods = await Promise.all(calendar.map(async (p) => {
    const campaign = await repo.getCampaign?.(p.code);
    const dueAt = campaign?.dueAt ?? periodicDueAt(p, periodicDueDays(effective?.reportDeadlines));
    return {
      ...p,
      dueAt,
      isOpen: campaign ? campaign.isOpen : false,
      ...(campaign?.announcement ? { announcement: campaign.announcement } : {}),
      customFields: campaign?.customFields ?? [],
    };
  }));
  return { periods, reports: await repo.list(clubId) };
}

export async function createClubPeriodicReport(repo: ClubPeriodicReportRepository, policy: PolicyRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, periodCode: string, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.report.submit", now);
  const effective = await policy.findEffective(now);
  const period = effective?.academicCalendar.find((p) => p.code === periodCode && p.startAt <= now);
  if (!period) throw new DomainError("invalid reporting period", "validation");
  if (repo.getCampaign) {
    const campaign = await repo.getCampaign(period.code);
    if (!campaign || !campaign.isOpen) {
      throw new DomainError("ICPDP has not opened periodic report submission for this period", "conflict");
    }
    if (now > campaign.dueAt) {
      throw new DomainError("the periodic report submission deadline has passed", "conflict");
    }
    return repo.create(clubId, period.code, campaign.dueAt, actor!.id, now);
  }
  return repo.create(clubId, period.code, periodicDueAt(period, periodicDueDays(effective?.reportDeadlines)), actor!.id, now);
}

export async function changeClubPeriodicReport(repo: ClubPeriodicReportRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, id: string, revision: number, input: PeriodicDraftInput | null, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.report.submit", now);
  if (!/^[0-9a-f]{24}$/i.test(id) || !Number.isInteger(revision) || revision < 0) {
    throw new DomainError("invalid report identifier or version", "validation");
  }
  return input ? repo.save(clubId, id, revision, normalizePeriodicDraft(input), actor!.id, now)
    : repo.submit(clubId, id, revision, actor!.id, now);
}
