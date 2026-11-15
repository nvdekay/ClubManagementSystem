import type { EventRegistrationState } from "./event-registration.js";

export type AttendanceMethod = "self" | "manual" | "walk-in";

export interface Attendance {
  id: string;
  eventId: string;
  eventTitle: string;
  /** Absent for a school-wide event organised by ICPDP (UC53). */
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
  /** Creates the single attendance (BR18); `created: false` when one already existed. */
  checkIn(input: { eventId: string; studentId: string; method: "self" | "walk-in"; now: Date }):
    Promise<{ attendance: Attendance; created: boolean }>;
  listMine(studentId: string): Promise<Attendance[]>;
}

/** States in which a published event accepts check-in (the scheduler may not have flipped it to Ongoing yet). */
export const checkInStates = ["Upcoming", "Ongoing", "PUBLIC", "ONGOING"] as const;

// UC31: lấy khung giờ check-in của sự kiện, mặc định là thời gian diễn ra sự kiện
/** UC31 window: the event's configured check-in window, defaulting to the event's own start/end. */
export function checkInWindow(event: CheckInTarget["event"]): { opensAt: Date; closesAt: Date } {
  return { opensAt: event.checkInOpenAt ?? event.startAt, closesAt: event.checkInCloseAt ?? event.endAt };
}

// Kiểm tra thời điểm hiện tại có nằm trong khung giờ check-in không
export function isWithinCheckInWindow(event: CheckInTarget["event"], now: Date): boolean {
  const { opensAt, closesAt } = checkInWindow(event);
  return opensAt <= now && now < closesAt;
}

// So khớp mã check-in không phân biệt hoa thường và khoảng trắng
/** Codes are shown or scanned at the venue, so case and surrounding spaces must not matter. */
export function checkInCodesMatch(expected: string, given: string): boolean {
  return expected.trim().toUpperCase() === given.trim().toUpperCase();
}

// BR36: tính khung giờ được gửi phản hồi từ lúc check-in của người tham dự
/** BR36: feedback opens at the attendee's own check-in and closes `feedbackWindowHours` after the event ends. */
export function feedbackWindow(attendance: Attendance, feedbackWindowHours: number | null) {
  return {
    feedbackOpensAt: attendance.checkedInAt,
    feedbackClosesAt: feedbackWindowHours === null ? null
      : new Date(attendance.eventEndAt.getTime() + feedbackWindowHours * 3_600_000),
  };
}
