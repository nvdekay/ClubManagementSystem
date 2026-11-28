import { DomainError, orNotFound } from '../domain/errors.js'
import {
  feedbackWindowFor,
  isFeedbackWindowOpen,
  validateFeedback,
  type EventFeedbackRepository,
} from '../domain/event-feedback.js'
import type { PolicyRepository } from '../domain/policy.js'
import { parseObjectId, requireSignedIn, type AccessActor } from './access.js'
import { feedbackHours } from './event-checkin.js'

// Cho biết sinh viên có thể gửi feedback sự kiện không và feedback đã gửi
/** Trang sự kiện cần gì: có được hiển thị biểu mẫu không (FR-01, E3) và bản ghi của chính sinh viên. */
export async function getEventFeedbackContext(
  repo: EventFeedbackRepository,
  policy: PolicyRepository,
  actor: AccessActor | null,
  id: string,
  now: Date,
) {
  const target = await repo.target(parseObjectId(id, 'event id'), requireSignedIn(actor))
  if (!target) {
    throw new DomainError('event not found', 'not_found')
  }
  if (!target.attendance) {
    return { attended: false, canSubmit: false, opensAt: null, closesAt: null, feedback: null }
  }
  const window = feedbackWindowFor(
    target.attendance,
    await feedbackHours(policy, target.attendance.eventEndAt),
  )
  return {
    attended: true,
    canSubmit: !target.feedback && isFeedbackWindowOpen(window, now),
    opensAt: window.opensAt,
    closesAt: window.closesAt,
    feedback: target.feedback,
  }
}

// Sinh viên đã điểm danh gửi feedback sự kiện trong cửa sổ cho phép
export async function submitEventFeedback(
  repo: EventFeedbackRepository,
  policy: PolicyRepository,
  actor: AccessActor | null,
  id: string,
  input: { rating: number; comment: string; isAnonymous: boolean },
  now: Date,
) {
  const studentId = requireSignedIn(actor)
  const validEventId = parseObjectId(id, 'event id')
  let valid: { rating: number; comment: string }
  try {
    valid = validateFeedback(input)
  } catch (error) {
    throw new DomainError(error instanceof Error ? error.message : 'invalid feedback', 'validation')
  }
  const target = orNotFound(await repo.target(validEventId, studentId), 'event')
  if (!target.attendance) {
    throw new DomainError('only checked-in attendees can give feedback', 'forbidden')
  }
  if (target.feedback) {
    throw new DomainError('feedback was already submitted for this event', 'conflict')
  }
  if (
    !isFeedbackWindowOpen(
      feedbackWindowFor(
        target.attendance,
        await feedbackHours(policy, target.attendance.eventEndAt),
      ),
      now,
    )
  ) {
    throw new DomainError('the feedback window for this event has closed', 'conflict')
  }
  return repo.submit({
    eventId: validEventId,
    studentId,
    attendanceId: target.attendance.id,
    clubId: target.attendance.clubId,
    ...valid,
    isAnonymous: input.isAnonymous,
    now,
  })
}

// Sinh viên xem các feedback sự kiện mình đã gửi
export async function listMyEventFeedback(
  repo: EventFeedbackRepository,
  actor: AccessActor | null,
) {
  return repo.listMine(requireSignedIn(actor))
}
