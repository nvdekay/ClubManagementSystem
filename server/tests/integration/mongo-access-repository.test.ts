import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveClubPermissions } from "../../src/domain/access.js";
import { mongoAccessRepository } from "../../src/infra/db/mongo-access-repository.js";
import { ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-access-test-${process.pid}`;

describe.skipIf(!uri)("Mongo club access repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("loads only the user's current assignment in the requested club", async () => {
    const now = new Date("2026-10-02T12:00:00Z");
    const clubId = new Types.ObjectId();
    const userId = new Types.ObjectId();
    const otherUserId = new Types.ObjectId();
    const termId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    const membershipId = new Types.ObjectId();
    const otherMembershipId = new Types.ObjectId();
    await ucmsModels.clubs!.create({
      _id: clubId, code: "CLUBA", name: "Club A", field: "Academic",
      state: "Active", createdAt: now,
    });
    await ucmsModels.clubMemberships!.create([
      { _id: membershipId, clubId, userId, state: "Active", joinedAt: now, statusHistory: [] },
      { _id: otherMembershipId, clubId, userId: otherUserId, state: "Active", joinedAt: now, statusHistory: [] },
    ]);
    await ucmsModels.clubTerms!.create({
      _id: termId, clubId, name: "2026", state: "Active",
      startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01"),
    });
    await ucmsModels.clubPositions!.create({
      _id: positionId, clubId, code: "EVENT", name: "Event coordinator",
      isBoardSeat: false, isLeaderRole: false, isDefaultMemberRole: false,
      isSingleHolder: false, permissionCodes: ["club.event.manage"], isActive: true,
    });
    await ucmsModels.clubPositionAssignments!.create([
      {
        clubId, termId, positionId, membershipId,
        effectiveFrom: new Date("2026-01-01"), assignedBy: userId,
      },
      {
        clubId, termId, positionId, membershipId: otherMembershipId,
        effectiveFrom: new Date("2026-01-01"), assignedBy: userId,
      },
    ]);

    const repo = mongoAccessRepository();
    const own = await repo.findSnapshot(userId.toString(), clubId.toString());
    expect(own).not.toBeNull();
    expect(own?.assignments).toHaveLength(1);
    expect(resolveClubPermissions(own!, now)).toEqual(["club.event.manage"]);
    expect(await repo.findSnapshot(userId.toString(), new Types.ObjectId().toString())).toBeNull();
  });
});
