import type { ClubEventInput, EventProposalDocument, EventPublishInput } from "./club-event.js";
import { DomainError } from "./errors.js";
import type { AcademicSemester } from "./policy.js";
import { semesterOf } from "./school-event.js";

// Kiểm tra thời gian sự kiện ở tương lai, kết thúc sau bắt đầu và trả về học kỳ chứa sự kiện
export function assertEventSchedule(startAt: Date, endAt: Date, calendar: readonly AcademicSemester[], now: Date): string {
  if (!Number.isFinite(startAt.getTime()) || !Number.isFinite(endAt.getTime()) || startAt <= now || endAt <= startAt) {
    throw new DomainError("event dates must be in the future and end after the start", "validation");
  }
  return semesterOf(calendar, startAt, endAt);
}
// Đảm bảo gửi sự kiện trước giờ bắt đầu đủ số giờ báo trước
export function assertEventNotice(startAt: Date, now: Date, noticeHours: number): void {
  if (startAt.getTime() - now.getTime() < noticeHours * 3600000) {
    throw new DomainError(`submit at least ${noticeHours} hours before the event starts`, "validation", { noticeHours });
  }
}
export const INTERNAL_EVENT_NOTICE_HOURS = 24;
export const APPROVED_EVENT_CANCEL_NOTICE_HOURS = 72;
// Đảm bảo yêu cầu huỷ sự kiện đã duyệt cách giờ bắt đầu tối thiểu số giờ quy định
/** Sự kiện ICPDP đã duyệt chỉ được yêu cầu huỷ khi còn ít nhất 72 giờ trước startAt. */
export function assertApprovedEventCancellationNotice(startAt: Date, now: Date, noticeHours = APPROVED_EVENT_CANCEL_NOTICE_HOURS): void {
  if (startAt.getTime() - now.getTime() < noticeHours * 3600000) {
    throw new DomainError(`cancellation request must be submitted at least ${noticeHours} hours before the event starts`, "conflict",
      { noticeHours });
  }
}
// Đảm bảo sự kiện nội bộ được công bố trước giờ bắt đầu đủ thời gian báo trước
/** Sự kiện nội bộ chỉ được chính thức hoá (CREATED/PUBLIC) hoặc dời lịch CREATED khi còn ít nhất 24 giờ. */
export function assertInternalEventNotice(startAt: Date, now: Date): void {
  if (startAt.getTime() - now.getTime() < INTERNAL_EVENT_NOTICE_HOURS * 3600000) {
    throw new DomainError(`internal event must start at least ${INTERNAL_EVENT_NOTICE_HOURS} hours from now`, "validation",
      { noticeHours: INTERNAL_EVENT_NOTICE_HOURS });
  }
}
// Chỉ cho sửa sự kiện nội bộ ở trạng thái DRAFT hoặc CREATED
/** Chỉ sự kiện nội bộ DRAFT và CREATED mới được sửa; đã công bố thì khoá lịch. */
export function assertInternalEventEditable(state: string): void {
  if (state === "PUBLIC" || state === "ONGOING") {
    throw new DomainError("published internal event schedule is locked; only cancellation is allowed", "conflict");
  }
  if (state !== "DRAFT" && state !== "CREATED") throw new DomainError("internal event cannot be edited in its current state", "conflict");
}
// Kiểm tra đối tượng tham dự của đề xuất ICPDP và dòng ngân sách đi kèm
/** Plan B: đề xuất ICPDP là PUBLIC, hoặc MEMBERS_ONLY kèm ít nhất một dòng ngân sách yêu cầu. */
export function assertProposalAudience(input: Pick<ClubEventInput, "audienceScope" | "budgetLines">): void {
  if (input.audienceScope === "MEMBERS_ONLY" && input.budgetLines.length === 0) {
    throw new DomainError("internal events without university budget must use the internal event flow", "validation");
  }
}
// Kiểm tra dữ liệu sự kiện CLB và trả về học kỳ chứa sự kiện
export function validateClubEventInput(input: ClubEventInput, calendar: readonly AcademicSemester[], now: Date): string {
  if (!input.title.trim() || !input.objective.trim() || !input.plan.trim()) throw new DomainError("title, objective and plan are required", "validation");
  const hasTopVenue = Boolean(input.venueText?.trim() || input.propertyId);
  if (!hasTopVenue && !input.occurrences?.length) throw new DomainError("choose a property or enter a venue", "validation");
  if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new DomainError("invalid capacity", "validation");
  const semester = assertEventSchedule(input.startAt, input.endAt, calendar, now);
  for (const occurrence of input.occurrences ?? []) {
    if (assertEventSchedule(occurrence.startAt, occurrence.endAt, calendar, now) !== semester || occurrence.startAt < input.startAt || occurrence.endAt > input.endAt) {
      throw new DomainError("all occurrences must be inside the event dates and the same semester", "validation");
    }
    if (!occurrence.venueText?.trim() && !occurrence.propertyId && !hasTopVenue) {
      throw new DomainError("choose a property or enter a venue", "validation");
    }
  }
  const occurrences = [...(input.occurrences ?? [])].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  if (occurrences.some((o, i) => i > 0 && o.startAt < occurrences[i - 1]!.endAt)) throw new DomainError("occurrences must not overlap", "validation");
  if (input.budgetLines.some((line) => !line.category.trim() || !line.purpose.trim() || !Number.isSafeInteger(line.amount) || line.amount <= 0) ||
    !Number.isSafeInteger(input.budgetLines.reduce((sum, line) => sum + line.amount, 0))) throw new DomainError("invalid requested budget", "validation");
  if (new Set(input.bookingIds).size !== input.bookingIds.length) throw new DomainError("booking ids must be unique", "validation");
  const form = input.registrationForm ?? [];
  if (new Set(form.map((f) => f.key)).size !== form.length || form.some((f) => !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(f.key) ||
    ["__proto__", "constructor", "prototype"].includes(f.key) || (["select", "radio", "checkbox"].includes(f.type) && !f.options?.length))) {
    throw new DomainError("invalid registration form fields", "validation");
  }
  return semester;
}
// Kiểm tra cấu hình đăng ký và check-in khi công bố sự kiện
export function validateEventPublication(input: EventPublishInput, startAt: Date, endAt: Date, now: Date): void {
  if (startAt <= now) throw new DomainError("event has already started", "conflict");
  if (Boolean(input.registrationOpenAt) !== Boolean(input.registrationCloseAt) ||
    (input.registrationOpenAt && input.registrationCloseAt && (input.registrationOpenAt >= input.registrationCloseAt || input.registrationCloseAt > startAt))) {
    throw new DomainError("registration must open before closing and close no later than the start", "validation");
  }
  if (!input.registrationOpenAt && !input.allowWalkIn) throw new DomainError("an event without registration must allow walk-ins", "validation");
  if (input.checkInOpenAt >= input.checkInCloseAt || input.checkInCloseAt > endAt) {
    throw new DomainError("invalid check-in window", "validation");
  }
}
// Phân loại xung đột lịch sự kiện: không xung đột, cảnh báo hay chặn
export function eventConflictResult(overlaps: number[], thresholdMinutes: number, allowOverbooking: boolean) {
  if (!overlaps.length) return "No Conflict";
  return !allowOverbooking && overlaps.some((minutes) => minutes >= thresholdMinutes) ? "Blocking Conflict" : "Warning";
}
// Kiểm tra việc huỷ sự kiện có trễ so với thời gian báo trước không
export function eventCancellationIsLate(startAt: Date, now: Date, noticeHours: number): boolean {
  return startAt.getTime() - now.getTime() < noticeHours * 3600000;
}

export const PROPOSAL_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const extensionForMime: Record<string, string> = { [PDF]: "pdf", [DOCX]: "docx", [XLSX]: "xlsx" };
export const PROPOSAL_DOCUMENT_MIME_TYPES: ReadonlySet<string> = new Set([PDF, DOCX]);
export const PROPOSAL_TEMPLATE_MIME_TYPES: ReadonlySet<string> = new Set([PDF, DOCX, XLSX]);
// Kiểm tra magic bytes của file khớp với loại MIME khai báo
function signatureMatches(mimeType: string, bytes: Buffer): boolean {
  if (mimeType === PDF) return bytes.subarray(0, 5).toString("latin1") === "%PDF-";
  const zip = bytes.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04])) && bytes.includes(Buffer.from("[Content_Types].xml"));
  return zip && bytes.includes(Buffer.from(mimeType === DOCX ? "word/" : "xl/"));
}
// Kiểm tra tên, dung lượng, loại và nội dung file đề xuất sự kiện, trả về tên đã cắt khoảng trắng
/** Kiểm tra tên, dung lượng, loại khai báo, phần mở rộng và magic bytes của tài liệu đề xuất hoặc mẫu được tải lên; trả về tên đã cắt khoảng trắng. */
export function validateEventProposalFile(fileName: string, mimeType: string, bytes: Buffer, allowedMimes: ReadonlySet<string>): string {
  const name = fileName.trim();
  const extension = extensionForMime[mimeType];
  // eslint-disable-next-line no-control-regex
  if (!name || name.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(name) || !allowedMimes.has(mimeType) || !extension ||
    !name.toLowerCase().endsWith(`.${extension}`) || bytes.length === 0 || bytes.length > PROPOSAL_DOCUMENT_MAX_BYTES ||
    !signatureMatches(mimeType, bytes)) {
    throw new DomainError("invalid event proposal file", "validation", { maxBytes: PROPOSAL_DOCUMENT_MAX_BYTES, mimeTypes: [...allowedMimes] });
  }
  return name;
}
// Đảm bảo đã có tài liệu đề xuất trước khi gửi sự kiện
export function assertProposalDocumentPresent(document: EventProposalDocument | undefined): void {
  if (!document) throw new DomainError("event proposal document is required before submission", "validation", { field: "proposalDocument" });
}
