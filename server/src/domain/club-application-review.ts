import type {
  ApplicationDocument,
  ClubApplicationRecord,
  ClubApplicationVersion,
  FounderProfile,
} from './club-application.js'
import type { SimilarityCandidate } from './similar-club.js'

export type ApplicationReviewOutcome = 'Request revision' | 'Approve' | 'Reject'

export interface ApplicationReviewTask {
  id: string
  applicationId: string
  title: string
  state: 'Open' | 'Decided' | 'Closed'
  assigneeId?: string
  openedAt: Date
  slaDueAt?: Date
}

export interface ApplicationReviewDecision {
  id: string
  taskId: string
  outcome: ApplicationReviewOutcome
  reason?: string
  sections: string[]
  reviewNote?: string
  policyVersionId?: string
  actorId: string
  at: Date
}

export interface ApplicationReviewQueueItem {
  task: ApplicationReviewTask
  application: ClubApplicationRecord
}

export interface ApplicationReviewDetail extends ApplicationReviewQueueItem {
  versions: ClubApplicationVersion[]
  decisions: ApplicationReviewDecision[]
  /** Thành viên sáng lập của phiên bản nộp mới nhất, để ICPDP thấy tên thay vì id. */
  founders: FounderProfile[]
  /** UC07 E3: các CLB Active đã dùng tên được đề xuất; ICPDP quyết định ở UC08. */
  nameConflicts: Array<{ id: string; code: string; name: string }>
}

export interface ApplicationReviewDecisionInput {
  outcome: ApplicationReviewOutcome
  reason?: string
  sections?: string[]
  reviewNote?: string
  revisionDeadlineAt?: Date
}

export interface ClubApplicationReviewRepository {
  listOpen(): Promise<ApplicationReviewQueueItem[]>
  find(applicationId: string): Promise<ApplicationReviewDetail | null>
  findDocument(applicationId: string, documentId: string): Promise<ApplicationDocument | null>
  /** CLB ở mọi trạng thái cùng các hồ sơ đang chờ khác, trừ hồ sơ này và CLB do nó tạo ra. */
  similarityCandidates(applicationId: string): Promise<SimilarityCandidate[]>
  claim(applicationId: string, officerId: string, now: Date): Promise<ApplicationReviewDetail>
  decide(
    applicationId: string,
    officerId: string,
    input: ApplicationReviewDecisionInput,
    now: Date,
  ): Promise<ApplicationReviewDetail>
}
