import type { EventRegistrationState } from "./event-registration.js";

export type AttendanceMethod = "self" | "manual" | "walk-in";

export interface Attendance {
  id: string;
  eventId: string;
  eventTitle: string;
  /** Không có với sự kiện toàn trường do ICPDP tổ chức (UC53). */
  clubId?: string;
  clubName: string;
  eventStartAt: Date;
  eventEndAt: Date;
  checkedInAt: Date;
  method: AttendanceMethod;
  abnormalFlags: string[];
}

export interface CheckInTarget {
  event: {
    id: string;
    clubId?: string;
    title: string;
    state: string;
    audienceScope: string;
    published: boolean;
    startAt: Date;
    endAt: Date;
    checkInCode?: string;
    checkInOpenAt?: Date;
    checkInCloseAt?: Date;
    allowWalkIn: boolean;
  };
  registrationState: EventRegistrationState | null;
  isActiveClubMember: boolean;
  attendance: Attendance | null;
}

export interface EventCheckInRepository {
  target(eventId: string, studentId: string): Promise<CheckInTarget | null>;
  /** Tạo bản điểm danh duy nhất (BR18); `created: false` khi đã có sẵn một bản. */
  checkIn(input: { eventId: string; studentId: string; method: "self" | "walk-in"; now: Date }):
    Promise<{ attendance: Attendance; created: boolean }>;
  listMine(studentId: string): Promise<Attendance[]>;
}

/** Các trạng thái mà sự kiện đã công bố nhận check-in (scheduler có thể chưa chuyển nó sang Ongoing). */
export const checkInStates = ["Upcoming", "Ongoing", "PUBLIC", "ONGOING"] as const;

// UC31: lấy khung giờ check-in của sự kiện, mặc định là thời gian diễn ra sự kiện
/** Khoảng thời gian UC31: cửa sổ check-in đã cấu hình của sự kiện, mặc định là giờ bắt đầu/kết thúc của chính sự kiện. */
export function checkInWindow(event: CheckInTarget["event"]): { opensAt: Date; closesAt: Date } {
  return { opensAt: event.checkInOpenAt ?? event.startAt, closesAt: event.checkInCloseAt ?? event.endAt };
}

// Kiểm tra thời điểm hiện tại có nằm trong khung giờ check-in không
export function isWithinCheckInWindow(event: CheckInTarget["event"], now: Date): boolean {
  const { opensAt, closesAt } = checkInWindow(event);
  return opensAt <= now && now < closesAt;
}

// So khớp mã check-in không phân biệt hoa thường và khoảng trắng
/** Mã được hiển thị hoặc quét tại địa điểm, nên không được phân biệt hoa thường và khoảng trắng hai đầu. */
export function checkInCodesMatch(expected: string, given: string): boolean {
  return expected.trim().toUpperCase() === given.trim().toUpperCase();
}

// BR36: tính khung giờ được gửi phản hồi từ lúc check-in của người tham dự
/** BR36: phản hồi mở từ lúc người tham dự check-in và đóng sau khi sự kiện kết thúc `feedbackWindowHours` giờ. */
export function feedbackWindow(attendance: Attendance, feedbackWindowHours: number | null) {
  return {
    feedbackOpensAt: attendance.checkedInAt,
    feedbackClosesAt: feedbackWindowHours === null ? null
      : new Date(attendance.eventEndAt.getTime() + feedbackWindowHours * 3_600_000),
  };
}
