import type { AuthRepository } from "../domain/auth.js";
import type { BudgetReconciliationRepository, ExpenseReviewInput } from "../domain/budget-reconciliation.js";
import { DomainError } from "../domain/errors.js";
import { VIOLATION_SEVERITIES, type ViolationSeverity } from "../domain/violation.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

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

function budgetId(value: string): string {
  if (!objectId.test(value)) throw new DomainError("invalid budget id", "validation");
  return value;
}

export async function getReconciliation(repo: BudgetReconciliationRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, now: Date) {
  await officer(auth, actor);
  const found = await repo.find(budgetId(id), now);
  if (!found) throw new DomainError("budget not found", "not_found");
  return found;
}

export async function reconcileBudget(repo: BudgetReconciliationRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, reviews: ExpenseReviewInput[], now: Date) {
  const officerId = await officer(auth, actor);
  if (reviews.some((item) => !objectId.test(item.expenseId))) {
    throw new DomainError("invalid expense id", "validation", { field: "reviews" });
  }
  return repo.reconcile(budgetId(id), officerId, reviews, now);
}

/** UC37 A1: the settlement goes back to the club until it adds the missing evidence. */
export async function requestSettlementEvidence(repo: BudgetReconciliationRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string, message: string, now: Date) {
  const officerId = await officer(auth, actor);
  const text = message.trim();
  if (!text || text.length > 2_000) throw new DomainError("say what evidence is missing", "validation", { field: "message" });
  return repo.requestEvidence(budgetId(id), officerId, text, now);
}

/** UC37 E2 / BR58: an overdue refund becomes a compliance case raised from the budget itself. */
export async function openRecoveryCase(repo: BudgetReconciliationRepository, auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null, id: string, severity: ViolationSeverity, now: Date) {
  const officerId = await officer(auth, actor);
  if (!VIOLATION_SEVERITIES.includes(severity)) throw new DomainError("invalid severity", "validation", { field: "severity" });
  return repo.openCase(budgetId(id), officerId, severity, now);
}
