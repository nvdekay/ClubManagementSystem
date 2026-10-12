export type CampaignState = "Draft" | "Published" | "Accepting Applications"
  | "Screening" | "Completed" | "Cancelled";

export interface RecruitmentSelectionStep {
  name: string;
  description?: string;
  startsAt?: Date;
  endsAt?: Date;
}

export interface RecruitmentFormField {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "select" | "multiselect" | "file";
  required: boolean;
  options?: string[];
}

export interface RecruitmentRubricCriterion {
  key: string;
  label: string;
  maxScore: number;
}

export interface RecruitmentCampaignInput {
  title: string;
  positions: readonly string[];
  criteria?: string;
  windowStart: Date;
  windowEnd: Date;
  capacity: number;
  selectionSteps: readonly RecruitmentSelectionStep[];
  formSchema: readonly RecruitmentFormField[];
  rubric: readonly RecruitmentRubricCriterion[];
}

export interface RecruitmentCampaign extends RecruitmentCampaignInput {
  id: string;
  clubId: string;
  state: CampaignState;
  publishedBy?: string;
  publishedAt?: Date;
  createdAt: Date;
}

export interface OverlappingCampaign {
  id: string;
  title: string;
  positions: string[];
  windowStart: Date;
  windowEnd: Date;
  state: CampaignState;
}

export interface RecruitmentCampaignRepository {
  list(clubId: string): Promise<RecruitmentCampaign[]>;
  find(clubId: string, campaignId: string): Promise<RecruitmentCampaign | null>;
  overlaps(clubId: string, campaignId: string | undefined,
    positions: readonly string[], windowStart: Date,
    windowEnd: Date): Promise<OverlappingCampaign[]>;
  createDraft(clubId: string, actorId: string, input: RecruitmentCampaignInput,
    now: Date): Promise<RecruitmentCampaign>;
  updateDraft(clubId: string, campaignId: string, actorId: string,
    input: RecruitmentCampaignInput, now: Date): Promise<RecruitmentCampaign>;
  publish(clubId: string, campaignId: string, actorId: string,
    now: Date): Promise<RecruitmentCampaign>;
  cancel(clubId: string, campaignId: string, actorId: string,
    now: Date): Promise<RecruitmentCampaign>;
}
