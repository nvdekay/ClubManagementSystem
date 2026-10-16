import type { AcademicSemester } from "./policy.js";
export const RECONFIRMATION_DAYS = 14;
export interface MembershipReconfirmation {
  id: string; membershipId: string; clubName: string; periodCode: string; dueAt: Date;
  state: "Pending" | "Confirmed" | "Exempt" | "Expired"; confirmedAt?: Date;
}
export interface MembershipReconfirmationRepository {
  listMine(userId: string): Promise<MembershipReconfirmation[]>;
  confirm(id: string, userId: string, now: Date): Promise<MembershipReconfirmation>;
  run(period: AcademicSemester, dueAt: Date, now: Date): Promise<{ opened: number; expired: number; exempt: number }>;
}
