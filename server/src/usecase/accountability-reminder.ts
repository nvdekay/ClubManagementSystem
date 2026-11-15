import type { AccountabilityReminderRepository } from "../domain/accountability-reminder.js";
// Chạy nhắc nhở trách nhiệm giải trình và trả số lượng đã nhắc
export async function runAccountabilityReminders(
  repo: AccountabilityReminderRepository,
  now: Date,
): Promise<number> {
  return repo.remind(now);
}
