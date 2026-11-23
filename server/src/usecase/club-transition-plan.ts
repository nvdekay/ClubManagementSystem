import type { ClubAccessRepository } from "../domain/access.js";
import { normalizeTransitionPlan, type ClubTransitionPlanRepository, type TransitionPlanInput } from "../domain/club-transition-plan.js";
import { DomainError } from "../domain/errors.js";
import { assertClubAccess, type AccessActor } from "./access.js";
export async function clubTransitionContext(repo: ClubTransitionPlanRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.transition.plan", now);
  return repo.context(clubId, now);
}
export async function writeClubTransition(repo: ClubTransitionPlanRepository, access: ClubAccessRepository,
  actor: AccessActor | null, clubId: string, action: { id?: string; revision?: number; input?: TransitionPlanInput }, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.transition.plan", now);
  if (action.id && (!/^[0-9a-f]{24}$/i.test(action.id) || !Number.isInteger(action.revision) || action.revision! < 0)) {
    throw new DomainError("invalid plan identifier or revision", "validation");
  }
  if (!action.id) {
    if (!action.input) throw new DomainError("plan content is required", "validation");
    return repo.create(clubId, normalizeTransitionPlan(action.input), actor!.id, now);
  }
  return action.input ? repo.save(clubId, action.id, action.revision!, normalizeTransitionPlan(action.input), actor!.id, now)
    : repo.submit(clubId, action.id, action.revision!, actor!.id, now);
}
