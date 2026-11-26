import type {
  PeriodicEvidenceStorage,
  UploadedEvidenceRepository,
} from '../../domain/periodic-report.js'
import { cleanupOrphanedEvidence } from '../../usecase/periodic-evidence-cleanup.js'
import { scheduleJob, type StopJob } from './schedule.js'

// Hẹn giờ dọn ảnh minh chứng không được tham chiếu mỗi ngày, trả hàm dừng job
export function startEvidenceCleanupJob(
  uploads: UploadedEvidenceRepository,
  storage: PeriodicEvidenceStorage | null,
  intervalMs = 24 * 3600000,
): StopJob {
  return scheduleJob('evidence-cleanup', intervalMs, async () => {
    const { removed, failures } = await cleanupOrphanedEvidence(storage, uploads, new Date())
    for (const failure of failures) {
      console.error(JSON.stringify({ job: 'evidence-cleanup', ...failure }))
    }
    if (removed) {
      console.log(JSON.stringify({ job: 'evidence-cleanup', removed }))
    }
  })
}
