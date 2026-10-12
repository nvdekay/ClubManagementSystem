import { describe, expect, it } from "vitest";
import type { ClubAccessRepository } from "../../src/domain/access.js";
import type { CandidateEvaluation, CandidateEvaluationRepository,
  EvaluationTarget } from "../../src/domain/candidate-evaluation.js";
import { summarizeEvaluations } from "../../src/domain/candidate-evaluation.js";
import type { RecruitmentRubricCriterion } from "../../src/domain/recruitment-campaign.js";
import { listCandidateEvaluations, recordCandidateEvaluation } from "../../src/usecase/candidate-evaluation.js";

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
      if (target.applicationState !== "Shortlisted") throw new Error("repo must not be reached");
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

describe("UC19 candidate evaluation", () => {
  it("records a rubric evaluation of a Shortlisted application for the calling reviewer", async () => {
    const { repo } = memoryRepo(shortlisted);
    await expect(recordCandidateEvaluation(repo, accessRepo(), actor(), {
      ...input, scores: { communication: 4, teamwork: 7.5 }, comment: "  Strong interview  " }, now))
      .resolves.toMatchObject({ reviewerId: reviewerA, applicationId,
        scores: { communication: 4, teamwork: 7.5 }, totalScore: 11.5, comment: "Strong interview" });
  });

  it("rejects scores that do not match the campaign rubric", async () => {
    const { repo } = memoryRepo(shortlisted);
    for (const scores of [{ communication: 4 }, { communication: 6, teamwork: 1 },
      { communication: -1, teamwork: 1 }, { communication: 1, teamwork: 1, extra: 1 },
      { communication: Number.NaN, teamwork: 1 }] as Record<string, number>[]) {
      await expect(recordCandidateEvaluation(repo, accessRepo(), actor(), { ...input, scores }, now))
        .rejects.toMatchObject({ kind: "validation" });
    }
  });

  it("E1: without a rubric the evaluation is a required free-text comment", async () => {
    const { repo } = memoryRepo({ ...shortlisted, rubric: [] });
    await expect(recordCandidateEvaluation(repo, accessRepo(), actor(), { ...input, scores: {} }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(recordCandidateEvaluation(repo, accessRepo(), actor(),
      { ...input, scores: { communication: 3 }, comment: "Good" }, now)).rejects.toMatchObject({ kind: "validation" });
    const saved = await recordCandidateEvaluation(repo, accessRepo(), actor(),
      { ...input, scores: {}, comment: "Motivated, ready to help with events" }, now);
    expect(saved).toMatchObject({ scores: {}, comment: "Motivated, ready to help with events" });
    expect(saved.totalScore).toBeUndefined();
  });

  it("A1: one evaluation per reviewer, updatable, with aggregate and dispersion across reviewers", async () => {
    const { repo, rows } = memoryRepo(shortlisted);
    await recordCandidateEvaluation(repo, accessRepo(), actor(), { ...input, scores: { communication: 1, teamwork: 1 } }, now);
    await recordCandidateEvaluation(repo, accessRepo(), actor(), { ...input, scores: { communication: 5, teamwork: 5 } }, now);
    await recordCandidateEvaluation(repo, accessRepo(), actor(reviewerB),
      { ...input, scores: { communication: 2, teamwork: 4 } }, now);
    expect(rows.size).toBe(2);
    const listed = await listCandidateEvaluations(repo, accessRepo(), actor(), clubId, campaignId, now);
    expect(listed.rubric).toEqual(rubric);
    const [group] = listed.applications;
    expect(group?.evaluations.map((evaluation) => evaluation.totalScore)).toEqual([10, 6]);
    expect(group?.summary).toEqual({ count: 2, scoredCount: 2, maxTotal: 15, mean: 8, min: 6, max: 10, stdDev: 2 });
  });

  it("summarizes free-text-only evaluations without a score", () => {
    expect(summarizeEvaluations([], [{ id: "1", applicationId, reviewerId: reviewerA, scores: {},
      comment: "ok", createdAt: now }])).toEqual({ count: 1, scoredCount: 0, maxTotal: 0 });
  });

  it("evaluations become immutable once the application leaves Shortlisted", async () => {
    for (const applicationState of ["Accepted", "Rejected", "Waitlisted", "Withdrawn", "Screening"] as const) {
      const { repo } = memoryRepo({ ...shortlisted, applicationState });
      await expect(recordCandidateEvaluation(repo, accessRepo(), actor(),
        { ...input, scores: { communication: 1, teamwork: 1 } }, now)).rejects.toMatchObject({ kind: "conflict" });
    }
    const { repo } = memoryRepo({ ...shortlisted, campaignState: "Cancelled" });
    await expect(recordCandidateEvaluation(repo, accessRepo(), actor(),
      { ...input, scores: { communication: 1, teamwork: 1 } }, now)).rejects.toMatchObject({ kind: "conflict" });
  });

  it("E2: callers without club.application.review are rejected", async () => {
    const { repo } = memoryRepo(shortlisted);
    await expect(recordCandidateEvaluation(repo, accessRepo(false), actor(),
      { ...input, scores: { communication: 1, teamwork: 1 } }, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(listCandidateEvaluations(repo, accessRepo(false), actor(), clubId, campaignId, now))
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(listCandidateEvaluations(repo, accessRepo(), null, clubId, campaignId, now))
      .rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("reports unknown applications and campaigns as not found", async () => {
    const { repo } = memoryRepo(shortlisted);
    await expect(recordCandidateEvaluation(repo, accessRepo(), actor(),
      { ...input, applicationId: "999999999999999999999999", scores: {} }, now)).rejects.toMatchObject({ kind: "not_found" });
    await expect(listCandidateEvaluations(repo, accessRepo(), actor(), clubId, "999999999999999999999999", now))
      .rejects.toMatchObject({ kind: "not_found" });
  });
});
