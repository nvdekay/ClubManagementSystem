import { DomainError } from "../domain/errors.js";
import {
  checkInCodesMatch,
  checkInStates,
  feedbackWindow,
  isWithinCheckInWindow,
  type Attendance,
  type EventCheckInRepository,
} from "../domain/event-checkin.js";
import type { PolicyRepository } from "../domain/policy.js";
import type { AccessActor } from "./access.js";

const objectId = /^[0-9a-f]{24}$/i;

// Kiểm sinh viên đã đăng nhập, chưa bị khóa và trả id
function student(actor: AccessActor | null): string {
  if (!actor) throw new DomainError("authentication required", "unauthorized");
  if (actor.accountState === "Locked") throw new DomainError(actor.lockReason || "account locked", "locked");
  if (!objectId.test(actor.id)) throw new DomainError("invalid actor", "validation");
  return actor.id;
}

// Lấy số giờ mở cửa sổ feedback theo chính sách hiện hành
async function feedbackHours(policy: PolicyRepository, now: Date): Promise<number | null> {
  return (await policy.findEffective(now))?.feedbackWindowHours ?? null;
}

// Gắn thông tin cửa sổ feedback vào bản ghi điểm danh
function view(attendance: Attendance, hours: number | null) {
  return { ...attendance, ...feedbackWindow(attendance, hours) };
}

// Sinh viên điểm danh sự kiện bằng mã, kiểm cửa sổ, đăng ký và đối tượng
export async function checkInToEvent(repo: EventCheckInRepository, policy: PolicyRepository,
  actor: AccessActor | null, eventId: string, code: string, now: Date) {
  const studentId = student(actor);
  if (!objectId.test(eventId)) throw new DomainError("invalid event id", "validation");
  const target = await repo.target(eventId, studentId);
  if (!target) throw new DomainError("event not found", "not_found");
  // E1: check-in lặp lại trả về bản ghi đầu tiên không đổi (BR18), kể cả sau khung giờ.
  if (target.attendance) {
    return { ...view(target.attendance, await feedbackHours(policy, now)), alreadyCheckedIn: true };
  }
  const { event } = target;
  if (!event.published || !(checkInStates as readonly string[]).includes(event.state)) {
    throw new DomainError("event is not open for check-in", "conflict");
  }
  if (!event.checkInCode) throw new DomainError("check-in is not available for this event", "conflict");
  if (!checkInCodesMatch(event.checkInCode, code)) throw new DomainError("invalid check-in code", "validation");
  // E2: ngoài khung giờ chỉ còn check-in thủ công (kèm lý do) của thành viên CLB.
  if (!isWithinCheckInWindow(event, now)) {
    throw new DomainError("check-in is outside the event's check-in window", "conflict");
  }
  if (event.audienceScope === "MEMBERS_ONLY" && !target.isActiveClubMember) {
    throw new DomainError("event is limited to active club members", "forbidden");
  }
  // E3 trừ khi sự kiện nhận walk-in (A2), khi đó cũng tạo luôn đăng ký.
  const method = target.registrationState === "Confirmed" ? "self" : event.allowWalkIn ? "walk-in" : null;
  if (!method) throw new DomainError("a confirmed registration is required to check in", "forbidden");
  const result = await repo.checkIn({ eventId, studentId, method, now });
  return { ...view(result.attendance, await feedbackHours(policy, now)), alreadyCheckedIn: !result.created };
}

// Sinh viên xem lịch sử điểm danh của mình
export async function listMyAttendances(repo: EventCheckInRepository, policy: PolicyRepository,
  actor: AccessActor | null, now: Date) {
  const studentId = student(actor);
  const [items, hours] = await Promise.all([repo.listMine(studentId), feedbackHours(policy, now)]);
  return items.map((item) => view(item, hours));
}
