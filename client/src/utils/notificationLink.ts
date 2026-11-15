import type { AppNotification } from "@/services/notifications";

type Rule = [RegExp, (item: AppNotification) => string | undefined];

// Tạo hàm sinh link tới trang của CLB trong thông báo
function club(path: string) {
  return function link(item: AppNotification): string | undefined {
    return item.clubId ? `/club/${encodeURIComponent(item.clubId)}${path}` : undefined;
  };
}

// Tạo hàm trả về link cố định
function fixed(path: string) {
  return function link(): string { return path; };
}

// Link tới trang sự kiện của CLB, kèm id sự kiện nếu có
function clubEvent(item: AppNotification): string | undefined {
  const path = club("/events")(item);
  return path && item.entityId ? `${path}?event=${encodeURIComponent(item.entityId)}` : path;
}

// Tạo hàm sinh link trang chi tiết theo entityId
/** Trang chi tiết `base/<entityId>`, hoặc trang danh sách khi dòng không có entity. */
function detail(base: string) {
  return function link(item: AppNotification): string {
    return item.entityId ? `${base}/${encodeURIComponent(item.entityId)}` : base;
  };
}

// Khớp đầu tiên thắng, nên các mã cụ thể đặt phía trên tiền tố nhóm của chúng. Mỗi mã dẫn tới
// workspace của những người nhận (server: danh sách audience ở domain/notification.ts).
const rules: Rule[] = [
  [/^SPONSORED_ITEM_SUBMITTED$/, (item) => typeof item.payload.budgetId === "string"
    ? `/workspace/budgets/${encodeURIComponent(item.payload.budgetId)}` : detail("/workspace/event-proposals")(item)],
  [/^SPONSORED_ITEM_/, (item) => {
    const path = club("/budgets")(item);
    if (!path) return undefined;
    if (typeof item.payload.budgetId === "string") return `${path}?budget=${encodeURIComponent(item.payload.budgetId)}`;
    return item.entityId ? `${path}?event=${encodeURIComponent(item.entityId)}` : path;
  }],
  [/^EVENT_PUBLISHED$/, detail("/events")],
  [/^(EVENT_REGISTRATION_|EVENT_CANCELLED$|EVENT_RESCHEDULED$|EVENT_CHECKED_IN$)/, fixed("/workspace/event-registrations")],
  [/^EVENT_CANCELLATION_REQUESTED$/, detail("/workspace/event-proposals")],
  [/^(EVENT_PROPOSAL_|EVENT_CANCELLATION_DECIDED$)/, clubEvent],
  // Hồ sơ của chính người sáng lập (cả biên nhận lẫn quyết định).
  [/^CLUB_APPLICATION_APPROVED$/, (item) => club("")(item) ?? detail("/workspace/applications")(item)],
  [/^CLUB_APPLICATION_/, detail("/workspace/applications")],
  [/^BOARD_NOMINATION_SUBMITTED$/, detail("/workspace/board-nominations")],
  [/^BOARD_NOMINATION_/, club("/board")],
  [/^BOOKING_(SUBMITTED|CANCELLED|RELEASED)$/, fixed("/workspace/bookings")],
  [/^PROPERTY_BOOKING_STATUS$/, club("/bookings")],
  [/^ROOM_ALLOCATION/, club("/rooms")],
  [/^RECRUITMENT_APPLICATION_(SUBMITTED|WITHDRAWN)$/, club("/recruitment")],
  [/^RECRUITMENT_/, fixed("/workspace/recruitment")],
  [/^MEMBERSHIP_WITHDRAWAL_REQUESTED$/, club("/members")],
  [/^(CLUB_MEMBERSHIP_|MEMBERSHIP_RECONFIRMATION_)/, fixed("/workspace/clubs")],
  [/^(TRANSITION_PLAN_|LEADERSHIP_TRANSITION_)/, club("/transition-plans")],
  [/^SUSPENSION_REQUEST_SUBMITTED$/, fixed("/workspace/suspension-requests")],
  [/^SUSPENSION_REQUEST_/, club("/suspension-requests")],
  [/^(VIOLATION_RESPONSE_SUBMITTED|CORRECTIVE_ACTION_SUBMITTED)$/,
    (item) => item.entityId ? `/workspace/violations/${encodeURIComponent(item.entityId)}` : "/workspace/violations"],
  [/^VIOLATION_/, club("/violations")],
  [/^PERIODIC_REPORT_SUBMITTED$/, detail("/workspace/periodic-reports")],
  [/^PERIODIC_REPORT_/, club("/periodic-reports")],
  [/^EVALUATION_PUBLISHED$/, club("/evaluations")],
  [/^(CLUB_SUSPENSION_ENDING|CLUB_LIFECYCLE_FAILED|CLUB_DISSOLUTION_COMPLETED)$/, fixed("/icpdp/clubs")],
  [/^CLUB_/, (item) => item.clubId ? `/clubs/${encodeURIComponent(item.clubId)}` : undefined],
  [/^EVENT_INVITATION_/, (item) => typeof item.payload.eventId === "string"
    ? `/workspace/school-events/${encodeURIComponent(item.payload.eventId)}` : "/workspace/school-events"],
  [/^SCHOOL_EVENT_INVITATION/, club("/invitations")],
  [/^REPORT_ESCALATED_TO_ICPDP$/, fixed("/workspace/event-reports")],
  [/^REPORT_/, club("/event-reports")],
  [/^REFUND_OVERDUE_TO_ICPDP$/, detail("/workspace/budgets")],
  [/^(BUDGET_|SETTLEMENT_|REFUND_)/, club("/budgets")],
];

// Tìm trang mà một thông báo dẫn tới theo mã sự kiện
/** Trang trong app mà thông báo dẫn tới, hoặc undefined khi không có trang tương ứng. */
export function notificationLink(item: AppNotification): string | undefined {
  const rule = rules.find(([pattern]) => pattern.test(item.eventCode));
  return rule?.[1](item);
}

const families = ["EVENT_REGISTRATION", "EVENT_PROPOSAL", "CLUB_APPLICATION", "BOARD_NOMINATION", "BOOKING",
  "PROPERTY_BOOKING", "ROOM_ALLOCATION", "RECRUITMENT", "CLUB_MEMBERSHIP", "MEMBERSHIP", "TRANSITION_PLAN",
  "LEADERSHIP_TRANSITION", "SUSPENSION_REQUEST", "VIOLATION", "CORRECTIVE_ACTION", "PERIODIC_REPORT", "EVALUATION",
  "EVENT_INVITATION", "SCHOOL_EVENT", "REPORT", "SETTLEMENT", "REFUND", "BUDGET", "EVENT", "CLUB"] as const;

export type NotificationFamily = (typeof families)[number] | "OTHER";

// Xác định nhóm chủ đề của mã thông báo
/** Chủ đề dùng làm tiêu đề dự phòng cho mã chưa có tiêu đề riêng. */
export function notificationFamily(eventCode: string): NotificationFamily {
  return families.find((family) => eventCode === family || eventCode.startsWith(`${family}_`)) ?? "OTHER";
}

// Lấy chủ thể dễ đọc nhất trong payload thông báo
/** Chủ thể dễ đọc và cụ thể nhất trong payload (tên sự kiện, CLB, kỳ, phòng). */
export function notificationSubject(item: AppNotification): string | undefined {
  for (const field of ["title", "eventTitle", "clubName", "periodCode", "propertyName", "semesterCode"]) {
    const value = item.payload[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}
