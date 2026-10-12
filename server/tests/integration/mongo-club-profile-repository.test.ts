import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoClubProfileRepository } from "../../src/infra/db/mongo-club-profile-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-club-profile-test-${process.pid}`;

describe.skipIf(!uri)("Mongo club profile repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("updates only club-owned fields and applies the starter template idempotently", async () => {
    const clubId = new Types.ObjectId();
    const actorId = new Types.ObjectId();
    const now = new Date("2026-10-08T12:00:00Z");
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-UC09", name: "UC09 Club",
      field: "Technology", state: "Pending Setup", institutionalFields: { owner: "ICPDP" },
      createdAt: now });
    const repo = mongoClubProfileRepository();
    const updated = await repo.updateProfile(clubId.toString(), actorId.toString(), {
      description: "Operating profile", contactEmail: "club@example.edu", channels: [{
        label: "Website", url: "https://example.edu/",
      }], operatingScope: "Campus",
    }, now);
    expect(updated).toMatchObject({ description: "Operating profile",
      institutionalFields: { owner: "ICPDP" }, state: "Pending Setup" });

    const template = [
      { name: "Ban Chủ nhiệm", sortOrder: 10 },
      { name: "Ban Sự kiện", sortOrder: 20 },
    ];
    expect(await repo.applyDepartmentTemplate(clubId.toString(), actorId.toString(), template, now))
      .toHaveLength(2);
    expect(await repo.applyDepartmentTemplate(clubId.toString(), actorId.toString(), [
      { name: "Must not overwrite", sortOrder: 1 },
    ], now)).toHaveLength(2);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: clubId,
      action: "CLUB_DEPARTMENT_TEMPLATE_APPLIED" })).toBe(1);
  });

  it("enforces case-insensitive names and protects departments still in use", async () => {
    const clubId = new Types.ObjectId();
    const actorId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const now = new Date("2026-10-08T13:00:00Z");
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-GUARD", name: "Guard Club",
      field: "Community", state: "Pending Setup", createdAt: now });
    const repo = mongoClubProfileRepository();
    const department = await repo.createDepartment(clubId.toString(), actorId.toString(), {
      name: "Ban Truyền thông", description: "Media", sortOrder: 10,
    }, now);
    await expect(repo.createDepartment(clubId.toString(), actorId.toString(), {
      name: "  BAN TRUYỀN THÔNG  ", sortOrder: 20,
    }, now)).rejects.toMatchObject({ kind: "conflict" });

    const position = await ucmsModels.clubPositions!.create({ clubId, code: "MEDIA",
      name: "Media", unit: department.name, isBoardSeat: false, isLeaderRole: false,
      isDefaultMemberRole: false, isSingleHolder: false,
      permissionCodes: [], isActive: true });
    await expect(repo.deactivateDepartment(clubId.toString(), department.id,
      actorId.toString(), now)).rejects.toMatchObject({ kind: "conflict" });
    await ucmsModels.clubPositions!.updateOne({ _id: position._id }, { $set: { isActive: false } });
    const membership = await ucmsModels.clubMemberships!.create({ clubId, userId,
      departmentId: new Types.ObjectId(department.id), state: "Active", joinedAt: now,
      statusHistory: [] });
    await expect(repo.deactivateDepartment(clubId.toString(), department.id,
      actorId.toString(), now)).rejects.toMatchObject({ kind: "conflict" });
    await ucmsModels.clubMemberships!.updateOne({ _id: membership._id }, { $set: { state: "Left" } });
    await expect(repo.deactivateDepartment(clubId.toString(), department.id,
      actorId.toString(), now)).resolves.toMatchObject({ isActive: false });
  }, 60_000);
});
