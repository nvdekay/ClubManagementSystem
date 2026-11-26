import type { FacilityBookingRepository } from '../../domain/facility-booking.js'
import { runBookingLifecycleJob } from '../../usecase/facility-booking.js'
import { scheduleJob, type StopJob } from './schedule.js'

// Hẹn giờ chạy job vòng đời booking cơ sở vật chất mỗi phút
export function startFacilityBookingJob(
  repo: FacilityBookingRepository,
  intervalMs = 60000,
): StopJob {
  return scheduleJob('facility-booking', intervalMs, async () => {
    await runBookingLifecycleJob(repo, new Date())
  })
}
