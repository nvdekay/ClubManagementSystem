import {
  simulateRouting, validateRoutingRules, type ApprovalRoutingRepository, type RoutingRule,
} from "../domain/approval-routing.js";
import type { AuthRepository } from "../domain/auth.js";
import { DomainError } from "../domain/errors.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

async function holder(auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, role: string): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  const roles = await auth.systemRoleCodes(actor.id);
  // D1: ICPDP_HEAD counts only together with ICPDP_OFFICER.
  if (!roles.includes("ICPDP_OFFICER") || !roles.includes(role)) throw new DomainError(`${role} role required`, "forbidden");
  return actor.id;
}

function id(value: string): string {
  if (!objectId.test(value)) throw new DomainError("invalid rule set id", "validation");
  return value;
}

/** UC05: every ICPDP officer reads the rule sets; only ICPDP_HEAD changes them. */
export async function listRoutingRuleSets(repo: ApprovalRoutingRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null) {
  await holder(auth, actor, "ICPDP_OFFICER");
  return repo.list();
}

export async function createRoutingDraft(repo: ApprovalRoutingRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, rules: RoutingRule[], now: Date) {
  const actorId = await holder(auth, actor, "ICPDP_HEAD");
  return repo.createDraft(validateRoutingRules(rules), actorId, now);
}

export async function saveRoutingDraft(repo: ApprovalRoutingRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, ruleSetId: string, rules: RoutingRule[], now: Date) {
  const actorId = await holder(auth, actor, "ICPDP_HEAD");
  return repo.saveDraft(id(ruleSetId), validateRoutingRules(rules), actorId, now);
}

/** FR-UC05-03/04: overlapping rules are refused; activation versions and audits; only new requests use it. */
export async function activateRoutingRuleSet(repo: ApprovalRoutingRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, ruleSetId: string, now: Date) {
  const actorId = await holder(auth, actor, "ICPDP_HEAD");
  const draft = await repo.find(id(ruleSetId));
  if (!draft) throw new DomainError("routing rule set not found", "not_found");
  if (draft.state !== "Draft") throw new DomainError("only a draft rule set can be activated", "conflict");
  validateRoutingRules(draft.rules);
  return repo.activate(draft.id, actorId, now);
}

/** UC05 A1: which rule of a rule set the last N decided requests would match, and their SLA; reads only. */
export async function simulateRoutingRuleSet(repo: ApprovalRoutingRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, ruleSetId: string, limit: number) {
  await holder(auth, actor, "ICPDP_OFFICER");
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new DomainError("choose between 1 and 200 requests", "validation");
  const set = await repo.find(id(ruleSetId));
  if (!set) throw new DomainError("routing rule set not found", "not_found");
  return simulateRouting(set.rules, await repo.recentDecided(limit));
}
