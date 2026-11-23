import type { ClubAccessRepository } from "../domain/access.js";
import type { ClubEvaluationRepository } from "../domain/club-evaluation.js";
import { assertClubAccess, type AccessActor } from "./access.js";
export async function publishedClubEvaluations(repo: ClubEvaluationRepository, access: ClubAccessRepository, actor: AccessActor | null, clubId: string, now: Date) {
  await assertClubAccess(access, actor, clubId, "club.report.submit", now); return repo.listPublished(clubId);
}
