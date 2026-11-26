import type { AccountabilityReminderRepository } from '../../domain/accountability-reminder.js'
import { runAccountabilityReminders } from '../../usecase/accountability-reminder.js'
import { scheduleJob, type StopJob } from './schedule.js'

// Hẹn giờ chạy nhắc nhở trách nhiệm giải trình mỗi giờ, trả hàm dừng job
export function startAccountabilityReminderJob(
  repo: AccountabilityReminderRepository,
  intervalMs = 3600000,
): StopJob {
  return scheduleJob('accountability-reminders', intervalMs, async () => {
    await runAccountabilityReminders(repo, new Date())
  })
}
