import { DomainError } from '../domain/errors.js'
import {
  isBeforeToday,
  type MembershipRepository,
  type MembershipState,
} from '../domain/membership.js'
import type { ClubAccessRepository } from '../domain/access.js'
import { assertClubAccess, type AccessActor } from './access.js'

const objectId = /^[0-9a-f]{24}$/i

// Kiểm người dùng đăng nhập, tài khoản Active và trả id
function actorId(actor: AccessActor | null): string {
  if (!actor) {
    throw new DomainError('authentication required', 'unauthorized')
  }
  if (actor.accountState !== 'Active') {
    throw new DomainError('account is not active', 'locked')
  }
  if (!objectId.test(actor.id)) {
    throw new DomainError('invalid actor', 'validation')
  }
  return actor.id
}

// Kiểm định dạng ObjectId của một định danh
function validId(value: string, name: string) {
  if (!objectId.test(value)) {
    throw new DomainError(`invalid ${name}`, 'validation')
  }
  return value
}

// Kiểm quyền quản lý thành viên của CLB và trả id actor
async function authorize(
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now: Date,
) {
  const userId = actorId(actor)
  validId(clubId, 'club id')
  await assertClubAccess(access, actor, clubId, 'club.member.manage', now)
  return userId
}

// Sinh viên xem các tư cách thành viên của mình
export async function listMyMemberships(repo: MembershipRepository, actor: AccessActor | null) {
  return repo.listMine(actorId(actor))
}

// CLB xem danh sách thành viên của mình
export async function listClubMemberships(
  repo: MembershipRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now = new Date(),
) {
  await authorize(access, actor, clubId, now)
  return repo.listClub(clubId, now)
}

// UC20 A1: Club Leader thêm thủ công một sinh viên vào CLB kèm lý do
/** UC20 A1: Club Leader thêm một sinh viên từng đăng nhập, kèm lý do (BR13). */
export async function onboardMemberManually(
  repo: MembershipRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  input: { clubId: string; email: string; reason: string },
  now = new Date(),
) {
  const id = actorId(actor)
  validId(input.clubId, 'club id')
  await assertClubAccess(access, actor, input.clubId, 'club.application.review', now)
  const email = input.email.trim().toLowerCase()
  const reason = input.reason.trim()
  if (!/^[^\s@]+@[^\s@]+$/.test(email) || email.length > 320) {
    throw new DomainError('a valid email is required', 'validation', { field: 'email' })
  }
  if (!reason || reason.length > 2000) {
    throw new DomainError('an onboarding reason is required', 'validation', { field: 'reason' })
  }
  return repo.onboardManually({ clubId: input.clubId, email, reason, actorId: id, now })
}

// CLB đổi trạng thái thành viên (Active, Inactive, Banned) có hiệu lực hôm nay
export async function changeMembershipState(
  repo: MembershipRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  input: {
    clubId: string
    membershipId: string
    state: 'Active' | 'Inactive' | 'Banned'
    effectiveDate: Date
    reason?: string
  },
  now = new Date(),
) {
  const id = await authorize(access, actor, input.clubId, now)
  validId(input.membershipId, 'membership id')
  // So theo ngày lịch Việt Nam: đồng hồ máy client lệch vài giây vẫn là "hôm nay".
  if (
    Number.isNaN(input.effectiveDate.getTime()) ||
    isBeforeToday(input.effectiveDate, now) ||
    isBeforeToday(now, input.effectiveDate)
  ) {
    throw new DomainError('effective date must be today', 'validation')
  }
  const reason = input.reason?.trim()
  if (input.state === 'Banned' && !reason) {
    throw new DomainError('ban reason is required', 'validation')
  }
  if (reason && reason.length > 2000) {
    throw new DomainError('reason is too long', 'validation')
  }
  // Không để mốc hiệu lực vượt quá hiện tại: repository dùng nó để đóng các role đang giữ.
  const effectiveDate = input.effectiveDate > now ? now : input.effectiveDate
  return repo.changeState({
    ...input,
    effectiveDate,
    ...(reason ? { reason } : {}),
    actorId: id,
    now,
  })
}

// Thành viên gửi yêu cầu rút khỏi CLB kèm lý do và ngày hiệu lực
export async function requestMembershipWithdrawal(
  repo: MembershipRepository,
  actor: AccessActor | null,
  input: { membershipId: string; reason: string; requestedEffectiveDate: Date },
  now = new Date(),
) {
  const userId = actorId(actor)
  validId(input.membershipId, 'membership id')
  const reason = input.reason.trim()
  if (
    !reason ||
    reason.length > 2000 ||
    Number.isNaN(input.requestedEffectiveDate.getTime()) ||
    isBeforeToday(input.requestedEffectiveDate, now)
  ) {
    throw new DomainError('invalid membership withdrawal request', 'validation')
  }
  return repo.requestWithdrawal({
    membershipId: input.membershipId,
    userId,
    reason,
    requestedEffectiveDate: input.requestedEffectiveDate,
    now,
  })
}

// Thành viên xem các yêu cầu rút khỏi CLB của mình
export async function listMyMembershipWithdrawalRequests(
  repo: MembershipRepository,
  actor: AccessActor | null,
) {
  return repo.listMyWithdrawalRequests(actorId(actor))
}

// CLB xem các yêu cầu rút khỏi CLB của thành viên
export async function listClubMembershipWithdrawalRequests(
  repo: MembershipRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  now = new Date(),
) {
  await authorize(access, actor, clubId, now)
  return repo.listClubWithdrawalRequests(clubId)
}

// CLB thực hiện yêu cầu rút khỏi CLB của thành viên
export async function executeMembershipWithdrawal(
  repo: MembershipRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  input: { clubId: string; requestId: string },
  now = new Date(),
) {
  const id = await authorize(access, actor, input.clubId, now)
  validId(input.requestId, 'withdrawal request id')
  return repo.executeWithdrawal({
    clubId: input.clubId,
    requestId: input.requestId,
    actorId: id,
    now,
  })
}

// Cho biết trạng thái thành viên có được yêu cầu rút khỏi CLB không
export function canRequestWithdrawal(state: MembershipState): boolean {
  return state === 'Active' || state === 'Inactive'
}
