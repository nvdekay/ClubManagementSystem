import type { MembershipReconfirmationRepository } from '../../domain/membership-reconfirmation.js'
import type { PolicyRepository } from '../../domain/policy.js'
import { runMembershipReconfirmation } from '../../usecase/membership-reconfirmation.js'
import { logCounts, scheduleJob, type StopJob } from './schedule.js'

// Hẹn giờ chạy job tái xác nhận thành viên mỗi giờ
export function startMembershipReconfirmationJob(
  repo: MembershipReconfirmationRepository,
  policy: PolicyRepository,
  intervalMs = 3600000,
): StopJob {
  return scheduleJob('membership-reconfirmation', intervalMs, async () => {
    logCounts(
      'membership-reconfirmation',
      await runMembershipReconfirmation(repo, policy, new Date()),
    )
  })
}
