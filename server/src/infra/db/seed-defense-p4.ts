// Defense demo, presenter 4: flow 6 (facilities, UC44-UC47, UC58) and flow 11 (school events, UC53-UC54).
// Creates the facility catalogue and the booking/allocation states the recording starts from; flow 11 needs
// only the cast, because the school event is created live. Additive and safe to run again.
import mongoose, { Types } from "mongoose";
import { BOOKING_SLOTS } from "../../domain/facility-booking.js";
import type { PropertyInput } from "../../domain/property.js";
import { planRoomAllocation } from "../../domain/room-allocation.js";
import { loadConfig } from "../config/index.js";
import { otherClubLeaderUserIds } from "./club-board.js";
import { mongoFacilityBookingRepository } from "./mongo-facility-booking-repository.js";
import { mongoPolicyRepository } from "./mongo-policy-repository.js";
import { mongoPropertyRepository } from "./mongo-property-repository.js";
import { mongoRoomAllocationRepository } from "./mongo-room-allocation-repository.js";
import { DEMO_CLUB_NAME, defenseCast, type CastMember, type CastRole } from "./seed-defense-cast.js";
import { ucmsModels as m } from "./ucms-models.js";

const NEIGHBOUR_CLUB = "FPTU Robotics Club";
const DAY = 86_400_000;
const now = new Date();

/** Vietnam calendar day (YYYY-MM-DD) of the first given ISO weekday at least `minDays` from now. */
function dayAhead(weekday: number, minDays: number): string {
  for (let offset = minDays; ; offset += 1) {
    const local = new Date(now.getTime() + offset * DAY + 7 * 3_600_000);
    if ((local.getUTCDay() || 7) === weekday) return local.toISOString().slice(0, 10);
  }
}
function slotOn(day: string, number: number) {
  const slot = BOOKING_SLOTS.find((item) => item.number === number)!;
  return { startAt: new Date(`${day}T${slot.start}:00+07:00`), endAt: new Date(`${day}T${slot.end}:00+07:00`) };
}
function wholeDay(day: string) {
  return { startAt: new Date(`${day}T00:00:00+07:00`), endAt: new Date(`${day}T23:59:00+07:00`) };
}
function weekdays(days: number[], open = "07:00", close = "18:00") {
  return days.map((day) => ({ day, open, close }));
}

/** Overridden accounts must exist already and are never modified; demo accounts are created when missing. */
async function castUser(role: CastRole, person: CastMember): Promise<Types.ObjectId> {
  const found = await m.users!.findOne({ email: person.email }).lean();
  if (found) return found._id as Types.ObjectId;
  if (person.overridden) throw new Error(`--${role}=${person.email}: no such account; sign in to UCMS with it once, then rerun`);
  const [created] = await m.users!.create([{ email: person.email, displayName: person.name, accountState: "Active", createdAt: now }]);
  return created!._id as Types.ObjectId;
}

async function ensureOfficer(userId: Types.ObjectId, person: CastMember): Promise<void> {
  const role = await m.roles!.findOne({ code: "ICPDP_OFFICER", scope: "system" }).lean();
  if (!role) throw new Error("ICPDP_OFFICER role is missing; start the server once so auth bootstrap creates it");
  if (await m.userRoleAssignments!.exists({ userId, roleId: role._id, revokedAt: null })) return;
  // Roles of a real account are left as they are: the flows need ICPDP_OFFICER, so it must already be there.
  if (person.overridden) throw new Error(`--officer=${person.email} does not hold ICPDP_OFFICER; grant it in the app first`);
  await m.userRoleAssignments!.create({ userId, roleId: role._id, grantedBy: userId, grantedAt: now,
    reason: "defense demo presenter 4" });
}

/** Active membership in this club only; other clubs of the user are never read or changed here. */
async function ensureMembership(clubId: Types.ObjectId, userId: Types.ObjectId, actorId: Types.ObjectId) {
  const found = await m.clubMemberships!.findOne({ clubId, userId }).lean();
  if (found) {
    if (found.state !== "Active") throw new Error(`membership ${String(found._id)} is ${String(found.state)}, not Active`);
    return found._id as Types.ObjectId;
  }
  const [created] = await m.clubMemberships!.create([{ clubId, userId, state: "Active", joinedAt: now, defaultRole: "MEMBERS",
    statusHistory: [{ toState: "Active", reason: "Defense demo cast", actorId, at: now }] }]);
  return created!._id as Types.ObjectId;
}

/** Finds the club by name or creates it Active with an Active term and the standard seats. */
async function ensureClub(name: string, contactEmail: string, officerId: Types.ObjectId): Promise<Types.ObjectId> {
  const found = await m.clubs!.findOne({ name }).lean();
  if (found) {
    if (found.state !== "Active") throw new Error(`club "${name}" is ${String(found.state)}, not Active`);
    return found._id as Types.ObjectId;
  }
  const [club] = await m.clubs!.create([{ code: `CLB-P4-${new Types.ObjectId().toHexString().slice(-8).toUpperCase()}`,
    name, field: "Công nghệ", state: "Active", contactEmail, createdAt: now, updatedAt: now }]);
  const clubId = club!._id as Types.ObjectId;
  await m.clubTerms!.create({ clubId, name: "Founding term", startAt: now,
    endAt: new Date(now.getTime() + 365 * DAY), state: "Active", confirmedBy: officerId, confirmedAt: now });
  const seat = { clubId, permissionCodes: [], isActive: true };
  await m.clubPositions!.create([
    { ...seat, code: "CLUB_LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true },
    { ...seat, code: "VICE_LEADER", name: "Phó chủ nhiệm", isBoardSeat: true, isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: false },
    { ...seat, code: "MEMBERS", name: "Thành viên", isBoardSeat: false, isLeaderRole: false, isDefaultMemberRole: true, isSingleHolder: false },
  ]);
  return clubId;
}

/** Puts the leader in the club's leader seat unless already there; refuses what BR06 or the seat forbids. */
async function ensureLeader(clubId: Types.ObjectId, userId: Types.ObjectId, person: CastMember, officerId: Types.ObjectId) {
  const membershipId = await ensureMembership(clubId, userId, officerId);
  const term = await m.clubTerms!.findOne({ clubId, state: "Active", startAt: { $lte: now }, endAt: { $gt: now } }).lean();
  const seat = await m.clubPositions!.findOne({ clubId, isLeaderRole: true, isActive: true }).lean();
  if (!term || !seat) throw new Error(`club "${DEMO_CLUB_NAME}" has no Active term or leader seat`);
  const holders = await m.clubPositionAssignments!.find({ clubId, termId: term._id, positionId: seat._id, effectiveTo: null }).lean();
  if (holders.some((item) => String(item.membershipId) === String(membershipId))) return;
  if (holders.length) {
    throw new Error(`the leader seat of "${DEMO_CLUB_NAME}" is held by someone else; run every defense seed with the same --leader`);
  }
  await mongoose.connection.transaction(async (session) => {
    const others = await otherClubLeaderUserIds(session, clubId, [membershipId], term.startAt as Date, term.endAt as Date);
    if (others.size) {
      throw new Error(`${person.email} already leads another club in an overlapping term; BR06 allows one club per leader`);
    }
    await m.clubPositionAssignments!.create([{ clubId, termId: term._id, positionId: seat._id, membershipId,
      effectiveFrom: now, assignedBy: officerId, confirmedBy: officerId }], { session });
  });
}

const catalogue: PropertyInput[] = [
  { type: "HALL", name: "Hội trường tầng 5 Alpha", location: "Toà Alpha, tầng 5", capacity: 300,
    equipment: ["Máy chiếu", "Loa", "Micro không dây"], bookableHours: weekdays([1, 2, 3, 4, 5, 6]),
    blackouts: [{ ...wholeDay(dayAhead(6, 28)), reason: "Nhà trường tổ chức lễ tốt nghiệp" }] },
  { type: "OUTDOOR", name: "Sân bóng rổ ngoài trời", location: "Khu thể thao phía Đông", capacity: 200,
    equipment: ["Loa kéo"], bookableHours: weekdays([1, 2, 3, 4, 5, 6, 7]), blackouts: [] },
  { type: "STAGE", name: "Sân khấu di động", location: "Kho thiết bị Toà Delta", capacity: 150,
    equipment: ["Đèn sân khấu"], bookableHours: weekdays([5, 6, 7]), blackouts: [] },
  { type: "EQUIPMENT", name: "Bộ âm thanh lưu động", location: "Kho thiết bị Toà Delta",
    equipment: ["Micro cài áo"], bookableHours: weekdays([1, 2, 3, 4, 5, 6]), blackouts: [] },
  { type: "ROOM", name: "Phòng BE-201", location: "Toà Beta", capacity: 45, equipment: ["Máy chiếu"],
    bookableHours: weekdays([1, 2, 3, 4, 5, 6]),
    blackouts: [{ ...wholeDay(dayAhead(4, 14)), reason: "Bảo trì hệ thống điều hoà" }] },
  { type: "ROOM", name: "Phòng BE-202", location: "Toà Beta", capacity: 45, equipment: ["Máy chiếu"],
    bookableHours: weekdays([1, 2, 3, 4, 5, 6]), blackouts: [] },
];

try {
  const config = loadConfig();
  await mongoose.connect(config.MONGO_URI, { serverSelectionTimeoutMS: 5_000 });

  // Cast: the officer, the leader and an Active member of the demo club (flags may point at real accounts).
  const cast = defenseCast();
  const officer = await castUser("officer", cast.officer);
  await ensureOfficer(officer, cast.officer);
  const leader = await castUser("leader", cast.leader);
  const member = await castUser("member", cast.member);
  const club = { id: await ensureClub(DEMO_CLUB_NAME, cast.leader.email, officer), name: DEMO_CLUB_NAME };
  await ensureLeader(club.id, leader, cast.leader, officer);
  await ensureMembership(club.id, member, officer);
  const neighbour = { id: await ensureClub(NEIGHBOUR_CLUB, "robotics.demo@fpt.edu.vn", officer), name: NEIGHBOUR_CLUB };

  const policy = await mongoPolicyRepository().findEffective(now);
  const semester = policy?.academicCalendar.find((item) => item.startAt <= now && now < item.endAt);
  if (!policy || !semester || semester.endAt.getTime() - now.getTime() < 21 * DAY) {
    throw new Error("the effective policy needs a semester that runs at least three more weeks");
  }

  // UC44: the catalogue, keyed on the property name.
  const propertyRepo = mongoPropertyRepository();
  const ids: Record<string, string> = {};
  for (const input of catalogue) {
    const found = await m.properties!.findOne({ name: input.name }).lean();
    ids[input.name] = found ? String(found._id) : (await propertyRepo.create(input, String(officer), now)).id;
  }

  // UC45-UC47: a draft the leader submits live, and an approved booking the leader cancels live.
  const bookings = mongoFacilityBookingRepository();
  async function booking(purpose: string, input: Omit<Parameters<typeof bookings.create>[1], "purpose">, approve: boolean) {
    const found = await m.propertyBookings!.findOne({ clubId: club.id, purpose }).lean();
    if (found) return `${purpose}: ${String(found.state)} (kept)`;
    let detail = await bookings.create(String(club.id), { ...input, purpose }, String(leader), now);
    if (approve) {
      const id = detail.booking.id;
      await bookings.submit(id, String(club.id), 0, String(leader), now);
      await bookings.claim(id, String(officer), now);
      detail = await bookings.decide(id, String(officer), { outcome: "Approve",
        reason: "Sân trống, CLB đang hoạt động, mục đích phù hợp." }, now);
    }
    return `${purpose}: ${detail.booking.state}`;
  }
  const results = [
    await booking("Workshop Git và GitHub cho tân thành viên", { propertyId: ids["Hội trường tầng 5 Alpha"]!,
      ...slotOn(dayAhead(3, 4), 3), headcount: 120, equipment: ["Máy chiếu", "Micro không dây"] }, false),
    await booking("Giao lưu thể thao với CLB bạn", { propertyId: ids["Sân bóng rổ ngoài trời"]!,
      ...slotOn(dayAhead(5, 6), 4), headcount: 60, equipment: [] }, true),
  ];

  // UC58: another club already holds Tuesday slot 3 of BE-201, so the grid shows a taken cell.
  const rooms = mongoRoomAllocationRepository();
  const roomId = ids["Phòng BE-201"]!;
  if (!(await m.auditLogs!.exists({ entityType: "RoomAllocation", action: "ROOM_ALLOCATED",
    "after.clubId": String(neighbour.id), "after.propertyId": roomId }))) {
    const plan = planRoomAllocation({ semesterCode: semester.code, clubId: String(neighbour.id), propertyId: roomId,
      weekday: 2, slot: 3, note: "Sinh hoạt nhóm robot" }, await propertyRepo.find(roomId), await rooms.club(String(neighbour.id)),
    policy.academicCalendar, now);
    await rooms.allocate(plan, neighbour.name, policy.conflictThresholdMinutes, String(officer), now);
  }

  console.log(JSON.stringify({ club: String(club.id), semester: semester.code, properties: ids, bookings: results }, null, 2));
} catch (error) {
  console.error("defense p4 seed failed:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
