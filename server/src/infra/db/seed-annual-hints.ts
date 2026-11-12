// Acceptance data for the annual evaluation report (UC55 A2) and similar-club hints (UC07/UC08),
// added on top of an existing demo database. Usage: npm run seed:annual-hints -- --officer=<email> --applicant=<email>
// Only adds data and is safe to re-run: every row is keyed and skipped when it already exists.
// Never creates an evaluation for the live semester (Fall 2026): its generate/publish flow is demoed by hand.
import mongoose, { Types } from "mongoose";
import { DEFAULT_SCHEME_SETTINGS, EVALUATION_DIMENSIONS, type SchemeThresholds } from "../../domain/evaluation-scheme.js";
import { classify } from "../../domain/evaluation.js";
import type { FounderRole } from "../../domain/club-application.js";
import type { AccessActor } from "../../usecase/access.js";
import { createApplicationDraft, submitApplication, uploadApplicationDocument } from "../../usecase/club-application.js";
import { loadConfig, optionalCloudinaryConfig } from "../config/index.js";
import { cloudinaryApplicationFiles } from "../files/cloudinary-application-files.js";
import { mongoClubApplicationRepository } from "./mongo-club-application-repository.js";
import { mongoClubFieldRepository } from "./mongo-club-field-repository.js";
import { mongoEvaluationSchemeRepository } from "./mongo-evaluation-scheme-repository.js";
import { mongoPolicyRepository } from "./mongo-policy-repository.js";
import { charterPdf, logoPng } from "./seed-files.js";
import { ucmsModels as m } from "./ucms-models.js";

const config = loadConfig();
const DAY = 24 * 3_600_000;
const now = new Date();
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, "").split("=");
  return [key, rest.join("=").trim().toLowerCase()];
}));
const OFFICER_EMAIL = args.officer ?? "";
const APPLICANT_EMAIL = args.applicant ?? "";
if (!OFFICER_EMAIL.includes("@") || !APPLICANT_EMAIL.includes("@")) {
  console.error("usage: npm run seed:annual-hints -- --officer=<ICPDP officer email> --applicant=<student email>");
  process.exit(1);
}
const LIVE_PERIOD = "Fall 2026";

// Rows inserted by hand before this seed existed; this seed replaces them.
const LEGACY_EVALUATIONS = [1, 2, 3, 4, 5, 6].map((n) => new Types.ObjectId(`dea0000000000000000000${String(n).padStart(2, "0")}`));
const LEGACY_REPORTS = [1, 2, 3].map((n) => new Types.ObjectId(`deb0000000000000000000${String(n).padStart(2, "0")}`));

// Fall 2025 uses stricter thresholds, so the year classification visibly follows the latest term's scheme.
const STRICT: SchemeThresholds = { excellent: 88, good: 75, fair: 55 };
const periods: Record<string, { thresholds: SchemeThresholds; publishedAt: Date }> = {
  "Spring 2025": { thresholds: DEFAULT_SCHEME_SETTINGS.thresholds, publishedAt: new Date("2025-05-10T03:00:00Z") },
  "Summer 2025": { thresholds: DEFAULT_SCHEME_SETTINGS.thresholds, publishedAt: new Date("2025-09-12T03:00:00Z") },
  "Fall 2025": { thresholds: STRICT, publishedAt: new Date("2026-01-10T03:00:00Z") },
  "Spring 2026": { thresholds: DEFAULT_SCHEME_SETTINGS.thresholds, publishedAt: new Date("2026-05-10T03:00:00Z") },
  "Summer 2026": { thresholds: DEFAULT_SCHEME_SETTINGS.thresholds, publishedAt: new Date("2026-09-12T03:00:00Z") },
};

interface Figures { members: number; events: number; attendances: number; openCases: number }
interface PlannedEvaluation {
  club: string; period: string; total: number; figures: Figures;
  revisionNo?: number; state?: "Published" | "Finalized"; insufficient?: string;
}
function f(members: number, events: number, attendances: number, openCases = 0): Figures {
  return { members, events, attendances, openCases };
}

const evaluationPlan: PlannedEvaluation[] = [
  // 2025: complete year (Spring, Summer, Fall).
  { club: "HEBE", period: "Spring 2025", total: 80, figures: f(16, 2, 85) },
  { club: "HEBE", period: "Summer 2025", total: 86, figures: f(18, 3, 120) },
  { club: "HEBE", period: "Fall 2025", total: 92, figures: f(22, 4, 210) },
  { club: "Melody", period: "Spring 2025", total: 90, figures: f(30, 4, 260) },
  { club: "Melody", period: "Summer 2025", total: 89, figures: f(28, 3, 190) },
  { club: "Melody", period: "Fall 2025", total: 91, figures: f(32, 5, 300) },
  { club: "FDS", period: "Spring 2025", total: 84, figures: f(17, 3, 140) },
  { club: "FDS", period: "Summer 2025", total: 78, figures: f(15, 2, 80) },
  { club: "FDS", period: "Fall 2025", total: 70, figures: f(13, 1, 45, 1) },
  // A later revision still being reviewed: never counts.
  { club: "FDS", period: "Fall 2025", total: 95, figures: f(13, 1, 45, 1), revisionNo: 2, state: "Finalized" },
  { club: "EHC", period: "Spring 2025", total: 70, figures: f(9, 2, 55) },
  { club: "EHC", period: "Summer 2025", total: 72, figures: f(10, 2, 60) },
  { club: "EHC", period: "Fall 2025", total: 75, figures: f(11, 2, 75) },
  { club: "iGo", period: "Spring 2025", total: 68, figures: f(25, 3, 150) },
  { club: "iGo", period: "Summer 2025", total: 66, figures: f(22, 2, 120) },
  { club: "iGo", period: "Fall 2025", total: 63, figures: f(20, 2, 95, 1) },
  { club: "FRC", period: "Spring 2025", total: 50, figures: f(8, 1, 25, 1) },
  { club: "FRC", period: "Summer 2025", total: 48, figures: f(7, 1, 20, 1) },
  { club: "FRC", period: "Fall 2025", total: 46, figures: f(7, 0, 0, 2) },
  { club: "Mây Mưa Club", period: "Summer 2025", total: 52, figures: f(6, 1, 18) },
  { club: "Mây Mưa Club", period: "Fall 2025", total: 58, figures: f(8, 1, 25), insufficient: "D5" },
  { club: "FEC", period: "Fall 2025", total: 79, figures: f(20, 2, 110) },
  { club: "Blazie", period: "Spring 2025", total: 72, figures: f(24, 2, 130) },
  { club: "Blazie", period: "Summer 2025", total: 55, figures: f(20, 1, 40) },
  // Post-publication revision: both revisions are Published, the higher revisionNo wins.
  { club: "Blazie", period: "Summer 2025", total: 80, figures: f(20, 2, 140), revisionNo: 2 },
  { club: "Blazie", period: "Fall 2025", total: 76, figures: f(26, 3, 160) },
  // 2026: provisional year (Fall 2026 is live and stays untouched).
  { club: "HEBE", period: "Spring 2026", total: 72, figures: f(18, 2, 90) },
  { club: "HEBE", period: "Summer 2026", total: 78, figures: f(20, 2, 110) },
  { club: "FDS", period: "Spring 2026", total: 81, figures: f(15, 3, 120) },
  { club: "FDS", period: "Summer 2026", total: 74, figures: f(12, 1, 40) },
  { club: "EHC", period: "Spring 2026", total: 65, figures: f(9, 2, 60) },
  { club: "EHC", period: "Summer 2026", total: 66, figures: f(9, 2, 35, 1) },
  { club: "Melody", period: "Spring 2026", total: 88, figures: f(31, 4, 240) },
  { club: "Melody", period: "Summer 2026", total: 90, figures: f(33, 3, 220) },
  { club: "FRC", period: "Spring 2026", total: 45, figures: f(7, 1, 15, 1) },
  { club: "FRC", period: "Summer 2026", total: 48, figures: f(8, 1, 22, 1) },
  { club: "Mây Mưa Club", period: "Summer 2026", total: 50, figures: f(7, 1, 15, 1) },
];

interface PlannedReport {
  club: string; period: string; approved: number; disbursed: number;
  achievements: { title: string; description: string }[]; state?: "Accepted" | "Submitted";
}
const reportPlan: PlannedReport[] = [
  { club: "HEBE", period: "Spring 2025", approved: 6_000_000, disbursed: 5_500_000, achievements: [
    { title: "Quán quân K-pop Random Dance Hà Nội 2025", description: "Đội nhảy HEBE vượt qua 18 đội đến từ các trường đại học khu vực Hà Nội." }] },
  { club: "Melody", period: "Spring 2025", approved: 8_000_000, disbursed: 7_200_000, achievements: [
    { title: "Đêm nhạc gây quỹ \"Mùa xuân yêu thương\"", description: "Quyên góp được 35 triệu đồng tặng học sinh vùng cao Hà Giang." },
    { title: "Giải ba Tiếng hát sinh viên Thủ đô 2025", description: "Thành viên Melody đạt giải ba hạng mục đơn ca nhạc nhẹ." }] },
  { club: "FDS", period: "Spring 2025", approved: 4_000_000, disbursed: 3_600_000, achievements: [
    { title: "Hackathon Dữ liệu mở 2025", description: "Đội FDS vào chung kết với mô hình dự báo lượng mưa cho nông nghiệp đồng bằng." }] },
  { club: "iGo", period: "Spring 2025", approved: 5_000_000, disbursed: 4_800_000, achievements: [
    { title: "Chiến dịch \"Áo ấm cho em\"", description: "Trao 420 áo ấm và 150 suất quà cho trẻ em xã Lũng Cú, Hà Giang." }] },
  { club: "HEBE", period: "Summer 2025", approved: 3_000_000, disbursed: 2_400_000, achievements: [
    { title: "Biểu diễn khai mạc Ngày hội Chào tân sinh viên", description: "Tiết mục mở màn trước hơn 2.000 tân sinh viên khóa 21." }] },
  { club: "EHC", period: "Summer 2025", approved: 2_500_000, disbursed: 2_500_000, achievements: [
    { title: "Top 5 vòng loại SVATTT 2025", description: "Đội EHC lọt vào nhóm 5 đội dẫn đầu khu vực phía Bắc cuộc thi Sinh viên với An toàn thông tin." }] },
  { club: "Blazie", period: "Summer 2025", approved: 4_500_000, disbursed: 4_000_000, achievements: [
    { title: "Giải nhì Vũ điệu tuổi trẻ 2025", description: "Tiết mục hiện đại kết hợp múa đương đại đạt giải nhì toàn thành phố." }] },
  { club: "HEBE", period: "Fall 2025", approved: 6_500_000, disbursed: 6_000_000, achievements: [
    { title: "Workshop vũ đạo cho 300 sinh viên", description: "Chuỗi 6 buổi workshop mở cho sinh viên toàn trường, mỗi buổi kín chỗ." }] },
  { club: "Melody", period: "Fall 2025", approved: 7_000_000, disbursed: 6_100_000, achievements: [
    { title: "Liveshow kỷ niệm 13 năm thành lập", description: "Đêm nhạc tại hội trường tòa Alpha thu hút hơn 800 khán giả." }] },
  { club: "FDS", period: "Fall 2025", approved: 3_500_000, disbursed: 2_000_000, achievements: [] },
  { club: "FEC", period: "Fall 2025", approved: 2_000_000, disbursed: 1_500_000, achievements: [
    { title: "Cuộc thi hùng biện tiếng Anh \"Speak Up\"", description: "Thu hút 64 thí sinh, chung kết có sự tham gia của giám khảo bản ngữ." }] },
  { club: "Mây Mưa Club", period: "Fall 2025", approved: 1_500_000, disbursed: 1_200_000, achievements: [
    { title: "Triển lãm tranh màu nước \"Hà Nội mùa thu\"", description: "Trưng bày 45 tác phẩm của thành viên tại sảnh tòa Beta trong một tuần." }] },
  // Not accepted yet: its finance and achievement must not appear in the annual report.
  { club: "FRC", period: "Fall 2025", approved: 9_000_000, disbursed: 8_500_000, state: "Submitted", achievements: [
    { title: "Robot tự hành vào chung kết Robocon", description: "Thành tích chưa được ICPDP xác nhận nên không được đưa vào báo cáo năm." }] },
  { club: "HEBE", period: "Spring 2026", approved: 6_000_000, disbursed: 5_200_000, achievements: [
    { title: "Giải nhất cuộc thi nhảy K-pop sinh viên Hà Nội 2026", description: "Đội nhảy HEBE vượt qua 24 đội của 12 trường." }] },
  { club: "FDS", period: "Spring 2026", approved: 4_500_000, disbursed: 4_500_000, achievements: [
    { title: "Top 3 Kaggle Student Challenge", description: "Nhóm 4 thành viên đạt hạng 3 bảng sinh viên Đông Nam Á." },
    { title: "Chuỗi workshop Python cơ bản", description: "5 buổi workshop cho 180 lượt sinh viên năm nhất." }] },
  { club: "Melody", period: "Spring 2026", approved: 5_500_000, disbursed: 5_000_000, achievements: [
    { title: "Album acoustic \"Gửi FPTU\"", description: "Phát hành 6 ca khúc sáng tác của thành viên, đạt 20.000 lượt nghe." }] },
  { club: "Melody", period: "Summer 2026", approved: 4_000_000, disbursed: 3_000_000, achievements: [
    { title: "Biểu diễn tại Lễ tốt nghiệp 2026", description: "Ban nhạc Melody biểu diễn ba ca khúc trong lễ tốt nghiệp của trường." }] },
  { club: "Mây Mưa Club", period: "Summer 2026", approved: 1_500_000, disbursed: 1_200_000, achievements: [
    { title: "Triển lãm đồ thủ công tái chế", description: "Trưng bày 60 sản phẩm tại sảnh tòa Alpha trong 3 ngày." }] },
];

// Founding applications: four in the ICPDP queue, one Draft owned by the applicant account.
interface PlannedApplication {
  key: string; founders: string[]; clubName: string; field: string; summary: string; objectives: string;
  logo: [number, number, number]; submit: boolean;
}
const applicationPlan: PlannedApplication[] = [
  { key: "HIGH vs FPTU Melody Club", founders: ["anhdthe180081@fpt.edu.vn", "anhdthe180134@fpt.edu.vn", "anhghe180002@fpt.edu.vn"],
    clubName: "CLB Melody", field: "Nghệ thuật", submit: true, logo: [190, 24, 93],
    summary: "Nơi những con người khao khát vượt ngưỡng tìm thấy nhau qua âm nhạc.",
    objectives: "Hình thành và phát triển phong trào âm nhạc, nơi những người trẻ khao khát vượt ngưỡng cùng biểu diễn." },
  { key: "HIGH 60 vs FPTU Robotics Club (no description)", founders: ["anhldhe180047@fpt.edu.vn", "anhlnhe180001@fpt.edu.vn", "anhpmhe180118@fpt.edu.vn"],
    clubName: "CLB Robotics FPTU", field: "Công nghệ", submit: true, logo: [14, 116, 144],
    summary: "Thiết kế và lập trình robot tự hành cho sinh viên năm nhất.",
    objectives: "Chế tạo robot thi đấu, tham gia Robocon và các cuộc thi robot quốc gia." },
  { key: "APPLICATION pair (1/2)", founders: ["anhpqhe180080@fpt.edu.vn", "anhvdhe180032@fpt.edu.vn", "anlhhe180072@fpt.edu.vn"],
    clubName: "CLB Đọc sách FPTU", field: "Kỹ năng", submit: true, logo: [180, 83, 9],
    summary: "Lan tỏa văn hóa đọc sách, mỗi tháng một cuốn sách hay.",
    objectives: "Tổ chức buổi thảo luận sách hằng tháng, trao đổi sách cũ và ngày hội đọc sách cuối kỳ." },
  { key: "APPLICATION pair (2/2)", founders: ["anlhhe180094@fpt.edu.vn", "anlhhe180144@fpt.edu.vn", "annkhe180096@fpt.edu.vn"],
    clubName: "CLB Mọt Sách", field: "Kỹ năng", submit: true, logo: [101, 163, 13],
    summary: "Cộng đồng mọt sách chia sẻ niềm vui đọc sách.",
    objectives: "Thảo luận sách hằng tháng, góc trao đổi sách cũ và ngày hội đọc sách mỗi học kỳ." },
  { key: "no hints", founders: ["binhldhe180022@fpt.edu.vn", "chihhhe180057@fpt.edu.vn", "chihphe180035@fpt.edu.vn"],
    clubName: "CLB Thiên văn học", field: "Công nghệ", submit: true, logo: [30, 27, 75],
    summary: "Quan sát bầu trời đêm bằng kính thiên văn.",
    objectives: "Tổ chức đêm ngắm sao, chụp ảnh thiên văn và workshop về vũ trụ." },
  { key: "applicant Draft vs iGo", founders: [APPLICANT_EMAIL, "chihthe180114@fpt.edu.vn", "dungdmhe180074@fpt.edu.vn"],
    clubName: "CLB Tình nguyện Vì Cộng Đồng", field: "Cộng đồng", submit: false, logo: [22, 163, 74],
    summary: "Nơi những người trẻ gặp nhau với mong muốn tạo ra giá trị tích cực cho xã hội.",
    objectives: "Tổ chức hoạt động tình nguyện vì cộng đồng tại Hà Nội, lan tỏa giá trị tích cực." },
];

function actor(id: string): AccessActor {
  return { id, accountState: "Active" };
}

async function userId(email: string): Promise<string> {
  const user = await m.users!.findOne({ email }).select("_id").lean();
  if (!user) throw new Error(`user ${email} not found in this database`);
  return String(user._id);
}

const clubIds = new Map<string, Types.ObjectId>();
async function clubId(code: string): Promise<Types.ObjectId> {
  if (!clubIds.has(code)) {
    const club = await m.clubs!.findOne({ code }).select("_id").lean();
    if (!club) throw new Error(`club ${code} not found in this database`);
    clubIds.set(code, club._id as Types.ObjectId);
  }
  return clubIds.get(code)!;
}

try {
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 });
  const officer = await userId(OFFICER_EMAIL);
  const officerId = new Types.ObjectId(officer);

  // ── Replace the hand-inserted rows ──
  await m.evaluationDimensionResults!.deleteMany({ evaluationId: { $in: LEGACY_EVALUATIONS } });
  await m.evaluations!.deleteMany({ _id: { $in: LEGACY_EVALUATIONS } });
  await m.periodicReports!.deleteMany({ _id: { $in: LEGACY_REPORTS } });

  // ── Annual report: one Active scheme per period, created through the scheme repository ──
  const schemes = mongoEvaluationSchemeRepository();
  const schemeIds = new Map<string, Types.ObjectId>();
  for (const [periodCode, period] of Object.entries(periods)) {
    if (periodCode === LIVE_PERIOD) throw new Error(`${LIVE_PERIOD} is live and must not be seeded`);
    const active = await m.evaluationSchemes!.findOne({ periodCode, state: "Active" }).select("_id").lean();
    let id = active?._id as Types.ObjectId | undefined;
    if (!id) {
      const draft = await schemes.createDraft(periodCode, { ...DEFAULT_SCHEME_SETTINGS, thresholds: period.thresholds }, officer, now);
      await schemes.activate(draft.id, officer, now);
      id = new Types.ObjectId(draft.id);
    }
    schemeIds.set(periodCode, id);
  }

  // Published evaluations are inserted directly: UC42 would need the live activity of past semesters.
  // The weighted sum of these offsets is 0 under the default weights, so dimension scores add up to the total.
  const offsets = [5, -4, 2, -3, 4, -6, 1, -3];
  let evaluationsAdded = 0;
  for (const plan of evaluationPlan) {
    const club = await clubId(plan.club);
    const revisionNo = plan.revisionNo ?? 1;
    const state = plan.state ?? "Published";
    const period = periods[plan.period]!;
    const publishedAt = new Date(period.publishedAt.getTime() + (revisionNo - 1) * 20 * DAY);
    const existing = await m.evaluations!.findOne({ clubId: club, periodCode: plan.period, revisionNo }).select("_id").lean();
    let evaluationId = existing?._id as Types.ObjectId | undefined;
    if (!evaluationId) {
      const created = await m.evaluations!.create({ clubId: club, periodCode: plan.period,
        schemeId: schemeIds.get(plan.period), state, totalScore: Types.Decimal128.fromString(String(plan.total)),
        classification: classify(plan.total, period.thresholds), revisionNo,
        generatedAt: new Date(publishedAt.getTime() - 3 * DAY), finalizedBy: officerId,
        finalizedAt: new Date(publishedAt.getTime() - DAY), ...(state === "Published" ? { publishedAt } : {}) });
      evaluationId = created._id as Types.ObjectId;
      evaluationsAdded += 1;
    }
    if (await m.evaluationDimensionResults!.exists({ evaluationId })) continue;
    function lineage(metric: string, value: number) {
      return { metric, sourceEntity: "seed-annual-hints", sourceIds: [], sourcePeriod: plan.period, value };
    }
    await m.evaluationDimensionResults!.insertMany(EVALUATION_DIMENSIONS.map((dimension, index) => {
      const insufficient = dimension.code === plan.insufficient;
      return { evaluationId, dimensionCode: dimension.code,
        ...(insufficient ? {} : { score: Types.Decimal128.fromString(String(plan.total + offsets[index]!)) }),
        isInsufficientData: insufficient, isManual: false,
        evidence: dimension.code === "D1" ? [lineage("attendances", plan.figures.attendances),
          lineage("activeMembers", plan.figures.members), lineage("completedEvents", plan.figures.events)]
          : dimension.code === "D8" ? [lineage("violationPenalty", 0), lineage("openViolations", plan.figures.openCases)] : [] };
    }));
  }

  // Periodic reports: unique per (club, period), so a period the club already reported is left alone.
  let reportsAdded = 0;
  for (const plan of reportPlan) {
    const club = await clubId(plan.club);
    if (await m.periodicReports!.exists({ clubId: club, periodCode: plan.period })) continue;
    const accepted = (plan.state ?? "Accepted") === "Accepted";
    const submittedAt = new Date(periods[plan.period]!.publishedAt.getTime() - 10 * DAY);
    await m.periodicReports!.create({ clubId: club, periodCode: plan.period, periodType: "SEMESTER",
      preloadedFigures: { finance: { budgets: 2, approvedTotal: plan.approved, disbursedTotal: plan.disbursed },
        capturedAt: submittedAt, clubData: { achievements: plan.achievements } },
      narrative: `Báo cáo hoạt động ${plan.period} của CLB.`, nextPlan: "Tiếp tục kế hoạch hoạt động kỳ sau.",
      evidence: [], state: accepted ? "Accepted" : "Submitted", versionNo: 1, lateFlag: false,
      submittedBy: officerId, submittedAt, dueAt: new Date(submittedAt.getTime() + 2 * DAY),
      ...(accepted ? { decisionOutcome: "Accept", decidedBy: officerId, decidedAt: new Date(submittedAt.getTime() + DAY) } : {}) });
    reportsAdded += 1;
  }

  // ── Similar-club hints: founding applications through the UC07 use cases ──
  const applications = mongoClubApplicationRepository();
  const clubFields = mongoClubFieldRepository();
  const policy = mongoPolicyRepository();
  const cloudinary = optionalCloudinaryConfig(config);
  const storage = cloudinary ? cloudinaryApplicationFiles(cloudinary) : null;
  const seeded: string[] = [];
  for (const plan of applicationPlan) {
    const founders = await Promise.all(plan.founders.map(userId));
    const owner = founders[0]!;
    let record = (await applications.listMine(owner)).find((item) => item.draft.clubName === plan.clubName);
    if (record && record.state !== "Draft") {
      seeded.push(`${record.id}  ${record.state.padEnd(12)} ${plan.clubName} (${plan.key})`);
      continue;
    }
    if (!storage) {
      console.warn(`skipped "${plan.clubName}": Cloudinary is not configured, so the proposal and logo cannot be uploaded`);
      continue;
    }
    if ((await applications.activeLeaderUserIds([owner], now)).length) {
      throw new Error(`${plan.founders[0]} already leads a club, so "${plan.clubName}" could not be submitted`);
    }
    if (!record) {
      const field = (await clubFields.listActive()).find((item) => item.name === plan.field);
      if (!field) throw new Error(`club field "${plan.field}" is not in the catalog`);
      const roles: FounderRole[] = ["LEADER", "VICE_LEADER"];
      record = await createApplicationDraft(applications, clubFields, actor(owner), {
        clubName: plan.clubName, fieldId: field.id, summary: plan.summary, objectives: plan.objectives,
        fanpageUrl: "", contactEmail: "",
        founders: founders.map((id, index) => ({ userId: id, role: roles[index] ?? "MEMBER" })) }, now);
    }
    const uploaded = new Set(record.draft.documents.map((document) => document.documentType));
    if (!uploaded.has("PROPOSAL")) {
      await uploadApplicationDocument(applications, storage, actor(owner), record.id, "PROPOSAL",
        "de-an-thanh-lap.pdf", "application/pdf", charterPdf(plan.clubName), now);
    }
    if (!uploaded.has("LOGO")) {
      await uploadApplicationDocument(applications, storage, actor(owner), record.id, "LOGO",
        "logo.png", "image/png", logoPng(plan.logo), now);
    }
    if (plan.submit) await submitApplication(applications, policy, clubFields, actor(owner), record.id, now);
    seeded.push(`${record.id}  ${(plan.submit ? "Submitted" : "Draft").padEnd(12)} ${plan.clubName} (${plan.key})`);
  }

  console.log(`annual report: ${evaluationsAdded} evaluations and ${reportsAdded} periodic reports added`);
  console.log(`founding applications:\n  ${seeded.join("\n  ")}`);
} catch (error) {
  console.error("annual/hints seed failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
