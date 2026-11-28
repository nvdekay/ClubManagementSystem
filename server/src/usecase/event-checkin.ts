import { DomainError, orNotFound } from '../domain/errors.js'
import {
  checkInCodesMatch,
  checkInStates,
  feedbackWindow,
  isWithinCheckInWindow,
  type Attendance,
  type EventCheckInRepository,
} from '../domain/event-checkin.js'
import type { PolicyRepository } from '../domain/policy.js'
import { parseObjectId, requireSignedIn, type AccessActor } from './access.js'

// The feedback window comes from the policy in force when the event ended, not the current one,
// so a later policy edit cannot reopen or cut short the window of an event that already finished.
export async function feedbackHours(
  policy: PolicyRepository,
  eventEndAt: Date,
): Promise<number | null> {
  return (await policy.findEffective(eventEndAt))?.feedbackWindowHours ?? null
}

// Gắn thông tin cửa sổ feedback vào bản ghi điểm danh
function view(attendance: Attendance, hours: number | null) {
  return { ...attendance, ...feedbackWindow(attendance, hours) }
}

// Sinh viên điểm danh sự kiện bằng mã, kiểm cửa sổ, đăng ký và đối tượng
export async function checkInToEvent(
  repo: EventCheckInRepository,
  policy: PolicyRepository,
  actor: AccessActor | null,
  eventId: string,
  code: string,
  now: Date,
) {
  const studentId = requireSignedIn(actor)
  parseObjectId(eventId, 'event id')
  const target = orNotFound(await repo.target(eventId, studentId), 'event')
  // E1: check-in lặp lại trả về bản ghi đầu tiên không đổi (BR18), kể cả sau khung giờ.
  if (target.attendance) {
    return {
      ...view(target.attendance, await feedbackHours(policy, target.attendance.eventEndAt)),
      alreadyCheckedIn: true,
    }
  }
  const { event } = target
  if (!event.published || !(checkInStates as readonly string[]).includes(event.state)) {
    throw new DomainError('event is not open for check-in', 'conflict')
  }
  if (!event.checkInCode) {
    throw new DomainError('check-in is not available for this event', 'conflict')
  }
  if (!checkInCodesMatch(event.checkInCode, code)) {
    throw new DomainError('invalid check-in code', 'validation')
  }
  // E2: ngoài khung giờ chỉ còn check-in thủ công (kèm lý do) của thành viên CLB.
  if (!isWithinCheckInWindow(event, now)) {
    throw new DomainError("check-in is outside the event's check-in window", 'conflict')
  }
  if (event.audienceScope === 'MEMBERS_ONLY' && !target.isActiveClubMember) {
    throw new DomainError('event is limited to active club members', 'forbidden')
  }
  // E3 trừ khi sự kiện nhận walk-in (A2), khi đó cũng tạo luôn đăng ký.
  const method =
    target.registrationState === 'Confirmed' ? 'self' : event.allowWalkIn ? 'walk-in' : null
  if (!method) {
    throw new DomainError('a confirmed registration is required to check in', 'forbidden')
  }
  const result = await repo.checkIn({ eventId, studentId, method, now })
  return {
    ...view(result.attendance, await feedbackHours(policy, result.attendance.eventEndAt)),
    alreadyCheckedIn: !result.created,
  }
}

// Sinh viên xem lịch sử điểm danh của mình
export async function listMyAttendances(
  repo: EventCheckInRepository,
  policy: PolicyRepository,
  actor: AccessActor | null,
) {
  const studentId = requireSignedIn(actor)
  const items = await repo.listMine(studentId)
  // One policy lookup per distinct event end time.
  const hoursByEnd = new Map<number, Promise<number | null>>()
  return Promise.all(
    items.map(async (item) => {
      const key = item.eventEndAt.getTime()
      if (!hoursByEnd.has(key)) {
        hoursByEnd.set(key, feedbackHours(policy, item.eventEndAt))
      }
      return view(item, await hoursByEnd.get(key)!)
    }),
  )
}
