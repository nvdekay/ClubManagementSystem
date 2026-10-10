// Clean, realistic demo data on top of `npm run seed`, so every implemented flow can be tried end to end.
// Usage: npm run seed:demo -- --owner=<your Google email> [--owner-name="Your Name"]
// Safe to re-run: each section skips what already exists. Writes go through the app's use cases and
// repositories wherever a flow exists, so the data obeys the same rules as the UI.
import { crc32, deflateSync } from "node:zlib";
import mongoose, { Types } from "mongoose";
import { DomainError } from "../../domain/errors.js";
import type { FounderRole } from "../../domain/club-application.js";
import { DEFAULT_FORM_REQUIREMENTS, type PolicySettings } from "../../domain/policy.js";
import type { AccessActor } from "../../usecase/access.js";
import { createApplicationDraft, submitApplication, uploadApplicationDocument } from "../../usecase/club-application.js";
import { claimApplicationReview, decideApplicationReview } from "../../usecase/club-application-review.js";
import { assignClubRole, createClubRole } from "../../usecase/club-role.js";
import { submitEventFeedback } from "../../usecase/event-feedback.js";
import { registerForEvent } from "../../usecase/event-registration.js";
import { createPolicyVersion } from "../../usecase/policy.js";
import { createRecruitmentCampaignDraft, publishRecruitmentCampaign } from "../../usecase/recruitment-campaign.js";
import {
  createRecruitmentApplicationDraft,
  saveRecruitmentApplicationDraft,
  submitRecruitmentApplication,
} from "../../usecase/recruitment-application.js";
import { sendStudentFeedback } from "../../usecase/student-feedback.js";
import { loadConfig, optionalCloudinaryConfig } from "../config/index.js";
import { cloudinaryApplicationFiles } from "../files/cloudinary-application-files.js";
import { mongoAccessRepository } from "./mongo-access-repository.js";
import { mongoAuthRepository } from "./mongo-auth-repository.js";
import { mongoClubApplicationRepository } from "./mongo-club-application-repository.js";
import { mongoClubApplicationReviewRepository } from "./mongo-club-application-review-repository.js";
import { mongoClubRoleRepository } from "./mongo-club-role-repository.js";
import { mongoEventFeedbackRepository } from "./mongo-event-feedback-repository.js";
import { mongoEventRegistrationRepository } from "./mongo-event-registration-repository.js";
import { mongoMembershipRepository } from "./mongo-membership-repository.js";
import { mongoPolicyRepository } from "./mongo-policy-repository.js";
import { mongoRecruitmentApplicationRepository } from "./mongo-recruitment-application-repository.js";
import { mongoRecruitmentCampaignRepository } from "./mongo-recruitment-campaign-repository.js";
import { mongoStudentFeedbackRepository } from "./mongo-student-feedback-repository.js";
import { pdpClubs } from "./pdp-demo-data.js";
import { ensureDefaultClubFields, mongoClubFieldRepository } from "./mongo-club-field-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "./ucms-models.js";

const config = loadConfig();
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const now = new Date();
function at(offset: number): Date {
  return new Date(now.getTime() + offset);
}

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=")];
}));
const ownerEmail = String(args.owner ?? "").trim().toLowerCase();
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ownerEmail)) {
  console.error("usage: npm run seed:demo -- --owner=<your Google email> [--owner-name=\"Your Name\"]");
  process.exit(1);
}

// Demo students: clearly demo addresses that cannot belong to a real person.
const students = [
  ["Trần Minh Anh", "minhanh"], ["Lê Hoàng Bảo", "hoangbao"], ["Phạm Thu Chi", "thuchi"],
  ["Nguyễn Đức Dũng", "ducdung"], ["Võ Ngọc Hà", "ngocha"], ["Đặng Quốc Huy", "quochuy"],
  ["Bùi Khánh Linh", "khanhlinh"], ["Hoàng Gia Long", "gialong"], ["Đỗ Phương Mai", "phuongmai"],
  ["Ngô Tuấn Nam", "tuannam"], ["Phan Bảo Ngọc", "baongoc"], ["Vũ Thành Phát", "thanhphat"],
  ["Trịnh Hải Quân", "haiquan"], ["Lý Minh Tâm", "minhtam"], ["Đinh Thảo Vy", "thaovy"],
  ["Mai Anh Tuấn", "anhtuan"],
] as const;

function club(code: string): { id: Types.ObjectId; name: string } {
  const found = pdpClubs.find((item) => item.code === code);
  if (!found) throw new Error(`PDP club ${code} missing — run npm run seed first`);
  return { id: new Types.ObjectId(found.id), name: found.name };
}

function actor(id: Types.ObjectId): AccessActor {
  return { id: id.toString(), accountState: "Active" };
}

/** Runs a step that may already have happened on a previous run (duplicate → conflict). */
async function once(label: string, step: () => Promise<unknown>): Promise<void> {
  try {
    await step();
  } catch (error) {
    if (error instanceof DomainError && error.kind === "conflict") return;
    throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
  }
}

/** A small, valid one-page PDF so the ICPDP reviewer can really open the charter. */
function charterPdf(title: string): Buffer {
  const ascii = title.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
  const text = `BT /F1 20 Tf 72 760 Td (${ascii}) Tj 0 -32 Td /F1 12 Tf (Dieu le cau lac bo - ban demo) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = objects.map((object, index) => {
    const offset = body.length;
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  body += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "latin1");
}

const policySettings: PolicySettings = {
  minFoundingMembers: 3,
  formRequirements: DEFAULT_FORM_REQUIREMENTS,
  reportDeadlines: [{ reportType: "PERIODIC", dueDaysAfterPeriodEnd: 7, remindBeforeDays: 2,
    overdueAfterDays: 1, escalateAfterDays: 3 }],
  conflictThresholdMinutes: 30,
  feedbackWindowHours: 72,
  feedbackMinRespondents: 3,
  allowOverbooking: false,
  enforceOverdueReportBlock: false,
  academicCalendar: [
    { code: "Fall 2026", startAt: new Date("2026-08-31T17:00:00Z"), endAt: new Date("2026-12-31T16:59:59Z") },
    { code: "Spring 2027", startAt: new Date("2026-12-31T17:00:00Z"), endAt: new Date("2027-04-30T16:59:59Z") },
  ],
};

const boardPermissions = {
  VICE: ["club.member.manage", "club.event.manage", "club.attendance.manage", "club.application.review",
    "club.recruitment.manage", "club.feedback.view"],
  TREASURER: ["club.expense.record", "club.report.submit"],
  MEDIA: ["club.profile.manage", "club.recruitment.manage", "club.feedback.view"],
};

/** A solid-colour square PNG, standing in for the proposed logo a student would upload. */
function logoPng(rgb: [number, number, number], size = 64): Buffer {
  function chunk(type: string, data: Buffer): Buffer {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([length, body, crc]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => rgb).flat())]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))),
    chunk("IEND", Buffer.alloc(0))]);
}

try {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 });
  await ensureUcmsDatabase();
  await ensureDefaultClubFields();
  const db = mongoose.connection.db!;
  if (!(await ucmsModels.clubs!.exists({ _id: club("HEBE").id }))) {
    throw new Error("PDP clubs are missing — run npm run seed first");
  }

  // ── Accounts ──────────────────────────────────────────────────────────────────────────────
  async function user(email: string, displayName: string): Promise<Types.ObjectId> {
    const existing = await ucmsModels.users!.findOne({ email }).select({ _id: 1 }).lean();
    if (existing) return existing._id as Types.ObjectId;
    const [created] = await ucmsModels.users!.create([{ email, displayName, accountState: "Active", createdAt: now }]);
    return created!._id as Types.ObjectId;
  }
  const owner = await user(ownerEmail, String(args["owner-name"] || ownerEmail.split("@")[0]));
  const s = await Promise.all(students.map(([name, slug]) => user(`${slug}@demo.ucms.edu.vn`, name)));

  const officerRole = await ucmsModels.roles!.findOne({ code: "ICPDP_OFFICER" }).lean();
  if (!officerRole) throw new Error("ICPDP_OFFICER role missing — start the server once so auth bootstrap runs");
  if (!(await ucmsModels.userRoleAssignments!.exists({ userId: owner, roleId: officerRole._id, revokedAt: null }))) {
    await ucmsModels.userRoleAssignments!.create({ userId: owner, roleId: officerRole._id, grantedBy: owner,
      grantedAt: now, reason: "Demo: tài khoản phát triển kiêm cán bộ ICPDP" });
  }
  const auth = mongoAuthRepository("*");

  // ── Policy (UC04) ─────────────────────────────────────────────────────────────────────────
  const policy = mongoPolicyRepository();
  if (!(await policy.findEffective(now))) {
    await createPolicyVersion(policy, auth, actor(owner), policySettings, undefined,
      "Chính sách khởi tạo cho môi trường demo", now);
  }

  // ── Club structures: term, positions, members, confirmed board (HEBE, Mây Mưa, EHC, FDS) ──────
  async function setupClub(code: string, term: { name: string; startAt: Date; endAt: Date },
    leader: Types.ObjectId, board: Array<{ code: keyof typeof boardPermissions; name: string; user: Types.ObjectId }>,
    members: Array<{ user: Types.ObjectId; state?: "Active" | "Inactive"; joined?: Date }>) {
    const { id: clubId } = club(code);
    const existingTerm = await ucmsModels.clubTerms!.findOne({ clubId, state: "Active" }).lean();
    if (existingTerm) return;
    const [termDoc] = await ucmsModels.clubTerms!.create([{ clubId, name: term.name, startAt: term.startAt,
      endAt: term.endAt, state: "Active" }]);
    const roles = [
      { code: "CLUB_LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true, isDefaultMemberRole: false,
        isSingleHolder: true, permissionCodes: [] as string[] },
      ...board.map((seat) => ({ code: seat.code, name: seat.name, isBoardSeat: true, isLeaderRole: false,
        isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: boardPermissions[seat.code] })),
      { code: "MEMBERS", name: "Thành viên", isBoardSeat: false, isLeaderRole: false, isDefaultMemberRole: true,
        isSingleHolder: false, permissionCodes: [] as string[] },
    ];
    const positionDocs = await ucmsModels.clubPositions!.insertMany(roles.map((role) => ({ clubId, ...role,
      isActive: true })));
    await ucmsModels.clubRoleStructureVersions!.create({ clubId, versionNo: 1, effectiveFrom: term.startAt,
      source: "APPLICATION", roles: positionDocs.map((position, index) => ({ positionId: position._id, ...roles[index] })),
      createdBy: owner, reason: "Cơ cấu ban đầu (demo)", createdAt: now });
    const everyone = [{ user: leader }, ...board.map((seat) => ({ user: seat.user })), ...members];
    const membershipDocs = await ucmsModels.clubMemberships!.insertMany(everyone.map((member) => ({ clubId,
      userId: member.user, state: "state" in member && member.state ? member.state : "Active",
      joinedAt: "joined" in member && member.joined ? member.joined : term.startAt, defaultRole: "MEMBERS",
      statusHistory: [] })));
    const seats = [{ position: positionDocs[0]!, membership: membershipDocs[0]! },
      ...board.map((_, index) => ({ position: positionDocs[index + 1]!, membership: membershipDocs[index + 1]! }))];
    await ucmsModels.clubPositionAssignments!.insertMany(seats.map((seat) => ({ clubId, termId: termDoc!._id,
      positionId: seat.position._id, membershipId: seat.membership._id, effectiveFrom: term.startAt,
      assignedBy: owner, confirmedBy: owner })));
  }
  const termFA = { name: "Nhiệm kỳ 2026–2027", startAt: new Date("2026-08-31T17:00:00Z"),
    endAt: new Date("2027-08-31T16:59:59Z") };
  await setupClub("HEBE", termFA, owner,
    [{ code: "VICE", name: "Phó chủ nhiệm", user: s[0]! }, { code: "TREASURER", name: "Thủ quỹ", user: s[1]! },
      { code: "MEDIA", name: "Trưởng ban Truyền thông", user: s[2]! }],
    [{ user: s[3]! }, { user: s[4]! }, { user: s[5]! }, { user: s[6]!, state: "Inactive" }, { user: s[7]!, state: "Inactive" }]);
  await setupClub("Mây Mưa Club", termFA, s[8]!, [{ code: "VICE", name: "Phó chủ nhiệm", user: s[9]! }],
    [{ user: owner, joined: at(-30 * DAY) }, { user: s[10]! }, { user: s[11]! }, { user: s[3]! }]);
  await setupClub("EHC", termFA, s[14]!, [{ code: "VICE", name: "Phó chủ nhiệm", user: s[15]! }], [{ user: s[5]! }]);
  await setupClub("FDS", { name: "Nhiệm kỳ 2025–2026", startAt: new Date("2025-09-30T17:00:00Z"),
    endAt: new Date("2026-10-31T16:59:59Z") }, s[7]!, [{ code: "VICE", name: "Phó chủ nhiệm", user: s[3]! }],
    [{ user: s[12]! }, { user: s[13]! }]);

  // UC23: the HEBE leader (owner) created a regular role and gave it to a member (structure version 2).
  const clubRoles = mongoClubRoleRepository();
  const hebeId = club("HEBE").id.toString();
  if (!(await clubRoles.overview(hebeId, now))?.roles.some((role) => role.name === "Phụ trách Hậu cần")) {
    const created = await createClubRole(clubRoles, mongoAccessRepository(), actor(owner), hebeId, {
      name: "Phụ trách Hậu cần", isSingleHolder: true, permissionCodes: ["club.booking.manage", "club.expense.record"],
      reason: "Cần người lo phòng tập và chi phí đạo cụ",
    }, now);
    const logistics = created.roles.find((role) => role.name === "Phụ trách Hậu cần")!;
    const holder = await ucmsModels.clubMemberships!.findOne({ clubId: club("HEBE").id, userId: s[3] }).lean();
    if (holder) {
      await assignClubRole(clubRoles, mongoAccessRepository(), actor(owner), hebeId, logistics.id,
        { membershipId: String(holder._id) }, now);
    }
  }

  // UC22: one HEBE member has asked to leave (waiting for the leader in UC21).
  const membershipRepo = mongoMembershipRepository();
  const leaving = await ucmsModels.clubMemberships!.findOne({ clubId: club("HEBE").id, userId: s[5] }).lean();
  if (leaving) {
    await once("withdrawal request", () => membershipRepo.requestWithdrawal({ membershipId: String(leaving._id),
      userId: s[5]!.toString(), reason: "Học kỳ này em đi thực tập toàn thời gian nên không sắp xếp được lịch.",
      requestedEffectiveDate: at(3 * DAY), now }));
  }

  // ── Recruitment (UC16→UC18): HEBE campaign with applicants to review; EHC campaign to apply to ────────
  const access = mongoAccessRepository();
  const campaigns = mongoRecruitmentCampaignRepository();
  const recruitment = mongoRecruitmentApplicationRepository();
  async function campaign(code: string, leader: Types.ObjectId, title: string, positions: string[],
    criteria: string): Promise<string> {
    const { id: clubId } = club(code);
    const existing = (await campaigns.list(clubId.toString())).find((item) => item.title === title);
    if (existing) return existing.id;
    const draft = await createRecruitmentCampaignDraft(campaigns, access, actor(leader), clubId.toString(), {
      title, positions, criteria, windowStart: at(-2 * DAY), windowEnd: at(14 * DAY), capacity: 10,
      selectionSteps: [{ name: "Vòng đơn", description: "Xét hồ sơ trực tuyến" },
        { name: "Phỏng vấn", description: "Gặp mặt 15 phút với ban chủ nhiệm" }],
      formSchema: [
        { key: "intro", label: "Giới thiệu ngắn về bản thân", type: "textarea", required: true },
        { key: "experience", label: "Kinh nghiệm liên quan", type: "select", required: true,
          options: ["Chưa có", "Dưới 1 năm", "Từ 1 năm trở lên"] },
        { key: "portfolio", label: "Link sản phẩm/portfolio (nếu có)", type: "url", required: false },
      ],
      rubric: [{ key: "attitude", label: "Thái độ", maxScore: 10 }, { key: "skill", label: "Kỹ năng", maxScore: 10 }],
    }, now);
    await publishRecruitmentCampaign(campaigns, access, policy, actor(leader), clubId.toString(), draft.campaign.id,
      true, now);
    return draft.campaign.id;
  }
  const hebeCampaign = await campaign("HEBE", owner, "Tuyển thành viên HEBE Gen 8 — Học kỳ Fall 2026",
    ["Ban Biểu diễn", "Ban Truyền thông"], "Yêu thích nghệ thuật biểu diễn, tham gia sinh hoạt tối thiểu 2 buổi/tuần.");
  await campaign("EHC", s[14]!, "EHC Recruitment 2026 — Tìm kiếm Hacker tương lai",
    ["Ban Kỹ thuật", "Ban Sự kiện"], "Quan tâm đến bảo mật, sẵn sàng học CTF cùng CLB.");
  const applicants: Array<[number, string, string, string]> = [
    [10, "Ban Biểu diễn", "Em học múa đương đại 3 năm, từng diễn văn nghệ chào tân sinh viên.", "Từ 1 năm trở lên"],
    [11, "Ban Truyền thông", "Em làm thiết kế cho fanpage lớp, muốn học thêm về sản xuất video.", "Dưới 1 năm"],
    [12, "Ban Biểu diễn", "Em chưa có kinh nghiệm nhưng rất thích nhảy K-pop và chăm chỉ tập luyện.", "Chưa có"],
    [13, "Ban Truyền thông", "Em viết content cho CLB cấp 3 và quản lý một kênh TikTok nhỏ.", "Từ 1 năm trở lên"],
  ];
  for (const [index, position, intro, experience] of applicants) {
    const student = actor(s[index]!);
    if (await recruitment.findMineForCampaign(hebeCampaign, student.id)) continue;
    const application = await createRecruitmentApplicationDraft(recruitment, student, hebeCampaign, position, now);
    await saveRecruitmentApplicationDraft(recruitment, student, application.id,
      { position, answers: { intro, experience } }, now);
    await submitRecruitmentApplication(recruitment, student, application.id, now);
  }

  // ── Founding applications (UC07→UC08): two in the ICPDP review queue, one approved (club Active) ──
  const applications = mongoClubApplicationRepository();
  const reviews = mongoClubApplicationReviewRepository();
  const clubFields = mongoClubFieldRepository();
  const cloudinary = optionalCloudinaryConfig(config);
  const storage = cloudinary ? cloudinaryApplicationFiles(cloudinary) : null;
  async function application(founder: Types.ObjectId, cofounders: Types.ObjectId[], clubName: string,
    fieldName: string, summary: string, objectives: string,
    logoColor: [number, number, number]): Promise<string | null> {
    const existing = (await applications.listMine(founder.toString())).find((item) => item.draft.clubName === clubName);
    if (existing) return existing.state === "Draft" ? null : existing.id;
    if (!storage) {
      console.warn(`skipped "${clubName}": Cloudinary is not configured, so the proposal and logo cannot be uploaded`);
      return null;
    }
    const field = (await clubFields.listActive()).find((item) => item.name === fieldName);
    if (!field) {
      console.warn(`skipped "${clubName}": club field "${fieldName}" is not in the catalog`);
      return null;
    }
    const roles: FounderRole[] = ["LEADER", "VICE_LEADER"];
    const draft = await createApplicationDraft(applications, clubFields, actor(founder), {
      clubName, fieldId: field.id, summary, objectives, fanpageUrl: "", contactEmail: "",
      founders: [founder, ...cofounders].map((userId, index) => ({ userId: String(userId),
        role: roles[index] ?? "MEMBER" })),
    }, now);
    await uploadApplicationDocument(applications, storage, actor(founder), draft.id, "PROPOSAL",
      "de-an-thanh-lap.pdf", "application/pdf", charterPdf(clubName), now);
    await uploadApplicationDocument(applications, storage, actor(founder), draft.id, "LOGO",
      "logo.png", "image/png", logoPng(logoColor), now);
    await submitApplication(applications, policy, clubFields, actor(founder), draft.id, now);
    return draft.id;
  }
  await application(s[12]!, [s[13]!, s[10]!], "CLB Nhiếp ảnh Đường phố FPTU", "Nghệ thuật",
    "Cộng đồng yêu nhiếp ảnh đường phố của FPTU.",
    "Lan toả nhiếp ảnh đường phố, tổ chức photowalk hằng tháng và triển lãm cuối kỳ.", [234, 88, 12]);
  await application(s[9]!, [s[11]!, s[4]!], "CLB Cờ vây FPTU", "Kỹ năng",
    "Nơi rèn tư duy chiến lược qua từng ván cờ vây.",
    "Rèn tư duy chiến lược qua cờ vây, tổ chức giải đấu nội bộ mỗi học kỳ.", [30, 41, 59]);
  const gameApp = await application(s[11]!, [s[15]!, s[2]!], "CLB Lập trình Game FPTU", "Công nghệ",
    "Làm game indie cùng nhau, từ ý tưởng tới sản phẩm.",
    "Cùng nhau làm game indie bằng Unity/Godot, tham gia game jam trong và ngoài trường.", [79, 70, 229]);
  if (gameApp) {
    const record = await ucmsModels.clubApplications!.findById(gameApp).select({ state: 1 }).lean();
    if (record?.state === "Submitted" || record?.state === "Under Review") {
      await once("claim game application", () => claimApplicationReview(reviews, auth, actor(owner), gameApp, now));
      await decideApplicationReview(reviews, auth, actor(owner), gameApp,
        { outcome: "Approve", reason: "Hồ sơ đầy đủ, mục tiêu rõ ràng và phù hợp định hướng phát triển sinh viên." }, now);
    }
  }

  // ── Events (UC25–UC27 are not built yet, so events are published directly) ─────────────────
  const registrationForm = [
    { key: "phone", label: "Số điện thoại", type: "text", required: true },
    { key: "level", label: "Bạn đã từng tham gia hoạt động tương tự chưa?", type: "select", required: true,
      options: ["Chưa từng", "Đôi khi", "Thường xuyên"] },
    { key: "note", label: "Ghi chú cho ban tổ chức", type: "textarea", required: false },
  ];
  async function event(id: string, code: string, organizer: Types.ObjectId, input: {
    title: string; objective: string; startAt: Date; endAt: Date; venueText: string; capacity: number;
    waitlistEnabled: boolean; audienceScope?: "PUBLIC" | "MEMBERS_ONLY"; state: "Upcoming" | "Ongoing" | "Completed";
    registrationOpenAt: Date; registrationCloseAt: Date; checkInCode?: string; allowWalkIn?: boolean;
  }): Promise<Types.ObjectId> {
    const eventId = new Types.ObjectId(id);
    if (await ucmsModels.events!.exists({ _id: eventId })) return eventId;
    const { id: clubId, name } = club(code);
    await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId, clubName: name,
      title: input.title, objective: input.objective, startAt: input.startAt, endAt: input.endAt,
      semesterCode: "Fall 2026", venueText: input.venueText, audienceScope: input.audienceScope ?? "PUBLIC",
      capacity: input.capacity, confirmedRegistrationCount: 0, nextWaitlistPosition: 1,
      waitlistEnabled: input.waitlistEnabled, state: input.state, allowWalkIn: input.allowWalkIn ?? false,
      ...(input.checkInCode ? { checkInCode: input.checkInCode } : {}), currentRevisionNo: 1,
      publishedAt: at(-14 * DAY), registrationOpenAt: input.registrationOpenAt,
      registrationCloseAt: input.registrationCloseAt, attendanceFinalized: false, createdAt: at(-14 * DAY) });
    await ucmsModels.eventProposalVersions!.create({ eventId, revisionNo: 1, payload: { registrationForm },
      submittedBy: organizer, submittedAt: at(-15 * DAY) });
    return eventId;
  }
  const registrations = mongoEventRegistrationRepository();
  async function register(eventId: Types.ObjectId, userIds: Types.ObjectId[]) {
    for (const userId of userIds) {
      await once("event registration", () => registerForEvent(registrations, policy, actor(userId), eventId.toString(),
        { phone: "0912345678", level: "Đôi khi" }, now));
    }
  }
  /** Attendance for events whose registration window is already over (no UI path can create these now). */
  async function attended(eventId: Types.ObjectId, clubCode: string, userIds: Types.ObjectId[], checkedInAt: Date) {
    const { id: clubId } = club(clubCode);
    for (const userId of userIds) {
      if (await ucmsModels.attendances!.exists({ eventId, studentId: userId })) continue;
      const registration = await ucmsModels.eventRegistrations!.findOneAndUpdate({ eventId, studentId: userId },
        { $setOnInsert: { eventId, studentId: userId, clubId, state: "Confirmed", answers: {},
          createdAt: at(-10 * DAY) } }, { upsert: true, new: true }).lean();
      await ucmsModels.events!.updateOne({ _id: eventId }, { $inc: { confirmedRegistrationCount: 1 } });
      await ucmsModels.attendances!.create({ eventId, studentId: userId, registrationId: registration!._id, clubId,
        checkedInAt, method: "self", abnormalFlags: [], finalized: false });
    }
  }

  const workshop = await event("de0000000000000000000e01", "HEBE", owner, {
    title: "Workshop nhảy hiện đại K-pop cho tân sinh viên",
    objective: "Buổi workshop mở cho mọi sinh viên: khởi động, học một đoạn vũ đạo K-pop ngắn và giao lưu cùng HEBE.",
    startAt: at(6 * DAY), endAt: at(6 * DAY + 2.5 * HOUR), venueText: "Phòng đa năng tầng 2, tòa Beta",
    capacity: 30, waitlistEnabled: true, state: "Upcoming", registrationOpenAt: at(-2 * DAY), registrationCloseAt: at(5 * DAY) });
  await register(workshop, [s[3]!, s[4]!, s[6]!, s[10]!, s[12]!]);
  const ctf = await event("de0000000000000000000e02", "EHC", s[14]!, {
    title: "CTF Warm-up: Nhập môn bảo mật web",
    objective: "Làm quen với các lỗ hổng web phổ biến qua thử thách CTF nhỏ. Số chỗ có hạn, hết chỗ sẽ vào danh sách chờ.",
    startAt: at(9 * DAY), endAt: at(9 * DAY + 3 * HOUR), venueText: "Phòng lab 304, tòa Alpha",
    capacity: 3, waitlistEnabled: true, state: "Upcoming", registrationOpenAt: at(-1 * DAY), registrationCloseAt: at(8 * DAY) });
  await register(ctf, [s[5]!, s[13]!, s[15]!]);
  const badminton = await event("de0000000000000000000e03", "FBC", owner, {
    title: "Giải cầu lông giao hữu FBC Open",
    objective: "Giải giao hữu đánh đơn dành cho người mới. Số suất rất ít và không có danh sách chờ.",
    startAt: at(12 * DAY), endAt: at(12 * DAY + 4 * HOUR), venueText: "Nhà thi đấu Đại học FPT Hà Nội",
    capacity: 2, waitlistEnabled: false, state: "Upcoming", registrationOpenAt: at(-1 * DAY), registrationCloseAt: at(11 * DAY) });
  await register(badminton, [s[0]!, s[1]!]);
  await event("de0000000000000000000e04", "Mây Mưa Club", s[8]!, {
    title: "Sinh hoạt tháng 10: Trà đạo & Origami",
    objective: "Buổi sinh hoạt nội bộ dành riêng cho thành viên Mây Mưa Club.",
    startAt: at(4 * DAY), endAt: at(4 * DAY + 2 * HOUR), venueText: "Phòng 112, tòa Gamma", capacity: 25,
    waitlistEnabled: false, audienceScope: "MEMBERS_ONLY", state: "Upcoming",
    registrationOpenAt: at(-3 * DAY), registrationCloseAt: at(3 * DAY) });
  const festival = await event("de0000000000000000000e05", "HEBE", owner, {
    title: "Tuần lễ âm nhạc HEBE Unplugged",
    objective: "Chuỗi biểu diễn acoustic mỗi tối trong tuần. Đến nơi, nhập mã check-in được dán tại sảnh.",
    startAt: at(-1 * DAY), endAt: at(5 * DAY), venueText: "Sảnh Delta, Đại học FPT Hà Nội", capacity: 120,
    waitlistEnabled: false, state: "Ongoing", registrationOpenAt: at(-10 * DAY), registrationCloseAt: at(-2 * DAY),
    checkInCode: "HEBE2026", allowWalkIn: true });
  if (!(await ucmsModels.eventRegistrations!.exists({ eventId: festival, studentId: owner }))) {
    for (const userId of [owner, s[3]!, s[4]!]) {
      await ucmsModels.eventRegistrations!.create({ eventId: festival, studentId: userId, clubId: club("HEBE").id,
        state: "Confirmed", answers: { phone: "0912345678", level: "Thường xuyên" }, createdAt: at(-5 * DAY) });
    }
    await ucmsModels.events!.updateOne({ _id: festival }, { $set: { confirmedRegistrationCount: 3 } });
  }
  const origami = await event("de0000000000000000000e06", "Mây Mưa Club", s[8]!, {
    title: "Workshop Origami cơ bản",
    objective: "Gấp hạc giấy và hoa sen giấy theo phong cách Nhật Bản. Cảm ơn mọi người đã tham gia!",
    startAt: at(-1 * DAY - 3 * HOUR), endAt: at(-1 * DAY), venueText: "Phòng 112, tòa Gamma", capacity: 30,
    waitlistEnabled: false, state: "Completed", registrationOpenAt: at(-12 * DAY), registrationCloseAt: at(-2 * DAY) });
  await attended(origami, "Mây Mưa Club", [owner, s[8]!, s[9]!, s[10]!, s[11]!], at(-1 * DAY - 3 * HOUR + 10 * 60_000));
  const feedback = mongoEventFeedbackRepository();
  const origamiFeedback: Array<[number, number, string, boolean]> = [
    [8, 5, "Hướng dẫn rất dễ hiểu, mong có thêm buổi gấp nâng cao.", false],
    [9, 4, "Vui và chill, nhưng phòng hơi chật khi đông người.", false],
    [10, 5, "Lần đầu gấp được hạc giấy, cảm ơn các anh chị!", true],
  ];
  for (const [index, rating, comment, isAnonymous] of origamiFeedback) {
    await once("event feedback", () => submitEventFeedback(feedback, policy, actor(s[index]!), origami.toString(),
      { rating, comment, isAnonymous }, now));
  }
  const welcome = await event("de0000000000000000000e07", "HEBE", owner, {
    title: "Đêm nhạc chào tân sinh viên K21",
    objective: "Đêm diễn mở màn năm học mới của HEBE Club.",
    startAt: at(-10 * DAY), endAt: at(-10 * DAY + 3 * HOUR), venueText: "Hội trường lớn, tòa Alpha", capacity: 200,
    waitlistEnabled: false, state: "Completed", registrationOpenAt: at(-25 * DAY), registrationCloseAt: at(-11 * DAY) });
  await attended(welcome, "HEBE", [owner, s[0]!, s[3]!, s[4]!], at(-10 * DAY + 5 * 60_000));

  // ── One-way student feedback (UC50) ────────────────────────────────────────────────────────
  const studentFeedback = mongoStudentFeedbackRepository();
  const hebe = club("HEBE").id.toString();
  const messages: Array<[number, Parameters<typeof sendStudentFeedback>[2]]> = [
    [4, { recipient: "CLUB", clubId: hebe, eventId: welcome.toString(), category: "praise",
      message: "Đêm nhạc chào tân sinh viên quá đỉnh, âm thanh ánh sáng rất chuyên nghiệp!", isAnonymous: false }],
    [6, { recipient: "CLUB", clubId: hebe, category: "suggestion",
      message: "CLB có thể đăng lịch tập lên sớm hơn 1 tuần để mọi người sắp xếp không ạ?", isAnonymous: true }],
    [12, { recipient: "CLUB", clubId: hebe, category: "issue",
      message: "Buổi tập tối thứ 5 kết thúc muộn, gần giờ đóng cửa ký túc xá.", isAnonymous: true }],
    [10, { recipient: "ICPDP", category: "suggestion",
      message: "Nhà trường có thể mở thêm phòng tập cho các CLB nghệ thuật vào cuối tuần không ạ?", isAnonymous: false }],
    [13, { recipient: "ICPDP", clubId: club("FBC").id.toString(), category: "issue",
      message: "Lịch sử dụng nhà thi đấu của CLB cầu lông hay bị trùng với lịch thể dục.", isAnonymous: true }],
  ];
  for (const [index, input] of messages) {
    if (await ucmsModels.complaints!.exists({ complainantId: s[index], description: input.message })) continue;
    await sendStudentFeedback(studentFeedback, actor(s[index]!), input, now);
  }

  // ── Leadership transition waiting for ICPDP (UC13; UC12 is not built yet, so the plan is inserted) ──
  const fds = club("FDS").id;
  if (!(await ucmsModels.transitionPlans!.exists({ clubId: fds }))) {
    const fromTerm = await ucmsModels.clubTerms!.findOne({ clubId: fds, state: "Active" }).lean();
    const [toTerm] = await ucmsModels.clubTerms!.create([{ clubId: fds, name: "Nhiệm kỳ 2026–2027",
      startAt: new Date("2026-10-31T17:00:00Z"), endAt: new Date("2027-10-31T16:59:59Z"), state: "Planned",
      previousTermId: fromTerm!._id }]);
    const fdsMembers = await ucmsModels.clubMemberships!.find({ clubId: fds }).lean();
    function membershipOf(userId: Types.ObjectId): string {
      return String(fdsMembers.find((member) => String(member.userId) === String(userId))!._id);
    }
    const [plan] = await ucmsModels.transitionPlans!.create([{ clubId: fds, fromTermId: fromTerm!._id,
      toTermId: toTerm!._id,
      candidates: [{ positionCode: "CLUB_LEADER", membershipId: membershipOf(s[12]!) },
        { positionCode: "VICE", membershipId: membershipOf(s[13]!) }],
      outstandingObligations: [{ id: "report-fa26", type: "REPORT",
        description: "Nộp báo cáo hoạt động học kỳ Summer 2026", assigneeMembershipId: membershipOf(s[12]!) }],
      handoverItems: { items: [{ id: "assets", description: "Bàn giao sổ tài sản và tài khoản fanpage" },
        { id: "docs", description: "Bàn giao tài liệu workshop Data Science 101" }],
      proposedBoardRoles: [
        { code: "CLUB_LEADER", name: "Chủ nhiệm", isLeaderRole: true, isSingleHolder: true, permissionCodes: [] },
        { code: "VICE", name: "Phó chủ nhiệm", isLeaderRole: false, isSingleHolder: true,
          permissionCodes: boardPermissions.VICE },
      ] }, state: "Pending Confirmation", submittedBy: s[7], submittedAt: at(-1 * DAY) }]);
    await ucmsModels.approvalTasks!.create({ entityType: "TRANSITION_PLAN", entityId: plan!._id, clubId: fds,
      title: "Chuyển giao nhiệm kỳ — FPTU Data Science Club", state: "Open", openedAt: at(-1 * DAY) });
  }

  const counts = await Promise.all(["users", "policyVersions", "clubMemberships", "recruitmentApplications",
    "clubApplications", "boardNominations", "events", "eventRegistrations", "attendances", "eventFeedbacks",
    "complaints", "transitionPlans"].map(async (name) => `${name}=${await db.collection(name).countDocuments()}`));
  console.log(`demo data ready (owner ${ownerEmail}): ${counts.join(", ")}`);
} catch (error) {
  console.error("demo seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
