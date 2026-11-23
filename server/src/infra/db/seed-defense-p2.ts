// Dữ liệu demo bảo vệ cho người trình bày 2: luồng 4 (UC10-UC13, ban chủ nhiệm và chuyển giao lãnh đạo) và
// luồng 10 (UC14-UC15, đình chỉ, kích hoạt lại, giải thể) trên CLB demo dùng chung.
// Dàn nhân vật lấy từ seed-defense-cast.ts (tài khoản demo, hoặc tài khoản thật qua --leader= v.v.).
// Chỉ thêm và chạy lại an toàn, kể cả sau seed của các người trình bày khác: mỗi phần đều khoá theo
// dàn nhân vật, tên CLB và các tiêu đề cố định, và dùng lại những gì đã có.
import mongoose, { Types } from "mongoose";
import { createPolicyVersion } from "../../usecase/policy.js";
import { writeClubTransition } from "../../usecase/club-transition-plan.js";
import { loadConfig } from "../config/index.js";
import { mongoAccessRepository } from "./mongo-access-repository.js";
import { mongoAuthRepository } from "./mongo-auth-repository.js";
import { mongoClubTransitionPlanRepository } from "./mongo-club-transition-plan-repository.js";
import { mongoPolicyRepository } from "./mongo-policy-repository.js";
import { DEMO_CLUB_NAME, defenseCast, type CastMember, type CastRole } from "./seed-defense-cast.js";
import { ucmsModels as m } from "./ucms-models.js";

type Ids = Record<CastRole, Types.ObjectId>;
const cast = defenseCast();
const UPCOMING_EVENT = "Hackathon Sáng tạo FPTU 2026";
const PAST_EVENT = "Workshop Git & GitHub cho thành viên mới";
const NEW_TERM = "Nhiệm kỳ 2026–2027";
const DAY = 86_400_000;
const VN_OFFSET = 7 * 3_600_000;
const now = new Date();
// Đầu ngày (giờ Việt Nam) cách hôm nay days ngày
/** Nửa đêm của một ngày lịch Việt Nam, `days` ngày sau hôm nay. */
function vnDayStart(days: number): Date {
  return new Date(Math.floor((now.getTime() + VN_OFFSET) / DAY) * DAY + days * DAY - VN_OFFSET);
}

// Lấy hoặc tạo tài khoản người dùng cho một vai demo
/** Tài khoản thật (bị ghi đè) phải đã đăng nhập một lần; tài khoản demo được tạo nếu còn thiếu. */
async function user(person: CastMember): Promise<Types.ObjectId> {
  const found = await m.users!.findOne({ email: person.email }).select("_id").lean();
  if (found) return found._id as Types.ObjectId;
  if (person.overridden) throw new Error(`no account ${person.email}; sign in with it once before seeding`);
  const [created] = await m.users!.create([{ email: person.email, displayName: person.name,
    accountState: "Active", createdAt: now }]);
  return created!._id as Types.ObjectId;
}

// Đảm bảo người dùng có vai trò ICPDP_OFFICER
/** Chỉ cấp ICPDP_OFFICER cho cán bộ demo; cán bộ thật phải đã giữ quyền này. */
async function officerRole(officerId: Types.ObjectId): Promise<void> {
  const role = cast.officer.overridden ? await m.roles!.findOne({ code: "ICPDP_OFFICER", scope: "system" }).lean()
    : await m.roles!.findOneAndUpdate({ code: "ICPDP_OFFICER", scope: "system" },
      { $setOnInsert: { name: "ICPDP OFFICER", isSystem: true, permissionCodes: [] } },
      { upsert: true, new: true }).lean();
  const held = role && await m.userRoleAssignments!.exists({ userId: officerId, roleId: role._id, revokedAt: null });
  if (held) return;
  if (cast.officer.overridden) throw new Error(`${cast.officer.email} does not hold the ICPDP_OFFICER role`);
  await m.userRoleAssignments!.create({ userId: officerId, roleId: role!._id, grantedBy: officerId,
    grantedAt: now, reason: "defense demo (presenter 2)" });
}

/**
 * CLB demo dùng chung (cùng dạng với seed của các người trình bày khác): leader ở ghế Chủ nhiệm,
 * vice ở ghế Phó chủ nhiệm, member và member2 là thành viên thường. CLB đã có thì dùng lại;
 * chỉ thêm các membership còn thiếu của dàn nhân vật.
 */
async function ensureClub(ids: Ids): Promise<Types.ObjectId> {
  const statusHistory = [{ toState: "Active", reason: "defense demo (presenter 2)", actorId: ids.officer, at: now }];
  const roles = ["leader", "vice", "member", "member2"] as const;
  const found = await m.clubs!.findOne({ name: DEMO_CLUB_NAME }).select("_id").lean();
  if (found) {
    const clubId = found._id as Types.ObjectId;
    for (const role of roles) {
      if (!(await m.clubMemberships!.exists({ clubId, userId: ids[role] }))) {
        await m.clubMemberships!.create({ clubId, userId: ids[role], state: "Active", joinedAt: now,
          defaultRole: "MEMBERS", statusHistory });
      }
    }
    return clubId;
  }
  const [club] = await m.clubs!.create([{ code: "CLB-DEMO-P2", name: DEMO_CLUB_NAME, field: "Công nghệ", state: "Active",
    description: "Cộng đồng sinh viên học lập trình và xây dựng sản phẩm công nghệ.",
    contactEmail: cast.leader.email, createdAt: now }]);
  const clubId = club!._id as Types.ObjectId;
  const seats = [
    { code: "CLUB_LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true, isSingleHolder: true, isDefaultMemberRole: false },
    { code: "VICE_LEADER", name: "Phó chủ nhiệm", isBoardSeat: true, isLeaderRole: false, isSingleHolder: false, isDefaultMemberRole: false },
    { code: "MEMBERS", name: "Thành viên", isBoardSeat: false, isLeaderRole: false, isSingleHolder: false, isDefaultMemberRole: true },
  ];
  const positions = await m.clubPositions!.create(seats.map((seat) => ({ ...seat, clubId, permissionCodes: [], isActive: true })));
  const [term] = await m.clubTerms!.create([{ clubId, name: "Founding term", startAt: now,
    endAt: new Date(now.getTime() + 365 * DAY), state: "Active", confirmedBy: ids.officer, confirmedAt: now }]);
  const memberships = await m.clubMemberships!.create(roles.map((role) => ({
    clubId, userId: ids[role], state: "Active", joinedAt: now, defaultRole: "MEMBERS", statusHistory })));
  await m.clubPositionAssignments!.create([0, 1].map((index) => ({ clubId, termId: term!._id,
    positionId: positions[index]!._id, membershipId: memberships[index]!._id, effectiveFrom: now,
    assignedBy: ids.officer, confirmedBy: ids.officer })));
  return clubId;
}

// Đảm bảo có học kỳ kế tiếp trong policy, trả về mã học kỳ
/** UC15 cần một học kỳ sau hôm nay để lên lịch giải thể; được thêm qua usecase UC04. */
async function ensureNextSemester(officerId: Types.ObjectId, config: { ALLOWED_DOMAIN?: string }): Promise<string> {
  const policies = mongoPolicyRepository();
  const current = await policies.findEffective(now);
  if (!current) throw new Error("no effective policy; run `npm run seed` first");
  const later = current.academicCalendar.find((semester) => semester.startAt > now);
  if (later) return later.code;
  const lastEnd = Math.max(now.getTime(), ...current.academicCalendar.map((semester) => semester.endAt.getTime()));
  const startAt = new Date(lastEnd + 1000);
  const endAt = new Date(startAt.getTime() + 120 * DAY - 1000);
  const vnStart = new Date(startAt.getTime() + VN_OFFSET);
  const month = vnStart.getUTCMonth();
  const code = `${month < 4 ? "Spring" : month < 8 ? "Summer" : "Fall"} ${vnStart.getUTCFullYear()}`;
  const { id: _id, effectiveFrom: _from, createdBy: _by, createdAt: _at, ...settings } = current;
  await createPolicyVersion(policies, mongoAuthRepository(config.ALLOWED_DOMAIN ?? ""), { id: String(officerId), accountState: "Active" },
    { ...settings, academicCalendar: [...current.academicCalendar, { code, startAt, endAt }] },
    undefined, "Bổ sung học kỳ kế tiếp cho lịch năm học (demo bảo vệ)", now);
  return code;
}

// Đảm bảo có các sự kiện demo của CLB
/** Một sự kiện đã duyệt sắp tới (bị huỷ do đình chỉ) và một sự kiện đã qua có ngân sách chưa đối soát. */
async function ensureEvents(clubId: Types.ObjectId): Promise<void> {
  const base = { organizerType: "CLUB", clubId, clubName: DEMO_CLUB_NAME, audienceScope: "PUBLIC", capacity: 120,
    confirmedRegistrationCount: 0, nextWaitlistPosition: 1, waitlistEnabled: false, allowWalkIn: false,
    currentRevisionNo: 1, semesterCode: "Fall 2026", venueText: "Hội trường tòa Alpha" };
  if (!(await m.events!.exists({ clubId, title: UPCOMING_EVENT }))) {
    const startAt = new Date(vnDayStart(12).getTime() + 8 * 3_600_000);
    await m.events!.create({ ...base, title: UPCOMING_EVENT, state: "Approved", startAt,
      endAt: new Date(startAt.getTime() + 9 * 3_600_000), publishedAt: now, attendanceFinalized: false,
      objective: "Thi lập trình sáng tạo theo đội trong một ngày", createdAt: new Date(now.getTime() - 7 * DAY) });
  }
  if (!(await m.events!.exists({ clubId, title: PAST_EVENT }))) {
    const startAt = new Date(vnDayStart(-6).getTime() + 13 * 3_600_000);
    const [event] = await m.events!.create([{ ...base, title: PAST_EVENT, state: "Completed", startAt,
      endAt: new Date(startAt.getTime() + 3 * 3_600_000), publishedAt: new Date(now.getTime() - 20 * DAY),
      attendanceFinalized: true, objective: "Hướng dẫn Git cho thành viên mới", createdAt: new Date(now.getTime() - 20 * DAY) }]);
    const total = Types.Decimal128.fromString("1500000");
    const approvedAt = new Date(now.getTime() - 15 * DAY);
    const endAt = new Date(startAt.getTime() + 3 * 3_600_000);
    await m.eventBudgets!.create({
      eventId: event!._id,
      clubId,
      periodCode: "Fall 2026",
      state: "Approved",
      lines: [
        { category: "In tài liệu", requestedAmount: 800_000, approvedAmount: 800_000, fundingDecision: "BEFORE_EVENT" },
        { category: "Nước uống", requestedAmount: 700_000, approvedAmount: 700_000, fundingDecision: "AFTER_EVENT" },
      ],
      sponsoredItems: [
        {
          id: `${String(event!._id)}-1`,
          category: "In tài liệu",
          requestedAmount: 800_000,
          approvedAmount: 800_000,
          fundingDecision: "BEFORE_EVENT",
          paymentChannel: "VIA_OFFICER_ADVANCE",
          approvedAt: approvedAt.toISOString(),
          eventEndAt: endAt.toISOString(),
          status: "Draft",
          amount: 0,
          description: "",
          images: [],
          advanceAmount: 800_000,
          advancedAt: new Date(now.getTime() - 10 * DAY).toISOString(),
          advanceReceivedAt: new Date(now.getTime() - 9 * DAY).toISOString(),
        },
        {
          id: `${String(event!._id)}-2`,
          category: "Nước uống",
          requestedAmount: 700_000,
          approvedAmount: 700_000,
          fundingDecision: "AFTER_EVENT",
          paymentChannel: "VIA_OFFICER_REIMBURSE",
          approvedAt: approvedAt.toISOString(),
          eventEndAt: endAt.toISOString(),
          status: "Draft",
          amount: 0,
          description: "",
          images: [],
        },
      ],
      requestedTotal: total,
      approvedTotal: total,
      disbursedTotal: Types.Decimal128.fromString("800000"),
      refundedTotal: Types.Decimal128.fromString("0"),
      approvedByDecisionId: new Types.ObjectId(),
      isSettlementLate: false,
      createdAt: approvedAt,
    });
  }
}

/**
 * Bản nháp UC12 do Chủ nhiệm hiện tại lưu qua usecase thật: vice nhận ghế Chủ nhiệm
 * ghế của nhiệm kỳ kế tiếp, thành viên và leader sắp mãn nhiệm thành vice leader, nên leader giữ
 * quyền Club Leader cho luồng 10. Một nghĩa vụ (sự kiện sắp tới) được để lại cho buổi demo trực tiếp.
 */
async function ensureTransitionDraft(clubId: Types.ObjectId, ids: Ids): Promise<void> {
  if (await m.transitionPlans!.exists({ clubId })) return;
  const leaderPosition = await m.clubPositions!.findOne({ clubId, isLeaderRole: true, isActive: true }).lean();
  const leaderAssignment = leaderPosition && await m.clubPositionAssignments!.findOne({ positionId: leaderPosition._id,
    effectiveTo: null }).lean();
  const leaderMembership = leaderAssignment && await m.clubMemberships!.findById(leaderAssignment.membershipId).lean();
  if (!leaderMembership) throw new Error(`${DEMO_CLUB_NAME} has no confirmed Chủ nhiệm`);
  const board = ["vice", "member", "leader"] as const;
  const memberships = await m.clubMemberships!.find({ clubId, state: "Active",
    userId: { $in: board.map((role) => ids[role]) } }).lean();
  const [vice, member, leader] = board.map((role) => {
    const found = memberships.find((item) => String(item.userId) === String(ids[role]));
    if (!found) throw new Error(`${cast[role].email} must be an Active member of ${DEMO_CLUB_NAME}`);
    return String(found._id);
  }) as [string, string, string];
  const past = await m.events!.findOne({ clubId, title: PAST_EVENT }).select("_id").lean();
  const budget = await m.eventBudgets!.findOne({ eventId: past!._id }).select("_id").lean();
  await writeClubTransition(mongoClubTransitionPlanRepository(), mongoAccessRepository(),
    { id: String(leaderMembership.userId), accountState: "Active" }, String(clubId), { input: {
      toTerm: { name: NEW_TERM, startAt: vnDayStart(1), endAt: new Date(vnDayStart(366).getTime() - 1000) },
      earlyReason: "Chủ nhiệm hiện tại chuyển sang làm Phó chủ nhiệm; ban mới tiếp quản sớm để chuẩn bị Hackathon.",
      candidates: [{ positionCode: "CLUB_LEADER", membershipId: vice }, { positionCode: "VICE_LEADER", membershipId: member },
        { positionCode: "VICE_LEADER", membershipId: leader }],
      handoverItems: ["Tài khoản fanpage và email liên hệ của CLB", "Hồ sơ thành viên và biên bản họp ban chủ nhiệm",
        "Hoá đơn, chứng từ của Workshop Git & GitHub"].map((description, index) => ({ id: String(index + 1), description })),
      assignees: { [`EVENT:${String(past!._id)}`]: vice, [`BUDGET:${String(budget!._id)}`]: member },
    } }, now);
}

try {
  const config = loadConfig();
  await mongoose.connect(config.MONGO_URI);
  const ids = Object.fromEntries(await Promise.all(Object.entries(cast)
    .map(async ([key, person]) => [key, await user(person)]))) as Ids;
  await officerRole(ids.officer);
  const clubId = await ensureClub(ids);
  const semester = await ensureNextSemester(ids.officer, config);
  await ensureEvents(clubId);
  await ensureTransitionDraft(clubId, ids);
  const plan = await m.transitionPlans!.findOne({ clubId }).sort({ _id: -1 }).lean();
  console.log(JSON.stringify({ clubId: String(clubId), nextSemester: semester,
    transitionPlan: plan ? `${String(plan._id)} (${String(plan.state)})` : null }, null, 2));
} catch (error) {
  console.error("presenter 2 defense seed failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
