import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import {
  DEFAULT_SCHEME_SETTINGS, EVALUATION_DIMENSIONS, schemeActivationIssues, validateSchemeSettings,
  type EvaluationSchemeRepository, type SchemeSettings,
} from "../domain/evaluation-scheme.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

async function officer(auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null): Promise<string> {
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

async function existing(repo: EvaluationSchemeRepository, id: string) {
  if (!objectId.test(id)) throw new DomainError("invalid evaluation scheme id", "validation");
  const scheme = await repo.find(id);
  if (!scheme) throw new DomainError("evaluation scheme not found", "not_found");
  return scheme;
}

function draftOnly(state: string): void {
  if (state !== "Draft") {
    throw new DomainError("only a draft scheme can change; create a revision instead", "conflict");
  }
}

/** Evaluation periods are the semesters of the policy in force. */
async function periods(policy: PolicyRepository, now: Date) {
  return ((await policy.findEffective(now))?.academicCalendar ?? []).map((semester) => ({
    code: semester.code, startAt: semester.startAt, endAt: semester.endAt,
  }));
}

export async function listEvaluationSchemes(repo: EvaluationSchemeRepository, policy: PolicyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, now: Date) {
  await officer(auth, actor);
  const [schemes, semesters] = await Promise.all([repo.list(), periods(policy, now)]);
  return { schemes, periods: semesters, dimensions: EVALUATION_DIMENSIONS };
}

/** A new draft starts from the defaults, or from any earlier scheme (UC41 A1, BR51 revisions). */
export async function createEvaluationScheme(repo: EvaluationSchemeRepository, policy: PolicyRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null,
  input: { periodCode: string; copyFromId?: string }, now: Date) {
  const actorId = await officer(auth, actor);
  const periodCode = input.periodCode.trim();
  if (!(await periods(policy, now)).some((semester) => semester.code === periodCode)) {
    throw new DomainError("evaluation period is not in the academic calendar", "validation", { field: "periodCode" });
  }
  const source = input.copyFromId ? await existing(repo, input.copyFromId) : null;
  const settings: SchemeSettings = source
    ? { dimensions: source.dimensions, thresholds: source.thresholds } : DEFAULT_SCHEME_SETTINGS;
  return repo.createDraft(periodCode, settings, actorId, now);
}

export async function updateEvaluationScheme(repo: EvaluationSchemeRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string,
  settings: SchemeSettings, now: Date) {
  const actorId = await officer(auth, actor);
  const scheme = await existing(repo, id);
  draftOnly(scheme.state);
  return repo.updateDraft(scheme.id, validateSchemeSettings(settings), actorId, now);
}

export async function activateEvaluationScheme(repo: EvaluationSchemeRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string, now: Date) {
  const actorId = await officer(auth, actor);
  const scheme = await existing(repo, id);
  draftOnly(scheme.state);
  const issues = schemeActivationIssues(scheme);
  if (issues.length) throw new DomainError("evaluation scheme cannot be activated", "validation", { issues });
  return repo.activate(scheme.id, actorId, now);
}

export async function deleteEvaluationScheme(repo: EvaluationSchemeRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string, now: Date) {
  const actorId = await officer(auth, actor);
  const scheme = await existing(repo, id);
  draftOnly(scheme.state);
  await repo.deleteDraft(scheme.id, actorId, now);
  return { deleted: true as const };
}
