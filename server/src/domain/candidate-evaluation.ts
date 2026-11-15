import { DomainError } from "./errors.js";
import type { RecruitmentApplicationState } from "./recruitment-application.js";
import type { CampaignState, RecruitmentRubricCriterion } from "./recruitment-campaign.js";

export interface CandidateEvaluation {
  id: string;
  applicationId: string;
  reviewerId: string;
  reviewerName?: string;
  scores: Record<string, number>;
  /** Tổng điểm rubric; không có với đánh giá dạng văn bản tự do (đợt tuyển không có rubric). */
  totalScore?: number;
  comment?: string;
  createdAt: Date;
}

export interface CandidateEvaluationSummary {
  count: number;
  scoredCount: number;
  maxTotal: number;
  mean?: number;
  min?: number;
  max?: number;
  stdDev?: number;
}

export interface EvaluationTarget {
  applicationState: RecruitmentApplicationState;
  campaignState: CampaignState;
  rubric: readonly RecruitmentRubricCriterion[];
}

export interface CandidateEvaluationRepository {
  /** Hồ sơ ứng tuyển thuộc đợt tuyển của CLB này, kèm rubric của đợt; null khi không tìm thấy. */
  target(clubId: string, campaignId: string, applicationId: string): Promise<EvaluationTarget | null>;
  listForCampaign(clubId: string, campaignId: string): Promise<{
    rubric: RecruitmentRubricCriterion[]; evaluations: CandidateEvaluation[] } | null>;
  /** Upsert bản đánh giá của chính người chấm; phải kiểm tra lại hồ sơ vẫn đang Shortlisted. */
  save(input: { applicationId: string; reviewerId: string; scores: Record<string, number>;
    totalScore?: number; comment?: string; now: Date }): Promise<CandidateEvaluation>;
}

// Đảm bảo hồ sơ ứng tuyển đang ở trạng thái Shortlisted và đợt tuyển chưa bị huỷ để được chấm
export function assertEvaluable(target: EvaluationTarget): void {
  if (target.campaignState === "Cancelled") {
    throw new DomainError("campaign is cancelled", "conflict");
  }
  if (target.applicationState !== "Shortlisted") {
    throw new DomainError("only shortlisted applications without a decision can be evaluated", "conflict");
  }
}

// Kiểm tra điểm theo rubric và dựng bản đánh giá ứng viên
export function buildCandidateEvaluation(rubric: readonly RecruitmentRubricCriterion[],
  input: { scores: Record<string, number>; comment?: string }) {
  const comment = input.comment?.trim();
  if (comment && comment.length > 2000) throw new DomainError("evaluation comment is too long", "validation");
  const keys = Object.keys(input.scores);
  if (!rubric.length) {
    if (keys.length) throw new DomainError("campaign has no rubric; scores are not allowed", "validation");
    if (!comment) throw new DomainError("a written evaluation is required when the campaign has no rubric", "validation");
    return { scores: {}, comment };
  }
  if (keys.length !== rubric.length || rubric.some((criterion) => {
    const score = input.scores[criterion.key];
    return typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > criterion.maxScore;
  })) {
    throw new DomainError("every rubric criterion needs a score within its scale", "validation", {
      criteria: rubric.map(({ key, maxScore }) => ({ key, maxScore })),
    });
  }
  const scores = Object.fromEntries(rubric.map((criterion) => [criterion.key, input.scores[criterion.key]!]));
  const totalScore = rubric.reduce((sum, criterion) => sum + scores[criterion.key]!, 0);
  return { scores, totalScore, ...(comment ? { comment } : {}) };
}

// Tổng hợp điểm trung bình và độ phân tán từ các bản đánh giá của ứng viên
/** Tổng hợp (trung bình) và độ phân tán (min/max/độ lệch chuẩn tổng thể) của các tổng điểm. */
export function summarizeEvaluations(rubric: readonly RecruitmentRubricCriterion[],
  evaluations: readonly CandidateEvaluation[]): CandidateEvaluationSummary {
  const totals = evaluations.flatMap((evaluation) =>
    evaluation.totalScore === undefined ? [] : [evaluation.totalScore]);
  const summary = { count: evaluations.length, scoredCount: totals.length,
    maxTotal: rubric.reduce((sum, criterion) => sum + criterion.maxScore, 0) };
  if (!totals.length) return summary;
  const mean = totals.reduce((sum, total) => sum + total, 0) / totals.length;
  const variance = totals.reduce((sum, total) => sum + (total - mean) ** 2, 0) / totals.length;
  return { ...summary, mean, min: Math.min(...totals), max: Math.max(...totals), stdDev: Math.sqrt(variance) };
}
