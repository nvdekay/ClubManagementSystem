import type { ClubAccessRepository } from "../domain/access.js";
import type { AuthRepository } from "../domain/auth.js";
import {
  type EventFinanceRepository,
  type FinanceAction,
  validateExpense,
  validateFinancialEvidence,
} from "../domain/event-finance.js";
import { DomainError } from "../domain/errors.js";
import { assertClubAccess, type AccessActor } from "./access.js";

export interface EventFinanceDeps {
  repo: EventFinanceRepository;
  access: ClubAccessRepository;
  auth: Pick<AuthRepository, "systemRoleCodes">;
}
export function financeId(value: string): string {
  if (!/^[0-9a-f]{24}$/i.test(value))
    throw new DomainError("invalid finance identifier", "validation");
  return value;
}
export async function assertFinanceOfficer(
  auth: Pick<AuthRepository, "systemRoleCodes">,
  actor: AccessActor | null,
): Promise<string> {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState !== "Active")
    throw new DomainError("account locked", "locked");
  if (
    !(await auth.systemRoleCodes(financeId(actor.id))).includes("ICPDP_OFFICER")
  )
    throw new DomainError("ICPDP officer role required", "forbidden");
  return actor.id;
}
export async function listEventFinances(
  deps: EventFinanceDeps,
  actor: AccessActor | null,
  clubId: string | undefined,
  now: Date,
) {
  if (clubId)
    await assertClubAccess(
      deps.access,
      actor,
      financeId(clubId),
      "club.expense.record",
      now,
    );
  else await assertFinanceOfficer(deps.auth, actor);
  return deps.repo.list(clubId);
}
export async function getEventFinance(
  deps: EventFinanceDeps,
  actor: AccessActor | null,
  id: string,
  clubId: string | undefined,
  now: Date,
) {
  if (clubId)
    await assertClubAccess(
      deps.access,
      actor,
      financeId(clubId),
      "club.expense.record",
      now,
    );
  else await assertFinanceOfficer(deps.auth, actor);
  const result = await deps.repo.find(financeId(id), clubId);
  if (!result) throw new DomainError("budget not found", "not_found");
  return result;
}
export async function actOnEventFinance(
  deps: EventFinanceDeps,
  actor: AccessActor | null,
  id: string,
  clubId: string | undefined,
  action: FinanceAction,
  now: Date,
) {
  if (clubId) {
    await assertClubAccess(
      deps.access,
      actor,
      financeId(clubId),
      "club.expense.record",
      now,
    );
    if (!["expense", "evidence", "submit"].includes(action.kind))
      throw new DomainError("officer action required", "forbidden");
  } else {
    await assertFinanceOfficer(deps.auth, actor);
    if (!["claim", "return", "finalize"].includes(action.kind))
      throw new DomainError("club action required", "forbidden");
  }
  if (!Number.isInteger(action.revision) || action.revision < 0)
    throw new DomainError("invalid revision", "validation");
  if (action.kind === "expense")
    action = {
      ...action,
      expenseId: action.expenseId ? financeId(action.expenseId) : undefined,
      input: validateExpense(action.input, now),
    };
  if (action.kind === "evidence")
    action = {
      ...action,
      expenseId: financeId(action.expenseId),
      input: validateFinancialEvidence(action.input),
    };
  if (
    action.kind === "return" &&
    (!action.reason.trim() || action.reason.length > 2000)
  )
    throw new DomainError("a correction reason is required", "validation");
  return deps.repo.act(financeId(id), clubId, actor!.id, action, now);
}
