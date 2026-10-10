import type { ClubAccessRepository } from "../domain/access.js";
import { assertEvaluable, buildCandidateEvaluation, summarizeEvaluations,
  type CandidateEvaluation, type CandidateEvaluationRepository } from "../domain/candidate-evaluation.js";
import { DomainError } from "../domain/errors.js";
import { assertClubAccess, type AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

function assertIds(ids: Record<string, string>): void {
  for (const [label, value] of Object.entries(ids)) {
    if (!objectId.test(value)) throw new DomainError(`invalid ${label} id`, "validation");
  }
}

/** UC19 A1/UC18 step 4: campaign rubric + evaluations grouped by application, with aggregate and dispersion. */
export async function listCandidateEvaluations(repo: CandidateEvaluationRepository,
  access: ClubAccessRepository, actor: AccessActor | null, clubId: string, campaignId: string,
  now = new Date()) {
  await assertClubAccess(access, actor, clubId, "club.application.review", now);
  assertIds({ campaign: campaignId });
  const found = await repo.listForCampaign(clubId, campaignId);
  if (!found) throw new DomainError("recruitment campaign not found", "not_found");
  const byApplication = new Map<string, CandidateEvaluation[]>();
  for (const evaluation of found.evaluations) {
    byApplication.set(evaluation.applicationId,
      [...byApplication.get(evaluation.applicationId) ?? [], evaluation]);
  }
  // The rubric travels with the list: reviewers may lack club.recruitment.manage to read the campaign.
  return { rubric: found.rubric, applications: [...byApplication].map(([applicationId, evaluations]) => ({
    applicationId, evaluations, summary: summarizeEvaluations(found.rubric, evaluations),
  })) };
}

/** UC19 main flow: create or update the caller's own evaluation of a Shortlisted application. */
export async function recordCandidateEvaluation(repo: CandidateEvaluationRepository,
  access: ClubAccessRepository, actor: AccessActor | null,
  input: { clubId: string; campaignId: string; applicationId: string;
    scores: Record<string, number>; comment?: string }, now = new Date()) {
  await assertClubAccess(access, actor, input.clubId, "club.application.review", now);
  assertIds({ campaign: input.campaignId, application: input.applicationId });
  const target = await repo.target(input.clubId, input.campaignId, input.applicationId);
  if (!target) throw new DomainError("application not found", "not_found");
  assertEvaluable(target);
  const evaluation = buildCandidateEvaluation(target.rubric, input);
  return repo.save({ ...evaluation, applicationId: input.applicationId, reviewerId: actor!.id, now });
}
