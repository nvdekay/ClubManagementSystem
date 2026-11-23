import { DomainError } from "./errors.js";

/** Thời gian nhắc trước khi một đợt đình chỉ có thời hạn tự hết. */
export const SUSPENSION_REMINDER_MS = 3 * 24 * 60 * 60 * 1000;

export interface ClubSuspension {
  reason: string;
  suspendedAt: Date;
  suspendedBy: string;
  /** null: đình chỉ cho đến khi ICPDP kích hoạt lại CLB. */
  until: Date | null;
  reminderSentAt?: Date;
}

export interface ClubDissolution {
  decidedAt: Date;
  decidedBy: string;
  reason: string;
  effectiveSemester: string;
  /** Giai đoạn Dissolving bắt đầu từ đây (khi học kỳ kế tiếp bắt đầu)… */
  effectiveFrom: Date;
  /** …và CLB chuyển thành Dissolved tại đây (khi học kỳ đó kết thúc). */
  effectiveTo: Date;
  /** Do bước cuối đặt (UC15 bước 6): thời điểm CLB được lưu trữ và những nghĩa vụ còn nợ. */
  archivedAt?: Date;
  outstanding?: OutstandingObligations;
}

/** Nghĩa vụ CLB chưa hoàn thành — báo cáo còn mở và ngân sách chưa quyết toán (UC15 bước 6, E1). */
export interface OutstandingObligations {
  periodicReports: string[];
  postEventReports: { eventId: string; title: string }[];
  budgets: UnreconciledBudget[];
}

export interface UnreconciledBudget {
  id: string;
  eventTitle: string;
  state: string;
}

/** Bước vòng đời bị lỗi với một CLB; CLB giữ nguyên trạng thái cũ và ICPDP được cảnh báo. */
export interface ClubLifecycleStepFailure {
  clubId: string;
  step: "dissolving" | "dissolved";
  message: string;
}

export interface ClubLifecycleStepResult {
  done: string[];
  failed: ClubLifecycleStepFailure[];
}

export interface ClubLifecycleAlert {
  /** null: bản thân job bị lỗi, không phải do một CLB cụ thể. */
  clubId: string | null;
  step: string;
  message: string;
}

export interface ClubLifecycleSummary {
  id: string;
  code: string;
  name: string;
  field: string;
  state: string;
  logoUrl?: string;
  contactEmail?: string;
  activeMembers: number;
  suspension?: ClubSuspension;
  dissolution?: ClubDissolution;
}

export interface ClubLifecycleHistoryEntry {
  action: string;
  reason?: string;
  actorName?: string;
  at: Date;
}

export interface ClubLifecycleDetail extends ClubLifecycleSummary {
  openCampaigns: { id: string; title: string; windowEnd: Date }[];
  upcomingEvents: { id: string; title: string; startAt: Date; endAt: Date; registrations: number }[];
  activeTerm?: { name: string; startAt: Date; endAt: Date };
  /** E1: ngân sách còn phải quyết toán; giải thể sẽ cảnh báo và bước 6 ghi nhận phần còn lại. */
  unreconciledBudgets: UnreconciledBudget[];
  history: ClubLifecycleHistoryEntry[];
}

/** Những gì bị huỷ theo dây chuyền, để ICPDP thấy hệ quả của quyết định. */
export interface CascadeResult {
  cancelledEvents: number;
  cancelledRegistrations: number;
  cancelledBookings: number;
}

export interface ClubLifecycleRepository {
  list(): Promise<ClubLifecycleSummary[]>;
  detail(clubId: string, now: Date): Promise<ClubLifecycleDetail | null>;
  suspend(clubId: string, input: { reason: string; until: Date | null; requestId?: string; decisionReason?: string }, actorId: string, now: Date): Promise<CascadeResult>;
  /** `actorId` null: do job vòng đời kích hoạt lại khi hết thời hạn đình chỉ. */
  reactivate(clubId: string, reason: string, actorId: string | null, now: Date): Promise<void>;
  decideDissolution(clubId: string, decision: ClubDissolution, now: Date): Promise<CascadeResult>;
  /** Các đợt đình chỉ có thời hạn sắp hết trong khoảng nhắc mà chưa được nhắc. */
  suspensionsDueForReminder(now: Date): Promise<ClubLifecycleSummary[]>;
  markReminded(clubId: string, officerIds: string[], now: Date): Promise<void>;
  expiredSuspensions(now: Date): Promise<ClubLifecycleSummary[]>;
  startDissolving(now: Date): Promise<ClubLifecycleStepResult>;
  /** Chạy bước 6 cho từng CLB đến hạn trong transaction riêng; CLB bị lỗi vẫn ở Dissolving. */
  completeDissolutions(now: Date): Promise<ClubLifecycleStepResult>;
  officerIds(): Promise<string[]>;
  /** Cảnh báo ICPDP officer về một lỗi, tối đa một lần mỗi ngày cho cùng CLB và cùng bước. */
  alertOfficers(alert: ClubLifecycleAlert, officerIds: string[], now: Date): Promise<boolean>;
}

// Kiểm tra lý do thay đổi vòng đời CLB là bắt buộc và không quá dài
export function validateLifecycleReason(reason: string): string {
  const normalized = typeof reason === "string" ? reason.trim() : "";
  if (!normalized || normalized.length > 2_000) {
    throw new DomainError("a reason is required", "validation", { field: "reason" });
  }
  return normalized;
}

// Tìm học kỳ kế tiếp sau học kỳ đang diễn ra
/** Học kỳ sau học kỳ đang chạy tại `now` (hoặc học kỳ đầu tiên chưa bắt đầu). */
export function nextSemester<T extends { code: string; startAt: Date; endAt: Date }>(
  calendar: readonly T[], now: Date): T | null {
  return [...calendar].sort((left, right) => left.startAt.getTime() - right.startAt.getTime())
    .find((semester) => semester.startAt > now) ?? null;
}
