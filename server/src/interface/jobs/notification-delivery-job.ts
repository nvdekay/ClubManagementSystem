import type { MailOutboxRepository, MailTransport } from '../../domain/notification.js'
import { deliverNotifications } from '../../usecase/notification.js'
import { scheduleJob, type StopJob } from './schedule.js'

// Hẹn giờ gửi email trong outbox thông báo mỗi phút
/** SCH-10: mỗi phút xả outbox thông báo và thử lại email lỗi với backoff. */
export function startNotificationDeliveryJob(
  repo: MailOutboxRepository,
  transport: MailTransport,
  options: { appUrl?: string; intervalMs?: number } = {},
): StopJob {
  return scheduleJob('notification-delivery', options.intervalMs ?? 60000, async () => {
    const result = await deliverNotifications(
      repo,
      transport,
      new Date(),
      options.appUrl ? { appUrl: options.appUrl } : {},
    )
    if (result.sent || result.retried || result.failed) {
      console.log(
        JSON.stringify({ job: 'notification-delivery', transport: transport.name, ...result }),
      )
    }
  })
}
