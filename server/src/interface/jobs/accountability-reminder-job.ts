import type { AccountabilityReminderRepository } from "../../domain/accountability-reminder.js";
import { runAccountabilityReminders } from "../../usecase/accountability-reminder.js";
export function startAccountabilityReminderJob(
  repo: AccountabilityReminderRepository,
  intervalMs = 3600000,
): () => void {
  let running = false;
  async function tick() {
    if (running) return;
    running = true;
    try {
      await runAccountabilityReminders(repo, new Date());
    } catch (error) {
      console.error(
        JSON.stringify({
          job: "accountability-reminders",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    } finally {
      running = false;
    }
  }
  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
