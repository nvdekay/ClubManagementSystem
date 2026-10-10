import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoAccessRepository } from "../../src/infra/db/mongo-access-repository.js";
import { mongoClubRoleRepository } from "../../src/infra/db/mongo-club-role-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import { resolveClubPermissions } from "../../src/domain/access.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-club-role-test-${process.pid}`;

describe.skipIf(!uri)("Mongo club role repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("versions every structural change, audits, notifies and applies permissions live", async () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const clubId = new Types.ObjectId();
    const leaderId = new Types.ObjectId();
    const studentId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-UC23", name: "UC23 Club", field: "Technology",
      state: "Active", createdAt: now });
    await ucmsModels.users!.create({ _id: studentId, email: "student@example.edu", displayName: "Student",
      accountState: "Active", createdAt: now });
    const [term] = await ucmsModels.clubTerms!.create([{ clubId, name: "Term", startAt: new Date("2026-09-01"),
      endAt: new Date("2027-09-01"), state: "Active" }]);
    const [membership] = await ucmsModels.clubMemberships!.create([{ clubId, userId: studentId, state: "Active",
      joinedAt: now, statusHistory: [] }]);
    await ucmsModels.clubRoleStructureVersions!.create({ clubId, versionNo: 1, effectiveFrom: now,
      source: "APPLICATION", roles: [], createdBy: leaderId, createdAt: now });

    const repo = mongoClubRoleRepository();
    const club = clubId.toString();
    await repo.createRole(club, leaderId.toString(), { name: "Thủ quỹ", isSingleHolder: true,
      permissionCodes: ["club.expense.record"] }, now);
    let overview = (await repo.overview(club, now))!;
    const role = overview.roles.find((item) => item.name === "Thủ quỹ")!;
    expect(role).toMatchObject({ isBoardSeat: false, isActive: true, holders: [] });
    expect(overview.activeTermId).toBe(String(term!._id));
    expect(overview.versions.map((item) => item.versionNo)).toEqual([2, 1]);
    expect(overview.versions[0]!.roles).toEqual([expect.objectContaining({ positionId: role.id, name: "Thủ quỹ" })]);

    await repo.assign(club, role.id, String(term!._id), leaderId.toString(),
      { membershipId: String(membership!._id), effectiveFrom: now }, now);
    overview = (await repo.overview(club, now))!;
    const held = overview.roles.find((item) => item.id === role.id)!.holders;
    expect(held).toEqual([expect.objectContaining({ displayName: "Student", membershipId: String(membership!._id) })]);
    await expect(repo.assign(club, role.id, String(term!._id), leaderId.toString(),
      { membershipId: String(membership!._id), effectiveFrom: now }, now)).rejects.toMatchObject({ kind: "conflict" });

    const later = new Date(now.getTime() + 1_000);
    const access = mongoAccessRepository();
    expect(resolveClubPermissions((await access.findSnapshot(studentId.toString(), club))!, later))
      .toEqual(["club.expense.record"]);
    await repo.updateRole(club, role.id, leaderId.toString(), { name: "Thủ quỹ", isSingleHolder: true,
      permissionCodes: ["club.report.submit"], reason: "Đổi quyền" }, later);
    expect(resolveClubPermissions((await access.findSnapshot(studentId.toString(), club))!, later))
      .toEqual(["club.report.submit"]);
    const updatedAudit = await ucmsModels.auditLogs!.findOne({ entityId: new Types.ObjectId(role.id),
      action: "CLUB_ROLE_UPDATED" }).lean();
    expect(updatedAudit).toMatchObject({ before: { permissionCodes: ["club.expense.record"] },
      after: { permissionCodes: ["club.report.submit"], versionNo: 3 }, reason: "Đổi quyền" });

    await expect(repo.deactivateRole(club, role.id, leaderId.toString(), later))
      .rejects.toMatchObject({ kind: "conflict" });
    await repo.revoke(club, role.id, held[0]!.assignmentId, leaderId.toString(), later);
    expect(resolveClubPermissions((await access.findSnapshot(studentId.toString(), club))!, later)).toEqual([]);
    await repo.deactivateRole(club, role.id, leaderId.toString(), later);

    overview = (await repo.overview(club, later))!;
    expect(overview.roles).toEqual([]);
    expect(overview.versions.map((item) => item.versionNo)).toEqual([4, 3, 2, 1]);
    expect(await ucmsModels.notifications!.find({ recipientUserId: studentId }).distinct("eventCode"))
      .toEqual(expect.arrayContaining(["CLUB_ROLE_ASSIGNED", "CLUB_ROLE_REVOKED"]));
    expect(await ucmsModels.auditLogs!.countDocuments({ action: { $regex: /^CLUB_ROLE_/ } })).toBe(5);
  }, 60_000);

  it("drops a revoked future-dated assignment from the holders at once (A2, E2, E4)", async () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const clubId = new Types.ObjectId();
    const leaderId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-UC23-FUT", name: "UC23 Future", field: "Technology",
      state: "Active", createdAt: now });
    const [term] = await ucmsModels.clubTerms!.create([{ clubId, name: "Term", startAt: new Date("2026-09-01"),
      endAt: new Date("2027-09-01"), state: "Active" }]);
    const [first, second] = await ucmsModels.clubMemberships!.create([
      { clubId, userId: new Types.ObjectId(), state: "Active", joinedAt: now, statusHistory: [] },
      { clubId, userId: new Types.ObjectId(), state: "Active", joinedAt: now, statusHistory: [] },
    ]);
    const repo = mongoClubRoleRepository();
    const club = clubId.toString();
    await repo.createRole(club, leaderId.toString(), { name: "Hậu cần", isSingleHolder: true,
      permissionCodes: ["club.booking.manage"] }, now);
    const role = (await repo.overview(club, now))!.roles.find((item) => item.name === "Hậu cần")!;
    await repo.assign(club, role.id, String(term!._id), leaderId.toString(),
      { membershipId: String(first!._id), effectiveFrom: new Date("2026-11-01T00:00:00Z") }, now);
    const [future] = (await repo.overview(club, now))!.roles.find((item) => item.id === role.id)!.holders;
    await repo.revoke(club, role.id, future!.assignmentId, leaderId.toString(), now);

    expect((await repo.overview(club, now))!.roles.find((item) => item.id === role.id)!.holders).toEqual([]);
    await repo.assign(club, role.id, String(term!._id), leaderId.toString(),
      { membershipId: String(second!._id), effectiveFrom: now }, now);
    const [current] = (await repo.overview(club, now))!.roles.find((item) => item.id === role.id)!.holders;
    expect(current).toMatchObject({ membershipId: String(second!._id) });
    await repo.revoke(club, role.id, current!.assignmentId, leaderId.toString(), now);
    await expect(repo.deactivateRole(club, role.id, leaderId.toString(), now)).resolves.toBeUndefined();
  }, 60_000);
});
