import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoMemberSpaceRepository } from "../../src/infra/db/mongo-member-space-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-member-space-test-${process.pid}`;

describe.skipIf(!uri)("Mongo member space repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("assembles membership, positions, roster without emails, events, attendance and other clubs", async () => {
    const now = new Date("2026-10-10T12:00:00Z");
    const [clubId, otherClub, termId, boardSeat, me, peer, myMembership, peerMembership, upcoming, past]
      = Array.from({ length: 10 }, () => new Types.ObjectId());
    await ucmsModels.clubs!.insertMany([
      { _id: clubId, code: "CLB-SPACE", name: "Space Club", field: "Arts", state: "Active", createdAt: now },
      { _id: otherClub, code: "CLB-OTHER", name: "Other Club", field: "Arts", state: "Active", createdAt: now },
    ]);
    await ucmsModels.users!.insertMany([
      { _id: me, email: "me@example.edu", displayName: "Me", accountState: "Active", createdAt: now },
      { _id: peer, email: "peer@example.edu", displayName: "Peer", accountState: "Active", createdAt: now },
    ]);
    await ucmsModels.clubMemberships!.insertMany([
      { _id: myMembership, clubId, userId: me, state: "Active", joinedAt: now, statusHistory: [] },
      { _id: peerMembership, clubId, userId: peer, state: "Inactive", joinedAt: now, statusHistory: [] },
      { clubId: otherClub, userId: me, state: "Active", joinedAt: now, statusHistory: [] },
    ]);
    await ucmsModels.clubTerms!.create({ _id: termId, clubId, name: "2026", state: "Active",
      startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") });
    await ucmsModels.clubPositions!.create({ _id: boardSeat, clubId, code: "TREASURER", name: "Treasurer",
      isBoardSeat: true, isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: true,
      permissionCodes: [], isActive: true });
    await ucmsModels.clubPositionAssignments!.create({ clubId, termId, positionId: boardSeat,
      membershipId: myMembership, effectiveFrom: new Date("2026-01-01"), assignedBy: peer, confirmedBy: peer });
    const base = { organizerType: "CLUB", clubId, clubName: "Space Club", semesterCode: "FA26", audienceScope: "PUBLIC",
      capacity: 10, confirmedRegistrationCount: 0, nextWaitlistPosition: 1, waitlistEnabled: false, allowWalkIn: false,
      currentRevisionNo: 1, publishedAt: now, attendanceFinalized: false, createdAt: now };
    await ucmsModels.events!.insertMany([
      { ...base, _id: upcoming, title: "Next meetup", state: "Upcoming",
        startAt: new Date("2026-10-20T10:00:00Z"), endAt: new Date("2026-10-20T12:00:00Z") },
      { ...base, _id: past, title: "Last meetup", state: "Completed",
        startAt: new Date("2026-10-01T10:00:00Z"), endAt: new Date("2026-10-01T12:00:00Z") },
    ]);
    await ucmsModels.eventRegistrations!.create({ eventId: upcoming, studentId: me, clubId, state: "Waitlisted",
      waitlistPosition: 1, answers: {}, createdAt: now });
    await ucmsModels.attendances!.create({ eventId: past, studentId: me, clubId, checkedInAt: new Date("2026-10-01T10:05:00Z"),
      method: "self", abnormalFlags: [], finalized: false });

    const space = await mongoMemberSpaceRepository().find(me.toString(), clubId.toString(), now);
    expect(space?.membership).toMatchObject({ state: "Active", positions: ["Treasurer"] });
    expect(space?.members).toEqual([
      { displayName: "Me", state: "Active", positions: ["Treasurer"] },
      { displayName: "Peer", state: "Inactive", positions: [] },
    ]);
    expect(JSON.stringify(space?.members)).not.toContain("@example.edu");
    expect(space?.board).toEqual([{ positionName: "Treasurer", memberName: "Me" }]);
    expect(space?.upcomingEvents).toEqual([expect.objectContaining({ title: "Next meetup", registrationState: "Waitlisted" })]);
    expect(space?.attendance).toEqual([expect.objectContaining({ eventTitle: "Last meetup", feedbackSubmitted: false })]);
    expect(space?.otherClubs).toEqual([{ clubId: otherClub.toString(), clubName: "Other Club", state: "Active" }]);
    expect(await mongoMemberSpaceRepository().find(new Types.ObjectId().toString(), clubId.toString(), now)).toBeNull();
  });
});
