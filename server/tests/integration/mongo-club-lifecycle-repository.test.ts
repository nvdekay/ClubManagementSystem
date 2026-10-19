import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoClubLifecycleRepository } from "../../src/infra/db/mongo-club-lifecycle-repository.js";
import { mongoPublicDiscoveryRepository } from "../../src/infra/db/mongo-public-discovery-repository.js";
import { mongoRecruitmentApplicationRepository } from "../../src/infra/db/mongo-recruitment-application-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";
import { alertClubLifecycleJobFailure, runClubLifecycleJob } from "../../src/usecase/club-lifecycle.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-lifecycle-test-${process.pid}`;
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!uri)("Mongo club lifecycle repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const officer = new Types.ObjectId();
  const student = new Types.ObjectId();
  const member = new Types.ObjectId();

  async function seedClub(name: string) {
    const clubId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: `CLB-${name}`, name, field: "Công nghệ", state: "Active", createdAt: now });
    await ucmsModels.clubMemberships!.create({ clubId, userId: member, state: "Active", joinedAt: now, statusHistory: [] });
    function event(title: string, startAt: Date, endAt: Date, state = "Upcoming") {
      return { clubId, clubName: name, title, startAt, endAt, state, semesterCode: "FA26", audienceScope: "PUBLIC",
        capacity: 30, confirmedRegistrationCount: 1, createdAt: now };
    }
    const [past, soon, late] = await ucmsModels.events!.insertMany([
      event("Đã diễn ra", new Date(now.getTime() - 5 * DAY), new Date(now.getTime() - 4 * DAY), "Completed"),
      event("Sắp tới", new Date(now.getTime() + 5 * DAY), new Date(now.getTime() + 5 * DAY + 3_600_000)),
      event("Năm sau", new Date("2027-06-01T02:00:00Z"), new Date("2027-06-01T05:00:00Z"), "Approved")]);
    await ucmsModels.eventRegistrations!.insertMany([soon, late].map((item) => ({ eventId: item!._id, studentId: student,
      clubId, state: "Confirmed", createdAt: now })));
    const campaign = await ucmsModels.recruitmentCampaigns!.create({ clubId, title: "Tuyển K20", positions: ["Thành viên"],
      windowStart: new Date(now.getTime() - DAY), windowEnd: new Date(now.getTime() + 20 * DAY), capacity: 10,
      state: "Published", selectionSteps: [], formSchema: [], rubric: [], createdAt: now });
    const term = await ucmsModels.clubTerms!.create({ clubId, name: "Nhiệm kỳ", startAt: now, endAt: new Date("2027-10-01"), state: "Active" });
    await ucmsModels.clubPositionAssignments!.create({ clubId, termId: term._id, positionId: new Types.ObjectId(),
      membershipId: new Types.ObjectId(), effectiveFrom: now, assignedBy: officer, confirmedBy: officer });
    return { clubId, past: past!._id, soon: soon!._id, late: late!._id, campaignId: campaign._id };
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.users!.insertMany([
      { _id: officer, email: "o@fpt.edu.vn", displayName: "Officer", googleSubject: "o", accountState: "Active", createdAt: now },
      { _id: student, email: "s@fpt.edu.vn", displayName: "Student", googleSubject: "s", accountState: "Active", createdAt: now },
      { _id: member, email: "m@fpt.edu.vn", displayName: "Member", googleSubject: "m", accountState: "Active", createdAt: now }]);
    const role = await ucmsModels.roles!.create({ code: "ICPDP_OFFICER", name: "ICPDP", scope: "system", permissionCodes: [], isSystem: true });
    await ucmsModels.userRoleAssignments!.create({ userId: officer, roleId: role._id, grantedBy: officer, grantedAt: now });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("suspends: cancels upcoming events and registrations, keeps recruitment open but blocks applying", async () => {
    const repo = mongoClubLifecycleRepository();
    const seeded = await seedClub("Robotics");
    // FR-UC15-04: a proposal awaiting ICPDP is cancelled too; an unsent draft is left to the club.
    const proposal = { clubId: seeded.clubId, clubName: "Robotics", startAt: new Date(now.getTime() + 10 * DAY),
      endAt: new Date(now.getTime() + 10 * DAY + 3_600_000), semesterCode: "FA26", audienceScope: "PUBLIC", capacity: 30, createdAt: now };
    const [pending] = await ucmsModels.events!.insertMany([{ ...proposal, title: "Chờ duyệt", state: "Pending Approval" },
      { ...proposal, title: "Bản nháp", state: "Draft", startAt: new Date(now.getTime() + 11 * DAY), endAt: new Date(now.getTime() + 11 * DAY + 3_600_000) }]);
    await ucmsModels.approvalTasks!.create({ entityType: "EVENT_PROPOSAL", entityId: pending!._id, clubId: seeded.clubId,
      title: "Chờ duyệt", state: "Open", openedAt: now });
    const until = new Date(now.getTime() + 2 * DAY);
    expect(await repo.suspend(String(seeded.clubId), { reason: "Vi phạm quy chế", until }, String(officer), now))
      .toEqual({ cancelledEvents: 3, cancelledRegistrations: 2, cancelledBookings: 0 });
    const events = await ucmsModels.events!.find({ clubId: seeded.clubId }).sort({ startAt: 1 }).lean();
    expect(events.map((event) => [event.title, event.state, event.cancelSourceType])).toEqual([
      ["Đã diễn ra", "Completed", undefined], ["Sắp tới", "Cancelled", "SUSPENSION"], ["Chờ duyệt", "Cancelled", "SUSPENSION"],
      ["Bản nháp", "Draft", undefined], ["Năm sau", "Cancelled", "SUSPENSION"]]);
    expect(await ucmsModels.approvalTasks!.findOne({ entityId: pending!._id }).lean()).toMatchObject({ state: "Closed" });
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: student, eventCode: "EVENT_CANCELLED" })).toBe(2);
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: member, eventCode: "CLUB_SUSPENDED" })).toBe(1);
    expect((await ucmsModels.recruitmentCampaigns!.findById(seeded.campaignId).lean())?.state).toBe("Published");
    // Students see the campaign flagged and cannot apply; the detail lists the obligations and history.
    expect(await mongoPublicDiscoveryRepository().getCampaign(String(seeded.campaignId), now))
      .toMatchObject({ clubSuspended: true });
    await expect(mongoRecruitmentApplicationRepository().campaign(String(seeded.campaignId), now))
      .rejects.toMatchObject({ kind: "conflict", details: { reason: "clubSuspended" } });
    const detail = await repo.detail(String(seeded.clubId), now);
    expect(detail).toMatchObject({ state: "Suspended", suspension: { reason: "Vi phạm quy chế", until },
      openCampaigns: [{ title: "Tuyển K20" }], upcomingEvents: [], history: [{ action: "CLUB_SUSPENDED", actorName: "Officer" }] });
    await expect(repo.suspend(String(seeded.clubId), { reason: "again", until: null }, String(officer), now))
      .rejects.toMatchObject({ kind: "conflict" });

    // The job reminds ICPDP once within three days, then reactivates when the date passes.
    expect(await runClubLifecycleJob(repo, now)).toMatchObject({ reminded: 1, reactivated: 0 });
    expect(await runClubLifecycleJob(repo, now)).toMatchObject({ reminded: 0 });
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: officer, eventCode: "CLUB_SUSPENSION_ENDING" })).toBe(1);
    expect(await runClubLifecycleJob(repo, new Date(until.getTime() + 1))).toMatchObject({ reactivated: 1 });
    const club = await ucmsModels.clubs!.findById(seeded.clubId).lean();
    expect(club?.state).toBe("Active");
    expect(club?.suspension).toBeUndefined();
    expect(await ucmsModels.auditLogs!.findOne({ entityId: seeded.clubId, action: "CLUB_REACTIVATED" }).lean())
      .toMatchObject({ actorRole: "SYSTEM" });
    expect((await mongoRecruitmentApplicationRepository().campaign(String(seeded.campaignId), now))?.id)
      .toBe(String(seeded.campaignId));
  });

  it("dissolves on schedule: BR45 cancellation now, Dissolving next semester, Dissolved at its end", async () => {
    const repo = mongoClubLifecycleRepository();
    const seeded = await seedClub("Guitar");
    const decision = { decidedAt: now, decidedBy: String(officer), reason: "Không còn hoạt động",
      effectiveSemester: "SP27", effectiveFrom: new Date("2027-01-05T00:00:00Z"), effectiveTo: new Date("2027-04-30T00:00:00Z") };
    expect(await repo.decideDissolution(String(seeded.clubId), decision, now)).toMatchObject({ cancelledEvents: 1 });
    // Only the event ending after the Dissolving semester is cancelled; the club stays Active for now.
    expect((await ucmsModels.events!.findById(seeded.late).lean())?.cancelSourceType).toBe("DISSOLUTION");
    expect((await ucmsModels.events!.findById(seeded.soon).lean())?.state).toBe("Upcoming");
    expect((await ucmsModels.clubs!.findById(seeded.clubId).lean())?.state).toBe("Active");
    await expect(repo.decideDissolution(String(seeded.clubId), decision, now)).rejects.toMatchObject({ kind: "conflict" });

    expect(await runClubLifecycleJob(repo, new Date("2027-01-06T00:00:00Z"))).toMatchObject({ dissolving: 1, dissolved: 0 });
    expect((await ucmsModels.clubs!.findById(seeded.clubId).lean())?.state).toBe("Dissolving");
    // Left open during the Dissolving semester: a proposal under review and an unreconciled budget (E1).
    const [pending] = await ucmsModels.events!.insertMany([{ clubId: seeded.clubId, clubName: "Guitar", title: "Đang duyệt",
      startAt: new Date("2027-04-10T02:00:00Z"), endAt: new Date("2027-04-10T05:00:00Z"), state: "Under Review",
      semesterCode: "SP27", audienceScope: "PUBLIC", capacity: 30, createdAt: now }]);
    const budget = await ucmsModels.eventBudgets!.create({ clubId: seeded.clubId, eventId: seeded.past, lines: [],
      requestedTotal: 100, approvedTotal: 100, approvedByDecisionId: new Types.ObjectId(), disbursedTotal: 100,
      isSettlementLate: false, refundedTotal: 0, state: "Disbursed", createdAt: now });
    expect((await repo.detail(String(seeded.clubId), now))?.unreconciledBudgets)
      .toEqual([{ id: String(budget._id), eventTitle: "Đã diễn ra", state: "Disbursed" }]);
    expect(await runClubLifecycleJob(repo, new Date("2027-05-01T00:00:00Z"))).toMatchObject({ dissolved: 1, failed: 0 });
    const archived = await ucmsModels.clubs!.findById(seeded.clubId).lean();
    expect(archived?.state).toBe("Dissolved");
    expect((await ucmsModels.events!.findById(pending!._id).lean())?.state).toBe("Cancelled");
    // The completed event never got its report and the budget was not reconciled: both stay on the archive.
    expect((archived?.dissolution as { outstanding?: unknown; archivedAt?: Date })).toMatchObject({
      archivedAt: new Date("2027-05-01T00:00:00Z"),
      outstanding: { postEventReports: [{ eventId: String(seeded.past), title: "Đã diễn ra" }],
        budgets: [{ id: String(budget._id), state: "Disbursed" }] } });
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: officer, eventCode: "CLUB_DISSOLVED",
      entityId: seeded.clubId, "payload.outstandingBudgets": 1 })).toBe(1);
    expect(await ucmsModels.clubTerms!.countDocuments({ clubId: seeded.clubId, state: "Active" })).toBe(0);
    expect(await ucmsModels.clubPositionAssignments!.countDocuments({ clubId: seeded.clubId, effectiveTo: null })).toBe(0);
    expect((await ucmsModels.recruitmentCampaigns!.findById(seeded.campaignId).lean())?.state).toBe("Cancelled");
    expect(await runClubLifecycleJob(repo, new Date("2027-05-02T00:00:00Z"))).toMatchObject({ dissolved: 0 });
    expect(await ucmsModels.auditLogs!.distinct("action", { entityId: seeded.clubId })).toEqual(
      expect.arrayContaining(["CLUB_DISSOLUTION_DECIDED", "CLUB_DISSOLVING", "CLUB_DISSOLVED"]));
  });

  it("keeps a club Dissolving when the final step fails and alerts ICPDP once a day", async () => {
    const repo = mongoClubLifecycleRepository();
    const clubId = new Types.ObjectId();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-Broken", name: "Broken", field: "Công nghệ", state: "Dissolving",
      createdAt: now, dissolution: { decidedAt: now, decidedBy: officer, reason: "x", effectiveSemester: "SP27",
        effectiveFrom: new Date("2027-01-05T00:00:00Z"), effectiveTo: new Date("2027-04-30T00:00:00Z") } });
    // A proposal that cannot be cancelled makes the whole step roll back.
    await ucmsModels.events!.create({ clubId, clubName: "Broken", title: "Kẹt", startAt: new Date("2027-04-01T02:00:00Z"),
      endAt: new Date("2027-04-01T05:00:00Z"), state: "Under Review", attendanceFinalized: true, semesterCode: "SP27",
      audienceScope: "PUBLIC", capacity: 30, createdAt: now });
    const at = new Date("2027-05-03T00:00:00Z");
    expect(await runClubLifecycleJob(repo, at)).toMatchObject({ dissolved: 0, failed: 1 });
    expect((await ucmsModels.clubs!.findById(clubId).lean())?.state).toBe("Dissolving");
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: officer, eventCode: "CLUB_LIFECYCLE_FAILED",
      entityId: clubId })).toBe(1);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: clubId, action: "CLUB_LIFECYCLE_FAILED" })).toBe(1);
    // The next hourly run fails again but does not alert again within the day.
    await runClubLifecycleJob(repo, new Date(at.getTime() + 3_600_000));
    expect(await ucmsModels.notifications!.countDocuments({ eventCode: "CLUB_LIFECYCLE_FAILED", entityId: clubId })).toBe(1);
    expect(await alertClubLifecycleJobFailure(repo, "database unreachable", at)).toBe(true);
    expect(await alertClubLifecycleJobFailure(repo, "database unreachable", at)).toBe(false);
    await ucmsModels.events!.deleteMany({ clubId });
  });
});
