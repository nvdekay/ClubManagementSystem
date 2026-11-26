import type { ApplicationExpiryRepository } from '../../domain/application-expiry.js'
import { expireClubApplications } from '../../usecase/application-expiry.js'
import { scheduleJob, type StopJob } from './schedule.js'

// Hẹn giờ chạy job hết hạn đơn lập CLB mỗi giờ, trả hàm dừng job
export function startApplicationExpiryJob(
  repo: ApplicationExpiryRepository,
  intervalMs = 3600000,
): StopJob {
  return scheduleJob('application-expiry', intervalMs, async () => {
    const expired = await expireClubApplications(repo, new Date())
    if (expired) {
      console.log(JSON.stringify({ job: 'application-expiry', expired }))
    }
  })
}
