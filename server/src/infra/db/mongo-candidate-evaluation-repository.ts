import mongoose, { Types } from "mongoose";
import type { CandidateEvaluation, CandidateEvaluationRepository } from "../../domain/candidate-evaluation.js";
import { DomainError } from "../../domain/errors.js";
import type { RecruitmentApplicationState } from "../../domain/recruitment-application.js";
import type { CampaignState, RecruitmentRubricCriterion } from "../../domain/recruitment-campaign.js";
import { ucmsModels } from "./ucms-models.js";

function rubricOf(value: unknown): RecruitmentRubricCriterion[] {
  return Array.isArray(value) ? value.flatMap((item: Record<string, unknown>) =>
    item && typeof item.key === "string" && typeof item.label === "string" && typeof item.maxScore === "number"
      ? [{ key: item.key, label: item.label, maxScore: item.maxScore }] : []) : [];
}

function mapEvaluation(doc: Record<string, unknown>, reviewerName?: string): CandidateEvaluation {
  const scores = doc.scores && typeof doc.scores === "object" ? doc.scores as Record<string, number> : {};
  return {
    id: String(doc._id), applicationId: String(doc.applicationId), reviewerId: String(doc.reviewerId),
    ...(reviewerName ? { reviewerName } : {}), scores,
    ...(doc.totalScore != null ? { totalScore: Number(String(doc.totalScore)) } : {}),
    ...(typeof doc.comment === "string" ? { comment: doc.comment } : {}),
    createdAt: doc.createdAt as Date,
  };
}

export function mongoCandidateEvaluationRepository(): CandidateEvaluationRepository {
  const evaluations = ucmsModels.candidateEvaluations!;
  const applications = ucmsModels.recruitmentApplications!;
  const campaigns = ucmsModels.recruitmentCampaigns!;
  const users = ucmsModels.users!;

  return {
    async target(clubId, campaignId, applicationId) {
      const [campaign, application] = await Promise.all([
        campaigns.findOne({ _id: new Types.ObjectId(campaignId), clubId: new Types.ObjectId(clubId) })
          .select("state rubric").lean(),
        applications.findOne({ _id: new Types.ObjectId(applicationId), campaignId: new Types.ObjectId(campaignId),
          clubId: new Types.ObjectId(clubId) }).select("state").lean(),
      ]);
      if (!campaign || !application) return null;
      return { campaignState: String(campaign.state) as CampaignState,
        applicationState: String(application.state) as RecruitmentApplicationState, rubric: rubricOf(campaign.rubric) };
    },

    async listForCampaign(clubId, campaignId) {
      const campaign = await campaigns.findOne({ _id: new Types.ObjectId(campaignId),
        clubId: new Types.ObjectId(clubId) }).select("rubric").lean();
      if (!campaign) return null;
      const applicationIds = await applications.find({ campaignId: campaign._id }).distinct("_id");
      const docs = await evaluations.find({ applicationId: { $in: applicationIds } })
        .sort({ createdAt: 1, _id: 1 }).lean();
      const reviewers = await users.find({ _id: { $in: docs.map((doc) => doc.reviewerId) } })
        .select("displayName").lean();
      const names = new Map(reviewers.map((user) => [String(user._id), String(user.displayName ?? "")]));
      return { rubric: rubricOf(campaign.rubric),
        evaluations: docs.map((doc) => mapEvaluation(doc, names.get(String(doc.reviewerId)))) };
    },

    async save(input) {
      const applicationId = new Types.ObjectId(input.applicationId);
      const reviewerId = new Types.ObjectId(input.reviewerId);
      return mongoose.connection.transaction(async (session) => {
        // ponytail: read-check, not a write lock — a decision committed in the same instant can
        // still race this save; bump a version field on the application if that ever matters.
        if (!await applications.exists({ _id: applicationId, state: "Shortlisted" }).session(session)) {
          throw new DomainError("only shortlisted applications without a decision can be evaluated", "conflict");
        }
        const unset: Record<string, 1> = {};
        if (input.totalScore === undefined) unset.totalScore = 1;
        if (input.comment === undefined) unset.comment = 1;
        const doc = await evaluations.findOneAndUpdate({ applicationId, reviewerId }, {
          $set: { scores: input.scores,
            ...(input.totalScore !== undefined
              ? { totalScore: Types.Decimal128.fromString(String(input.totalScore)) } : {}),
            ...(input.comment !== undefined ? { comment: input.comment } : {}) },
          $setOnInsert: { createdAt: input.now },
          ...(Object.keys(unset).length ? { $unset: unset } : {}),
        }, { upsert: true, new: true, session }).lean();
        if (!doc) throw new DomainError("evaluation could not be saved", "conflict");
        return mapEvaluation(doc);
      });
    },
  };
}
