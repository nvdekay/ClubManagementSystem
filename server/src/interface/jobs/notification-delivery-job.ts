import type { MailOutboxRepository, MailTransport } from "../../domain/notification.js";
import { deliverNotifications } from "../../usecase/notification.js";

/** SCH-10: drains the notification outbox every minute and retries failed emails with backoff. */
export function startNotificationDeliveryJob(repo: MailOutboxRepository, transport: MailTransport,
  options: { appUrl?: string; intervalMs?: number } = {}): () => void {
  let running = false;
  async function tick(): Promise<void> {
    if (running) return;
    running = true;
    try {
      const result = await deliverNotifications(repo, transport, new Date(), options.appUrl ? { appUrl: options.appUrl } : {});
      if (result.sent || result.retried || result.failed) {
        console.log(JSON.stringify({ job: "notification-delivery", transport: transport.name, ...result }));
      }
    } catch (error) {
      console.error(JSON.stringify({ job: "notification-delivery", error: error instanceof Error ? error.message : String(error) }));
    } finally { running = false; }
  }
  void tick();
  const timer = setInterval(() => void tick(), options.intervalMs ?? 60000);
  timer.unref();
  return () => clearInterval(timer);
}
