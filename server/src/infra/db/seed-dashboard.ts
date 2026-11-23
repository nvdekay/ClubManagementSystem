// Lịch sử dashboard dựng trên `npm run seed` + `npm run seed:demo`: khoảng 150 tài khoản sinh viên demo và
// một năm sinh hoạt CLB (thành viên vào/rời, sự kiện có đăng ký, check-in và feedback,
// ngân sách, đề xuất đang chờ, đơn tuyển thành viên), để biểu đồ ICPDP và Club Leader có dữ liệu để hiển thị.
// Cách dùng: npm run seed:dashboard   (chỉ database local; chạy lại an toàn: mỗi bản ghi có id cố định
// suy ra từ khoá của nó và chỉ được chèn khi chưa có).
import { createHash } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type { AcademicSemester } from "../../domain/policy.js";
import { loadConfig } from "../config/index.js";
import { studentEmail } from "./seed-email.js";
import { ensureUcmsDatabase, ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const config = loadConfig();
const DAY = 86_400_000;
const now = new Date();

// Sinh ObjectId cố định từ khoá để seed chạy lại không tạo trùng
function oid(key: string): Types.ObjectId {
  return new Types.ObjectId(createHash("md5").update(`seed-dashboard:${key}`).digest("hex").slice(0, 24));
}
// Bộ sinh số với seed cố định, nên chạy lại vẫn chọn cùng người, ngày và số cho cùng khoá.
let state = 20261017;
// Bộ sinh số ngẫu nhiên có seed cố định, trả về số trong [0, 1)
function random(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
// Đặt lại seed của bộ sinh số ngẫu nhiên theo khoá
/** Khởi động lại bộ sinh từ một khoá, để bỏ qua các bản ghi đã có trong database không làm lệch các lần chọn sau. */
function reseed(key: string): void {
  state = Number.parseInt(createHash("md5").update(key).digest("hex").slice(0, 8), 16) | 0;
}
// Sinh số nguyên ngẫu nhiên trong khoảng [min, max]
function int(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}
// Chọn ngẫu nhiên một phần tử
function pick<T>(items: readonly T[]): T {
  return items[int(0, items.length - 1)]!;
}
// Chọn ngẫu nhiên count phần tử không trùng
function sample<T>(items: readonly T[], count: number): T[] {
  return [...items].map((item) => ({ item, key: random() })).sort((a, b) => a.key - b.key).slice(0, count).map((row) => row.item);
}
// Chuyển số thành Decimal128
function money(value: number) {
  return Types.Decimal128.fromString(String(value));
}
// Chèn document nếu chưa có (upsert), trả về true khi thực sự chèn mới
async function insert(model: mongoose.Model<Doc>, doc: Doc & { _id: Types.ObjectId }): Promise<boolean> {
  const result = await model.updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
  return result.upsertedCount === 1;
}

const FAMILY = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const MIDDLE = ["Văn", "Thị", "Minh", "Đức", "Thu", "Ngọc", "Hoàng", "Gia", "Thanh", "Bảo", "Khánh", "Quang", "Hải", "Phương"];
const GIVEN = ["An", "Anh", "Bình", "Chi", "Dũng", "Duy", "Giang", "Hà", "Hân", "Hiếu", "Hoa", "Huy", "Khang", "Khoa", "Lan", "Linh",
  "Long", "Mai", "My", "Nam", "Ngân", "Nhi", "Phong", "Phúc", "Quân", "Quyên", "Sơn", "Tâm", "Thảo", "Trang", "Trí", "Tú", "Uyên", "Vy", "Yến"];

// Bản chụp PDP để hầu hết CLB chưa phân loại; các lĩnh vực này là phỏng đoán demo dựa trên tên từng CLB.
const DEMO_FIELDS: Record<string, string> = {
  "HEBE Club": "Nghệ thuật", "Mây Mưa Club": "Nghệ thuật", "Peace Club": "Cộng đồng", BoardGame: "Cộng đồng", BUK: "Kỹ năng", Business: "Kỹ năng",
  Chess: "Thể thao", "Color Team": "Nghệ thuật", Dango: "Ngôn ngữ", ESC: "Ngôn ngữ", "F-Logi": "Kỹ năng", FAIC: "Công nghệ",
  FCOC: "Công nghệ", FFC: "Thể thao", FGC: "Nghệ thuật", FGoC: "Thể thao", FKC: "Ngôn ngữ", FMUC: "Nghệ thuật", FMVC: "Nghệ thuật",
  FNC: "Cộng đồng", FPC: "Nghệ thuật", FTIC: "Công nghệ", FTTC: "Thể thao", FUB: "Thể thao", FUP: "Nghệ thuật",
  FUSW: "Cộng đồng", FUVC: "Cộng đồng", FVC: "Thể thao", HFU: "Cộng đồng", NSC: "Kỹ năng", "Soleil Crew": "Nghệ thuật", Yosakoi: "Nghệ thuật",
};
const EVENT_KINDS = ["Workshop", "Buổi giao lưu", "Talkshow", "Đêm diễn", "Giải đấu giao hữu", "Buổi sinh hoạt mở", "Chuyến dã ngoại", "Cuộc thi"];
const VENUES = ["Hội trường lớn, tòa Alpha", "Phòng 207, tòa Beta", "Sân trung tâm", "Thư viện tầng 2", "Sảnh tòa Delta", "Phòng 301, tòa Gamma"];
const COMMENTS = ["Rất bổ ích, mong có thêm buổi tương tự.", "Tổ chức chuyên nghiệp, đúng giờ.", "Nội dung hay nhưng hơi dài.",
  "Không gian hơi chật so với số người.", "Diễn giả nhiệt tình, dễ hiểu.", "Mình học được nhiều điều mới."];

// Sinh dữ liệu mẫu cho dashboard ICPDP, chỉ chạy trên Mongo local
async function main() {
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(config.MONGO_URI)) {
    throw new Error("seed:dashboard only writes to a local database (MONGO_URI must point at localhost)");
  }
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 });
  await ensureUcmsDatabase();
  const counts: Record<string, number> = {};
  function added(key: string, inserted: boolean) { if (inserted) counts[key] = (counts[key] ?? 0) + 1; }

  // ── Lĩnh vực CLB ─────────────────────────────────────────────────────────────
  for (const [name, field] of Object.entries(DEMO_FIELDS)) {
    const changed = await m.clubs!.updateOne({ name, field: "Chưa phân loại" }, { $set: { field } });
    if (changed.modifiedCount) counts.clubFields = (counts.clubFields ?? 0) + 1;
  }

  // ── Tài khoản sinh viên ────────────────────────────────────────────────────
  const students: Types.ObjectId[] = [];
  for (let index = 1; index <= 150; index += 1) {
    const name = `${pick(FAMILY)} ${pick(MIDDLE)} ${pick(GIVEN)}`;
    const id = oid(`user:${index}`);
    students.push(id);
    const email = studentEmail(name, 180000 + index);
    added("users", await insert(m.users!, { _id: id, email, displayName: name, accountState: "Active",
      createdAt: new Date(now.getTime() - int(20, 360) * DAY) }));
  }

  // ── CLB cần làm cho có sức sống: các CLB demo trước, rồi các CLB active có lĩnh vực ──
  const policy = await m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
  const calendar = (policy?.academicCalendar ?? []) as AcademicSemester[];
  // Xác định mã học kỳ của một ngày theo lịch học vụ
  function semesterOf(date: Date): string | undefined {
    return calendar.find((item) => item.startAt <= date && date < item.endAt)?.code;
  }
  const named = ["HEBE Club", "Mây Mưa Club", "Peace Club", "FPTU Ethical Hackers Club", "FPTU Data Science Club"];
  const clubs = [
    ...await m.clubs!.find({ name: { $in: named }, state: "Active" }).lean(),
    ...await m.clubs!.find({ name: { $nin: named }, state: "Active", field: { $ne: "Chưa phân loại" } }).sort({ name: 1 }).limit(9).lean(),
  ];
  const officer = (await m.userRoleAssignments!.findOne().lean())?.userId as Types.ObjectId | undefined;

  for (const [clubIndex, club] of clubs.entries()) {
    const clubId = club._id as Types.ObjectId;
    const clubName = String(club.name);
    reseed(`club:${String(clubId)}`);
    const isHebe = clubName === "HEBE Club";
    const memberRole = await m.clubPositions!.findOne({ clubId, isDefaultMemberRole: true }).select({ code: 1 }).lean();

    // Thành viên vào trong mười hai tháng qua, chủ yếu đầu học kỳ; một số rời đi.
    const roster = sample(students, isHebe ? 45 : int(14, 30));
    const members: Types.ObjectId[] = [];
    for (const studentId of roster) {
      const monthsAgo = pick([11, 10, 8, 7, 5, 4, 4, 3, 1, 1, 1, 0]);
      const joinedAt = new Date(now.getTime() - (monthsAgo * 30 + int(1, 25)) * DAY);
      const leaves = random() < 0.12 && monthsAgo > 2;
      const leftAt = new Date(joinedAt.getTime() + int(40, 120) * DAY);
      const left = leaves && leftAt < now;
      const id = oid(`membership:${String(clubId)}:${String(studentId)}`);
      if (await m.clubMemberships!.exists({ clubId, userId: studentId, _id: { $ne: id } })) continue;
      added("memberships", await insert(m.clubMemberships!, { _id: id, clubId, userId: studentId, state: left ? "Left" : "Active", joinedAt,
        ...(left ? { leftAt } : {}), ...(memberRole ? { defaultRole: String(memberRole.code) } : {}),
        statusHistory: [{ state: "Active", at: joinedAt, reason: "Seed dashboard" }] }));
      // Từ đây bản ghi đã lưu quyết định: một lần chạy trước có thể đã bốc ngày khác cho nó.
      const stored = await m.clubMemberships!.findById(id).select({ state: 1, joinedAt: 1 }).lean();
      if (!stored || stored.state === "Left") continue;
      members.push(studentId);
      // UC21 A2: một thành viên demo active đã xác nhận lại cho học kỳ hiện tại, nên job xác nhận lại
      // để họ ở Active. Thành viên mà job đã chuyển sang Inactive trước bản sửa này được khôi phục.
      const semester = calendar.find((item) => item.startAt <= now && now < item.endAt);
      if (semester && (stored.joinedAt as Date) <= semester.startAt) {
        const confirmedAt = new Date(semester.startAt.getTime() + int(1, 10) * DAY);
        await m.membershipReconfirmations!.updateOne({ membershipId: id, periodCode: semester.code },
          { $set: { state: "Confirmed", confirmedAt, confirmedBy: studentId },
            $setOnInsert: { clubId, openedAt: semester.startAt, dueAt: new Date(semester.startAt.getTime() + 14 * DAY) } }, { upsert: true });
        const restored = await m.clubMemberships!.updateOne({ _id: id, state: "Inactive",
          "statusHistory.reason": "Semester reconfirmation deadline expired" }, { $set: { state: "Active" },
          $pull: { statusHistory: { reason: "Semester reconfirmation deadline expired" } } });
        if (restored.modifiedCount) counts.restored = (counts.restored ?? 0) + 1;
      }
    }

    // Sự kiện: các sự kiện đã xong trong năm tháng qua, các sự kiện sắp tới trong hai tháng tới.
    reseed(`events:${String(clubId)}`);
    const eventCount = isHebe ? 9 : int(3, 6);
    for (let index = 0; index < eventCount; index += 1) {
      reseed(`event:${String(clubId)}:${index}`);
      const future = index >= eventCount - (isHebe ? 2 : 1);
      const offsetDays = future ? int(5, 60) : -int(3, 150);
      const startAt = new Date(now.getTime() + offsetDays * DAY + int(8, 18) * 3600_000);
      const semesterCode = semesterOf(startAt);
      if (!semesterCode) continue;
      const endAt = new Date(startAt.getTime() + int(2, 4) * 3600_000);
      const capacity = pick([40, 60, 80, 120, 200]);
      const eventId = oid(`event:${String(clubId)}:${index}`);
      const finished = !future;
      const recent = finished && offsetDays > -14;
      const registrants = sample([...members, ...sample(students, 60)], Math.min(capacity, int(15, isHebe ? 70 : 45)))
        .filter((value, position, all) => all.findIndex((other) => String(other) === String(value)) === position);
      const confirmed = registrants.filter(() => random() > 0.08);
      const inserted = await insert(m.events!, { _id: eventId, organizerType: "CLUB", clubId, clubName,
        title: `${pick(EVENT_KINDS)} ${clubName} #${index + 1}`, objective: "Hoạt động thường kỳ của CLB dành cho sinh viên.",
        startAt, endAt, semesterCode, venueText: pick(VENUES), audienceScope: random() < 0.2 ? "MEMBERS_ONLY" : "PUBLIC", capacity,
        confirmedRegistrationCount: confirmed.length, nextWaitlistPosition: 1, waitlistEnabled: false, riskCategory: "LOW",
        state: finished ? (recent ? "Completed" : "Closed") : "Upcoming", conflictResult: "No Conflict", allowWalkIn: true,
        currentRevisionNo: 1, publishedAt: new Date(startAt.getTime() - 20 * DAY), registrationOpenAt: new Date(startAt.getTime() - 20 * DAY),
        registrationCloseAt: new Date(startAt.getTime() - DAY), checkInOpenAt: startAt, checkInCloseAt: endAt,
        isLateCancellation: false, attendanceFinalized: finished, createdAt: new Date(startAt.getTime() - 30 * DAY) });
      added("events", inserted);
      if (!inserted) continue;
      for (const studentId of registrants) {
        const registrationId = oid(`registration:${String(eventId)}:${String(studentId)}`);
        const isConfirmed = confirmed.some((value) => String(value) === String(studentId));
        added("registrations", await insert(m.eventRegistrations!, { _id: registrationId, eventId, studentId, clubId,
          state: isConfirmed ? "Confirmed" : "Cancelled", createdAt: new Date(startAt.getTime() - int(2, 18) * DAY),
          ...(isConfirmed ? {} : { cancelledAt: new Date(startAt.getTime() - DAY) }) }));
        if (!finished || !isConfirmed || random() > 0.82) continue;
        const attendanceId = oid(`attendance:${String(eventId)}:${String(studentId)}`);
        added("attendances", await insert(m.attendances!, { _id: attendanceId, eventId, studentId, registrationId, clubId,
          checkedInAt: new Date(startAt.getTime() + int(0, 40) * 60_000), method: "self", abnormalFlags: [], finalized: true,
          finalizedAt: endAt }));
        if (random() > 0.45) continue;
        const score = pick([5, 5, 5, 4, 4, 4, 4, 3, 3, 2]);
        added("feedback", await insert(m.eventFeedbacks!, { _id: oid(`feedback:${String(eventId)}:${String(studentId)}`), eventId,
          attendanceId, studentId, clubId, scores: [{ criterionCode: "overall", score }], isAnonymous: random() < 0.3,
          ...(random() < 0.5 ? { comment: pick(COMMENTS) } : {}), submittedAt: new Date(endAt.getTime() + int(1, 48) * 3600_000) }));
      }
      // Ngân sách cho sự kiện học kỳ này theo mô hình sponsoredItems mới.
      if (semesterCode === semesterOf(now) && random() < 0.6) {
        const approved = int(2, 9) * 1_000_000;
        const settled = finished && !recent;
        const createdAt = new Date(startAt.getTime() - 25 * DAY);
        const isAfterDirect = approved >= 5_000_000;
        const decision = !isAfterDirect && random() < 0.4 ? "BEFORE_EVENT" : "AFTER_EVENT";
        const channel = decision === "BEFORE_EVENT"
          ? "VIA_OFFICER_ADVANCE"
          : isAfterDirect
            ? "DIRECT_VENDOR"
            : "VIA_OFFICER_REIMBURSE";
        const itemStatus = settled
          ? (decision === "BEFORE_EVENT" ? "Reconciled" : "Paid")
          : decision === "BEFORE_EVENT"
            ? (finished ? "Draft" : "AwaitingAdvance")
            : "Draft";
        const disbursed = settled || (decision === "BEFORE_EVENT" && finished) ? approved : 0;
        const itemId = String(oid(`budget-item:${String(eventId)}:0`));
        added("budgets", await insert(m.eventBudgets!, {
          _id: oid(`budget:${String(eventId)}`),
          eventId,
          clubId,
          lines: [{ category: "Chi phí tổ chức", requestedAmount: approved, approvedAmount: approved, fundingDecision: decision }],
          sponsoredItems: [{
            id: itemId,
            category: "Chi phí tổ chức",
            requestedAmount: approved,
            approvedAmount: approved,
            fundingDecision: decision,
            paymentChannel: channel,
            approvedAt: createdAt.toISOString(),
            eventEndAt: endAt.toISOString(),
            status: itemStatus,
            amount: settled ? approved : 0,
            description: settled ? "Chi phí tổ chức sự kiện" : "",
            images: [],
            ...(decision === "BEFORE_EVENT" && disbursed > 0 ? {
              advanceAmount: approved,
              advancedAt: new Date(startAt.getTime() - 10 * DAY).toISOString(),
              advanceReceivedAt: new Date(startAt.getTime() - 9 * DAY).toISOString(),
            } : {}),
            ...(channel === "DIRECT_VENDOR" && settled ? {
              vendorBankInfo: {
                vendorName: "Công ty TNHH Tổ chức Sự kiện FPT",
                accountHolder: "CONG TY TNHH TO CHUC SU KIEN FPT",
                accountNumber: "19036888999001",
                bankName: "Techcombank",
              },
            } : {}),
            ...(settled ? {
              submittedAt: new Date(endAt.getTime() + 5 * DAY).toISOString(),
              validAmount: approved,
              payable: approved,
              reviewReason: "Chứng từ đầy đủ, hợp lệ.",
              ...(decision === "BEFORE_EVENT" ? { reconciliationDelta: 0 } : { paidAt: new Date(endAt.getTime() + 7 * DAY).toISOString() }),
            } : {}),
          }],
          requestedTotal: money(approved),
          approvedTotal: money(approved),
          approvedByDecisionId: oid(`decision:${String(eventId)}`),
          disbursedTotal: money(disbursed),
          refundedTotal: money(0),
          isSettlementLate: false,
          state: settled ? "Closed" : "Approved",
          periodCode: semesterCode,
          ...(settled ? { acceptedTotal: money(approved) } : {}),
          createdAt,
        }));
      }
    }

    // Bổ sung feedback cho các sự kiện đã qua của Peace Club được tạo ngoài seed:dashboard.
    if (clubName === "Peace Club") {
      const existingEvents = await m.events!.find({
        clubId,
        endAt: { $lte: now },
        state: { $in: ["Completed", "Closed", "Approved", "FINISH"] },
      }).lean();
      for (const existingEvent of existingEvents) {
        const existingEventId = existingEvent._id as Types.ObjectId;
        const currentFeedbackCount = await m.eventFeedbacks!.countDocuments({ eventId: existingEventId });
        if (currentFeedbackCount >= 5) continue;
        reseed(`peace-existing:${String(existingEventId)}`);
        const existingStartAt = existingEvent.startAt as Date;
        const existingEndAt = existingEvent.endAt as Date;
        const respondents = sample(students, 7);
        for (const [idx, studentId] of respondents.entries()) {
          const registrationId = oid(`registration:${String(existingEventId)}:${String(studentId)}`);
          const attendanceId = oid(`attendance:${String(existingEventId)}:${String(studentId)}`);
          const feedbackId = oid(`feedback:${String(existingEventId)}:${String(studentId)}`);
          await m.eventRegistrations!.updateOne(
            { eventId: existingEventId, studentId },
            {
              $setOnInsert: {
                _id: registrationId,
                eventId: existingEventId,
                studentId,
                clubId,
                state: "Confirmed",
                createdAt: new Date(existingStartAt.getTime() - int(2, 7) * DAY),
              },
            },
            { upsert: true },
          );
          const regDoc = await m.eventRegistrations!.findOne({ eventId: existingEventId, studentId }).lean();
          await m.attendances!.updateOne(
            { eventId: existingEventId, studentId },
            {
              $setOnInsert: {
                _id: attendanceId,
                eventId: existingEventId,
                studentId,
                registrationId: regDoc!._id,
                clubId,
                checkedInAt: new Date(existingStartAt.getTime() + int(1, 15) * 60_000),
                method: "self",
                abnormalFlags: [],
                finalized: true,
                finalizedAt: existingEndAt,
              },
            },
            { upsert: true },
          );
          const attDoc = await m.attendances!.findOne({ eventId: existingEventId, studentId }).lean();
          const score = pick([5, 5, 5, 4, 4, 4, 3]);
          const res = await m.eventFeedbacks!.updateOne(
            { eventId: existingEventId, studentId },
            {
              $setOnInsert: {
                _id: feedbackId,
                eventId: existingEventId,
                attendanceId: attDoc!._id,
                studentId,
                clubId,
                scores: [{ criterionCode: "overall", score }],
                isAnonymous: idx % 2 === 0,
                comment: pick(COMMENTS),
                submittedAt: new Date(existingEndAt.getTime() + (idx + 1) * 3600_000),
              },
            },
            { upsert: true },
          );
          added("feedback", res.upsertedCount === 1);
        }
        const confirmedTotal = await m.eventRegistrations!.countDocuments({ eventId: existingEventId, state: "Confirmed" });
        await m.events!.updateOne({ _id: existingEventId }, { $set: { confirmedRegistrationCount: confirmedTotal } });
      }
    }

    // Mỗi CLB còn lại có một đề xuất đang chờ ICPDP; một vài cái đã quá SLA review.
    reseed(`proposal:${String(clubId)}`);
    if (clubIndex % 2 === 0 && officer) {
      const startAt = new Date(now.getTime() + int(20, 50) * DAY);
      const semesterCode = semesterOf(startAt);
      const eventId = oid(`proposal:${String(clubId)}`);
      const submittedAt = new Date(now.getTime() - int(1, 9) * DAY);
      const title = `${pick(EVENT_KINDS)} ${clubName} (đề xuất)`;
      const payload = { title, objective: "Đề xuất hoạt động mới của CLB.", plan: "Khai mạc · Hoạt động chính · Tổng kết.",
        startAt, endAt: new Date(startAt.getTime() + 3 * 3600_000), venueText: pick(VENUES), capacity: 80, audienceScope: "PUBLIC", riskCategory: "LOW" };
      if (semesterCode && await insert(m.events!, { _id: eventId, organizerType: "CLUB", clubId, clubName, ...payload, semesterCode,
        confirmedRegistrationCount: 0, nextWaitlistPosition: 1, waitlistEnabled: false, state: "Pending Approval", conflictResult: "No Conflict",
        allowWalkIn: false, currentRevisionNo: 1, isLateCancellation: false, attendanceFinalized: false, createdAt: submittedAt })) {
        added("proposals", true);
        const leader = await m.clubMemberships!.findOne({ clubId, state: "Active" }).select({ userId: 1 }).lean();
        await insert(m.eventProposalVersions!, { _id: oid(`proposal-version:${String(clubId)}`), eventId, revisionNo: 1, payload,
          conflictResult: "No Conflict", submittedBy: leader?.userId ?? officer, submittedAt });
        await insert(m.approvalTasks!, { _id: oid(`proposal-task:${String(clubId)}`), entityType: "EVENT_PROPOSAL", entityId: eventId, clubId,
          title, state: "Open", openedAt: submittedAt, slaDueAt: new Date(submittedAt.getTime() + (clubIndex % 4 === 0 ? 2 : 10) * DAY) });
      }
    }

    // Chiến dịch đang mở của HEBE đầy dần đơn ở mọi giai đoạn của phễu.
    if (isHebe) {
      const campaign = await m.recruitmentCampaigns!.findOne({ clubId, state: { $ne: "Draft" } }).sort({ windowStart: -1 }).lean();
      reseed(`campaign:${String(clubId)}`);
      if (campaign) {
        const outsiders = students.filter((id) => !roster.some((member) => String(member) === String(id)));
        const stages = [...Array(9).fill("Submitted"), ...Array(4).fill("Screening"), ...Array(7).fill("Shortlisted"),
          ...Array(3).fill("Accepted"), ...Array(6).fill("Rejected"), "Waitlisted", "Withdrawn"];
        for (const [index, applicationState] of stages.entries()) {
          const userId = outsiders[index];
          if (!userId) break;
          const submittedAt = new Date(Math.min(now.getTime(), (campaign.windowStart as Date).getTime() + int(0, 8) * DAY));
          added("applications", await insert(m.recruitmentApplications!, { _id: oid(`application:${String(campaign._id)}:${String(userId)}`),
            campaignId: campaign._id, clubId, userId, answers: { motivation: "Mình muốn tham gia các hoạt động của CLB." },
            attachments: [], state: applicationState, submittedAt,
            ...(["Accepted", "Rejected"].includes(applicationState) ? { decidedAt: now, decisionOutcome: applicationState } : {}) }));
        }
      }
    }
  }

  console.log("seed:dashboard added", counts);
  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
