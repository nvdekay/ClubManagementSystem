import { DomainError } from "./errors.js";
export interface SuspensionImpact { id: string; kind: "event" | "booking"; title: string; startAt: Date }
export interface SuspensionRequestInput { reason: string; until: Date; obligationsPlan: string; recoveryPlan: string; acknowledgedImpactIds: string[] }
export interface SuspensionRequest extends SuspensionRequestInput {
  id: string; clubId: string; clubName: string; state: "Pending" | "Approved" | "Rejected";
  submittedAt: Date; submittedBy: string; decisionReason?: string; decidedAt?: Date;
}
export interface SuspensionRequestRepository {
  context(clubId: string, now: Date): Promise<{ impacts: SuspensionImpact[]; requests: SuspensionRequest[] }>;
  submit(clubId: string, input: SuspensionRequestInput, userId: string, now: Date): Promise<SuspensionRequest>;
  list(): Promise<SuspensionRequest[]>;
  decide(id: string, outcome: "Approve" | "Reject", reason: string, officerId: string, now: Date): Promise<void>;
}
export function normalizedSuspensionRequest(input: SuspensionRequestInput, now: Date): SuspensionRequestInput {
  const reason = input.reason.trim(); const obligationsPlan = input.obligationsPlan.trim(); const recoveryPlan = input.recoveryPlan.trim();
  if (!reason || reason.length > 2000 || !obligationsPlan || obligationsPlan.length > 5000 || !recoveryPlan || recoveryPlan.length > 5000
    || !Number.isFinite(input.until.getTime()) || input.until <= now || input.acknowledgedImpactIds.length > 1000) {
    throw new DomainError("a reason, future end date, obligations and recovery plan are required", "validation");
  }
  return { reason, until: input.until, obligationsPlan, recoveryPlan, acknowledgedImpactIds: [...new Set(input.acknowledgedImpactIds)].sort() };
}
