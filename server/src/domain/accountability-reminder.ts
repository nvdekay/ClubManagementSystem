export interface AccountabilityReminderRepository {
  remind(now: Date): Promise<number>;
}
