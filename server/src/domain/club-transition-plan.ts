import { DomainError } from "./errors.js";
import type { TransitionObligation, TransitionTerm } from "./leadership-transition.js";
export interface TransitionPlanInput {
  toTerm: { name: string; startAt: Date; endAt: Date };
  candidates: { positionCode: string; membershipId: string }[];
  handoverItems: { id: string; description: string }[];
  assignees: Record<string, string>;
  earlyReason?: string;
}
export interface ClubTransitionPlan {
  id: string; state: string; revision: number; fromTermId: string; toTermId: string;
  input: TransitionPlanInput; obligations: TransitionObligation[];
  history: { action: string; at: Date; reason?: string; snapshot?: TransitionPlanInput }[];
}
export interface TransitionPlanContext {
  term: TransitionTerm | null;
  positions: { code: string; name: string; isLeaderRole: boolean; isSingleHolder: boolean }[];
  members: { id: string; displayName: string }[];
  obligations: Omit<TransitionObligation, "assigneeMembershipId">[];
  plans: ClubTransitionPlan[];
}
export interface ClubTransitionPlanRepository {
  context(clubId: string, now: Date): Promise<TransitionPlanContext>;
  create(clubId: string, input: TransitionPlanInput, userId: string, now: Date): Promise<ClubTransitionPlan>;
  save(clubId: string, id: string, revision: number, input: TransitionPlanInput, userId: string, now: Date): Promise<ClubTransitionPlan>;
  submit(clubId: string, id: string, revision: number, userId: string, now: Date): Promise<ClubTransitionPlan>;
}
export function normalizeTransitionPlan(input: TransitionPlanInput): TransitionPlanInput {
  const name = input.toTerm.name.trim();
  if (!name || name.length > 200 || !Number.isFinite(input.toTerm.startAt.getTime())
    || !Number.isFinite(input.toTerm.endAt.getTime()) || input.toTerm.endAt <= input.toTerm.startAt) {
    throw new DomainError("invalid target term", "validation");
  }
  if (input.candidates.length > 30 || new Set(input.candidates.map((c) => c.membershipId)).size !== input.candidates.length
    || input.candidates.some((c) => !c.positionCode.trim() || !/^[0-9a-f]{24}$/i.test(c.membershipId))) {
    throw new DomainError("invalid or duplicate transition candidates", "validation");
  }
  if (input.handoverItems.length > 100 || input.handoverItems.some((i) => !i.id.trim() || !i.description.trim() || i.description.length > 2000)
    || new Set(input.handoverItems.map((i) => i.id)).size !== input.handoverItems.length
    || Object.keys(input.assignees).length > 500 || Object.values(input.assignees).some((id) => !/^[0-9a-f]{24}$/i.test(id))) {
    throw new DomainError("invalid handover items or assignees", "validation");
  }
  const earlyReason = input.earlyReason?.trim();
  if ((earlyReason?.length ?? 0) > 2000) throw new DomainError("early transition reason is too long", "validation");
  return { ...input, toTerm: { ...input.toTerm, name }, earlyReason };
}
