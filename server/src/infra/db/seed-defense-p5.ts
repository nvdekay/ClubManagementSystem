// Defense demo data for presenter 5: flow 7 (UC35-UC37, sponsored item invoices and payment) and
// flow 8 (UC38-UC39, UC41-UC43, periodic report and club evaluation) on "CLB Sáng tạo Công nghệ FPTU".
// Additive and safe to run again: every part is keyed on the cast, the club and fixed titles.
// The cast can point at real accounts (see seed-defense-cast.ts):
//   npm run seed:defense:p5 -- --leader=<email> --officer=<email> --member=<email>
// Add --report-submitted to leave the club's report Submitted (waiting for UC39) instead of Draft.
// No outside request: invoice images are stored as metadata only (Cloudinary is not used), so the
// recorder serves their previews itself.
import { createHash, randomUUID } from "node:crypto";
import mongoose, { Types } from "mongoose";
import { DEFAULT_SCHEME_SETTINGS } from "../../domain/evaluation-scheme.js";
import { scoreDimensions, totalOf } from "../../domain/evaluation.js";
import type { FundingDecision, SponsoredItemAction } from "../../domain/sponsored-item.js";
import { loadConfig } from "../config/index.js";
import { DEMO_CLUB_NAME, defenseCast, type CastMember, type CastRole } from "./seed-defense-cast.js";
import { mongoClubPeriodicReportRepository } from "./mongo-club-periodic-report-repository.js";
import { mongoEvaluationRepository } from "./mongo-evaluation-repository.js";
import { mongoEvaluationSchemeRepository } from "./mongo-evaluation-scheme-repository.js";
import { findPeriodicCampaign, mongoPeriodicReportRepository } from "./mongo-periodic-report-repository.js";
import { mongoPolicyRepository } from "./mongo-policy-repository.js";
import { mongoSponsoredItemRepository } from "./mongo-sponsored-item-repository.js";
import { ucmsModels as m } from "./ucms-models.js";

const CLUB_NAME = DEMO_CLUB_NAME;
const DOMAIN = "fpt.edu.vn";
const cast = defenseCast();
/** Students from outside the club who attended the event (D1/D2 inputs). */
const guests = ["Đỗ Thu Hà", "Vũ Quang Huy", "Bùi Khánh Linh", "Ngô Đức Mạnh", "Dương Thanh Tâm", "Lý Gia Hân"]
  .map((name, index) => ({ email: `guest${index + 1}.p5demo@${DOMAIN}`, name, overridden: false }));
const EVENT_TITLE = "Ngày hội Lập trình Sáng tạo FPTU 2026";
/** Fixed invoice image ids: the recorder maps them to the preview it serves. */
const IMAGE_IDS = ["5e000000-0000-4000-8000-000000000001", "5e000000-0000-4000-8000-000000000002",
  "5e000000-0000-4000-8000-000000000003"];
const DAY = 86_400_000;
const now = new Date();
function later(ms: number): Date {
  return new Date(now.getTime() + ms);
}

type Ids = Record<CastRole, Types.ObjectId>;

/** A real (overridden) account must exist already and is never changed; a demo account is created when missing. */
async function user(person: CastMember): Promise<Types.ObjectId> {
  const found = await m.users!.findOne({ email: person.email }).select("_id").lean();
  if (found) return found._id as Types.ObjectId;
  if (person.overridden) throw new Error(`${person.email} has no account here; sign in with Google once, then run the seed again`);
  const [created] = await m.users!.create([{ email: person.email, displayName: person.name,
    accountState: "Active", createdAt: now }]);
  return created!._id as Types.ObjectId;
}

async function officerRole(officerId: Types.ObjectId): Promise<void> {
  if (cast.officer.overridden) {
    const roleIds = await m.roles!.find({ code: "ICPDP_OFFICER", scope: "system" }).distinct("_id");
    if (!(await m.userRoleAssignments!.exists({ userId: officerId, roleId: { $in: roleIds }, revokedAt: null }))) {
      throw new Error(`${cast.officer.email} does not hold ICPDP_OFFICER; grant it in Tài khoản & phân quyền first`);
    }
    return;
  }
  const role = await m.roles!.findOneAndUpdate({ code: "ICPDP_OFFICER", scope: "system" },
    { $setOnInsert: { name: "ICPDP OFFICER", isSystem: true, permissionCodes: [] } },
    { upsert: true, new: true }).lean();
  if (!(await m.userRoleAssignments!.exists({ userId: officerId, roleId: role!._id, revokedAt: null }))) {
    await m.userRoleAssignments!.create({ userId: officerId, roleId: role!._id, grantedBy: officerId,
      grantedAt: now, reason: "defense demo (presenter 5)" });
  }
}

/** The cast leader must hold the club's leader seat; a club made by another seed is reused, never re-seated. */
async function assertLeader(clubId: Types.ObjectId, leaderId: Types.ObjectId): Promise<void> {
  const membership = await m.clubMemberships!.findOne({ clubId, userId: leaderId, state: "Active" }).select("_id").lean();
  const positions = await m.clubPositions!.find({ clubId, isLeaderRole: true, isActive: true }).distinct("_id");
  if (!membership || !(await m.clubPositionAssignments!.exists({ membershipId: membership._id,
    positionId: { $in: positions }, effectiveTo: null }))) {
    throw new Error(`${cast.leader.email} is not the Chủ nhiệm of ${CLUB_NAME} in this database; `
      + "run every presenter seed with the same --leader");
  }
}

/** Without the flow 1-3 end state: the club with the cast leader as Chủ nhiệm and the vice as Phó chủ nhiệm. */
async function ensureClub(ids: Ids): Promise<Types.ObjectId> {
  const found = await m.clubs!.findOne({ name: CLUB_NAME }).select("_id").lean();
  if (found) {
    await assertLeader(found._id as Types.ObjectId, ids.leader);
    return found._id as Types.ObjectId;
  }
  const [club] = await m.clubs!.create([{ code: "CLB-DEMO-P5", name: CLUB_NAME, field: "Công nghệ", state: "Active",
    description: "Cộng đồng sinh viên học lập trình và xây dựng sản phẩm công nghệ.",
    contactEmail: cast.leader.email, createdAt: now }]);
  const clubId = club!._id as Types.ObjectId;
  const seats = [
    { code: "CLUB_LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true, isSingleHolder: true, isDefaultMemberRole: false },
    { code: "VICE_LEADER", name: "Phó chủ nhiệm", isBoardSeat: true, isLeaderRole: false, isSingleHolder: false, isDefaultMemberRole: false },
    { code: "MEMBERS", name: "Thành viên", isBoardSeat: false, isLeaderRole: false, isSingleHolder: false, isDefaultMemberRole: true },
  ];
  const positions = await m.clubPositions!.create(seats.map((seat) => ({ ...seat, clubId, permissionCodes: [], isActive: true })));
  const [term] = await m.clubTerms!.create([{ clubId, name: "Founding term", startAt: new Date(now.getTime() - 60_000),
    endAt: later(365 * DAY), state: "Active", confirmedBy: ids.officer, confirmedAt: now }]);
  const memberships = await m.clubMemberships!.create((["leader", "vice", "member", "member2"] as const).map((key) => ({
    clubId, userId: ids[key], state: "Active", joinedAt: now, defaultRole: "MEMBERS",
    statusHistory: [{ toState: "Active", reason: "defense demo (presenter 5)", actorId: ids.officer, at: now }] })));
  await m.clubPositionAssignments!.create([0, 1].map((index) => ({ clubId, termId: term!._id,
    positionId: positions[index]!._id, membershipId: memberships[index]!._id, effectiveFrom: now,
    assignedBy: ids.officer, confirmedBy: ids.officer })));
  return clubId;
}

/** The semester the demo runs in, from the effective policy (UC04). */
async function currentPeriod() {
  const policy = await mongoPolicyRepository().findEffective(now);
  const period = policy?.academicCalendar.find((item) => item.startAt <= now && now <= item.endAt);
  if (!period) throw new Error("the effective policy has no semester containing today; run `npm run seed` first");
  return { period, minRespondents: policy!.feedbackMinRespondents ?? 1 };
}

// ── Flow 7: an event that ended two days ago, its sponsored budget, registrations and check-ins ──

interface Line { category: string; decision: FundingDecision; amount: number; reason?: string }
const lines: Line[] = [
  { category: "Thuê âm thanh, ánh sáng", decision: "BEFORE_EVENT", amount: 4_000_000 },
  { category: "In ấn banner, standee", decision: "AFTER_EVENT", amount: 2_500_000 },
  { category: "Tiệc liên hoan ban tổ chức", decision: "NOT_SPONSORED", amount: 1_200_000,
    reason: "Không thuộc danh mục được Nhà trường tài trợ" },
];

/** Metadata of a seeded invoice image; the bytes are never stored anywhere. */
function image(index: number, fileName: string, uploadedBy: Types.ObjectId) {
  return { id: IMAGE_IDS[index]!, assetId: `defense-demo-p5/invoice-${index + 1}`, fileName, mimeType: "image/png" as const,
    bytes: 182_000 + index * 7_000, digest: createHash("sha256").update(`defense-demo-p5:${fileName}`).digest("hex"),
    uploadedAt: now.toISOString(), uploadedBy: String(uploadedBy) };
}

async function ensureFinance(clubId: Types.ObjectId, ids: Ids, periodCode: string): Promise<void> {
  if (await m.events!.exists({ clubId, title: EVENT_TITLE })) return;
  const endAt = new Date(now.getTime() - 2 * DAY);
  const startAt = new Date(endAt.getTime() - 6 * 3_600_000);
  const approvedAt = new Date(now.getTime() - 20 * DAY);
  const [event] = await m.events!.create([{ organizerType: "CLUB", clubId, clubName: CLUB_NAME, title: EVENT_TITLE,
    objective: "Thi lập trình theo đội và giới thiệu dự án của thành viên CLB",
    description: "Các đội thi giải bài toán lập trình trong 4 giờ, sau đó trình bày sản phẩm trước ban giám khảo.",
    state: "Completed", audienceScope: "PUBLIC", capacity: 120, confirmedRegistrationCount: 10, nextWaitlistPosition: 1,
    waitlistEnabled: false, allowWalkIn: false, venueText: "Hội trường tòa Alpha", startAt, endAt,
    publishedAt: approvedAt, currentRevisionNo: 1, attendanceFinalized: true, semesterCode: periodCode, createdAt: approvedAt }]);
  const eventId = event!._id as Types.ObjectId;
  await m.eventProposalVersions!.create({ eventId, revisionNo: 1,
    payload: { title: EVENT_TITLE, objective: "Thi lập trình theo đội và giới thiệu dự án của thành viên CLB",
      plan: "Khai mạc, thi đấu 4 giờ, trình bày sản phẩm, trao giải" },
    budgetLines: lines.map((line) => ({ category: line.category, amount: line.amount })),
    submittedBy: ids.leader, submittedAt: new Date(approvedAt.getTime() - 5 * DAY) });
  const approved = lines.map((line) => (line.decision === "NOT_SPONSORED" ? 0 : line.amount));
  function decimal(value: number) {
    return Types.Decimal128.fromString(String(value));
  }
  const [budget] = await m.eventBudgets!.create([{ eventId, clubId,
    lines: lines.map((line, index) => ({ category: line.category, requestedAmount: line.amount,
      approvedAmount: approved[index], fundingDecision: line.decision, ...(line.reason ? { reason: line.reason } : {}) })),
    sponsoredItems: lines.map((line, index) => ({ id: randomUUID(), category: line.category,
      requestedAmount: line.amount, approvedAmount: approved[index], fundingDecision: line.decision,
      ...(line.reason ? { reason: line.reason } : {}), approvedAt: approvedAt.toISOString(),
      eventEndAt: endAt.toISOString(), status: "Draft", amount: 0, description: "", images: [] })),
    requestedTotal: decimal(lines.reduce((sum, line) => sum + line.amount, 0)),
    approvedTotal: decimal(approved.reduce((sum, value) => sum + value, 0)),
    approvedByDecisionId: new Types.ObjectId(), disbursedTotal: decimal(0), refundedTotal: decimal(0),
    isSettlementLate: false, state: "Approved", periodCode, createdAt: approvedAt }]);
  const budgetId = String(budget!._id);

  // Every item change goes through the real repository so expenses, audit logs and notifications exist.
  const repo = mongoSponsoredItemRepository();
  let detail = (await repo.find(budgetId))!;
  let tick = 0;
  async function act(index: number, byClub: boolean, action: SponsoredItemAction) {
    tick += 1;
    detail = await repo.act(budgetId, detail.items[index]!.id, detail.revision, String(byClub ? ids.leader : ids.officer),
      byClub ? String(clubId) : undefined, action, later(tick));
  }
  // Paid before the event (BEFORE_EVENT): the end state the live demo reaches for the other item.
  await act(0, true, { kind: "save", amount: 4_000_000, description: "Thuê dàn âm thanh, ánh sáng hội trường Alpha trong 1 ngày" });
  await act(0, true, { kind: "image", image: image(0, "hoa-don-am-thanh-anh-sang.png", ids.leader) });
  await act(0, true, { kind: "submit" });
  await act(0, false, { kind: "review", validAmount: 4_000_000, reason: "Hóa đơn hợp lệ, khớp hạng mục đã duyệt." });
  await act(0, true, { kind: "pay" });
  // AFTER_EVENT item: invoice images already collected, amount and submission happen live.
  await act(1, true, { kind: "image", image: image(1, "hoa-don-in-banner.png", ids.leader) });
  await act(1, true, { kind: "image", image: image(2, "hoa-don-in-standee.png", ids.leader) });

  // Registrations and check-ins: 4 members and 6 guests registered; 3 members and 5 guests checked in.
  const members = [ids.leader, ids.vice, ids.member, ids.member2];
  const guestIds = await Promise.all(guests.map(user));
  const registered = [...members, ...guestIds];
  const attended = [ids.leader, ids.vice, ids.member, ...guestIds.slice(0, 5)];
  const registrations = await m.eventRegistrations!.create(registered.map((studentId, index) => ({ eventId, studentId, clubId,
    state: "Confirmed", createdAt: new Date(startAt.getTime() - (10 - index) * DAY / 2) })));
  await m.attendances!.create(attended.map((studentId, index) => ({ eventId, studentId, clubId,
    registrationId: registrations.find((item) => String(item.studentId) === String(studentId))!._id,
    checkedInAt: new Date(startAt.getTime() + (5 + index) * 60_000), method: "self", finalized: true,
    finalizedBy: ids.leader, finalizedAt: endAt })));
}

// ── Flow 8: report campaign and the club's draft (UC38), scheme (UC41), other clubs' evaluations (UC42) ──

async function ensureCampaign(periodCode: string, officerId: Types.ObjectId): Promise<Date> {
  const existing = await findPeriodicCampaign(periodCode);
  if (existing) {
    if (!existing.isOpen || existing.dueAt < now) {
      console.warn(`warning: the ${periodCode} report campaign is closed or past due; reopen it before the live UC38 step`);
    }
    return existing.dueAt;
  }
  const dueAt = later(10 * DAY);
  await mongoPeriodicReportRepository().saveCampaign!(String(officerId), { periodCode, isOpen: true, dueAt,
    announcement: `Các CLB nộp báo cáo hoạt động ${periodCode} trước hạn. Danh sách thành viên và sự kiện đã được hệ thống điền sẵn; `
      + "CLB kiểm tra, bổ sung minh chứng và kế hoạch kỳ tới.",
    customFields: [{ id: "next_plan", label: "Kế hoạch hoạt động kỳ tới", type: "text", required: true,
      description: "Các hoạt động chính, thời gian dự kiến và người phụ trách." }] }, new Date(now.getTime() - 3 * DAY));
  return dueAt;
}

async function ensureReportDraft(clubId: Types.ObjectId, leaderId: Types.ObjectId, periodCode: string, dueAt: Date): Promise<void> {
  if (await m.periodicReports!.exists({ clubId, periodCode })) return;
  const repo = mongoClubPeriodicReportRepository();
  const created = await repo.create(String(clubId), periodCode, dueAt, String(leaderId), now);
  const system = created.systemData ?? { members: [], events: [] };
  const scores = [9.5, 9, 8.5, 8, 8];
  await repo.save(String(clubId), created.id, created.revision ?? 0, {
    members: system.members.map((member, index) => ({ ...member, activityScore: scores[index] ?? 8 })),
    events: [
      ...system.events.map((event) => ({ ...event, evidenceUrl: "https://drive.google.com/drive/folders/1p5DemoNgayHoiLapTrinh2026",
        evidenceNote: "Ảnh hoạt động và danh sách điểm danh" })),
      { title: "Workshop Git & GitHub cho thành viên mới", heldAt: "2026-10-10", participantCount: 18, source: "MANUAL" as const,
        description: "Hướng dẫn quản lý mã nguồn, tạo pull request và làm việc nhóm trên GitHub.",
        evidenceUrl: "https://drive.google.com/drive/folders/1p5DemoWorkshopGit2026" },
    ],
    achievements: [{ title: "Giải khuyến khích Hackathon sinh viên Hà Nội 2026",
      description: "Đội 3 thành viên của CLB đạt giải với ứng dụng hỗ trợ tìm phòng tự học.",
      evidenceUrl: "https://drive.google.com/file/d/1p5DemoGiayChungNhan2026/view" }],
    customAnswers: [],
  }, String(leaderId), later(1));
}

/** UC38 through the real repository, so the report reaches ICPDP exactly as a leader's submission would. */
async function submitReportDraft(clubId: Types.ObjectId, leaderId: Types.ObjectId, periodCode: string): Promise<void> {
  const draft = await m.periodicReports!.findOneAndUpdate({ clubId, periodCode, state: "Draft" },
    { $set: { "preloadedFigures.clubData.customAnswers": [{ fieldId: "next_plan", type: "text",
      textValue: "Tháng 12: workshop Docker nâng cao. Tháng 1: tuyển thành viên kỳ Spring. Phụ trách: Ban chủ nhiệm." }] } },
    { new: true }).select("__v").lean();
  if (!draft) return;
  await mongoClubPeriodicReportRepository().submit(String(clubId), String(draft._id), Number(draft.__v ?? 0), String(leaderId), now);
}

async function ensureScheme(periodCode: string, officerId: Types.ObjectId) {
  const schemes = mongoEvaluationSchemeRepository();
  const active = (await schemes.list()).find((scheme) => scheme.periodCode === periodCode && scheme.state === "Active");
  if (active) return active;
  const draft = await schemes.createDraft(periodCode, DEFAULT_SCHEME_SETTINGS, String(officerId), new Date(now.getTime() - 7 * DAY));
  return schemes.activate(draft.id, String(officerId), new Date(now.getTime() - 7 * DAY));
}

/**
 * An Accepted report for every other club, so its Finalized evaluation rests on a reviewed report (UC39 before UC42).
 * Inserted directly: UC38 would need each club's own leader. A club that already has a report is left alone.
 */
async function ensureOtherReports(clubIds: string[], periodCode: string, officerId: Types.ObjectId, dueAt: Date): Promise<void> {
  const submittedAt = new Date(now.getTime() - 2 * DAY);
  for (const id of clubIds) {
    const club = new Types.ObjectId(id);
    if (await m.periodicReports!.exists({ clubId: club, periodCode })) continue;
    await m.periodicReports!.create({ clubId: club, periodCode, periodType: "SEMESTER",
      preloadedFigures: { capturedAt: submittedAt },
      narrative: `Báo cáo hoạt động ${periodCode} của CLB.`, nextPlan: "Tiếp tục kế hoạch hoạt động kỳ sau.",
      evidence: [], state: "Accepted", versionNo: 1, lateFlag: false, submittedBy: officerId, submittedAt, dueAt,
      decisionOutcome: "Accept", decidedBy: officerId, decidedAt: new Date(submittedAt.getTime() + DAY) });
  }
}

/** Every other club is already Finalized, so the live demo only generates, finalizes and publishes its own club. */
async function ensureOtherEvaluations(clubId: Types.ObjectId, officerId: Types.ObjectId, dueAt: Date) {
  const { period, minRespondents } = await currentPeriod();
  const scheme = await ensureScheme(period.code, officerId);
  const repo = mongoEvaluationRepository();
  const done = new Set((await repo.latest(period.code)).map((item) => item.clubId));
  const others = (await repo.clubsInScope()).filter((club) => club.id !== String(clubId));
  await ensureOtherReports(others.map((club) => club.id), period.code, officerId, dueAt);
  const clubs = others.filter((club) => !done.has(club.id));
  const at = new Date(now.getTime() - 3_600_000);
  for (const club of clubs) {
    const results = scoreDimensions(await repo.collectMetrics(club.id, period, at), scheme, period.code, minRespondents);
    const id = await repo.writeDraft({ clubId: club.id, periodCode: period.code, scheme, target: { kind: "new" }, results },
      String(officerId), at);
    const draft = (await repo.find(id))!;
    await repo.finalize(id, totalOf(draft.dimensions, draft.thresholds), String(officerId), at);
  }
  const pending = await repo.unreviewedReports(period.code);
  if (pending.some((club) => club.clubId !== String(clubId))) {
    console.warn(`warning: ${period.code} reports still waiting for UC39 block UC42: ${pending.map((club) => club.clubName).join(", ")}`);
  }
  return { scheme: `v${scheme.version} ${scheme.state}`, finalizedNow: clubs.length };
}

try {
  const config = loadConfig();
  await mongoose.connect(config.MONGO_URI);
  const ids = Object.fromEntries(await Promise.all(Object.entries(cast).map(async ([key, person]) =>
    [key, await user(person)] as const))) as Ids;
  await officerRole(ids.officer);
  const clubId = await ensureClub(ids);
  const { period } = await currentPeriod();
  await ensureFinance(clubId, ids, period.code);
  const dueAt = await ensureCampaign(period.code, ids.officer);
  await ensureReportDraft(clubId, ids.leader, period.code, dueAt);
  if (process.argv.includes("--report-submitted")) await submitReportDraft(clubId, ids.leader, period.code);
  const evaluations = await ensureOtherEvaluations(clubId, ids.officer, dueAt);

  const event = await m.events!.findOne({ clubId, title: EVENT_TITLE }).select("_id").lean();
  const budget = event && await m.eventBudgets!.findOne({ eventId: event._id }).lean();
  const report = await m.periodicReports!.findOne({ clubId, periodCode: period.code }).select("state").lean();
  console.log(JSON.stringify({ club: String(clubId), period: period.code, budget: budget && String(budget._id),
    items: ((budget?.sponsoredItems ?? []) as { category: string; status: string }[]).map((item) => `${item.category}: ${item.status}`),
    report: report && `${String(report._id)} ${String(report.state)}`, evaluations }, null, 2));
} catch (error) {
  console.error("presenter 5 seed failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
