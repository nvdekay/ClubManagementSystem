import type { AuthRepository } from '../domain/auth.js'
import { DomainError, orNotFound } from '../domain/errors.js'
import type { PolicyRepository } from '../domain/policy.js'
import {
  normalizedInvitation,
  normalizedSchoolEvent,
  type SchoolEventInput,
  type SchoolEventRepository,
} from '../domain/school-event.js'
import { parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'

// Lấy sự kiện trường theo id, không có thì báo not_found
async function existing(repo: SchoolEventRepository, id: string) {
  const found = orNotFound(await repo.find(parseObjectId(id, 'event id')), 'school event')
  return found
}

// ICPDP xem danh sách sự kiện do trường tổ chức
export async function listSchoolEvents(
  repo: SchoolEventRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
) {
  await requireIcpdpOfficer(auth, actor)
  return repo.list()
}

// ICPDP xem chi tiết một sự kiện trường
export async function getSchoolEvent(
  repo: SchoolEventRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
) {
  await requireIcpdpOfficer(auth, actor)
  return existing(repo, id)
}

// Cảnh báo xung đột lịch khi ICPDP đang nhập form sự kiện trường
/** FR-UC53-02: cảnh báo xung đột hiển thị khi officer điền biểu mẫu. */
export async function checkSchoolEventConflicts(
  repo: SchoolEventRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  input: { propertyId?: string; startAt: Date; endAt: Date },
) {
  await requireIcpdpOfficer(auth, actor)
  if (input.propertyId) {
    parseObjectId(input.propertyId, 'property id')
  }
  if (
    Number.isNaN(input.startAt.getTime()) ||
    Number.isNaN(input.endAt.getTime()) ||
    input.endAt <= input.startAt
  ) {
    throw new DomainError('the event must end after it starts', 'validation', { field: 'endAt' })
  }
  return repo.conflicts(input.propertyId, input.startAt, input.endAt)
}

// ICPDP tạo sự kiện trường, có thể mời sẵn các CLB
export async function createSchoolEvent(
  repo: SchoolEventRepository,
  policy: PolicyRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  input: SchoolEventInput,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  if (input.propertyId) {
    parseObjectId(input.propertyId, 'property id')
  }
  for (const clubId of input.clubIds ?? []) {
    parseObjectId(clubId, 'club id')
  }
  const calendar = (await policy.findEffective(now))?.academicCalendar ?? []
  return repo.create(normalizedSchoolEvent(input, calendar, now), officerId, now)
}

// ICPDP mời CLB tham gia sự kiện trường trước khi diễn ra
export async function inviteClubs(
  repo: SchoolEventRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  input: { clubIds?: string[]; allActiveClubs?: boolean; deadline?: Date },
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  for (const clubId of input.clubIds ?? []) {
    parseObjectId(clubId, 'club id')
  }
  const event = await existing(repo, id)
  if (!['Approved', 'Upcoming'].includes(event.state)) {
    throw new DomainError('clubs can only be invited before the event takes place', 'conflict')
  }
  return repo.invite(
    event.id,
    normalizedInvitation(input, event.startAt, now, true),
    officerId,
    now,
  )
}

// ICPDP thu hồi lời mời CLB tham gia sự kiện trường
export async function withdrawInvitation(
  repo: SchoolEventRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  invitationId: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  return repo.withdraw(
    parseObjectId(id, 'event id'),
    parseObjectId(invitationId, 'invitation id'),
    officerId,
    now,
  )
}

// ICPDP công bố sự kiện trường đã duyệt
export async function publishSchoolEvent(
  repo: SchoolEventRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  const event = await existing(repo, id)
  if (event.state !== 'Approved') {
    throw new DomainError('only an unpublished school event can be published', 'conflict')
  }
  if (event.startAt <= now) {
    throw new DomainError('the event has already started', 'conflict')
  }
  return repo.publish(event.id, officerId, now)
}

// Job: cho hết hạn các lời mời CLB quá thời hạn trả lời
export async function runInvitationExpiryJob(repo: SchoolEventRepository, now: Date) {
  return repo.expireInvitations(now)
}
