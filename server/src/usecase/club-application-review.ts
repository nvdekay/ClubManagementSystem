import type { AuthRepository } from '../domain/auth.js'
import type {
  ApplicationReviewDecisionInput,
  ApplicationReviewDetail,
  ClubApplicationReviewRepository,
} from '../domain/club-application-review.js'
import type { ApplicationFileStorage } from '../domain/club-application.js'
import { DomainError } from '../domain/errors.js'
import { similarClubHints, type SimilarClubHint } from '../domain/similar-club.js'
import { parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

const allowedSections = new Set([
  'club-information',
  'founders',
  'documents',
  'role-structure',
  'other',
])

// Chuẩn hóa và kiểm quyết định xét duyệt (lý do, mục cần sửa, hạn sửa)
function normalizedDecision(input: ApplicationReviewDecisionInput, now: Date) {
  const reason = input.reason?.trim()
  const reviewNote = input.reviewNote?.trim()
  const sections = [...new Set((input.sections ?? []).map((section) => section.trim()))]
  if (!reason && input.outcome !== 'Approve') {
    throw new DomainError('decision reason is required', 'validation')
  }
  if ((reason && reason.length > 5_000) || (reviewNote && reviewNote.length > 10_000)) {
    throw new DomainError('review text is too long', 'validation')
  }
  if (sections.some((section) => !allowedSections.has(section))) {
    throw new DomainError('invalid review section', 'validation')
  }
  if (input.outcome === 'Request revision') {
    if (!sections.length) {
      throw new DomainError('revision sections are required', 'validation')
    }
    if (!input.revisionDeadlineAt || input.revisionDeadlineAt <= now) {
      throw new DomainError('future revision deadline is required', 'validation')
    }
  } else if (input.revisionDeadlineAt) {
    throw new DomainError('revision deadline only applies to revision requests', 'validation')
  }
  return {
    outcome: input.outcome,
    reason,
    reviewNote,
    sections,
    revisionDeadlineAt: input.revisionDeadlineAt,
  }
}

export type ApplicationReviewView = ApplicationReviewDetail & { similarClubs: SimilarClubHint[] }

// Gắn gợi ý các CLB tương tự vào chi tiết đơn để officer tham khảo
/** Chỉ mang tính tham khảo (UC08): so sánh với phiên bản nộp mới nhất; không bao giờ chọn kết quả. */
async function withSimilarClubs(
  repo: ClubApplicationReviewRepository,
  detail: ApplicationReviewDetail,
): Promise<ApplicationReviewView> {
  const { clubName, field, summary, objectives } =
    detail.versions.at(-1)?.snapshot ?? detail.application.draft
  return {
    ...detail,
    similarClubs: similarClubHints(
      { name: clubName, field, text: `${summary} ${objectives}` },
      await repo.similarityCandidates(detail.application.id),
    ),
  }
}

// ICPDP xem các đơn lập CLB đang chờ xét duyệt
export async function listApplicationReviews(
  repo: ClubApplicationReviewRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
) {
  await requireIcpdpOfficer(auth, actor)
  return repo.listOpen()
}

// ICPDP xem chi tiết một đơn lập CLB kèm gợi ý CLB tương tự
export async function getApplicationReview(
  repo: ClubApplicationReviewRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  id: string,
) {
  await requireIcpdpOfficer(auth, actor)
  const detail = await repo.find(parseObjectId(id, 'application id'))
  if (!detail) {
    throw new DomainError('application review not found', 'not_found')
  }
  return withSimilarClubs(repo, detail)
}

// ICPDP officer nhận xử lý một đơn lập CLB
export async function claimApplicationReview(
  repo: ClubApplicationReviewRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  return withSimilarClubs(
    repo,
    await repo.claim(
      parseObjectId(id, 'application id'),
      await requireIcpdpOfficer(auth, actor),
      now,
    ),
  )
}

// ICPDP ghi quyết định duyệt, yêu cầu sửa hoặc từ chối đơn lập CLB
export async function decideApplicationReview(
  repo: ClubApplicationReviewRepository,
  auth: AuthRepository,
  actor: AccessActor | null,
  id: string,
  input: ApplicationReviewDecisionInput,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  return withSimilarClubs(
    repo,
    await repo.decide(
      parseObjectId(id, 'application id'),
      officerId,
      normalizedDecision(input, now),
      now,
    ),
  )
}

// Cấp URL tạm để ICPDP xem tài liệu đính kèm của đơn
export async function applicationReviewDocumentAccess(
  repo: ClubApplicationReviewRepository,
  auth: AuthRepository,
  storage: ApplicationFileStorage | null,
  actor: AccessActor | null,
  id: string,
  documentId: string,
) {
  await requireIcpdpOfficer(auth, actor)
  if (!storage) {
    throw new DomainError('file storage is not configured', 'unavailable')
  }
  const document = await repo.findDocument(parseObjectId(id, 'application id'), documentId)
  if (!document) {
    throw new DomainError('application document not found', 'not_found')
  }
  return { fileName: document.fileName, url: await storage.accessUrl(document.assetId) }
}
