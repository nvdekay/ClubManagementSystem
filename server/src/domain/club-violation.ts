import type { EvidenceInput, ViolationDetail } from "./violation.js";
export interface ClubViolationRepository {
  list(clubId: string, now: Date): Promise<ViolationDetail[]>;
  respond(clubId: string, id: string, text: string, userId: string, now: Date): Promise<void>;
  submitAction(clubId: string, id: string, actionId: string, input: { note: string; evidence: EvidenceInput[] }, userId: string, now: Date): Promise<void>;
}
