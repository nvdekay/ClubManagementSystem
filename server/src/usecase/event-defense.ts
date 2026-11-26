import type { ClubAccessRepository } from '../domain/access.js'
import type { AuthRepository } from '../domain/auth.js'
import { DomainError } from '../domain/errors.js'
import {
  MAX_DEFENSE_DURATION_MINUTES,
  MIN_DEFENSE_DURATION_MINUTES,
  assertRevisionDeadlineBeforeDefense,
  validateDefenseScheduleSlot,
  type EventDefenseRepository,
  type RespondRescheduleInput,
  type ScheduleDefenseInput,
} from '../domain/event-defense.js'
import {
  approvedBudget,
  type EventProposalReviewRepository,
  type EventReviewDecisionInput,
} from '../domain/event-proposal-review.js'
import { assertClubAccess, parseObjectId, requireIcpdpOfficer, type AccessActor } from './access.js'
import { normalizedEventDecision } from './event-proposal-review.js'

const MINUTE_MS = 60 * 1000

// Cắt khoảng trắng và bắt buộc có giá trị, không quá độ dài tối đa
function trimmedRequired(value: string | undefined, label: string, maxLength: number): string {
  const text = value?.trim() ?? ''
  if (!text) {
    throw new DomainError(`${label} is required`, 'validation')
  }
  if (text.length > maxLength) {
    throw new DomainError(`${label} cannot exceed ${maxLength} characters`, 'validation')
  }
  return text
}

// Cắt khoảng trắng chuỗi tùy chọn và kiểm độ dài tối đa
function trimmedOptional(value: string | undefined, maxLength: number): string | undefined {
  const text = value?.trim()
  if (!text) {
    return undefined
  }
  if (text.length > maxLength) {
    throw new DomainError(`note cannot exceed ${maxLength} characters`, 'validation')
  }
  return text
}

// ICPDP xem các phòng còn trống cho buổi bảo vệ đề án theo giờ và thời lượng
export async function listAvailableDefenseRooms(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  startAt: Date,
  durationMinutes: number,
  excludeDefenseId?: string,
) {
  await requireIcpdpOfficer(auth, actor)
  if (!(startAt instanceof Date) || Number.isNaN(startAt.getTime())) {
    throw new DomainError('valid start time is required', 'validation', { field: 'startAt' })
  }
  if (
    !Number.isInteger(durationMinutes) ||
    durationMinutes < MIN_DEFENSE_DURATION_MINUTES ||
    durationMinutes > MAX_DEFENSE_DURATION_MINUTES
  ) {
    throw new DomainError(
      `duration must be an integer between ${MIN_DEFENSE_DURATION_MINUTES} and ${MAX_DEFENSE_DURATION_MINUTES} minutes`,
      'validation',
      { field: 'durationMinutes' },
    )
  }
  const endAt = new Date(startAt.getTime() + durationMinutes * MINUTE_MS)
  const excludeId = excludeDefenseId ? parseObjectId(excludeDefenseId, 'defense id') : undefined
  return repo.listAvailableRooms(startAt, endAt, excludeId)
}

// ICPDP lên lịch buổi bảo vệ đề án sự kiện (phòng, giờ, thời lượng)
export async function scheduleEventDefense(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
  input: ScheduleDefenseInput,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  const id = parseObjectId(eventId, 'event id')
  const propertyId = parseObjectId(input.propertyId, 'property id')
  const title = trimmedRequired(input.title, 'defense title', 200)
  const note = trimmedOptional(input.note, 2000)
  const slot = validateDefenseScheduleSlot(input.startAt, input.durationMinutes, now)
  return repo.schedule(
    id,
    officerId,
    { ...slot, propertyId, title, ...(note ? { note } : {}) },
    now,
  )
}

// ICPDP hủy buổi bảo vệ đề án kèm lý do
export async function cancelEventDefense(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
  reason: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  const id = parseObjectId(eventId, 'event id')
  const cleanReason = trimmedRequired(reason, 'cancellation reason', 2000)
  return repo.cancel(id, officerId, cleanReason, now)
}

// ICPDP chấp nhận (đặt lịch mới, vào thẳng CONFIRMED — BR63) hoặc từ chối yêu cầu dời lịch bảo vệ của CLB
export async function respondDefenseReschedule(
  repo: EventDefenseRepository,
  events: Pick<EventProposalReviewRepository, 'find'>,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
  input: RespondRescheduleInput,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  const id = parseObjectId(eventId, 'event id')
  if (input.accept) {
    if (
      !(input.startAt instanceof Date) ||
      Number.isNaN(input.startAt.getTime()) ||
      input.startAt <= now
    ) {
      throw new DomainError('future defense start time is required', 'validation', {
        field: 'startAt',
      })
    }
    const durationMinutes = input.durationMinutes ?? 60
    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < MIN_DEFENSE_DURATION_MINUTES ||
      durationMinutes > MAX_DEFENSE_DURATION_MINUTES
    ) {
      throw new DomainError(
        `duration must be an integer between ${MIN_DEFENSE_DURATION_MINUTES} and ${MAX_DEFENSE_DURATION_MINUTES} minutes`,
        'validation',
        { field: 'durationMinutes' },
      )
    }
    const propertyId = parseObjectId(input.propertyId ?? '', 'property id')
    const note = trimmedOptional(input.note, 2000)
    // BR63: an open revision deadline must stay at least 12h before the defense, also when it moves.
    // FR-UC26-20: the accepted start only has to be in the future (the 48h notice is for first scheduling).
    const event = (await events.find(id, now))?.event
    if (event?.state === 'Revision Requested' && event.revisionDeadlineAt) {
      assertRevisionDeadlineBeforeDefense(event.revisionDeadlineAt, input.startAt)
    }
    return repo.respondReschedule(
      id,
      officerId,
      {
        accept: true,
        startAt: input.startAt,
        durationMinutes,
        propertyId,
        ...(note ? { note } : {}),
      },
      now,
    )
  }
  const reason = trimmedRequired(input.reason, 'rejection reason', 2000)
  return repo.respondReschedule(id, officerId, { accept: false, reason }, now)
}

// ICPDP bắt đầu buổi bảo vệ đề án
export async function startEventDefense(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  return repo.start(parseObjectId(eventId, 'event id'), officerId, now)
}

// ICPDP xem phiên bảo vệ đang diễn ra
export async function getLiveDefenseSession(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
) {
  await requireIcpdpOfficer(auth, actor)
  const session = await repo.getLiveSession(parseObjectId(eventId, 'event id'))
  if (!session) {
    throw new DomainError('defense session not found', 'not_found')
  }
  return session
}

// ICPDP lưu ghi chú trong buổi bảo vệ
export async function saveDefenseNote(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
  content: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  if (typeof content !== 'string' || content.length > 50_000) {
    throw new DomainError('defense note cannot exceed 50000 characters', 'validation', {
      field: 'content',
    })
  }
  return repo.saveNote(parseObjectId(eventId, 'event id'), officerId, content, now)
}

// ICPDP kết thúc buổi bảo vệ đề án
export async function endEventDefense(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  return repo.end(parseObjectId(eventId, 'event id'), officerId, now)
}

// ICPDP ghi nhận CLB vắng mặt buổi bảo vệ
export async function markDefenseNoShow(
  repo: EventDefenseRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
  reason: string | undefined,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  const cleanReason =
    trimmedOptional(reason, 2000) ?? 'Club did not attend the scheduled defense session'
  return repo.markNoShow(parseObjectId(eventId, 'event id'), officerId, cleanReason, now)
}

// ICPDP ghi quyết định đề án sau buổi bảo vệ (duyệt, sửa, từ chối)
export async function decideAfterDefense(
  defenseRepo: EventDefenseRepository,
  reviewRepo: EventProposalReviewRepository,
  auth: Pick<AuthRepository, 'systemRoleCodes'>,
  actor: AccessActor | null,
  eventId: string,
  input: EventReviewDecisionInput,
  now: Date,
) {
  const officerId = await requireIcpdpOfficer(auth, actor)
  const id = parseObjectId(eventId, 'event id')
  const decision = normalizedEventDecision(input, now)
  const detail = await reviewRepo.find(id, now)
  if (!detail) {
    throw new DomainError('event proposal not found', 'not_found')
  }
  if (decision.outcome === 'Approve') {
    const current =
      detail.versions.find((version) => version.revisionNo === detail.event.currentRevisionNo) ??
      detail.versions.at(-1)
    approvedBudget(current?.budgetLines ?? [], decision.budgetLines)
  }
  return defenseRepo.decideAfterDefense(id, officerId, decision, now)
}

// CLB xem thông tin buổi bảo vệ đề án của sự kiện mình
export async function getClubEventDefense(
  repo: EventDefenseRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  eventId: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.event.manage', now)
  const view = await repo.getClubDefense(
    parseObjectId(clubId, 'club id'),
    parseObjectId(eventId, 'event id'),
  )
  if (!view) {
    throw new DomainError('event proposal not found', 'not_found')
  }
  return view
}

// CLB xác nhận tham dự buổi bảo vệ đề án
export async function confirmClubEventDefense(
  repo: EventDefenseRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  eventId: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.event.manage', now)
  return repo.confirmByClub(
    parseObjectId(clubId, 'club id'),
    parseObjectId(eventId, 'event id'),
    actor!.id,
    now,
  )
}

// CLB yêu cầu dời lịch bảo vệ đề án kèm lý do
export async function requestClubDefenseReschedule(
  repo: EventDefenseRepository,
  access: ClubAccessRepository,
  actor: AccessActor | null,
  clubId: string,
  eventId: string,
  reason: string,
  now: Date,
) {
  await assertClubAccess(access, actor, clubId, 'club.event.manage', now)
  const cleanReason = trimmedRequired(reason, 'reschedule reason', 2000)
  return repo.requestRescheduleByClub(
    parseObjectId(clubId, 'club id'),
    parseObjectId(eventId, 'event id'),
    actor!.id,
    cleanReason,
    now,
  )
}

// Job: cảnh báo các buổi bảo vệ mà CLB quá hạn chưa xác nhận
export async function runDefenseConfirmationAlertJob(
  repo: EventDefenseRepository,
  now: Date,
): Promise<number> {
  return repo.alertOverdueConfirmations(now)
}
