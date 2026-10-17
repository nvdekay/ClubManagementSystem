// Dashboard history on top of `npm run seed` + `npm run seed:demo`: about 150 demo student accounts and a
// year of club life (members joining and leaving, events with registrations, check-ins and feedback,
// budgets, pending proposals, recruitment applications), so the ICPDP and Club Leader charts have shape.
// Usage: npm run seed:dashboard   (local databases only; safe to re-run: every record has a fixed id
// derived from its key and is only inserted when missing).
import { createHash } from "node:crypto";
import mongoose, { Types } from "mongoose";
import type { AcademicSemester } from "../../domain/policy.js";
import { loadConfig } from "../config/index.js";
import { ensureUcmsDatabase, ucmsModels as m } from "./ucms-models.js";

type Doc = Record<string, unknown>;
const config = loadConfig();
const DAY = 86_400_000;
const now = new Date();

function oid(key: string): Types.ObjectId {
  return new Types.ObjectId(createHash("md5").update(`seed-dashboard:${key}`).digest("hex").slice(0, 24));
}
// A fixed-seed generator, so a re-run picks the same people, dates and numbers for the same keys.
let state = 20261017;
function random(): number {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
/** Restarts the generator from a key, so skipping records already in the database never shifts later picks. */
function reseed(key: string): void {
  state = Number.parseInt(createHash("md5").update(key).digest("hex").slice(0, 8), 16) | 0;
}
function int(min: number, max: number): number {
  return min + Math.floor(random() * (max - min + 1));
}
function pick<T>(items: readonly T[]): T {
  return items[int(0, items.length - 1)]!;
}
function sample<T>(items: readonly T[], count: number): T[] {
  return [...items].map((item) => ({ item, key: random() })).sort((a, b) => a.key - b.key).slice(0, count).map((row) => row.item);
}
function money(value: number) {
  return Types.Decimal128.fromString(String(value));
}
async function insert(model: mongoose.Model<Doc>, doc: Doc & { _id: Types.ObjectId }): Promise<boolean> {
  const result = await model.updateOne({ _id: doc._id }, { $setOnInsert: doc }, { upsert: true });
  return result.upsertedCount === 1;
}

const FAMILY = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"];
const MIDDLE = ["Văn", "Thị", "Minh", "Đức", "Thu", "Ngọc", "Hoàng", "Gia", "Thanh", "Bảo", "Khánh", "Quang", "Hải", "Phương"];
const GIVEN = ["An", "Anh", "Bình", "Chi", "Dũng", "Duy", "Giang", "Hà", "Hân", "Hiếu", "Hoa", "Huy", "Khang", "Khoa", "Lan", "Linh",
  "Long", "Mai", "My", "Nam", "Ngân", "Nhi", "Phong", "Phúc", "Quân", "Quyên", "Sơn", "Tâm", "Thảo", "Trang", "Trí", "Tú", "Uyên", "Vy", "Yến"];
function ascii(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

// The PDP snapshot leaves most clubs unclassified; these fields are a demo guess from each club's name.
const DEMO_FIELDS: Record<string, string> = {
  "HEBE Club": "Nghệ thuật", "Mây Mưa Club": "Nghệ thuật", BoardGame: "Cộng đồng", BUK: "Kỹ năng", Business: "Kỹ năng",
  Chess: "Thể thao", "Color Team": "Nghệ thuật", Dango: "Ngôn ngữ", ESC: "Ngôn ngữ", "F-Logi": "Kỹ năng", FAIC: "Công nghệ",
  FCOC: "Công nghệ", FFC: "Thể thao", FGC: "Nghệ thuật", FGoC: "Thể thao", FKC: "Ngôn ngữ", FMUC: "Nghệ thuật", FMVC: "Nghệ thuật",
  FNC: "Cộng đồng", FPC: "Nghệ thuật", FTIC: "Công nghệ", FTTC: "Thể thao", FUB: "Thể thao", FUP: "Nghệ thuật",
  FUSW: "Cộng đồng", FUVC: "Cộng đồng", FVC: "Thể thao", HFU: "Cộng đồng", NSC: "Kỹ năng", "Soleil Crew": "Nghệ thuật", Yosakoi: "Nghệ thuật",
};
const EVENT_KINDS = ["Workshop", "Buổi giao lưu", "Talkshow", "Đêm diễn", "Giải đấu giao hữu", "Buổi sinh hoạt mở", "Chuyến dã ngoại", "Cuộc thi"];
const VENUES = ["Hội trường lớn, tòa Alpha", "Phòng 207, tòa Beta", "Sân trung tâm", "Thư viện tầng 2", "Sảnh tòa Delta", "Phòng 301, tòa Gamma"];
const COMMENTS = ["Rất bổ ích, mong có thêm buổi tương tự.", "Tổ chức chuyên nghiệp, đúng giờ.", "Nội dung hay nhưng hơi dài.",
  "Không gian hơi chật so với số người.", "Diễn giả nhiệt tình, dễ hiểu.", "Mình học được nhiều điều mới."];

async function main() {
  if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)[:/]/.test(config.MONGO_URI)) {
    throw new Error("seed:dashboard only writes to a local database (MONGO_URI must point at localhost)");
  }
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 });
  await ensureUcmsDatabase();
  const counts: Record<string, number> = {};
  function added(key: string, inserted: boolean) { if (inserted) counts[key] = (counts[key] ?? 0) + 1; }

  // ── Club fields ─────────────────────────────────────────────────────────────
  for (const [name, field] of Object.entries(DEMO_FIELDS)) {
    const changed = await m.clubs!.updateOne({ name, field: "Chưa phân loại" }, { $set: { field } });
    if (changed.modifiedCount) counts.clubFields = (counts.clubFields ?? 0) + 1;
  }

  // ── Student accounts ────────────────────────────────────────────────────────
  const students: Types.ObjectId[] = [];
  for (let index = 1; index <= 150; index += 1) {
    const name = `${pick(FAMILY)} ${pick(MIDDLE)} ${pick(GIVEN)}`;
    const id = oid(`user:${index}`);
    students.push(id);
    const email = `${ascii(name.split(" ").at(-1)!)}.${String(index).padStart(3, "0")}@demo.ucms.edu.vn`;
    added("users", await insert(m.users!, { _id: id, email, displayName: name, accountState: "Active",
      createdAt: new Date(now.getTime() - int(20, 360) * DAY) }));
  }

  // ── Clubs to bring to life: the demo clubs first, then active clubs with a field ──
  const policy = await m.policyVersions!.findOne({ effectiveFrom: { $lte: now } }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
  const calendar = (policy?.academicCalendar ?? []) as AcademicSemester[];
  function semesterOf(date: Date): string | undefined {
    return calendar.find((item) => item.startAt <= date && date < item.endAt)?.code;
  }
  const named = ["HEBE Club", "Mây Mưa Club", "FPTU Ethical Hackers Club", "FPTU Data Science Club"];
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

    // Members joining over the last twelve months, mostly at the start of a semester; some leave.
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
      // The stored record decides from here on: an earlier run may have drawn different dates for it.
      const stored = await m.clubMemberships!.findById(id).select({ state: 1, joinedAt: 1 }).lean();
      if (!stored || stored.state === "Left") continue;
      members.push(studentId);
      // UC21 A2: an active demo member has reconfirmed for the current semester, so the reconfirmation job
      // leaves them Active. A member the job already turned Inactive before this fix is restored.
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

    // Events: finished ones over the last five months, upcoming ones over the next two.
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
      // Budgets for this semester's events: advanced in full, settled once the event is well past.
      if (semesterCode === semesterOf(now) && random() < 0.6) {
        const approved = int(2, 9) * 1_000_000;
        const settled = finished && !recent;
        added("budgets", await insert(m.eventBudgets!, { _id: oid(`budget:${String(eventId)}`), eventId, clubId,
          lines: [{ category: "Chi phí tổ chức", requestedAmount: approved + 500_000, approvedAmount: approved }],
          requestedTotal: money(approved + 500_000), approvedTotal: money(approved), approvedByDecisionId: oid(`decision:${String(eventId)}`),
          disbursedTotal: money(finished ? approved : 0), refundedTotal: money(0), isSettlementLate: false,
          state: settled ? "Closed" : finished ? "Disbursed" : "Approved", periodCode: semesterCode,
          ...(finished ? { settlementDueAt: new Date(endAt.getTime() + 14 * DAY) } : {}),
          ...(settled ? { settlementSubmittedAt: new Date(endAt.getTime() + 7 * DAY), acceptedTotal: money(approved) } : {}),
          createdAt: new Date(startAt.getTime() - 25 * DAY) }));
      }
    }

    // A proposal waiting for ICPDP in every other club; a few have run past their review SLA.
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

    // HEBE's open campaign fills up with applications at every stage of the funnel.
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
