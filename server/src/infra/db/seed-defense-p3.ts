// Dữ liệu demo bảo vệ cho người trình bày 3: luồng 5 (UC25-UC34, UC48-UC49, sự kiện CLB) trên
// "CLB Sáng tạo Công nghệ FPTU". Mỗi trạng thái mà buổi demo trực tiếp bắt đầu từ đều có một sự kiện đang chờ sẵn:
//   1. một đề xuất bị trả lại sửa và đã được sửa xong (Leader nộp lại, ICPDP duyệt, Leader đăng)
//   2. một sự kiện nhỏ đã đăng và đã đầy, có hai sinh viên trong danh sách chờ
//   3. một buổi talk đang diễn ra với cửa sổ check-in đang mở (sinh viên check-in và gửi feedback)
//   4. một workshop kết thúc hai ngày trước: một người vắng mặt cần xác nhận, điểm danh chưa chốt, đủ feedback
// Mọi lệnh ghi đều đi qua repository và usecase thật. Sự kiện 3 và 4 không thể được đề xuất trong
// quá khứ (ghế Leader chỉ tồn tại từ hôm nay), nên chúng được đề xuất với ngày tương lai rồi toàn bộ
// bản ghi được dời ngược thời gian trước khi có ai đăng ký. Chỉ thêm và chạy lại an toàn.
// Dàn nhân vật: seed-defense-cast.ts; ví dụ `npm run seed:defense:p3 -- --leader=a@x --officer=b@y --member=c@z`.
// Một thành viên bị ghi đè cũng có ghế ở buổi talk đang diễn ra để có thể check-in và gửi feedback trực tiếp.
import mongoose, { Types, type Model } from "mongoose";
import type { ClubEventInput, EventPublishInput } from "../../domain/club-event.js";
import type { EventReviewDecisionInput } from "../../domain/event-proposal-review.js";
import { checkInToEvent } from "../../usecase/event-checkin.js";
import { submitEventFeedback } from "../../usecase/event-feedback.js";
import { normalizedEventDecision, runEventLifecycleJob } from "../../usecase/event-proposal-review.js";
import { registerForEvent } from "../../usecase/event-registration.js";
import { loadConfig } from "../config/index.js";
import { defenseCast, DEMO_CLUB_NAME, type CastRole } from "./seed-defense-cast.js";
import { mongoClubEventRepository } from "./mongo-club-event-repository.js";
import { mongoEventCheckInRepository } from "./mongo-event-checkin-repository.js";
import { mongoEventFeedbackRepository } from "./mongo-event-feedback-repository.js";
import { mongoEventProposalReviewRepository } from "./mongo-event-proposal-review-repository.js";
import { mongoEventRegistrationRepository } from "./mongo-event-registration-repository.js";
import { mongoPolicyRepository } from "./mongo-policy-repository.js";
import { ucmsModels as m } from "./ucms-models.js";

const castRoles = defenseCast();
const DOMAIN = "fpt.edu.vn";
/** Các vai trong dàn nhân vật demo bảo vệ, khoá theo tên mà câu chuyện của luồng này dùng. */
const roleOf = { an: "leader", bao: "vice", chi: "member", duy: "member2", officer: "officer" } as const;
/** Thêm các sinh viên chỉ có dữ liệu để lấp đăng ký, danh sách chờ và feedback. */
const students = {
  giang: "Hoàng Thu Giang", hai: "Đặng Minh Hải", khanh: "Vũ Ngọc Khánh", linh: "Bùi Thảo Linh",
  minh: "Ngô Quang Minh", nhi: "Trịnh Yến Nhi", phuc: "Lý Hoàng Phúc",
} as const;
type Person = keyof typeof roleOf | keyof typeof students;
type Ids = Record<Person, Types.ObjectId>;
const P3_EVENTS = {
  revision: "Workshop Git & GitHub cho người mới bắt đầu",
  waitlist: "Mentoring 1-1 cùng kỹ sư phần mềm",
  ongoing: "Talkshow: AI trong học tập và nghiên cứu",
  completed: "Workshop Docker cơ bản",
} as const;
const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;
const VN_OFFSET = 7 * HOUR;
const now = new Date();
// Repository CLB với đúng các quy tắc main.ts nối (báo trước đề xuất 7 ngày, huỷ muộn 24 giờ).
const events = mongoClubEventRepository({ proposalNoticeHours: 168, cancellationNoticeHours: 24 });
const reviews = mongoEventProposalReviewRepository();
const policies = mongoPolicyRepository();

// Thời điểm cách hiện tại ms mili giây về trước
function ago(ms: number): Date { return new Date(now.getTime() - ms); }
// Giờ hour:00 theo giờ Việt Nam của ngày cách hôm nay days ngày
/** `hour`:00 giờ Việt Nam của ngày lịch `days` ngày sau hôm nay. */
function vnAt(days: number, hour: number): Date {
  return new Date(Math.floor((now.getTime() + VN_OFFSET) / DAY) * DAY + days * DAY + hour * HOUR - VN_OFFSET);
}
// Dựng actor sinh viên Active từ id
function student(id: Types.ObjectId) { return { id: String(id), accountState: "Active" as const }; }

/** Các thao tác chỉ Leader làm được được ghi ngày không sớm hơn ghế của leader, để CLB vừa tạo vẫn chạy được. */
let leaderSince = 0;
// Thời điểm leader thao tác, không sớm hơn lúc leader nhận ghế
/** `minutes` phút trước bây giờ, nhưng không bao giờ trước lúc leader giữ ghế. */
function led(minutes: number): Date { return new Date(Math.max(now.getTime() - minutes * MINUTE, leaderSince)); }

// Lấy hoặc tạo tài khoản cho một vai trong cast
/** Một vai trong dàn nhân vật: tài khoản bị ghi đè (thật) phải tồn tại sẵn và không bao giờ bị đổi tên. */
async function castUser(role: CastRole): Promise<Types.ObjectId> {
  const person = castRoles[role];
  const found = await m.users!.findOne({ email: person.email }).select("_id").lean();
  if (found) return found._id as Types.ObjectId;
  if (person.overridden) throw new Error(`--${role}=${person.email}: no such account; sign in once with Google first`);
  const [created] = await m.users!.create([{ email: person.email, displayName: person.name, accountState: "Active", createdAt: now }]);
  return created!._id as Types.ObjectId;
}
// Lấy hoặc tạo sinh viên demo theo khoá
async function demoStudent(key: keyof typeof students): Promise<Types.ObjectId> {
  const email = `${key}.demo@${DOMAIN}`;
  const found = await m.users!.findOne({ email }).select("_id").lean();
  if (found) return found._id as Types.ObjectId;
  const [created] = await m.users!.create([{ email, displayName: students[key], accountState: "Active", createdAt: now }]);
  return created!._id as Types.ObjectId;
}

// Đảm bảo người dùng có vai trò ICPDP_OFFICER
/** Cán bộ thật phải đã giữ ICPDP_OFFICER; chỉ cán bộ demo mới được cấp ở đây. */
async function ensureOfficerRole(officerId: Types.ObjectId): Promise<void> {
  const role = castRoles.officer.overridden ? await m.roles!.findOne({ code: "ICPDP_OFFICER", scope: "system" }).lean()
    : await m.roles!.findOneAndUpdate({ code: "ICPDP_OFFICER", scope: "system" },
      { $setOnInsert: { name: "ICPDP OFFICER", isSystem: true, permissionCodes: [] } }, { upsert: true, new: true }).lean();
  if (role && await m.userRoleAssignments!.exists({ userId: officerId, roleId: role._id, revokedAt: null })) return;
  if (castRoles.officer.overridden) throw new Error(`--officer=${castRoles.officer.email} does not hold the ICPDP_OFFICER role`);
  await m.userRoleAssignments!.create({ userId: officerId, roleId: role!._id, grantedBy: officerId,
    grantedAt: now, reason: "defense demo (presenter 3)" });
}

/**
 * BR06: một user chỉ lãnh đạo tối đa một CLB mỗi nhiệm kỳ đang chạy. Seed từ chối leader đã giữ
 * ghế Chủ nhiệm của CLB khác thay vì tạo ra một ban lãnh đạo thứ hai vi phạm quy tắc.
 */
async function assertLeadsNoOtherClub(clubId: Types.ObjectId | undefined, leaderId: Types.ObjectId): Promise<void> {
  const memberships = await m.clubMemberships!.find({ userId: leaderId, ...(clubId ? { clubId: { $ne: clubId } } : {}) }).lean();
  if (!memberships.length) return;
  const seats = await m.clubPositions!.find({ clubId: { $in: memberships.map((x) => x.clubId) }, isLeaderRole: true, isActive: true }).distinct("_id");
  const terms = await m.clubTerms!.find({ clubId: { $in: memberships.map((x) => x.clubId) }, state: { $in: ["Active", "Planned"] },
    endAt: { $gt: now } }).distinct("_id");
  const held = await m.clubPositionAssignments!.findOne({ membershipId: { $in: memberships.map((x) => x._id) },
    positionId: { $in: seats }, termId: { $in: terms }, effectiveTo: null }).lean();
  if (!held) return;
  const other = await m.clubs!.findById(held.clubId).select("name").lean();
  throw new Error(`${castRoles.leader.email} already leads "${String(other?.name)}"; BR06 allows one club per term, ` +
    `so it cannot also be Chủ nhiệm of "${DEMO_CLUB_NAME}". Use an account that leads no club (or the vice seat).`);
}

// Đảm bảo người dùng là thành viên Active của CLB demo
async function ensureMembership(clubId: Types.ObjectId, userId: Types.ObjectId, officerId: Types.ObjectId) {
  const found = await m.clubMemberships!.findOne({ clubId, userId }).lean();
  if (found) {
    if (found.state !== "Active") throw new Error(`user ${String(userId)} has a ${String(found.state)} membership in "${DEMO_CLUB_NAME}"`);
    return found._id as Types.ObjectId;
  }
  const [created] = await m.clubMemberships!.create([{ clubId, userId, state: "Active", joinedAt: now, defaultRole: "MEMBERS",
    statusHistory: [{ toState: "Active", reason: "defense demo (presenter 3)", actorId: officerId, at: now }] }]);
  return created!._id as Types.ObjectId;
}

/**
 * CLB demo với leader của dàn nhân vật làm Chủ nhiệm, vice làm Phó chủ nhiệm và cả hai thành viên đều Active.
 * Dùng lại những gì seed của người trình bày khác (hoặc lần chạy luồng 1-3) đã tạo và chỉ thêm phần còn thiếu.
 */
async function ensureClub(ids: Ids): Promise<Types.ObjectId> {
  const existing = await m.clubs!.findOne({ name: DEMO_CLUB_NAME }).select("_id").lean();
  await assertLeadsNoOtherClub(existing?._id as Types.ObjectId | undefined, ids.an);
  const clubId = (existing?._id ?? (await m.clubs!.create([{ code: "CLB-DEMO-P3", name: DEMO_CLUB_NAME, field: "Công nghệ",
    state: "Active", description: "Cộng đồng sinh viên học lập trình và xây dựng sản phẩm công nghệ.",
    contactEmail: castRoles.leader.email, createdAt: now }]))[0]!._id) as Types.ObjectId;
  const club = await m.clubs!.findById(clubId).lean();
  if (club!.state !== "Active") throw new Error(`"${DEMO_CLUB_NAME}" is ${String(club!.state)}; flow 5 needs an Active club`);
  const seats = [
    { code: "CLUB_LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true, isSingleHolder: true, isDefaultMemberRole: false },
    { code: "VICE_LEADER", name: "Phó chủ nhiệm", isBoardSeat: true, isLeaderRole: false, isSingleHolder: false, isDefaultMemberRole: false },
    { code: "MEMBERS", name: "Thành viên", isBoardSeat: false, isLeaderRole: false, isSingleHolder: false, isDefaultMemberRole: true },
  ];
  const position: Record<string, Types.ObjectId> = {};
  for (const seat of seats) {
    const found = await m.clubPositions!.findOne({ clubId, code: seat.code, isActive: true }).select("_id").lean();
    position[seat.code] = (found?._id ?? (await m.clubPositions!.create([{ ...seat, clubId, permissionCodes: [], isActive: true }]))[0]!._id) as Types.ObjectId;
  }
  const term = await m.clubTerms!.findOne({ clubId, state: "Active", startAt: { $lte: now }, endAt: { $gt: now } }).lean()
    ?? (await m.clubTerms!.create([{ clubId, name: "Founding term", startAt: ago(120 * MINUTE),
      endAt: new Date(now.getTime() + 365 * DAY), state: "Active", confirmedBy: ids.officer, confirmedAt: now }]))[0]!.toObject();
  const membership = {} as Record<"an" | "bao" | "chi" | "duy", Types.ObjectId>;
  for (const key of ["an", "bao", "chi", "duy"] as const) membership[key] = await ensureMembership(clubId, ids[key], ids.officer);
  async function seat(code: string, holder: "an" | "bao"): Promise<Date> {
    const held = await m.clubPositionAssignments!.find({ clubId, termId: term._id, positionId: position[code], effectiveTo: null }).lean();
    const own = held.find((a) => String(a.membershipId) === String(membership[holder]));
    if (own) return own.effectiveFrom as Date;
    if (code === "CLUB_LEADER" && held.length) {
      const other = await m.clubMemberships!.findById(held[0]!.membershipId).lean();
      const user = other && await m.users!.findById(other.userId).select("email").lean();
      throw new Error(`"${DEMO_CLUB_NAME}" is already led by ${String(user?.email)}; run every presenter seed with the same --leader`);
    }
    const effectiveFrom = new Date(Math.max((term.startAt as Date).getTime(), ago(120 * MINUTE).getTime()));
    await m.clubPositionAssignments!.create([{ clubId, termId: term._id, positionId: position[code], membershipId: membership[holder],
      effectiveFrom, assignedBy: ids.officer, confirmedBy: ids.officer }]);
    return effectiveFrom;
  }
  const leaderFrom = await seat("CLUB_LEADER", "an");
  await seat("VICE_LEADER", "bao");
  leaderSince = Math.max(leaderFrom.getTime(), (term.startAt as Date).getTime()) + 1000;
  return clubId;
}

// Đảm bảo policy có hạn nộp báo cáo POST_EVENT
/**
 * Báo cáo sau sự kiện đến hạn sau một số ngày kể từ khi sự kiện kết thúc, đọc từ chính sách có hiệu lực tại
 * thời điểm kết thúc đó; các sự kiện demo đăng ký và kết thúc trong vòng một tháng qua. Khi chính sách có hiệu lực
 * một tháng trước không có hạn POST_EVENT, một bản sao của chính sách hiện tại kèm hạn đó được thêm vào (như seed-guide.ts
 * làm): từ năm 2000 nếu lúc đó chưa có chính sách nào, để các sự kiện CLB cũ có hạn thay vì cảnh báo
 * "chưa cấu hình", còn không thì từ một tháng trước. Database đã có sẵn thì để nguyên.
 */
async function ensureReportDeadline(): Promise<void> {
  const monthAgo = ago(30 * DAY);
  const inForce = await m.policyVersions!.findOne({ effectiveFrom: { $lte: monthAgo } }).sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).lean();
  if (((inForce?.reportDeadlines ?? []) as { reportType: string }[]).some((d) => d.reportType === "POST_EVENT")) return;
  const current = await m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1, _id: -1 }).lean();
  if (!current) throw new Error("no effective policy; run `npm run seed` first");
  const { _id: id, __v: revision, ...settings } = current;
  void id; void revision;
  const deadlines = ((settings.reportDeadlines ?? []) as { reportType: string }[]).filter((d) => d.reportType !== "POST_EVENT");
  await m.policyVersions!.create({ ...settings, effectiveFrom: inForce ? monthAgo : new Date("2000-01-01T00:00:00.000Z"), createdAt: now,
    reportDeadlines: [...deadlines, { reportType: "POST_EVENT", dueDaysAfterPeriodEnd: 7, remindBeforeDays: 2, overdueAfterDays: 1, escalateAfterDays: 3 }] });
}

// Dựng input sự kiện CLB mẫu với giá trị mặc định
function input(title: string, startAt: Date, hours: number, extra: Partial<ClubEventInput>): ClubEventInput {
  return { title, startAt, endAt: new Date(startAt.getTime() + hours * HOUR), audienceScope: "PUBLIC", capacity: 40,
    riskCategory: "LOW", budgetLines: [], bookingIds: [], registrationForm: [], occurrences: [], objective: "", plan: "", ...extra };
}

// Gửi proposal sự kiện của CLB, trả về id sự kiện
/** Leader tạo và nộp, cán bộ nhận xử lý và quyết định; trả về id sự kiện. */
async function propose(clubId: Types.ObjectId, ids: Ids, draft: ClubEventInput, at: Date): Promise<string> {
  const club = String(clubId);
  const created = await events.create(club, draft, String(ids.an), at);
  const id = created.event.id;
  // Nộp cần tài liệu đề xuất; một asset giữ chỗ là đủ cho dữ liệu demo.
  const attached = await events.act(club, id, { kind: "attach-document", document: {
    id: `demo-proposal-${id}`, fileName: `De an ${draft.title}.pdf`, mimeType: "application/pdf", bytes: 48_000,
    assetId: `ucms/event-proposals/demo/${id}.pdf`, uploadedAt: at, uploadedBy: String(ids.an) } }, String(ids.an), at);
  await events.act(club, id, { kind: "submit", expectedVersion: attached.event.version }, String(ids.an), new Date(Math.min(at.getTime() + 5 * MINUTE, now.getTime())));
  await reviews.claim(id, String(ids.officer), new Date(Math.min(at.getTime() + 10 * MINUTE, now.getTime())));
  return id;
}
// ICPDP ghi quyết định cho proposal sự kiện
async function decide(id: string, ids: Ids, decision: EventReviewDecisionInput, at: Date): Promise<void> {
  await reviews.decide(id, String(ids.officer), normalizedEventDecision(decision, at), at);
}
// Publish sự kiện đã duyệt để mở đăng ký
async function publish(clubId: Types.ObjectId, ids: Ids, id: string, windows: EventPublishInput, at: Date): Promise<void> {
  const detail = await events.find(String(clubId), id);
  await events.act(String(clubId), id, { kind: "publish", input: windows, expectedVersion: detail!.event.version }, String(ids.an), at);
}

// Dịch các trường ngày của bản ghi đi delta mili giây
/** Cộng `delta` vào mọi trường ngày ở cấp cao nhất của các document đã cho. */
async function shiftDates(model: Model<Record<string, unknown>>, filter: Record<string, unknown>, delta: number): Promise<void> {
  for (const doc of await model.find(filter).lean()) {
    const set: Record<string, Date> = {};
    for (const [key, value] of Object.entries(doc)) if (value instanceof Date) set[key] = new Date(value.getTime() + delta);
    if (Object.keys(set).length) await model.updateOne({ _id: doc._id }, { $set: set });
  }
}
// Dịch lịch sự kiện cùng task duyệt đi delta mili giây
/** Dời một sự kiện vừa đăng và toàn bộ lịch sử đề xuất của nó `delta` ms theo thời gian (âm: về quá khứ). */
async function moveEvent(id: string, delta: number): Promise<void> {
  const eventId = new Types.ObjectId(id);
  const tasks = await m.approvalTasks!.find({ entityType: "EVENT_PROPOSAL", entityId: eventId }).select("_id").lean();
  await shiftDates(m.events!, { _id: eventId }, delta);
  await shiftDates(m.eventProposalVersions!, { eventId }, delta);
  await shiftDates(m.approvalTasks!, { _id: { $in: tasks.map((t) => t._id) } }, delta);
  await shiftDates(m.approvalDecisions!, { approvalTaskId: { $in: tasks.map((t) => t._id) } }, delta);
  await shiftDates(m.auditLogs!, { entityType: "Event", entityId: eventId }, delta);
  await shiftDates(m.notifications!, { entityId: eventId }, delta);
  // Các payload đã nộp cũng mang lịch; giữ cho khớp với sự kiện.
  const event = await m.events!.findById(eventId).select({ startAt: 1, endAt: 1 }).lean();
  const schedule = { startAt: event!.startAt, endAt: event!.endAt };
  await m.eventProposalVersions!.updateMany({ eventId }, { $set: { "payload.startAt": schedule.startAt, "payload.endAt": schedule.endAt } });
  await m.auditLogs!.updateMany({ entityType: "Event", entityId: eventId, "after.payload": { $exists: true } },
    { $set: { "after.payload.startAt": schedule.startAt, "after.payload.endAt": schedule.endAt } });
}

// Tạo sự kiện đã duyệt rồi dời về quá khứ
/** Được đề xuất, duyệt và đăng với lịch tương lai, rồi dời để bắt đầu lúc `startAt`. */
async function pastEvent(clubId: Types.ObjectId, ids: Ids, draft: ClubEventInput, startAt: Date): Promise<string> {
  const hours = (draft.endAt.getTime() - draft.startAt.getTime()) / HOUR;
  const tempStart = vnAt(9, draft.startAt.getUTCHours() + 7);
  const id = await propose(clubId, ids, { ...draft, startAt: tempStart, endAt: new Date(tempStart.getTime() + hours * HOUR) }, led(40));
  await decide(id, ids, { outcome: "Approve" }, led(25));
  await publish(clubId, ids, id, { registrationOpenAt: led(20), registrationCloseAt: tempStart, checkInOpenAt: tempStart,
    checkInCloseAt: new Date(tempStart.getTime() + hours * HOUR), allowWalkIn: false, waitlistEnabled: true }, led(20));
  await moveEvent(id, startAt.getTime() - tempStart.getTime());
  return id;
}

// Đăng ký sinh viên vào sự kiện, cách nhau theo thời gian
async function register(id: string, who: Types.ObjectId[], firstAt: Date): Promise<void> {
  const repo = mongoEventRegistrationRepository();
  for (const [index, studentId] of who.entries()) {
    await registerForEvent(repo, policies, student(studentId), id, {}, new Date(firstAt.getTime() + index * 47 * MINUTE));
  }
}
// Check-in sinh viên vào sự kiện bằng mã check-in
async function checkIn(id: string, who: Types.ObjectId[], firstAt: Date): Promise<void> {
  const event = await m.events!.findById(id).select({ checkInCode: 1 }).lean();
  const repo = mongoEventCheckInRepository();
  for (const [index, studentId] of who.entries()) {
    await checkInToEvent(repo, policies, student(studentId), id, String(event!.checkInCode), new Date(firstAt.getTime() + index * 3 * MINUTE));
  }
}

// Seed sự kiện ở trạng thái yêu cầu chỉnh sửa
async function seedRevisionRequested(clubId: Types.ObjectId, ids: Ids): Promise<void> {
  const startAt = vnAt(10, 18);
  const draft = input(P3_EVENTS.revision, startAt, 2.5, {
    venueText: "Phòng 401, tòa Beta", capacity: 60, riskCategory: "LOW",
    objective: "Giúp sinh viên năm nhất dùng Git và GitHub để làm bài tập nhóm và đóng góp mã nguồn mở.",
    plan: "18:00 Giới thiệu Git và quy trình làm việc nhóm\n18:45 Branch, pull request và review code\n19:45 Hỏi đáp",
    budgetLines: [{ category: "Tài liệu và quà tặng", purpose: "In tài liệu hướng dẫn và quà cho người tham gia", amount: 1_800_000 }],
  });
  const id = await propose(clubId, ids, draft, led(55));
  await decide(id, ids, { outcome: "Request revision", sections: ["content", "budget"],
    reason: "Bổ sung phần thực hành trên máy và báo giá chi tiết cho khoản in tài liệu.",
    revisionDeadlineAt: vnAt(4, 23) }, led(40));
  const detail = await events.find(String(clubId), id);
  await events.act(String(clubId), id, { kind: "save", expectedVersion: detail!.event.version, input: { ...draft,
    plan: "18:00 Giới thiệu Git và quy trình làm việc nhóm\n18:30 Thực hành trên máy: tạo repo, commit, branch\n19:15 Pull request và review code theo nhóm\n20:00 Hỏi đáp",
    budgetLines: [{ category: "Tài liệu và quà tặng", purpose: "In tài liệu hướng dẫn và quà cho nhóm hoàn thành bài thực hành",
      plannedItems: "60 bộ tài liệu x 15.000đ = 900.000đ; 6 phần quà x 50.000đ = 300.000đ", amount: 1_200_000 }],
  } }, String(ids.an), led(15));
}

// Seed sự kiện có danh sách chờ
async function seedWaitlist(clubId: Types.ObjectId, ids: Ids): Promise<void> {
  const startAt = vnAt(8, 14);
  const id = await propose(clubId, ids, input(P3_EVENTS.waitlist, startAt, 3, {
    venueText: "Phòng 302, tòa Alpha", capacity: 4,
    objective: "Mỗi sinh viên có 30 phút trao đổi riêng với kỹ sư phần mềm về định hướng nghề nghiệp và CV.",
    plan: "14:00 Giới thiệu mentor\n14:15 Bốn lượt trao đổi 1-1\n16:30 Tổng kết",
  }), led(80));
  await decide(id, ids, { outcome: "Approve" }, led(65));
  await publish(clubId, ids, id, { registrationOpenAt: led(60), registrationCloseAt: vnAt(7, 23),
    checkInOpenAt: startAt, checkInCloseAt: new Date(startAt.getTime() + 3 * HOUR), allowWalkIn: false, waitlistEnabled: true }, led(60));
  const repo = mongoEventRegistrationRepository();
  for (const [index, key] of (["giang", "hai", "khanh", "linh", "minh", "nhi"] as const).entries()) {
    await registerForEvent(repo, policies, student(ids[key]), id, {}, led(50 - index * 7));
  }
}

// Seed sự kiện đang diễn ra
async function seedOngoing(clubId: Types.ObjectId, ids: Ids): Promise<void> {
  const startAt = new Date(Math.floor(now.getTime() / (15 * MINUTE)) * 15 * MINUTE - 30 * MINUTE);
  const id = await pastEvent(clubId, ids, input(P3_EVENTS.ongoing, vnAt(0, 19), 2.5, {
    venueText: "Hội trường tầng 5, tòa Alpha", capacity: 120,
    objective: "Chia sẻ cách dùng công cụ AI có trách nhiệm trong học tập, làm đồ án và nghiên cứu khoa học.",
    plan: "Phần 1: AI hỗ trợ học tập\nPhần 2: Liêm chính học thuật khi dùng AI\nPhần 3: Hỏi đáp cùng diễn giả",
  }), startAt);
  // Một tài khoản thành viên thật cũng có ghế, để có thể check-in và gửi feedback trong buổi demo trực tiếp.
  await register(id, [ids.duy, ...(castRoles.member.overridden ? [ids.chi] : []), ids.giang, ids.hai, ids.khanh, ids.phuc],
    new Date(startAt.getTime() - 5 * DAY));
  await checkIn(id, [ids.giang, ids.hai, ids.khanh], new Date(startAt.getTime() + 4 * MINUTE));
}

// Seed sự kiện đã hoàn thành
async function seedCompleted(clubId: Types.ObjectId, ids: Ids): Promise<void> {
  const startAt = vnAt(-2, 18);
  const id = await pastEvent(clubId, ids, input(P3_EVENTS.completed, startAt, 2.5, {
    venueText: "Phòng 210, tòa Gamma", capacity: 30,
    objective: "Sinh viên tự đóng gói và chạy được một ứng dụng web bằng Docker và Docker Compose.",
    plan: "18:00 Container và image\n18:45 Viết Dockerfile\n19:30 Docker Compose cho ứng dụng nhiều dịch vụ",
  }), startAt);
  const attendees = [ids.giang, ids.hai, ids.khanh, ids.linh, ids.minh];
  await register(id, [...attendees, ids.nhi], new Date(startAt.getTime() - 6 * DAY));
  // Trịnh Yến Nhi đã đăng ký nhưng không check-in: người vắng mặt mà CLB xác nhận trước khi chốt.
  await checkIn(id, attendees, new Date(startAt.getTime() + 2 * MINUTE));
  await runEventLifecycleJob(reviews, now);
  const repo = mongoEventFeedbackRepository();
  const feedback: [Types.ObjectId, number, string, boolean][] = [
    [ids.giang, 5, "Hướng dẫn dễ hiểu, phần thực hành Docker Compose rất hữu ích cho đồ án.", false],
    [ids.hai, 4, "Nội dung tốt, mong có thêm thời gian hỏi đáp ở cuối buổi.", true],
    [ids.khanh, 5, "Mentor hỗ trợ nhiệt tình, tài liệu rõ ràng, làm theo được ngay.", false],
    [ids.linh, 4, "Phòng hơi nóng nhưng bài thực hành được chuẩn bị kỹ.", true],
  ];
  for (const [index, [studentId, rating, comment, isAnonymous]] of feedback.entries()) {
    await submitEventFeedback(repo, policies, student(studentId), id, { rating, comment, isAnonymous }, ago((90 - index * 20) * MINUTE));
  }
}

try {
  const config = loadConfig();
  await mongoose.connect(config.MONGO_URI);
  const ids = {} as Ids;
  for (const key of Object.keys(roleOf) as (keyof typeof roleOf)[]) ids[key] = await castUser(roleOf[key]);
  for (const key of Object.keys(students) as (keyof typeof students)[]) ids[key] = await demoStudent(key);
  await ensureOfficerRole(ids.officer);
  const clubId = await ensureClub(ids);
  await ensureReportDeadline();
  const steps: [string, (clubId: Types.ObjectId, ids: Ids) => Promise<void>][] = [
    [P3_EVENTS.revision, seedRevisionRequested], [P3_EVENTS.waitlist, seedWaitlist],
    [P3_EVENTS.ongoing, seedOngoing], [P3_EVENTS.completed, seedCompleted],
  ];
  for (const [title, step] of steps) {
    if (await m.events!.exists({ clubId, title })) continue;
    await step(clubId, ids);
  }
  await runEventLifecycleJob(reviews, now);
  const seeded = await m.events!.find({ clubId, title: { $in: Object.values(P3_EVENTS) } })
    .select({ title: 1, state: 1, startAt: 1, confirmedRegistrationCount: 1, capacity: 1, checkInCode: 1 }).sort({ startAt: 1 }).lean();
  console.log(JSON.stringify({ club: String(clubId), events: seeded.map((e) => ({ id: String(e._id), title: e.title, state: e.state,
    startAt: e.startAt, registered: `${String(e.confirmedRegistrationCount)}/${String(e.capacity)}`, checkInCode: e.checkInCode })) }, null, 2));
} catch (error) {
  console.error("presenter 3 seed failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
