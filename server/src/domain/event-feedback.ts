/** Tiêu chí duy nhất được chọn cho UC48: mức hài lòng chung theo thang 1–5 sao (đưa vào D3). */
export const FEEDBACK_CRITERION = 'overall'
export const MIN_RATING = 1
export const MAX_RATING = 5
export const MAX_COMMENT_LENGTH = 2_000

/** Phần tác giả thấy được của phản hồi của chính mình; không bao giờ hiển thị cho CLB kèm danh tính (BR37, A1). */
export interface MyEventFeedback {
  id: string
  eventId: string
  eventTitle: string
  clubName: string
  rating: number
  comment: string
  isAnonymous: boolean
  submittedAt: Date
}

export interface FeedbackTarget {
  attendance: { id: string; clubId?: string; checkedInAt: Date; eventEndAt: Date } | null
  feedback: MyEventFeedback | null
}

export interface EventFeedbackRepository {
  target(eventId: string, studentId: string): Promise<FeedbackTarget | null>
  /** Chèn bản ghi bất biến; gửi trùng sẽ trả về DomainError `conflict`. */
  submit(input: {
    eventId: string
    studentId: string
    attendanceId: string
    clubId?: string
    rating: number
    comment: string
    isAnonymous: boolean
    now: Date
  }): Promise<MyEventFeedback>
  listMine(studentId: string): Promise<MyEventFeedback[]>
}

// Kiểm tra điểm đánh giá và nhận xét phản hồi sự kiện
export function validateFeedback(input: { rating: number; comment: string }): {
  rating: number
  comment: string
} {
  if (!Number.isInteger(input.rating) || input.rating < MIN_RATING || input.rating > MAX_RATING) {
    throw new Error(`rating must be a whole number from ${MIN_RATING} to ${MAX_RATING}`)
  }
  const comment = input.comment.trim()
  if (!comment) {
    throw new Error('comment is required')
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    throw new Error(`comment must be at most ${MAX_COMMENT_LENGTH} characters`)
  }
  return { rating: input.rating, comment }
}

// BR36: tính khung giờ gửi phản hồi của người tham dự đã check-in
/** BR36: mở từ lúc người tham dự check-in cho đến `feedbackWindowHours` giờ sau khi sự kiện kết thúc. */
export function feedbackWindowFor(
  attendance: NonNullable<FeedbackTarget['attendance']>,
  hours: number | null,
) {
  return {
    opensAt: attendance.checkedInAt,
    closesAt: hours === null ? null : new Date(attendance.eventEndAt.getTime() + hours * 3_600_000),
  }
}

// Kiểm tra cửa sổ phản hồi đang mở tại thời điểm hiện tại
export function isFeedbackWindowOpen(
  window: { opensAt: Date; closesAt: Date | null },
  now: Date,
): boolean {
  return window.opensAt <= now && (window.closesAt === null || now < window.closesAt)
}

export type FeedbackSummary =
  | { respondents: number; visible: false }
  | {
      respondents: number
      visible: true
      averageRating: number
      distribution: Record<1 | 2 | 3 | 4 | 5, number>
    }

// Tổng hợp điểm phản hồi, chỉ hiển thị khi đủ số người phản hồi tối thiểu
/**
 * BR40: dưới mức tối thiểu đã cấu hình chỉ cho biết có phản hồi, không bao giờ lộ nội dung.
 * Chỉ nhận điểm đánh giá, nên số liệu tổng hợp không bao giờ mang danh tính (BR37, A1); phía CLB đọc qua UC49.
 */
export function summarizeFeedback(
  ratings: readonly number[],
  minRespondents: number,
): FeedbackSummary {
  const respondents = ratings.length
  if (respondents === 0 || respondents < minRespondents) {
    return { respondents, visible: false }
  }
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const rating of ratings) {
    distribution[rating as 1 | 2 | 3 | 4 | 5] += 1
  }
  const average = ratings.reduce((sum, rating) => sum + rating, 0) / respondents
  return {
    respondents,
    visible: true,
    averageRating: Math.round(average * 100) / 100,
    distribution,
  }
}
