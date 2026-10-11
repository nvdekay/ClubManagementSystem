import type { AccountabilityReminderRepository } from "../domain/accountability-reminder.js";
export async function runAccountabilityReminders(
  repo: AccountabilityReminderRepository,
  now: Date,
): Promise<number> {
  return repo.remind(now);
}
