import { DomainError, orNotFound } from '../domain/errors.js'
import type {
  RecruitmentApplicationState,
  RecruitmentAttachmentStorage,
  RecruitmentDecision,
  RecruitmentReviewRepository,
} from '../domain/recruitment-application.js'
import type { ClubAccessRepository } from '../domain/access.js'
import { assertClubAccess, isObjectId, type AccessActor } from './access.js'

// Kiểm người xét duyệt đăng nhập và tài khoản Active
function reviewerId(actor: AccessActor | null): string {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState !== 'Active') {
    throw new DomainError('account is not active', 'locked')
  }
  return actor.id
}

// Kiểm quyền xét duyệt đơn ứng tuyển của CLB và trả id actor
async function authorize(
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  if (!isObjectId(clubId)) {
    throw new DomainError('invalid club id', 'validation')
  }
  const userId = reviewerId(actor)
  await assertClubAccess(access, actor, clubId, 'club.application.review', now)
  return userId
}

// CLB xem các đơn ứng tuyển của một đợt tuyển để xét duyệt
export async function listRecruitmentApplicationsForReview(
  repo: RecruitmentReviewRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  campaignId: string,
  state: RecruitmentApplicationState | undefined,
  now = new Date(),
) {
  await authorize(access, actor, clubId, now)
  if (!isObjectId(campaignId)) {
    throw new DomainError('invalid campaign id', 'validation')
  }
  return repo.listForReview(clubId, campaignId, state)
}

// Cấp URL tạm để người xét duyệt xem file đính kèm của đơn
export async function reviewerAttachmentAccess(
  repo: RecruitmentReviewRepository,
  storage: RecruitmentAttachmentStorage | null,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  input: { clubId: string; campaignId: string; applicationId: string; attachmentId: string },
  now = new Date(),
) {
  await authorize(access, actor, input.clubId, now)
  for (const [label, value] of [
    ['campaign', input.campaignId],
    ['application', input.applicationId],
  ] as const) {
    if (!isObjectId(value)) {
      throw new DomainError(`invalid ${label} id`, 'validation')
    }
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.attachmentId)) {
    throw new DomainError('invalid attachment id', 'validation')
  }
  const attachment = orNotFound(await repo.reviewAttachment(input), 'recruitment attachment')
  if (!storage) {
    throw new DomainError('file storage is not configured', 'unavailable')
  }
  return { url: await storage.accessUrl(attachment.assetId), fileName: attachment.fileName }
}

// CLB chuyển trạng thái hàng loạt đơn ứng tuyển (sàng lọc, shortlist, quyết định...)
export async function reviewRecruitmentApplications(
  repo: RecruitmentReviewRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  input: {
    clubId: string
    campaignId: string
    applicationIds: string[]
    action: 'screen' | 'shortlist' | 'decide' | 'promote' | 'close-withdrawn'
    outcome?: RecruitmentDecision
    reason?: string
  },
  now = new Date(),
) {
  const actorId = await authorize(access, actor, input.clubId, now)
  if (
    !isObjectId(input.campaignId) ||
    !input.applicationIds.length ||
    input.applicationIds.length > 100 ||
    input.applicationIds.some((id) => !isObjectId(id)) ||
    new Set(input.applicationIds).size !== input.applicationIds.length
  ) {
    throw new DomainError('invalid recruitment review request', 'validation')
  }
  const reason = input.reason?.trim()
  if (reason && reason.length > 2000) {
    throw new DomainError('review reason is too long', 'validation')
  }
  if (input.action === 'decide' && !input.outcome) {
    throw new DomainError('decision outcome is required', 'validation')
  }
  if (input.action === 'decide' && input.outcome === 'Rejected' && !reason) {
    throw new DomainError('rejection reason is required', 'validation')
  }
  if (input.action === 'shortlist' && !reason) {
    throw new DomainError('shortlist reason is required', 'validation')
  }
  return repo.transition({ ...input, ...(reason ? { reason } : {}), actorId, now })
}

// CLB kết nạp ứng viên đã được nhận thành thành viên
export async function onboardAcceptedRecruitmentApplication(
  repo: RecruitmentReviewRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  input: {
    clubId: string
    campaignId: string
    applicationId: string
    joinedAt: Date
    departmentId?: string
  },
  now = new Date(),
) {
  const actorId = await authorize(access, actor, input.clubId, now)
  if (
    !isObjectId(input.campaignId) ||
    !isObjectId(input.applicationId) ||
    (input.departmentId && !isObjectId(input.departmentId)) ||
    Number.isNaN(input.joinedAt.getTime()) ||
    input.joinedAt > now
  ) {
    throw new DomainError('invalid onboarding request', 'validation')
  }
  return repo.onboard({ ...input, actorId, now })
}

// CLB ghi nhận ứng viên được nhận nhưng từ chối gia nhập
export async function declineAcceptedRecruitmentApplication(
  repo: RecruitmentReviewRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  input: { clubId: string; campaignId: string; applicationId: string; reason?: string },
  now = new Date(),
) {
  const actorId = await authorize(access, actor, input.clubId, now)
  if (
    !isObjectId(input.campaignId) ||
    !isObjectId(input.applicationId) ||
    (input.reason && input.reason.trim().length > 2000)
  ) {
    throw new DomainError('invalid decline request', 'validation')
  }
  return repo.declineAccepted({
    ...input,
    ...(input.reason ? { reason: input.reason.trim() } : {}),
    actorId,
    now,
  })
}
