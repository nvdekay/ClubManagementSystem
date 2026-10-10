import type { AuthRepository } from "../domain/auth.js";
import {
  BUDGET_FLOW_KINDS, checkFlow,
  type BudgetDisbursementRepository, type BudgetFlowInput, type NormalizedBudgetFlow,
} from "../domain/budget-disbursement.js";
import { DomainError } from "../domain/errors.js";
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

export function normalizedBudgetFlow(input: BudgetFlowInput, now: Date): NormalizedBudgetFlow {
  if (!BUDGET_FLOW_KINDS.includes(input.kind)) {
    throw new DomainError("invalid money flow kind", "validation", { field: "kind" });
  }
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new DomainError("amount must be a whole number of VND above zero", "validation", { field: "amount" });
  }
  const disbursedAt = input.disbursedAt ?? now;
  if (Number.isNaN(disbursedAt.getTime()) || disbursedAt > now) {
    throw new DomainError("the money flow date cannot be in the future", "validation", { field: "disbursedAt" });
  }
  const paymentReference = input.paymentReference?.trim() || undefined;
  const note = input.note?.trim() || undefined;
  if (paymentReference && paymentReference.length > 100 || note && note.length > 500) {
    throw new DomainError("money flow text is too long", "validation");
  }
  return { kind: input.kind, amount: input.amount, disbursedAt, paymentReference, note };
}

export async function listBudgets(repo: BudgetDisbursementRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null) {
  await officer(auth, actor);
  return repo.list();
}

export async function getBudget(repo: BudgetDisbursementRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string) {
  await officer(auth, actor);
  const detail = await repo.find(budgetId(id));
  if (!detail) throw new DomainError("budget not found", "not_found");
  return detail;
}

export async function recordBudgetFlow(repo: BudgetDisbursementRepository,
  auth: Pick<AuthRepository, "systemRoleCodes">, actor: AccessActor | null, id: string,
  input: BudgetFlowInput, now: Date) {
  const officerId = await officer(auth, actor);
  const flow = normalizedBudgetFlow(input, now);
  const detail = await repo.find(budgetId(id));
  if (!detail) throw new DomainError("budget not found", "not_found");
  // Fails fast with a field-level error; the repository re-checks inside its transaction.
  checkFlow(detail, flow);
  return repo.record(detail.id, officerId, flow, now);
}
