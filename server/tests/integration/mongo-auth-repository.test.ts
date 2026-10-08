import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { GoogleIdentity } from "../../src/domain/google-identity.js";
import type { SessionService } from "../../src/domain/session.js";
import { mongoAccountAdminRepository } from "../../src/infra/db/mongo-account-admin-repository.js";
import { mongoAuthRepository } from "../../src/infra/db/mongo-auth-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import { changeSystemRole, setAccountLock } from "../../src/usecase/account-admin.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-auth-test-${process.pid}`;
const now = new Date("2026-10-08T00:00:00Z");
const identity: GoogleIdentity = {
  subject: "google-subject",
  email: "student@fpt.edu.vn",
  emailVerified: true,
  displayName: "Student One",
};

describe.skipIf(!uri)("Mongo auth repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  beforeEach(async () => {
    for (const model of Object.values(ucmsModels)) {
      await model.deleteMany({});
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("creates one user and profile for concurrent first logins, then syncs profile fields", async () => {
    const repo = mongoAuthRepository("fpt.edu.vn");

    const [first, second] = await Promise.all([
      repo.findOrCreateGoogleUser(identity, identity.email, now),
      repo.findOrCreateGoogleUser(identity, identity.email, now),
    ]);

    expect(first.id).toBe(second.id);
    expect(await ucmsModels.users!.countDocuments({ email: identity.email })).toBe(1);
    expect(await ucmsModels.studentProfiles!.countDocuments({ userId: first.id })).toBe(1);

    const later = new Date("2026-10-09T00:00:00Z");
    const updated = await repo.findOrCreateGoogleUser({
      ...identity,
      displayName: "Student Updated",
      avatarUrl: "https://example.test/avatar.png",
    }, identity.email, later);

    expect(updated).toMatchObject({
      id: first.id,
      displayName: "Student Updated",
      avatarUrl: "https://example.test/avatar.png",
    });
    expect(await ucmsModels.users!.countDocuments({ email: identity.email })).toBe(1);
    expect(await ucmsModels.studentProfiles!.findOne({ userId: first.id }).lean()).toMatchObject({
      fullName: "Student Updated",
      syncedAt: later,
    });
  });

  it("persists UC03 role and lock audits and revokes the affected user's sessions", async () => {
    const actorId = new Types.ObjectId();
    const targetId = new Types.ObjectId();
    const officerRoleId = new Types.ObjectId();
    const attendanceRoleId = new Types.ObjectId();
    await ucmsModels.users!.create([
      { _id: actorId, email: "officer@fpt.edu.vn", displayName: "Officer",
        accountState: "Active", createdAt: now },
      { _id: targetId, email: "target@fpt.edu.vn", displayName: "Target",
        accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.roles!.create([
      { _id: officerRoleId, code: "ICPDP_OFFICER", name: "Officer", scope: "system",
        permissionCodes: [], isSystem: true },
      { _id: attendanceRoleId, code: "ATTENDANCE_UNLOCK", name: "Attendance unlock",
        scope: "system", permissionCodes: [], isSystem: true },
    ]);
    await ucmsModels.userRoleAssignments!.create({
      userId: actorId, roleId: officerRoleId, grantedBy: actorId, grantedAt: now,
    });
    const revokedUsers: string[] = [];
    const sessions: SessionService = {
      async issue() { throw new Error("unused"); },
      async resolve() { return null; },
      async revoke() {},
      async revokeUser(userId) { revokedUsers.push(userId); },
    };
    const repo = mongoAccountAdminRepository();
    const actor = await repo.findUser(actorId.toString());

    await changeSystemRole(repo, sessions, actor, targetId.toString(),
      "ATTENDANCE_UNLOCK", "grant", undefined, now);
    await setAccountLock(repo, sessions, actor, targetId.toString(), true,
      "manual review", now);

    expect(await repo.systemRoles(targetId.toString())).toContain("ATTENDANCE_UNLOCK");
    expect(await repo.findUser(targetId.toString())).toMatchObject({
      accountState: "Locked",
      lockReason: "manual review",
    });
    expect(revokedUsers).toEqual([targetId.toString(), targetId.toString()]);
    expect(await ucmsModels.auditLogs!.find({ entityId: targetId }).sort({ at: 1 }).lean())
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ action: "SYSTEM_ROLE_GRANTED", actorId, entityId: targetId }),
        expect.objectContaining({ action: "ACCOUNT_LOCKED", actorId, entityId: targetId,
          reason: "manual review" }),
      ]));
  });
});
