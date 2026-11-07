import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { upgradeClubRoles } from "../../src/infra/db/club-role-upgrade.js";
import { roleSnapshot } from "../../src/infra/db/mongo-leadership-transition-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-role-upgrade-test-${process.pid}`;
const now = new Date("2026-11-07T00:00:00Z");

describe.skipIf(!uri)("club role upgrade (BR55 migration)", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("cleans role codes, appends one MIGRATION version and is a no-op on rerun", async () => {
    const clubId = new Types.ObjectId();
    const officer = new Types.ObjectId();
    const base = { clubId, isActive: true, isDefaultMemberRole: false, isSingleHolder: true };
    const docs = await m.clubPositions!.create([
      { ...base, code: "CLUB_LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true, permissionCodes: ["club.event.manage"] },
      { ...base, code: "VICE_LEADER", name: "Phó chủ nhiệm", isBoardSeat: true, isLeaderRole: false, permissionCodes: ["club.member.manage"] },
      { ...base, code: "HEAD", name: "Trưởng ban", isBoardSeat: true, isLeaderRole: false,
        permissionCodes: ["club.event.manage", "club.transition.plan"] },
      { ...base, code: "TREASURER", name: "Thủ quỹ", isBoardSeat: false, isLeaderRole: false,
        permissionCodes: ["club.expense.record", "club.role.manage", "not.a.code"] },
      { ...base, code: "MEMBERS", name: "Thành viên", isBoardSeat: false, isLeaderRole: false, isDefaultMemberRole: true,
        isSingleHolder: false, permissionCodes: ["club.feedback.view"] },
    ]);
    await m.clubRoleStructureVersions!.create({ clubId, versionNo: 1, effectiveFrom: now, source: "APPLICATION",
      roles: docs.map((doc) => roleSnapshot(doc.toObject())), createdBy: officer, createdAt: now });

    expect(await upgradeClubRoles(now)).toEqual({ clubs: 1, roles: 5, skippedClubIds: [] });
    const codes = Object.fromEntries((await m.clubPositions!.find({ clubId }).lean())
      .map((doc) => [String(doc.code), doc.permissionCodes]));
    expect(codes).toEqual({ CLUB_LEADER: [], VICE_LEADER: [], HEAD: ["club.event.manage"],
      TREASURER: ["club.expense.record"], MEMBERS: [] });
    const versions = await m.clubRoleStructureVersions!.find({ clubId }).sort({ versionNo: 1 }).lean();
    expect(versions.map((item) => [item.versionNo, item.source])).toEqual([[1, "APPLICATION"], [2, "MIGRATION"]]);
    expect(await m.auditLogs!.countDocuments({ action: "CLUB_ROLE_STRUCTURE_MIGRATED", entityId: clubId })).toBe(1);

    expect(await upgradeClubRoles(now)).toEqual({ clubs: 0, roles: 0, skippedClubIds: [] });
    expect(await m.clubRoleStructureVersions!.countDocuments({ clubId })).toBe(2);
    expect(await m.auditLogs!.countDocuments({ action: "CLUB_ROLE_STRUCTURE_MIGRATED", entityId: clubId })).toBe(1);
  });

  it("leaves a club untouched when no version author can be found", async () => {
    const clubId = new Types.ObjectId();
    await m.clubPositions!.create({ clubId, code: "T", name: "Thủ quỹ", isActive: true, isBoardSeat: false, isLeaderRole: false,
      isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: ["club.role.manage"] });
    const result = await upgradeClubRoles(now);
    expect(result.skippedClubIds).toContain(String(clubId));
    expect((await m.clubPositions!.findOne({ clubId }).lean())?.permissionCodes).toEqual(["club.role.manage"]);
    expect(await m.clubRoleStructureVersions!.countDocuments({ clubId })).toBe(0);
  });
});
