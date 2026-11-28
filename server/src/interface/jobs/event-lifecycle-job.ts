import type { EventDefenseRepository } from '../../domain/event-defense.js'
import type { EventProposalReviewRepository } from '../../domain/event-proposal-review.js'
import type { SchoolEventRepository } from '../../domain/school-event.js'
import { runDefenseConfirmationAlertJob } from '../../usecase/event-defense.js'
import { runEventLifecycleJob } from '../../usecase/event-proposal-review.js'
import { runInvitationExpiryJob } from '../../usecase/school-event.js'
import { errorMessage, logCounts, scheduleJob, type StopJob } from './schedule.js'

const HOUR_MS = 60 * 60 * 1000

// Runs one sub-job; a failure is logged with its step name and does not skip the other steps.
async function step<T>(name: string, run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run()
  } catch (error) {
    console.error(
      JSON.stringify({ job: 'event-lifecycle', step: name, error: errorMessage(error) }),
    )
    return fallback
  }
}

// Hẹn giờ chạy job vòng đời sự kiện, lời mời và cảnh báo bảo vệ đề án mỗi giờ
/** Chạy một lần ngay, rồi mỗi giờ; trả về hàm dừng. Bước lỗi được log và thử lại giờ sau. */
export function startEventLifecycleJob(
  repo: EventProposalReviewRepository,
  schoolEvents?: SchoolEventRepository,
  eventDefenses?: EventDefenseRepository,
  intervalMs = HOUR_MS,
): StopJob {
  return scheduleJob('event-lifecycle', intervalMs, async () => {
    const now = new Date()
    const lifecycle = await step('event-lifecycle', () => runEventLifecycleJob(repo, now), {
      expired: 0,
      started: 0,
      completed: 0,
    })
    const expiredInvitations = schoolEvents
      ? await step('invitation-expiry', () => runInvitationExpiryJob(schoolEvents, now), 0)
      : 0
    const overdueDefenseAlerts = eventDefenses
      ? await step(
          'defense-confirmation-alerts',
          () => runDefenseConfirmationAlertJob(eventDefenses, now),
          0,
        )
      : 0
    logCounts('event-lifecycle', { ...lifecycle, expiredInvitations, overdueDefenseAlerts })
  })
}
