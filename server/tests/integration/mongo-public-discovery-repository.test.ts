import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoPublicDiscoveryRepository } from "../../src/infra/db/mongo-public-discovery-repository.js";
import { ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-discovery-test-${process.pid}`;
const now = new Date("2026-10-03T12:00:00Z");

describe.skipIf(!uri)("Mongo public discovery repository", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("filters public clubs, campaigns, board seats and upcoming events", async () => {
    const activeId = new Types.ObjectId();
    const suspendedId = new Types.ObjectId();
    const dissolvedId = new Types.ObjectId();
    await ucmsModels.clubs!.create([
      { _id: activeId, code: "ACADEMIC", name: "Academic [Club]", field: "Academic",
        state: "Active", createdAt: now },
      { _id: suspendedId, code: "PAUSED", name: "Paused Club", field: "Arts",
        state: "Suspended", createdAt: now },
      { _id: dissolvedId, code: "OLD", name: "Old Club", field: "Academic",
        state: "Dissolved", createdAt: now },
    ]);
    const userId = new Types.ObjectId();
    const membershipId = new Types.ObjectId();
    const termId = new Types.ObjectId();
    const positionId = new Types.ObjectId();
    await ucmsModels.users!.create({
      _id: userId, email: "board@fpt.edu.vn", displayName: "Board member",
      accountState: "Active", createdAt: now,
    });
    await ucmsModels.clubMemberships!.create({
      _id: membershipId, clubId: activeId, userId, state: "Active",
      joinedAt: now, statusHistory: [],
    });
    await ucmsModels.clubTerms!.create({
      _id: termId, clubId: activeId, name: "2026", state: "Active",
      startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01"),
    });
    await ucmsModels.clubPositions!.create({
      _id: positionId, clubId: activeId, code: "LEADER", name: "Leader",
      isBoardSeat: true, isLeaderRole: true, isDefaultMemberRole: false,
      isSingleHolder: true, permissionCodes: [], isActive: true,
    });
    await ucmsModels.clubPositionAssignments!.create({
      clubId: activeId, termId, positionId, membershipId,
      effectiveFrom: new Date("2026-01-01"), assignedBy: userId, confirmedBy: userId,
    });
    await ucmsModels.recruitmentCampaigns!.create([
      { clubId: activeId, title: "Autumn intake", positions: [], formSchema: {},
        windowStart: new Date("2026-10-01"), windowEnd: new Date("2026-10-10"),
        capacity: 20, state: "Published", createdAt: now },
      { clubId: activeId, title: "Future intake", positions: [], formSchema: {},
        windowStart: new Date("2026-10-04"), windowEnd: new Date("2026-10-10"),
        capacity: 20, state: "Published", createdAt: now },
      { clubId: suspendedId, title: "Paused intake", positions: [], formSchema: {},
        windowStart: new Date("2026-10-01"), windowEnd: new Date("2026-10-10"),
        capacity: 20, state: "Published", createdAt: now },
    ]);
    const eventBase = {
      clubId: activeId, clubName: "Academic [Club]",
      startAt: new Date("2026-10-10"), endAt: new Date("2026-10-10T02:00:00Z"),
      semesterCode: "FA26", audienceScope: "PUBLIC", capacity: 50,
      publishedAt: now, createdAt: now,
    };
    await ucmsModels.events!.create([
      { ...eventBase, title: "Open day", state: "Upcoming" },
      { ...eventBase, title: "Approved draft", state: "Approved" },
      { ...eventBase, title: "Private meeting", state: "Upcoming", audienceScope: "MEMBERS_ONLY" },
      { ...eventBase, title: "Spring workshop", state: "Completed", objective: "Robotics hands-on",
        startAt: new Date("2026-03-01"), endAt: new Date("2026-03-02") },
      { ...eventBase, title: "Hack night", state: "Ongoing",
        startAt: new Date("2026-10-03T10:00:00Z"), endAt: new Date("2026-10-03T14:00:00Z") },
    ]);
    const repo = mongoPublicDiscoveryRepository();
    const all = await repo.listClubs({ search: "", field: "", page: 1, pageSize: 12 }, now);
    expect(all.items.map((club) => club.code)).toEqual(["ACADEMIC", "PAUSED"]);
    expect(all.items.find((club) => club.code === "ACADEMIC")?.openCampaignId).toBeTruthy();
    expect(all.items.find((club) => club.code === "PAUSED")?.openCampaignId).toBeUndefined();
    expect((await repo.listClubs({ search: "[Club]", field: "", page: 1, pageSize: 12 }, now)).total)
      .toBe(1);
    expect(await repo.fields()).toEqual(["Academic", "Arts"]);
    expect(await repo.board(activeId.toString(), now))
      .toEqual([{ memberName: "Board member", positionName: "Leader", termName: "2026" }]);
    expect(await repo.campaigns(activeId.toString(), now)).toHaveLength(1);
    const autumnCampaign = await ucmsModels.recruitmentCampaigns!.findOne({
      clubId: activeId, title: "Autumn intake",
    }).lean();
    expect(autumnCampaign).not.toBeNull();
    expect(await repo.getCampaign(String(autumnCampaign!._id), now))
      .toMatchObject({ title: "Autumn intake", clubId: activeId.toString() });
    const futureCampaign = await ucmsModels.recruitmentCampaigns!.findOne({
      clubId: activeId, title: "Future intake",
    }).lean();
    expect(futureCampaign).not.toBeNull();
    expect(await repo.getCampaign(String(futureCampaign!._id), now)).toBeNull();
    expect(await repo.clubUpcomingEvents(activeId.toString(), now)).toHaveLength(1);
    function list(status: "all" | "ongoing" | "upcoming" | "ended", search = "") {
      return repo.listEvents({ status, search, page: 1, pageSize: 8 }, now);
    }
    const upcoming = await list("upcoming");
    expect(upcoming.items.map((event) => event.title)).toEqual(["Open day"]);
    expect(upcoming.total).toBe(1);
    expect((await list("ongoing")).items.map((event) => event.title)).toEqual(["Hack night"]);
    expect((await list("ended")).items.map((event) => event.title)).toEqual(["Spring workshop"]);
    expect((await list("all")).items.map((event) => event.title))
      .toEqual(["Open day", "Hack night", "Spring workshop"]);
    expect((await list("all", "robotics")).items.map((event) => event.title)).toEqual(["Spring workshop"]);
  });
});
