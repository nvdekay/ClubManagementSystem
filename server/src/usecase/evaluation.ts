import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import {
  checkManualScore, scoreDimensions, totalOf,
  type DimensionResult, type EvaluationDetail, type EvaluationOverview, type EvaluationRepository, type EvaluationRow,
  type PeriodWindow,
} from "../domain/evaluation.js";
import type { DimensionCode, EvaluationScheme, EvaluationSchemeRepository } from "../domain/evaluation-scheme.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;
const editableStates = new Set(["Draft", "Data Ready", "Under Review"]);

export interface EvaluationDeps {
  repo: EvaluationRepository;
  schemes: Pick<EvaluationSchemeRepository, "list">;
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

async function evaluation(repo: EvaluationRepository, id: string): Promise<EvaluationDetail> {
  if (!objectId.test(id)) throw new DomainError("invalid evaluation id", "validation");
  const found = await repo.find(id);
  if (!found) throw new DomainError("evaluation not found", "not_found");
  return found;
}

async function context(deps: EvaluationDeps, now: Date) {
  const policy = await deps.policy.findEffective(now);
  const schemes = await deps.schemes.list();
  return { calendar: [...(policy?.academicCalendar ?? [])], minRespondents: policy?.feedbackMinRespondents ?? 1, schemes };
}

function activeScheme(schemes: EvaluationScheme[], periodCode: string): EvaluationScheme | undefined {
  return schemes.find((scheme) => scheme.periodCode === periodCode && scheme.state === "Active");
}

function period(calendar: PeriodWindow[], code: string): PeriodWindow {
  const found = calendar.find((item) => item.code === code);
  if (!found) throw new DomainError("this period is not in the academic calendar", "validation", { field: "periodCode" });
  return found;
}

/** Keeps the officer's manual scores when the data is generated again (UC42 A1). */
function withManual(results: DimensionResult[], previous: EvaluationDetail | undefined, scheme: EvaluationScheme): DimensionResult[] {
  return results.map((result) => {
    const before = previous?.dimensions.find((item) => item.code === result.code && item.isManual);
    const allowed = scheme.dimensions.find((item) => item.code === result.code)?.allowsManual;
    return before && allowed ? { ...result, score: before.score, isManual: true, justification: before.justification } : result;
  });
}

async function computed(deps: EvaluationDeps, clubId: string, window: PeriodWindow, scheme: EvaluationScheme,
  minRespondents: number, now: Date): Promise<DimensionResult[]> {
  return scoreDimensions(await deps.repo.collectMetrics(clubId, window, now), scheme, window.code, minRespondents);
}

export async function evaluationOverview(deps: EvaluationDeps, actor: AccessActor | null, periodCode: string | undefined,
  now: Date): Promise<EvaluationOverview> {
  await officer(deps.auth, actor);
  const { calendar, schemes } = await context(deps, now);
  const periods = calendar.map((item) => ({ ...item, hasActiveScheme: Boolean(activeScheme(schemes, item.code)) }));
  const chosen = periodCode ?? [...calendar].reverse().find((item) => item.startAt <= now)?.code ?? calendar[0]?.code;
  if (!chosen) return { periods, rows: [], canPublish: false };
  if (periodCode) period(calendar, periodCode);
  const [clubs, latest] = await Promise.all([deps.repo.clubsInScope(), deps.repo.latest(chosen)]);
  const byClub = new Map(latest.map((item) => [item.clubId, item]));
  const rows: EvaluationRow[] = clubs.map((club) => {
    const item = byClub.get(club.id);
    return { clubId: club.id, clubName: club.name, clubState: club.state,
      ...(item ? { evaluationId: item.id, state: item.state, revisionNo: item.revisionNo,
        ...(item.totalScore !== undefined ? { totalScore: item.totalScore } : {}),
        ...(item.classification ? { classification: item.classification } : {}) } : {}),
      insufficientCount: item?.dimensions.filter((dimension) => dimension.score === undefined).length ?? 0,
      manualCount: item?.dimensions.filter((dimension) => dimension.isManual).length ?? 0 };
  });
  const scheme = activeScheme(schemes, chosen);
  return { periods, periodCode: chosen, ...(scheme ? { scheme: { id: scheme.id, version: scheme.version } } : {}), rows,
    canPublish: rows.length > 0 && rows.every((row) => row.state === "Finalized" || row.state === "Published")
      && rows.some((row) => row.state === "Finalized") };
}

/** UC42: a Data Ready draft for every club in scope that has none yet for the period. */
export async function generateEvaluations(deps: EvaluationDeps, actor: AccessActor | null, periodCode: string, now: Date) {
  const officerId = await officer(deps.auth, actor);
  const { calendar, minRespondents, schemes } = await context(deps, now);
  const window = period(calendar, periodCode);
  const scheme = activeScheme(schemes, periodCode);
  if (!scheme) throw new DomainError("activate an evaluation scheme for this period first", "conflict");
  const [clubs, latest] = await Promise.all([deps.repo.clubsInScope(), deps.repo.latest(periodCode)]);
  const done = new Set(latest.map((item) => item.clubId));
  for (const club of clubs.filter((item) => !done.has(item.id))) {
    await deps.repo.writeDraft({ clubId: club.id, periodCode, scheme, target: { kind: "new" },
      results: await computed(deps, club.id, window, scheme, minRespondents, now) }, officerId, now);
  }
  return evaluationOverview(deps, actor, periodCode, now);
}

export async function getEvaluation(deps: EvaluationDeps, actor: AccessActor | null, id: string) {
  await officer(deps.auth, actor);
  return evaluation(deps.repo, id);
}

/** UC42 A1 (draft not finalized yet) or UC43 A1 (new revision of a published result). */
export async function regenerateEvaluation(deps: EvaluationDeps, actor: AccessActor | null, id: string, now: Date) {
  const officerId = await officer(deps.auth, actor);
  const current = await evaluation(deps.repo, id);
  const { calendar, minRespondents, schemes } = await context(deps, now);
  const scheme = activeScheme(schemes, current.periodCode);
  if (!scheme) throw new DomainError("the period has no active evaluation scheme", "conflict");
  const latestRevision = current.revisions[0]?.revisionNo ?? current.revisionNo;
  if (current.revisionNo !== latestRevision) throw new DomainError("only the latest revision can change", "conflict");
  const isPublished = current.state === "Published";
  if (!isPublished && !editableStates.has(current.state)) {
    throw new DomainError("reopen the finalized evaluation before generating it again", "conflict");
  }
  const results = withManual(await computed(deps, current.clubId, period(calendar, current.periodCode), scheme, minRespondents, now),
    current, scheme);
  const newId = await deps.repo.writeDraft({ clubId: current.clubId, periodCode: current.periodCode, scheme, results,
    target: isPublished ? { kind: "revision", fromEvaluationId: current.id } : { kind: "replace", evaluationId: current.id } },
  officerId, now);
  return evaluation(deps.repo, newId);
}

export async function setManualScore(deps: EvaluationDeps, actor: AccessActor | null, id: string, code: DimensionCode,
  manual: { score: number; justification: string } | null, now: Date) {
  const officerId = await officer(deps.auth, actor);
  const current = await evaluation(deps.repo, id);
  if (!editableStates.has(current.state)) throw new DomainError("only an evaluation under review can change", "conflict");
  const checked = checkManualScore(current.dimensions.find((item) => item.code === code), manual);
  await deps.repo.setManual(current.id, code, checked, officerId, now);
  return evaluation(deps.repo, current.id);
}

export async function finalizeEvaluation(deps: EvaluationDeps, actor: AccessActor | null, id: string, now: Date) {
  const officerId = await officer(deps.auth, actor);
  const current = await evaluation(deps.repo, id);
  if (!editableStates.has(current.state)) throw new DomainError("this evaluation cannot be finalized now", "conflict");
  await deps.repo.finalize(current.id, totalOf(current.dimensions, current.thresholds), officerId, now);
  return evaluation(deps.repo, current.id);
}

export async function reopenEvaluation(deps: EvaluationDeps, actor: AccessActor | null, id: string, now: Date) {
  const officerId = await officer(deps.auth, actor);
  const current = await evaluation(deps.repo, id);
  if (current.state !== "Finalized") throw new DomainError("only a finalized, unpublished evaluation can be reopened", "conflict");
  await deps.repo.reopen(current.id, officerId, now);
  return evaluation(deps.repo, current.id);
}

/** UC43 FR-03: one scorecard for every club, so the period is published only when every club is finalized. */
export async function publishEvaluations(deps: EvaluationDeps, actor: AccessActor | null, periodCode: string, now: Date) {
  const officerId = await officer(deps.auth, actor);
  const overview = await evaluationOverview(deps, actor, periodCode, now);
  if (!overview.canPublish) throw new DomainError("finalize the evaluation of every club before publishing", "conflict");
  await deps.repo.publish(periodCode, officerId, now);
  return evaluationOverview(deps, actor, periodCode, now);
}
