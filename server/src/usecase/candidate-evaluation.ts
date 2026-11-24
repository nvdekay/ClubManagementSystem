import type { ClubAccessRepository } from '../domain/access.js'
import {
  assertEvaluable,
  buildCandidateEvaluation,
  summarizeEvaluations,
  type CandidateEvaluation,
  type CandidateEvaluationRepository,
} from '../domain/candidate-evaluation.js'
import { DomainError } from '../domain/errors.js'
import { assertClubAccess, type AccessActor } from './access.js'

const objectId = /^[0-9a-f]{24}$/i

// Kiểm các id truyền vào đúng định dạng ObjectId
function assertIds(ids: Record<string, string>): void {
  for (const [label, value] of Object.entries(ids)) {
    if (!objectId.test(value)) {
      throw new DomainError(`invalid ${label} id`, 'validation')
    }
  }
}

// Liệt kê đánh giá ứng viên theo đơn kèm rubric và thống kê tổng hợp
/** UC19 A1/UC18 bước 4: rubric của chiến dịch + các đánh giá nhóm theo đơn, kèm tổng hợp và độ phân tán. */
export async function listCandidateEvaluations(
  repo: CandidateEvaluationRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  campaignId: string,
  now = new Date(),
) {
  await assertClubAccess(access, actor, clubId, 'club.application.review', now)
  assertIds({ campaign: campaignId })
  const found = await repo.listForCampaign(clubId, campaignId)
  if (!found) {
    throw new DomainError('recruitment campaign not found', 'not_found')
  }
  const byApplication = new Map<string, CandidateEvaluation[]>()
  for (const evaluation of found.evaluations) {
    byApplication.set(evaluation.applicationId, [
      ...(byApplication.get(evaluation.applicationId) ?? []),
      evaluation,
    ])
  }
  // Rubric đi kèm danh sách: reviewer có thể không có club.recruitment.manage để đọc chiến dịch.
  return {
    rubric: found.rubric,
    applications: [...byApplication].map(([applicationId, evaluations]) => ({
      applicationId,
      evaluations,
      summary: summarizeEvaluations(found.rubric, evaluations),
    })),
  }
}

// Reviewer tạo hoặc cập nhật đánh giá của mình cho đơn đã Shortlisted
/** UC19 luồng chính: tạo hoặc cập nhật đánh giá của chính người gọi cho một đơn Shortlisted. */
export async function recordCandidateEvaluation(
  repo: CandidateEvaluationRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  input: {
    clubId: string
    campaignId: string
    applicationId: string
    scores: Record<string, number>
    comment?: string
  },
  now = new Date(),
) {
  await assertClubAccess(access, actor, input.clubId, 'club.application.review', now)
  assertIds({ campaign: input.campaignId, application: input.applicationId })
  const target = await repo.target(input.clubId, input.campaignId, input.applicationId)
  if (!target) {
    throw new DomainError('application not found', 'not_found')
  }
  assertEvaluable(target)
  const evaluation = buildCandidateEvaluation(target.rubric, input)
  return repo.save({
    ...evaluation,
    applicationId: input.applicationId,
    reviewerId: actor!.id,
    now,
  })
}
