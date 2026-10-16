import type { EvaluationDetail } from "./evaluation.js";
export interface ClubEvaluationRepository { listPublished(clubId: string): Promise<EvaluationDetail[]> }
