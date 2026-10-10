import { describe, expect, it } from "vitest";
import type { ClubAccessRepository } from "../../src/domain/access.js";
import type { CandidateEvaluation, CandidateEvaluationRepository,
  EvaluationTarget } from "../../src/domain/candidate-evaluation.js";
import { summarizeEvaluations } from "../../src/domain/candidate-evaluation.js";
import type { RecruitmentRubricCriterion } from "../../src/domain/recruitment-campaign.js";
import { listCandidateEvaluations, recordCandidateEvaluation } from "../../src/usecase/candidate-evaluation.js";
import { candidateEvaluationBody } from "../../src/interface/http/candidate-evaluation-routes.js";

// Adversarial cases for UC19, added in cross-review.
const reviewerA = "111111111111111111111111";
const reviewerB = "aaaaaaaaaaaaaaaaaaaaaaaa";
const clubId = "222222222222222222222222";
const campaignId = "333333333333333333333333";
const applicationId = "444444444444444444444444";
const now = new Date("2026-10-08T12:00:00Z");
const rubric: RecruitmentRubricCriterion[] = [
  { key: "communication", label: "Communication", maxScore: 5 },
  { key: "teamwork", label: "Teamwork", maxScore: 10 },
];

function actor(id = reviewerA) {
  return { id, accountState: "Active" as const };
}

function accessRepo(permission = true): ClubAccessRepository {
  return { findSnapshot: async () => ({ clubId, clubName: "Test", clubState: "Active",
    membership: { id: "555555555555555555555555", clubId, state: "Active" },
    terms: [{ id: "666666666666666666666666", clubId, state: "Active",
      startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") }],
    positions: [{ id: "777777777777777777777777", clubId, isActive: true,
      isLeaderRole: false, permissionCodes: permission ? ["club.application.review"] : [] }],
    assignments: [{ clubId, termId: "666666666666666666666666",
      positionId: "777777777777777777777777", membershipId: "555555555555555555555555",
      effectiveFrom: new Date("2026-01-01") }], isApprovedFounder: false }) };
}

function memoryRepo(target: EvaluationTarget) {
  const rows = new Map<string, CandidateEvaluation>();
  const repo: CandidateEvaluationRepository = {
    target: async (club, campaign, application) =>
      club === clubId && campaign === campaignId && application === applicationId ? target : null,
    listForCampaign: async (club, campaign) => club === clubId && campaign === campaignId
      ? { rubric: [...target.rubric], evaluations: [...rows.values()] } : null,
    save: async (input) => {
      const key = `${input.applicationId}:${input.reviewerId}`;
      const saved: CandidateEvaluation = { id: rows.get(key)?.id ?? String(rows.size + 1),
        applicationId: input.applicationId, reviewerId: input.reviewerId, scores: input.scores,
        ...(input.totalScore !== undefined ? { totalScore: input.totalScore } : {}),
        ...(input.comment !== undefined ? { comment: input.comment } : {}),
        createdAt: rows.get(key)?.createdAt ?? input.now };
      rows.set(key, saved);
      return saved;
    },
  };
  return { repo, rows };
}

const shortlisted: EvaluationTarget = { applicationState: "Shortlisted", campaignState: "Screening", rubric };
const input = { clubId, campaignId, applicationId };

// ---- Block to append to tests/unit/candidate-evaluation.test.ts (plus the candidateEvaluationBody import) ----
describe("UC19 candidate evaluation — adversarial input", () => {
  function scored(scores: Record<string, number>) {
    return { ...input, scores };
  }

  it("accepts the scale bounds and rejects non-finite or out-of-range scores", async () => {
    const { repo } = memoryRepo(shortlisted);
    await expect(recordCandidateEvaluation(repo, accessRepo(), actor(), scored({ communication: 0, teamwork: 10 }), now))
      .resolves.toMatchObject({ totalScore: 10 });
    for (const bad of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 10.01]) {
      await expect(recordCandidateEvaluation(repo, accessRepo(), actor(), scored({ communication: 1, teamwork: bad }), now))
        .rejects.toMatchObject({ kind: "validation" });
    }
  });

  it("rejects a missing criterion even when an extra key keeps the count equal", async () => {
    const { repo } = memoryRepo(shortlisted);
    await expect(recordCandidateEvaluation(repo, accessRepo(), actor(), scored({ communication: 1, other: 1 }), now))
      .rejects.toMatchObject({ kind: "validation" });
  });

  it("HTTP body: only numeric scores, no reviewer override, bounded comment", () => {
    for (const body of [{ scores: { communication: "4" } }, { scores: { communication: Number.NaN } },
      { scores: [4] }, { scores: { communication: 4 }, reviewerId: reviewerB },
      { scores: {}, comment: "x".repeat(2001) }, { comment: "no scores" }]) {
      expect(candidateEvaluationBody.safeParse(body).success, JSON.stringify(body)).toBe(false);
    }
    expect(candidateEvaluationBody.safeParse({ scores: { communication: 4 }, comment: "ok" }).success).toBe(true);
  });

  it("E1: a whitespace-only or over-long comment is not a written evaluation", async () => {
    const { repo } = memoryRepo({ ...shortlisted, rubric: [] });
    for (const comment of ["   \n ", "x".repeat(2001)]) {
      await expect(recordCandidateEvaluation(repo, accessRepo(), actor(), { ...input, scores: {}, comment }, now))
        .rejects.toMatchObject({ kind: "validation" });
    }
  });

  it("stores the evaluation under the caller only; another reviewer cannot overwrite it", async () => {
    const { repo, rows } = memoryRepo(shortlisted);
    await recordCandidateEvaluation(repo, accessRepo(), actor(), scored({ communication: 5, teamwork: 10 }), now);
    await recordCandidateEvaluation(repo, accessRepo(), actor(reviewerB), scored({ communication: 0, teamwork: 0 }), now);
    expect(rows.get(`${applicationId}:${reviewerA}`)).toMatchObject({ reviewerId: reviewerA, totalScore: 15 });
    expect(rows.get(`${applicationId}:${reviewerB}`)).toMatchObject({ reviewerId: reviewerB, totalScore: 0 });
  });

  it("checks the permission in the club named by the path, before touching the repository", async () => {
    const otherClub = "888888888888888888888888";
    const scopedAccess: ClubAccessRepository = { findSnapshot: async (userId, club) =>
      club === clubId ? accessRepo().findSnapshot(userId, club) : null };
    const repo: CandidateEvaluationRepository = {
      target: async () => { throw new Error("repository reached"); },
      listForCampaign: async () => { throw new Error("repository reached"); },
      save: async () => { throw new Error("repository reached"); },
    };
    await expect(recordCandidateEvaluation(repo, scopedAccess, actor(),
      { ...input, clubId: otherClub, scores: { communication: 1, teamwork: 1 } }, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(listCandidateEvaluations(repo, scopedAccess, actor(), otherClub, campaignId, now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });

  it("rejects malformed campaign/application ids as validation errors", async () => {
    const { repo } = memoryRepo(shortlisted);
    await expect(recordCandidateEvaluation(repo, accessRepo(), actor(),
      { ...input, applicationId: "{\"$gt\":\"\"}", scores: {} }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(listCandidateEvaluations(repo, accessRepo(), actor(), clubId, "not-an-id", now))
      .rejects.toMatchObject({ kind: "validation" });
  });

  it("summary math: no, one, and mixed scored/free-text evaluations", () => {
    function evaluation(reviewerId: string, totalScore?: number): CandidateEvaluation {
      return { id: reviewerId, applicationId, reviewerId, scores: {},
        ...(totalScore !== undefined ? { totalScore } : { comment: "text" }), createdAt: now };
    }
    expect(summarizeEvaluations(rubric, [])).toEqual({ count: 0, scoredCount: 0, maxTotal: 15 });
    expect(summarizeEvaluations(rubric, [evaluation(reviewerA, 7.5)]))
      .toEqual({ count: 1, scoredCount: 1, maxTotal: 15, mean: 7.5, min: 7.5, max: 7.5, stdDev: 0 });
    expect(summarizeEvaluations(rubric, [evaluation(reviewerA, 4), evaluation(reviewerB), evaluation("c", 10)]))
      .toEqual({ count: 3, scoredCount: 2, maxTotal: 15, mean: 7, min: 4, max: 10, stdDev: 3 });
  });
});
