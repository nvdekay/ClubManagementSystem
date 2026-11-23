import type { ClubAccessRepository } from "../domain/access.js";
import type { ClubViolationRepository } from "../domain/club-violation.js";
import { DomainError } from "../domain/errors.js";
import { normalizedEvidence, type EvidenceInput } from "../domain/violation.js";
import { assertClubAccess, type AccessActor } from "./access.js";
export async function listClubViolations(repo: ClubViolationRepository, access: ClubAccessRepository, actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.complaint.respond", now); return repo.list(clubId, now);
}
export async function respondClubViolation(repo: ClubViolationRepository, access: ClubAccessRepository, actor: AccessActor | null, clubId: string, id: string, input: { text: string } | { actionId: string; note: string; evidence: EvidenceInput[] }, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.complaint.respond", now);
  if (!/^[0-9a-f]{24}$/i.test(id)) throw new DomainError("invalid case id", "validation");
  const text = ("text" in input ? input.text : input.note).trim();
  if (!text || text.length > 5000) throw new DomainError("response text is required and must not exceed 5000 characters", "validation");
  if ("text" in input) return repo.respond(clubId, id, text, actor!.id, now);
  if (!/^[0-9a-f]{24}$/i.test(input.actionId) || input.evidence.length > 20) throw new DomainError("invalid corrective action or evidence", "validation");
  return repo.submitAction(clubId, id, input.actionId, { note: text, evidence: normalizedEvidence(input.evidence, actor!.id, now).map(({ note, url }) => ({ note, ...(url ? { url } : {}) })) }, actor!.id, now);
}
