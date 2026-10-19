import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clubBoardHistory, internalEvent, internalEvents } from "../../src/infra/db/dashboard-drilldown.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const officer = new Types.ObjectId(), student = new Types.ObjectId(), leader = new Types.ObjectId();
const club = new Types.ObjectId(), other = new Types.ObjectId();
const recorded = new Types.ObjectId(), publicEvent = new Types.ObjectId(), draft = new Types.ObjectId();
const founding = new Types.ObjectId(), second = new Types.ObjectId();
const leaderSeat = new Types.ObjectId(), viceSeat = new Types.ObjectId();
const leaderMembership = new Types.ObjectId(), studentMembership = new Types.ObjectId();

function event(id: Types.ObjectId, clubId: Types.ObjectId, title: string, audienceScope: string, state: string, semesterCode = "Fall 2026") {
  return { _id: id, clubId, title, audienceScope, state, semesterCode, capacity: 30,
    startAt: new Date("2026-10-01T10:00:00Z"), endAt: new Date("2026-10-01T12:00:00Z"), createdAt: new Date("2026-09-01Z") };
}

describe.skipIf(!uri)("UC02 dashboard drill-downs", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-dashboard-drilldown-test-${process.pid}` }); await ensureUcmsDatabase();
    const now = new Date("2026-10-11T00:00:00Z");
    await m.users!.create([
      { _id: officer, email: "officer@fpt.edu.vn", displayName: "Officer", createdAt: now },
      { _id: student, email: "student@fpt.edu.vn", displayName: "Student", createdAt: now },
      { _id: leader, email: "leader@fpt.edu.vn", displayName: "Leader", createdAt: now },
    ]);
    await m.clubs!.create([
      { _id: club, code: "CHESS", name: "Chess Club", field: "Sport", state: "Active", sourceApplicationId: new Types.ObjectId(), createdAt: now },
      { _id: other, code: "ART", name: "Art Club", field: "Arts", state: "Active", createdAt: now },
    ]);
    await m.events!.create([
      event(recorded, club, "Members night", "MEMBERS_ONLY", "Completed"),
      event(publicEvent, club, "Open day", "PUBLIC", "Completed"),
      event(draft, other, "Draft meetup", "MEMBERS_ONLY", "Draft", "Summer 2026"),
      event(new Types.ObjectId(), other, "Art jam", "MEMBERS_ONLY", "Upcoming", "Summer 2026"),
    ]);
    await m.eventRegistrations!.create([{ eventId: recorded, studentId: student, clubId: club, state: "Confirmed", createdAt: now }]);
    await m.attendances!.create([{ eventId: recorded, studentId: student, clubId: club, method: "self",
      checkedInAt: new Date("2026-10-01T10:05:00Z"), finalized: true }]);

    await m.clubMemberships!.create([
      { _id: leaderMembership, clubId: club, userId: leader, state: "Active", joinedAt: now, defaultRole: "MEMBERS", statusHistory: [] },
      { _id: studentMembership, clubId: club, userId: student, state: "Active", joinedAt: now, defaultRole: "MEMBERS", statusHistory: [] },
    ]);
    await m.clubPositions!.create([
      { _id: leaderSeat, clubId: club, code: "LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true, permissionCodes: [] },
      { _id: viceSeat, clubId: club, code: "VICE", name: "Phó chủ nhiệm", isBoardSeat: true, permissionCodes: [] },
    ]);
    await m.clubTerms!.create([
      { _id: founding, clubId: club, name: "Founding term", state: "Closed",
        startAt: new Date("2025-10-01Z"), endAt: new Date("2026-06-01Z") },
      { _id: second, clubId: club, name: "2026", state: "Active", startAt: new Date("2026-06-01Z"), endAt: new Date("2027-06-01Z") },
    ]);
    await m.clubPositionAssignments!.create([
      { clubId: club, termId: founding, positionId: leaderSeat, membershipId: leaderMembership,
        effectiveFrom: new Date("2025-10-01Z"), effectiveTo: new Date("2026-06-01Z"), assignedBy: officer, confirmedBy: officer },
      { clubId: club, termId: second, positionId: leaderSeat, membershipId: leaderMembership,
        effectiveFrom: new Date("2026-06-01Z"), assignedBy: officer, confirmedBy: officer },
      { clubId: club, termId: second, positionId: viceSeat, membershipId: studentMembership,
        effectiveFrom: new Date("2026-06-01Z"), assignedBy: officer, confirmedBy: officer },
    ]);
    await m.transitionPlans!.create({ clubId: club, fromTermId: founding, toTermId: second, candidates: [],
      outstandingObligations: [], state: "Confirmed", submittedBy: leader, submittedAt: new Date("2026-05-20Z"),
      decidedBy: officer, decidedAt: new Date("2026-06-01Z") });
    const nomination = await m.boardNominations!.create({ clubId: club, termId: second, state: "Confirmed",
      submittedBy: leader, submittedAt: new Date("2026-07-01Z"), decidedBy: officer, decidedAt: new Date("2026-07-02Z") });
    await m.boardNominationSeats!.create({ nominationId: nomination._id, positionId: viceSeat, membershipId: studentMembership, state: "Confirmed" });
    await m.clubRoleStructureVersions!.create([
      { clubId: club, versionNo: 1, effectiveFrom: new Date("2025-10-01Z"), source: "APPLICATION", createdBy: officer, createdAt: now,
        roles: [{ code: "LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true }] },
      { clubId: club, versionNo: 2, effectiveFrom: new Date("2026-06-01Z"), source: "TRANSITION", reason: "Add a vice seat",
        createdBy: officer, createdAt: now, roles: [{ code: "LEADER", name: "Chủ nhiệm", isBoardSeat: true, isLeaderRole: true },
          { code: "VICE", name: "Phó chủ nhiệm", isBoardSeat: true, isLeaderRole: false }] },
    ]);
  }, 30000);
  afterAll(async () => { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  it("lists recorded internal events only, with totals and filter options", async () => {
    const all = await internalEvents({});
    expect(all.items.map((item) => item.title).sort()).toEqual(["Art jam", "Members night"]);
    expect(all.items.find((item) => item.title === "Members night")).toMatchObject({ clubName: "Chess Club", registrations: 1, attendances: 1 });
    expect(all.clubs.map((item) => item.name)).toEqual(["Art Club", "Chess Club"]);
    expect(all.semesters).toEqual(["Summer 2026", "Fall 2026"].sort().reverse());
    expect((await internalEvents({ clubId: String(club) })).items.map((item) => item.title)).toEqual(["Members night"]);
    expect((await internalEvents({ semesterCode: "Summer 2026" })).items.map((item) => item.title)).toEqual(["Art jam"]);
  });

  it("opens an internal event's attendance but never a public or draft event", async () => {
    expect(await internalEvent(String(recorded))).toMatchObject({ attendance: [{ studentName: "Student", email: "student@fpt.edu.vn", finalized: true }] });
    expect(await internalEvent(String(publicEvent))).toBeNull();
    expect(await internalEvent(String(draft))).toBeNull();
  });

  it("lists structure versions and each term's board with the step that confirmed it (BR56)", async () => {
    const history = await clubBoardHistory(String(club));
    expect(history?.structures.map((item) => item.versionNo)).toEqual([2, 1]);
    expect(history?.terms.map((term) => term.name)).toEqual(["2026", "Founding term"]);
    const [current, first] = history!.terms;
    expect(current!.seats).toEqual(expect.arrayContaining([
      expect.objectContaining({ positionName: "Chủ nhiệm", memberName: "Leader", source: "TRANSITION", confirmedByName: "Officer" }),
      expect.objectContaining({ positionName: "Phó chủ nhiệm", memberName: "Student", source: "NOMINATION" }),
    ]));
    expect(first!.seats).toEqual([expect.objectContaining({ memberName: "Leader", source: "APPLICATION",
      effectiveTo: new Date("2026-06-01Z") })]);
    expect(await clubBoardHistory(String(new Types.ObjectId()))).toBeNull();
  });
});
