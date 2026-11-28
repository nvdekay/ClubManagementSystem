import type { ComplaintRepository } from '../../domain/complaint.js'
import { flagOverdueComplaintResponses } from '../../usecase/complaint.js'
import { logCounts, scheduleJob, type StopJob } from './schedule.js'

// Hẹn giờ quét khiếu nại quá hạn phản hồi mỗi giờ
/** UC52 E1: mỗi giờ, phát tín hiệu compliance một lần cho mỗi khiếu nại đã chuyển tiếp quá hạn. */
export function startComplaintResponseJob(
  repo: ComplaintRepository,
  intervalMs = 3600000,
): StopJob {
  return scheduleJob('complaint-response', intervalMs, async () => {
    logCounts('complaint-response', {
      flagged: await flagOverdueComplaintResponses(repo, new Date()),
    })
  })
}
