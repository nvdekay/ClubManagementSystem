import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import { FEEDBACK_CRITERION } from "../../src/domain/event-feedback.js";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { ClubEventInput } from "../../src/domain/club-event.js";
import { mongoClubEventRepository } from "../../src/infra/db/mongo-club-event-repository.js";
import { mongoEventProposalReviewRepository } from "../../src/infra/db/mongo-event-proposal-review-repository.js";
import { mongoEventRegistrationRepository } from "../../src/infra/db/mongo-event-registration-repository.js";
import { mongoEventCheckInRepository } from "../../src/infra/db/mongo-event-checkin-repository.js";
import { mongoEventFeedbackRepository } from "../../src/infra/db/mongo-event-feedback-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";
const uri = process.env.MONGO_URI;
const now = new Date("2026-10-11T00:00:00Z");
const actor = new Types.ObjectId(), club = new Types.ObjectId(), role = new Types.ObjectId();
const students = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
const startAt = new Date("2026-10-25T03:00:00Z"), endAt = new Date("2026-10-25T05:00:00Z");
const repo = mongoClubEventRepository({ proposalNoticeHours: 168, cancellationNoticeHours: 24 });
function input(scope: "PUBLIC" | "MEMBERS_ONLY" = "PUBLIC", budget = false): ClubEventInput {
  return { title: "Event", objective: "Goal", plan: "Plan", startAt, endAt, venueText: "Campus", capacity: 2, riskCategory: "LOW", audienceScope: scope,
    budgetLines: budget ? [{ category: "Supplies", amount: 100000, purpose: "Workshop" }] : [], bookingIds: [] };
}
async function approve(id: string, budget = false) {
  const r = mongoEventProposalReviewRepository(); await r.claim(id, String(actor), now);
  await r.decide(id, String(actor), { outcome: "Approve", sections: [], conditions: [], budgetLines: budget ? [{ approvedAmount: 100000 }] : [] }, now);
  return (await repo.find(String(club), id))!;
}
async function submitted(scope: "PUBLIC" | "MEMBERS_ONLY" = "PUBLIC", budget = false) {
  const d = await repo.create(String(club), input(scope, budget), String(actor), now);
  const s = await repo.act(String(club), d.event.id, { kind: "submit", expectedVersion: d.event.version }, String(actor), now);
  return scope === "MEMBERS_ONLY" && !budget ? s : approve(d.event.id, budget);
}
async function published(scope: "PUBLIC" | "MEMBERS_ONLY" = "PUBLIC") {
  const d = await submitted(scope);
  return repo.act(String(club), d.event.id, { kind: "publish", expectedVersion: d.event.version, input: {
    registrationOpenAt: now, registrationCloseAt: startAt, checkInOpenAt: startAt, checkInCloseAt: endAt, allowWalkIn: true, waitlistEnabled: true } }, String(actor), now);
}
// Turns the actor's board seat on or off: a Club Leader has every club permission, a Club Member none.
async function setLeader(on: boolean) {
  await m.clubPositions!.updateOne({ _id: role }, { $set: { isBoardSeat: on } });
}
describe.skipIf(!uri)("Mongo club event lifecycle", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-wave3-test-${process.pid}` }); await ensureUcmsDatabase();
    await m.users!.create([actor, ...students].map((id, i) => ({ _id: id, email: `wave3-${i}@test.edu`, displayName: `Student ${i}`, googleSubject: `wave3-${i}`, accountState: "Active", createdAt: now })));
    await m.clubs!.create({ _id: club, code: "W3", name: "Wave 3", field: "Technology", state: "Active", createdAt: now });
    await m.clubMemberships!.create([actor, ...students].map((userId) => ({ clubId: club, userId, state: "Active", joinedAt: now, statusHistory: [] })));
    // The actor is a Club Leader: a confirmed Phó chủ nhiệm seat in the active term.
    await m.clubPositions!.create({ _id: role, clubId: club, code: "VICE_LEADER", name: "Phó chủ nhiệm", isBoardSeat: true, isLeaderRole: false, isActive: true, permissionCodes: [] });
    const term = await m.clubTerms!.create({ clubId: club, name: "2026", state: "Active", startAt: new Date("2026-01-01Z"), endAt: new Date("2027-12-31Z") });
    const own = await m.clubMemberships!.findOne({ clubId: club, userId: actor }).lean();
    await m.clubPositionAssignments!.create({ clubId: club, termId: term._id, positionId: role, membershipId: own!._id, effectiveFrom: new Date("2026-01-01Z"), assignedBy: actor, confirmedBy: actor });
    await m.policyVersions!.create({ minFoundingMembers: 5, formRequirements: DEFAULT_FORM_REQUIREMENTS, reportDeadlines: [], conflictThresholdMinutes: 15, feedbackWindowHours: 72, feedbackMinRespondents: 2, allowOverbooking: false, enforceOverdueReportBlock: true,
      academicCalendar: [{ code: "Fall", startAt: new Date("2026-09-01Z"), endAt: new Date("2027-01-01Z") }], effectiveFrom: now, createdBy: actor, createdAt: now });
    const unlockRole = new Types.ObjectId(); await m.roles!.create({ _id: unlockRole, code: "ATTENDANCE_UNLOCK", name: "Unlock", scope: "system", permissionCodes: [] });
    await m.userRoleAssignments!.create({ userId: actor, roleId: unlockRole, grantedBy: actor, grantedAt: now });
  }, 30000);
  afterAll(async () => { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });
  it("requires a Club Leader when UC25 changes links and never attaches room allocations", async () => {
    const property = await m.properties!.create({ code: "SN-W3", name: "Outdoor venue", type: "OUTDOOR", location: "Campus", isActive: true,
      capacity: 100, equipment: [], blackouts: [], bookableHours: [{ day: 7, open: "07:00", close: "21:00" }] });
    const booking = await m.propertyBookings!.create({ propertyId: property._id, clubId: club, clubName: "Wave 3", purpose: "Outdoor activity",
      startAt, endAt, headcount: 2, state: "Requested", currentVersionNo: 1, semesterCode: "Fall", createdAt: now });
    const draft = await repo.create(String(club), { ...input(), propertyId: String(property._id), bookingIds: [String(booking._id)] }, String(actor), now);
    await setLeader(false);
    await expect(repo.act(String(club), draft.event.id, { kind: "submit", expectedVersion: draft.event.version }, String(actor), now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(await m.eventProposalVersions!.countDocuments({ eventId: draft.event.id })).toBe(0);
    expect((await m.propertyBookings!.findById(booking._id).lean())?.eventId).toBeUndefined();
    await setLeader(true);
    const sent = await repo.act(String(club), draft.event.id, { kind: "submit", expectedVersion: draft.event.version }, String(actor), now);
    expect(String((await m.propertyBookings!.findById(booking._id).lean())?.eventId)).toBe(sent.event.id);
    await m.events!.updateOne({ _id: sent.event.id }, { $set: { state: "Revision Requested" } });
    const revised = await repo.act(String(club), sent.event.id, { kind: "save", input: { ...input(), propertyId: String(property._id), bookingIds: [] }, expectedVersion: sent.event.version }, String(actor), now);
    await setLeader(false);
    await expect(repo.act(String(club), sent.event.id, { kind: "submit", expectedVersion: revised.event.version }, String(actor), now)).rejects.toMatchObject({ kind: "forbidden" });
    await setLeader(true);
    expect(String((await m.propertyBookings!.findById(booking._id).lean())?.eventId)).toBe(sent.event.id);
    await m.properties!.updateOne({ _id: property._id }, { $set: { type: "ROOM" } });
    await m.propertyBookings!.updateOne({ _id: booking._id }, { $unset: { eventId: "" }, $set: { currentVersionNo: 0, state: "Approved" } });
    expect((await repo.options(String(club))).bookings.map((item) => item.id)).not.toContain(String(booking._id));
    await expect(repo.create(String(club), { ...input(), propertyId: String(property._id), bookingIds: [String(booking._id)] }, String(actor), now)).rejects.toThrow("room allocations cannot be attached");
    await m.propertyBookings!.updateOne({ _id: booking._id }, { $set: { state: "Cancelled" } });
    await m.events!.updateOne({ _id: sent.event.id }, { $set: { state: "Cancelled" } });
  });
  it("offers equipment bookings and links them without using the equipment as the event venue", async () => {
    const property = await m.properties!.create({ code: "TB-W3", name: "Sound system", type: "EQUIPMENT", location: "Campus", isActive: true,
      equipment: [], blackouts: [], bookableHours: [{ day: 7, open: "07:00", close: "21:00" }] });
    const booking = await m.propertyBookings!.create({ propertyId: property._id, clubId: club, clubName: "Wave 3", purpose: "Sound equipment",
      startAt, endAt, headcount: 2, state: "Requested", currentVersionNo: 1, semesterCode: "Fall", createdAt: now });
    expect((await repo.options(String(club))).bookings).toContainEqual(expect.objectContaining({ id: String(booking._id), propertyType: "EQUIPMENT" }));
    const draft = await repo.create(String(club), { ...input(), bookingIds: [String(booking._id)] }, String(actor), now);
    const sent = await repo.act(String(club), draft.event.id, { kind: "submit", expectedVersion: draft.event.version }, String(actor), now);
    expect(String((await m.propertyBookings!.findById(booking._id).lean())?.eventId)).toBe(sent.event.id);
  });
  it("serializes submission and preserves immutable revisions", async () => {
    const d = await repo.create(String(club), input(), String(actor), now);
    const results = await Promise.allSettled([1, 2].map(() => repo.act(String(club), d.event.id, { kind: "submit", expectedVersion: d.event.version }, String(actor), now)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await m.eventProposalVersions!.countDocuments({ eventId: d.event.id })).toBe(1);
    expect(await m.approvalTasks!.countDocuments({ entityId: d.event.id, state: "Open" })).toBe(1);
  });
  it("publishes real proposals and promotes FIFO on student cancellation", async () => {
    const d = await published(); const r = mongoEventRegistrationRepository();
    const regs = [];
    for (const s of students) regs.push(await r.register({ eventId: d.event.id, studentId: String(s), answers: {}, allowOverbooking: false, now }));
    expect(regs[2]!.state).toBe("Waitlisted");
    await r.cancel(regs[0]!.id, String(students[0]), now);
    expect((await r.findOwned(regs[2]!.id, String(students[2])))?.state).toBe("Confirmed");
    expect((await repo.find(String(club), d.event.id))?.event.confirmedRegistrationCount).toBe(2);
    await expect(repo.act(String(club), d.event.id, { kind: "capacity", capacity: 1 }, String(actor), now)).rejects.toMatchObject({ kind: "conflict" });
  });
  it("closes internal attendance, excludes no-shows from feedback, and unlocks with audit", async () => {
    const d = await published("MEMBERS_ONLY"); expect(await m.approvalTasks!.countDocuments({ entityId: d.event.id })).toBe(0);
    const r = mongoEventRegistrationRepository();
    for (const s of students.slice(0, 2)) await r.register({ eventId: d.event.id, studentId: String(s), answers: {}, allowOverbooking: false, now });
    await repo.act(String(club), d.event.id, { kind: "check-in", studentId: String(students[0]) }, String(actor), startAt);
    const finished = new Date(endAt.getTime() + 1000); await mongoEventProposalReviewRepository().advanceLifecycle(finished);
    await expect(repo.act(String(club), d.event.id, { kind: "finalize" }, String(actor), finished)).rejects.toMatchObject({ kind: "conflict" });
    for (const [index, s] of students.slice(0, 2).entries()) await repo.act(String(club), d.event.id, { kind: "correct", studentId: String(s), reason: "Verified", absent: index === 1 }, String(actor), finished);
    expect((await mongoEventFeedbackRepository().target(d.event.id, String(students[1])))?.attendance).toBeNull();
    expect((await repo.act(String(club), d.event.id, { kind: "finalize" }, String(actor), finished)).event).toMatchObject({ state: "Closed", attendanceFinalized: true });
    await expect(mongoEventCheckInRepository().checkIn({ eventId: d.event.id, studentId: String(students[2]), method: "walk-in", now: finished })).rejects.toMatchObject({ kind: "conflict" });
    expect((await repo.act(String(club), d.event.id, { kind: "unlock", reason: "Review" }, String(actor), finished)).event).toMatchObject({ state: "Completed", attendanceFinalized: false });
  });
  it("enforces feedback threshold and strips identities", async () => {
    const d = await submitted();
    for (const [i, s] of students.slice(0, 2).entries()) {
      await m.eventFeedbacks!.create({ eventId: d.event.id, attendanceId: new Types.ObjectId(), studentId: s, scores: [{ criterionCode: FEEDBACK_CRITERION, score: 4 }], comment: "Good", isAnonymous: true, submittedAt: now });
      const f = (await repo.feedback(String(club), [d.event.id], now))[0]!;
      expect(f.visible).toBe(i === 1); if (i === 0) expect(f).not.toHaveProperty("comments"); else expect(f).toMatchObject({ averageRating: 4, comments: ["Good", "Good"] });
      expect(JSON.stringify(f)).not.toContain(String(s));
    }
    await expect(repo.feedback(String(new Types.ObjectId()), [d.event.id], now)).rejects.toMatchObject({ kind: "not_found" });
  });
  it("reapproves reschedules using one budget and cancels undisbursed budgets", async () => {
    const d = await submitted("PUBLIC", true);
    expect((await repo.act(String(club), d.event.id, { kind: "reschedule", expectedVersion: d.event.version, startAt: new Date(startAt.getTime() + 86400000), endAt: new Date(endAt.getTime() + 86400000), venueText: "New venue", reason: "Change" }, String(actor), now)).event.state).toBe("Pending Approval");
    const a = await approve(d.event.id, true); expect(await m.eventBudgets!.countDocuments({ eventId: d.event.id })).toBe(1);
    expect((await repo.act(String(club), d.event.id, { kind: "cancel", expectedVersion: a.event.version, reason: "Cancelled" }, String(actor), now)).budget?.state).toBe("Cancelled");
  });
  it("re-checks permission inside the write transaction", async () => {
    const d = await repo.create(String(club), input(), String(actor), now);
    await setLeader(false);
    await expect(repo.act(String(club), d.event.id, { kind: "submit", expectedVersion: d.event.version }, String(actor), now)).rejects.toMatchObject({ kind: "forbidden" });
    await setLeader(true);
  });
  it("rejects notice, semester, dissolution and overdue obligations without partial submission", async () => {
    const late = await repo.create(String(club), { ...input(), startAt: new Date(now.getTime() + 3600000), endAt: new Date(now.getTime() + 7200000) }, String(actor), now);
    await expect(repo.act(String(club), late.event.id, { kind: "submit", expectedVersion: late.event.version }, String(actor), now)).rejects.toMatchObject({ kind: "validation" });
    expect(await m.eventProposalVersions!.countDocuments({ eventId: late.event.id })).toBe(0);
    await expect(repo.create(String(club), { ...input(), endAt: new Date("2027-01-02Z") }, String(actor), now)).rejects.toMatchObject({ kind: "validation" });
    await m.clubs!.updateOne({ _id: club }, { $set: { "dissolution.effectiveTo": new Date("2026-10-20Z") } });
    await expect(repo.create(String(club), input(), String(actor), now)).rejects.toMatchObject({ kind: "conflict" });
    await m.clubs!.updateOne({ _id: club }, { $unset: { dissolution: "" } });
    const funded = await submitted("PUBLIC", true);
    await m.eventBudgets!.updateOne({ eventId: funded.event.id }, { $set: { state: "Disbursed", disbursedTotal: Types.Decimal128.fromString("50000"), settlementDueAt: new Date(now.getTime() - 1000) } });
    const blocked = await repo.create(String(club), input(), String(actor), now);
    await expect(repo.act(String(club), blocked.event.id, { kind: "submit", expectedVersion: blocked.event.version }, String(actor), now)).rejects.toMatchObject({ details: { obligations: ["overdueSettlement"] } });
    await m.eventBudgets!.updateOne({ eventId: funded.event.id }, { $set: { settlementDueAt: new Date(now.getTime() + 86400000) } });
    const cancelled = await repo.act(String(club), funded.event.id, { kind: "cancel", expectedVersion: funded.event.version, reason: "Funding obligation retained" }, String(actor), now);
    expect(cancelled.budget).toMatchObject({ state: "Disbursed", disbursedTotal: 50000 });
    expect((await m.eventBudgets!.findOne({ eventId: funded.event.id }).lean())?.settlementDueAt).toEqual(new Date(now.getTime() + 14 * 86400000));
    expect((await m.auditLogs!.findOne({ entityId: funded.event.id, action: "EVENT_CANCELLED" }).lean())?.after).toMatchObject({ settlementRequired: true });
  });
  it("keeps earlier revisions and blocks a resubmission after its deadline", async () => {
    const d = await repo.create(String(club), input(), String(actor), now);
    await repo.act(String(club), d.event.id, { kind: "submit", expectedVersion: d.event.version }, String(actor), now);
    const review = mongoEventProposalReviewRepository(); await review.claim(d.event.id, String(actor), now);
    await review.decide(d.event.id, String(actor), { outcome: "Request revision", reason: "Clarify plan", sections: [], conditions: [], budgetLines: [], revisionDeadlineAt: new Date(now.getTime() + 3600000) }, now);
    const requested = (await repo.find(String(club), d.event.id))!;
    await expect(repo.act(String(club), d.event.id, { kind: "submit", expectedVersion: requested.event.version }, String(actor), new Date(now.getTime() + 3600000))).rejects.toMatchObject({ kind: "conflict" });
    const saved = await repo.act(String(club), d.event.id, { kind: "save", expectedVersion: requested.event.version, input: { ...input(), plan: "Revised plan" } }, String(actor), now);
    const resubmitted = await repo.act(String(club), d.event.id, { kind: "submit", expectedVersion: saved.event.version }, String(actor), now);
    expect(resubmitted.versions.map((v) => (v.payload as ClubEventInput).plan)).toEqual(["Plan", "Revised plan"]);
    expect(await m.approvalTasks!.countDocuments({ entityId: d.event.id })).toBe(2);
  });
  it("rolls back blocked reschedules and releases participants when reapproval is rejected", async () => {
    const property = await m.properties!.create({ code: "W3-ROOM", name: "Room", type: "ROOM", isActive: true, bookableHours: [] });
    const blocker = await m.events!.create({ organizerType: "CLUB", clubId: club, clubName: "Wave 3", ...input(), state: "Upcoming", propertyId: property._id, semesterCode: "Fall", createdAt: now });
    const d = await published();
    await expect(repo.act(String(club), d.event.id, { kind: "reschedule", expectedVersion: d.event.version, startAt, endAt, propertyId: String(property._id), reason: "Room change" }, String(actor), now)).rejects.toMatchObject({ kind: "conflict" });
    expect((await repo.find(String(club), d.event.id))?.event).toMatchObject({ state: "Upcoming", version: d.event.version });
    expect(await m.eventProposalVersions!.countDocuments({ eventId: d.event.id })).toBe(1);
    const registration = await mongoEventRegistrationRepository().register({ eventId: d.event.id, studentId: String(students[0]), answers: {}, allowOverbooking: false, now });
    await repo.act(String(club), d.event.id, { kind: "reschedule", expectedVersion: d.event.version, startAt: new Date(startAt.getTime() + 86400000), endAt: new Date(endAt.getTime() + 86400000), venueText: "Campus", reason: "New date" }, String(actor), now);
    await expect(mongoEventRegistrationRepository().register({ eventId: d.event.id, studentId: String(students[1]), answers: {}, allowOverbooking: false, now })).rejects.toMatchObject({ kind: "conflict" });
    const review = mongoEventProposalReviewRepository(); await review.claim(d.event.id, String(actor), now);
    await review.decide(d.event.id, String(actor), { outcome: "Reject", reason: "Schedule unsuitable", sections: [], conditions: [], budgetLines: [] }, now);
    expect((await repo.find(String(club), d.event.id))?.event).toMatchObject({ state: "Rejected", confirmedRegistrationCount: 0 });
    expect((await mongoEventRegistrationRepository().findOwned(registration.id, String(students[0])))?.state).toBe("Cancelled");
    await m.events!.updateOne({ _id: blocker._id }, { $set: { state: "Cancelled" } });
  });
});
