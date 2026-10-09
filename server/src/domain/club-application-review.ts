import type {
  ApplicationDocument,
  ClubApplicationRecord,
  ClubApplicationVersion, FounderProfile,
} from "./club-application.js";

export type ApplicationReviewOutcome = "Request revision" | "Approve" | "Reject";

export interface ApplicationReviewTask {
  id: string;
  applicationId: string;
  title: string;
  state: "Open" | "Decided" | "Closed";
  assigneeId?: string;
  openedAt: Date;
  slaDueAt?: Date;
}

export interface ApplicationReviewDecision {
  id: string;
  taskId: string;
  outcome: ApplicationReviewOutcome;
  reason?: string;
  sections: string[];
  reviewNote?: string;
  actorId: string;
  at: Date;
}

export interface ApplicationReviewQueueItem {
  task: ApplicationReviewTask;
  application: ClubApplicationRecord;
}

export interface ApplicationReviewDetail extends ApplicationReviewQueueItem {
  versions: ClubApplicationVersion[];
  decisions: ApplicationReviewDecision[];
  /** Founding members of the latest submitted version, so ICPDP sees names instead of ids. */
  founders: FounderProfile[];
}

export interface ApplicationReviewDecisionInput {
  outcome: ApplicationReviewOutcome;
  reason?: string;
  sections?: string[];
  reviewNote?: string;
  revisionDeadlineAt?: Date;
}

export interface ClubApplicationReviewRepository {
  listOpen(): Promise<ApplicationReviewQueueItem[]>;
  find(applicationId: string): Promise<ApplicationReviewDetail | null>;
  findDocument(applicationId: string, documentId: string): Promise<ApplicationDocument | null>;
  claim(applicationId: string, officerId: string, now: Date): Promise<ApplicationReviewDetail>;
  decide(applicationId: string, officerId: string,
    input: ApplicationReviewDecisionInput, now: Date): Promise<ApplicationReviewDetail>;
}
