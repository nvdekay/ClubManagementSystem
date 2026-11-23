import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { InternalClubEventInput } from "../../src/domain/club-event.js";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import { icpdpCharts } from "../../src/infra/db/dashboard-charts.js";
import { internalEvents } from "../../src/infra/db/dashboard-drilldown.js";
import { mongoClubEventRepository } from "../../src/infra/db/mongo-club-event-repository.js";
import { mongoEvaluationRepository } from "../../src/infra/db/mongo-evaluation-repository.js";
import { mongoEventProposalReviewRepository } from "../../src/infra/db/mongo-event-proposal-review-repository.js";
import { mongoEventRegistrationRepository } from "../../src/infra/db/mongo-event-registration-repository.js";
import { mongoMemberSpaceRepository } from "../../src/infra/db/mongo-member-space-repository.js";
import { periodicLiveFigures } from "../../src/infra/db/mongo-periodic-report-repository.js";
import { mongoPublicDiscoveryRepository } from "../../src/infra/db/mongo-public-discovery-repository.js";
import { overduePostEventReports } from "../../src/infra/db/post-event-report-deadlines.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const now = new Date("2026-10-11T00:00:00Z");
const hour = 3_600_000;
const actor = new Types.ObjectId(), student = new Types.ObjectId(), role = new Types.ObjectId();
const club = new Types.ObjectId(), other = new Types.ObjectId(), viewClub = new Types.ObjectId();
const fall = { code: "Fall 2026", startAt: new Date("2026-09-01Z"), endAt: new Date("2027-01-01Z") };
const repo = mongoClubEventRepository({ proposalNoticeHours: 168, cancellationNoticeHours: 24 });

function internal(startAt: Date, extra: Partial<InternalClubEventInput> = {}): InternalClubEventInput {
  return { title: "Club night", objective: "Bond", plan: "Board games", startAt, endAt: new Date(startAt.getTime() + 2 * hour),
    venueText: "Room A", capacity: 10, riskCategory: "LOW", bookingIds: [], ...extra };
}
function settings(startAt: Date) {
  return { registrationOpenAt: now, registrationCloseAt: startAt, checkInOpenAt: startAt, checkInCloseAt: new Date(startAt.getTime() + 2 * hour),
    allowWalkIn: true, waitlistEnabled: false };
}

describe.skipIf(!uri)("Internal club events", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-internal-event-test-${process.pid}` }); await ensureUcmsDatabase();
    await m.users!.create([actor, student].map((_id, i) => ({ _id, email: `internal-${i}@test.edu`, displayName: `User ${i}`,
      googleSubject: `internal-${i}`, accountState: "Active", createdAt: now })));
    await m.clubs!.create([
      { _id: club, code: "INT", name: "Internal", field: "Technology", state: "Active", createdAt: now },
      { _id: other, code: "OTH", name: "Other", field: "Arts", state: "Active", createdAt: now },
      { _id: viewClub, code: "VIEW", name: "Viewers", field: "Arts", state: "Active", createdAt: now },
    ]);
    await m.clubMemberships!.create([club, viewClub].flatMap((clubId) => [actor, student].map((userId) =>
      ({ clubId, userId, state: "Active", joinedAt: now, statusHistory: [] }))));
    // The actor is a Club Leader through a confirmed board seat in the active term.
    await m.clubPositions!.create({ _id: role, clubId: club, code: "VICE_LEADER", name: "Phó chủ nhiệm", isBoardSeat: true, isLeaderRole: false, isActive: true, permissionCodes: [] });
    const term = await m.clubTerms!.create({ clubId: club, name: "2026", state: "Active", startAt: new Date("2026-01-01Z"), endAt: new Date("2027-12-31Z") });
    const own = await m.clubMemberships!.findOne({ clubId: club, userId: actor }).lean();
    await m.clubPositionAssignments!.create({ clubId: club, termId: term._id, positionId: role, membershipId: own!._id,
      effectiveFrom: new Date("2026-01-01Z"), assignedBy: actor, confirmedBy: actor });
    await m.policyVersions!.create({ minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS, reportDeadlines: [], conflictThresholdMinutes: 15,
      feedbackWindowHours: 72, feedbackMinRespondents: 2, allowOverbooking: false, enforceOverdueReportBlock: true,
      academicCalendar: [fall], effectiveFrom: new Date("2026-01-01Z"), createdBy: actor, createdAt: now });
  }, 30_000);
  afterAll(async () => { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  it("applies the 24-hour notice when an internal event becomes CREATED or PUBLIC, never to a draft", async () => {
    const soon = new Date(now.getTime() + 23 * hour);
    await expect(repo.createInternal(String(club), internal(soon), "create", undefined, String(actor), now)).rejects.toMatchObject({ kind: "validation" });
    await expect(repo.createInternal(String(club), internal(soon), "publish", settings(soon), String(actor), now)).rejects.toMatchObject({ kind: "validation" });
    const draft = await repo.createInternal(String(club), internal(soon), "draft", undefined, String(actor), now);
    expect(draft.event).toMatchObject({ state: "DRAFT", plan: "Board games" });
    await expect(repo.act(String(club), draft.event.id, { kind: "create-internal", expectedVersion: draft.event.version }, String(actor), now))
      .rejects.toMatchObject({ kind: "validation" });

    const created = await repo.createInternal(String(club), internal(new Date(now.getTime() + 24 * hour)), "create", undefined, String(actor), now);
    expect(created).toMatchObject({ versions: [], event: { state: "CREATED", audienceScope: "MEMBERS_ONLY", budgetLines: [], currentRevisionNo: 0, plan: "Board games" } });
    const published = await repo.createInternal(String(club), internal(new Date("2026-10-19T03:00:00Z")), "publish", settings(new Date("2026-10-19T03:00:00Z")), String(actor), now);
    expect(published.event).toMatchObject({ state: "PUBLIC", allowWalkIn: true });
    for (const id of [created.event.id, published.event.id]) {
      expect(await m.eventProposalVersions!.countDocuments({ eventId: id })).toBe(0);
      expect(await m.approvalTasks!.countDocuments({ entityId: id })).toBe(0);
      expect(await m.eventBudgets!.countDocuments({ eventId: id })).toBe(0);
    }
  });

  it("edits and reschedules a CREATED event directly, then locks its schedule once PUBLIC", async () => {
    const start = new Date("2026-10-21T03:00:00Z");
    let detail = await repo.createInternal(String(club), internal(start), "create", undefined, String(actor), now);
    await expect(repo.act(String(club), detail.event.id, { kind: "save-internal", expectedVersion: detail.event.version,
      input: internal(new Date(now.getTime() + 23 * hour)) }, String(actor), now)).rejects.toMatchObject({ kind: "validation" });
    detail = await repo.act(String(club), detail.event.id, { kind: "save-internal", expectedVersion: detail.event.version,
      input: internal(new Date("2026-10-22T03:00:00Z"), { plan: "New plan" }) }, String(actor), now);
    expect(detail.event).toMatchObject({ state: "CREATED", startAt: new Date("2026-10-22T03:00:00Z"), plan: "New plan" });
    // A content edit keeps the schedule, so the 24-hour rule does not apply even once the start is close.
    detail = await repo.act(String(club), detail.event.id, { kind: "save-internal", expectedVersion: detail.event.version,
      input: internal(new Date("2026-10-22T03:00:00Z"), { title: "Renamed", plan: "New plan" }) }, String(actor), new Date("2026-10-21T12:00:00Z"));
    expect(detail.event).toMatchObject({ state: "CREATED", title: "Renamed" });
    detail = await repo.act(String(club), detail.event.id, { kind: "reschedule", expectedVersion: detail.event.version, startAt: new Date("2026-10-23T03:00:00Z"),
      endAt: new Date("2026-10-23T05:00:00Z"), venueText: "Room B", reason: "Exams" }, String(actor), now);
    expect(detail.event).toMatchObject({ state: "CREATED", startAt: new Date("2026-10-23T03:00:00Z"), venueText: "Room B", plan: "New plan" });

    detail = await repo.act(String(club), detail.event.id, { kind: "publish", expectedVersion: detail.event.version, input: settings(new Date("2026-10-23T03:00:00Z")) }, String(actor), now);
    expect(detail.event.state).toBe("PUBLIC");
    await expect(repo.act(String(club), detail.event.id, { kind: "reschedule", expectedVersion: detail.event.version, startAt: new Date("2026-10-24T03:00:00Z"),
      endAt: new Date("2026-10-24T05:00:00Z"), venueText: "Room B", reason: "Again" }, String(actor), now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.act(String(club), detail.event.id, { kind: "save-internal", expectedVersion: detail.event.version,
      input: internal(new Date("2026-10-23T03:00:00Z")) }, String(actor), now)).rejects.toMatchObject({ kind: "conflict" });
    detail = await repo.act(String(club), detail.event.id, { kind: "cancel", expectedVersion: detail.event.version, reason: "Venue closed" }, String(actor), now);
    expect(detail.event.state).toBe("CANCELLED");
    expect((await m.auditLogs!.findOne({ entityId: new Types.ObjectId(detail.event.id), action: "EVENT_CANCELLED" }).lean())?.after).toMatchObject({ state: "CANCELLED" });

    const draft = await repo.createInternal(String(club), internal(start), "draft", undefined, String(actor), now);
    expect((await repo.act(String(club), draft.event.id, { kind: "cancel", expectedVersion: draft.event.version, reason: "Not needed" }, String(actor), now)).event.state).toBe("CANCELLED");
  });

  it("runs PUBLIC → ONGOING → FINISH, keeps FINISH through attendance and owes no post-event report", async () => {
    const start = new Date("2026-10-24T03:00:00Z"), end = new Date("2026-10-24T05:00:00Z"), after = new Date(end.getTime() + 1000);
    const event = await repo.createInternal(String(club), internal(start), "publish", settings(start), String(actor), now);
    await mongoEventRegistrationRepository().register({ eventId: event.event.id, studentId: String(student), answers: {}, allowOverbooking: false, now });
    const late = await repo.createInternal(String(club), internal(start, { title: "Late" }), "publish", settings(start), String(actor), now);
    const lifecycle = mongoEventProposalReviewRepository();
    await lifecycle.advanceLifecycle(start);
    expect((await repo.find(String(club), event.event.id))?.event.state).toBe("ONGOING");
    await repo.act(String(club), event.event.id, { kind: "check-in", studentId: String(student) }, String(actor), start);
    // The late event skipped ONGOING when the scheduler ran only after it ended.
    await m.events!.updateOne({ _id: new Types.ObjectId(late.event.id) }, { $set: { state: "PUBLIC" } });
    await lifecycle.advanceLifecycle(after);
    expect((await repo.find(String(club), late.event.id))?.event.state).toBe("FINISH");
    expect((await repo.find(String(club), event.event.id))?.event.state).toBe("FINISH");

    await repo.act(String(club), event.event.id, { kind: "correct", studentId: String(student), reason: "Verified", absent: false }, String(actor), after);
    expect((await repo.act(String(club), event.event.id, { kind: "finalize" }, String(actor), after)).event).toMatchObject({ state: "FINISH", attendanceFinalized: true });
    await m.roles!.create({ _id: new Types.ObjectId(), code: "ATTENDANCE_UNLOCK", name: "Unlock", scope: "system", permissionCodes: [] });
    const unlockRole = await m.roles!.findOne({ code: "ATTENDANCE_UNLOCK" }).lean();
    await m.userRoleAssignments!.create({ userId: actor, roleId: unlockRole!._id, grantedBy: actor, grantedAt: now });
    expect((await repo.act(String(club), event.event.id, { kind: "unlock", reason: "Review" }, String(actor), after)).event).toMatchObject({ state: "FINISH", attendanceFinalized: false });
    expect((await overduePostEventReports(club, new Date("2027-06-01Z"))).map(String)).not.toContain(event.event.id);
  });

  it("treats the club's own ROOM allocation as its right to use the room, but another club's as a blocking conflict", async () => {
    const start = new Date("2026-10-26T03:00:00Z"), end = new Date("2026-10-26T05:00:00Z");
    const [mine, theirs] = await m.properties!.create(["INT-ROOM-1", "INT-ROOM-2"].map((code) => ({ code, name: code, type: "ROOM", location: "Campus",
      isActive: true, capacity: 30, equipment: [], blackouts: [], bookableHours: [] })));
    await m.propertyBookings!.create([{ propertyId: mine!._id, clubId: club }, { propertyId: theirs!._id, clubId: other }].map((slot) => ({ ...slot,
      clubName: "Allocation", purpose: "Room allocation", startAt: new Date(start.getTime() - hour), endAt: new Date(end.getTime() + hour),
      headcount: 10, state: "Approved", currentVersionNo: 0, semesterCode: fall.code, createdAt: now })));
    const created = await repo.createInternal(String(club), internal(start, { propertyId: String(mine!._id) }), "create", undefined, String(actor), now);
    expect(created.event).toMatchObject({ state: "CREATED", conflictResult: "No Conflict" });
    await expect(repo.createInternal(String(club), internal(start, { propertyId: String(theirs!._id) }), "create", undefined, String(actor), now))
      .rejects.toMatchObject({ kind: "conflict" });
  });

  it("shows internal events to members from PUBLIC, never on the public portal, and counts them for UC02, UC38 and UC42", async () => {
    const base = { organizerType: "CLUB", clubId: viewClub, clubName: "Viewers", objective: "o", venueText: "v", capacity: 10, riskCategory: "LOW",
      semesterCode: fall.code, publishedAt: now, createdAt: now };
    function at(day: string) { return { startAt: new Date(`${day}T03:00:00Z`), endAt: new Date(`${day}T05:00:00Z`) }; }
    await m.events!.create([
      ...["DRAFT", "CREATED", "PUBLIC", "ONGOING"].map((state) => ({ ...base, ...at("2026-12-02"), title: `Internal ${state}`, audienceScope: "MEMBERS_ONLY", state })),
      { ...base, ...at("2026-12-03"), title: "Open day", audienceScope: "PUBLIC", state: "Upcoming" },
      { ...base, ...at("2026-09-10"), title: "Internal FINISH", audienceScope: "MEMBERS_ONLY", state: "FINISH" },
      { ...base, ...at("2026-09-11"), title: "Internal CANCELLED", audienceScope: "MEMBERS_ONLY", state: "CANCELLED" },
    ]);

    const space = await mongoMemberSpaceRepository().find(String(student), String(viewClub), now);
    expect(space!.upcomingEvents.map((item) => item.title).sort()).toEqual(["Internal ONGOING", "Internal PUBLIC", "Open day"]);

    const discovery = mongoPublicDiscoveryRepository();
    const portal = await discovery.listEvents({ status: "all", search: "", page: 1, pageSize: 100 }, now);
    expect(portal.items.map((item) => item.title).filter((title) => title.startsWith("Internal") || title === "Club night")).toEqual([]);
    expect((await discovery.clubUpcomingEvents(String(viewClub), now)).map((item) => item.title)).toEqual(["Open day"]);
    expect(await discovery.clubHistory(String(viewClub), now)).toEqual([]);

    const recorded = await internalEvents({ clubId: String(viewClub) });
    expect(recorded.items.map((item) => item.title).sort()).toEqual(["Internal CREATED", "Internal FINISH", "Internal ONGOING", "Internal PUBLIC"]);
    const months = (await icpdpCharts(now)).eventsByMonth;
    expect(months.find((item) => item.month === "2026-12")).toEqual({ month: "2026-12", count: 4, publicCount: 1, internalCount: 3 });
    expect(months.find((item) => item.month === "2026-09")).toEqual({ month: "2026-09", count: 1, publicCount: 0, internalCount: 1 });

    expect((await periodicLiveFigures(viewClub, fall.code)).events).toEqual({ completed: 1, cancelled: 1 });
    const metrics = await mongoEvaluationRepository().collectMetrics(String(viewClub), fall, now);
    expect(metrics).toMatchObject({ completedEvents: { value: 1 }, cancelledEvents: { value: 1 } });
  });
});
