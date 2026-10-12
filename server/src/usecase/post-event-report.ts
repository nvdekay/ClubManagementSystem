import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import {
  type PostEventReportRepository,
  type ReportAction,
  normalizeReport,
} from "../domain/post-event-report.js";
import { DomainError } from "../domain/errors.js";
import { assertClubAccess, type AccessActor } from "./access.js";
import { assertFinanceOfficer, financeId } from "./event-finance.js";
export interface PostEventReportDeps {
  repo: PostEventReportRepository;
  access: ClubAccessRepository;
  auth: Pick<AuthRepository, "systemRoleCodes">;
}
async function authorized(
  deps: PostEventReportDeps,
  actor: AccessActor | null,
  clubId: string | undefined,
  now: Date,
) {
  if (clubId)
    await assertClubAccess(
      deps.access,
      actor,
      financeId(clubId),
      "club.report.submit",
      now,
    );
  else await assertFinanceOfficer(deps.auth, actor);
}
export async function listPostEventReports(
  deps: PostEventReportDeps,
  actor: AccessActor | null,
  clubId: string | undefined,
  now: Date,
) {
  await authorized(deps, actor, clubId, now);
  return deps.repo.list(clubId, now);
}
export async function getPostEventReport(
  deps: PostEventReportDeps,
  actor: AccessActor | null,
  eventId: string,
  clubId: string | undefined,
  now: Date,
) {
  await authorized(deps, actor, clubId, now);
  const detail = await deps.repo.find(financeId(eventId), clubId, now);
  if (!detail) throw new DomainError("report event not found", "not_found");
  return detail;
}
export async function actOnPostEventReport(
  deps: PostEventReportDeps,
  actor: AccessActor | null,
  eventId: string,
  clubId: string | undefined,
  action: ReportAction,
  now: Date,
) {
  await authorized(deps, actor, clubId, now);
  if (
    clubId
      ? !["save", "submit"].includes(action.kind)
      : !["claim", "decision", "overdue"].includes(action.kind)
  ) {
    throw new DomainError("action not allowed for this workspace", "forbidden");
  }
  if (!Number.isInteger(action.revision) || action.revision < 0)
    throw new DomainError("invalid revision", "validation");
  if (action.kind === "save")
    action = { ...action, input: normalizeReport(action.input) };
  if (action.kind === "decision" || action.kind === "overdue") {
    if (!action.reason.trim() || action.reason.length > 2000)
      throw new DomainError("a decision reason is required", "validation");
  }
  if (
    action.kind === "decision" &&
    action.outcome === "finding" &&
    !action.violationId
  ) {
    throw new DomainError(
      "create a linked REPORT_FINDING case before accepting with finding",
      "validation",
    );
  }
  if (action.kind === "decision" && action.violationId)
    financeId(action.violationId);
  return deps.repo.act(financeId(eventId), clubId, actor!.id, action, now);
}
