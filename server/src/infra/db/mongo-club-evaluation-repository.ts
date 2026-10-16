import { Types } from "mongoose";
import type { ClubEvaluationRepository } from "../../domain/club-evaluation.js";
import { mongoEvaluationRepository } from "./mongo-evaluation-repository.js";
import { ucmsModels as m } from "./ucms-models.js";
export function mongoClubEvaluationRepository(): ClubEvaluationRepository {
  return { async listPublished(clubId) {
    const docs = await m.evaluations!.find({ clubId: new Types.ObjectId(clubId), state: "Published" }).sort({ publishedAt: -1, revisionNo: -1 }).lean();
    const reader = mongoEvaluationRepository();
    const details = await Promise.all(docs.map((d) => reader.find(String(d._id))));
    return details.filter((d): d is NonNullable<typeof d> => Boolean(d)).map((d) => ({ ...d, revisions: d.revisions.filter((r) => r.state === "Published") }));
  } };
}
