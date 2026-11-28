import type { ClubLifecycleRepository } from '../../domain/club-lifecycle.js'
import { alertClubLifecycleJobFailure, runClubLifecycleJob } from '../../usecase/club-lifecycle.js'
import { logCounts, scheduleJob, type StopJob } from './schedule.js'

const HOUR_MS = 60 * 60 * 1000

// Hẹn giờ chạy job vòng đời CLB (tạm ngừng, giải thể) mỗi giờ
/** Chạy một lần ngay, rồi mỗi giờ; trả về hàm dừng. Lần chạy lỗi sẽ báo ICPDP và thử lại giờ sau. */
export function startClubLifecycleJob(
  repo: ClubLifecycleRepository,
  intervalMs = HOUR_MS,
): StopJob {
  return scheduleJob(
    'club-lifecycle',
    intervalMs,
    async () => {
      logCounts('club-lifecycle', await runClubLifecycleJob(repo, new Date()))
    },
    async (message) => {
      await alertClubLifecycleJobFailure(repo, message, new Date())
    },
  )
}
