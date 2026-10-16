import { mongoClubTransitionPlanRepository } from "../../src/infra/db/mongo-club-transition-plan-repository.js";
import { mongoLeadershipTransitionRepository } from "../../src/infra/db/mongo-leadership-transition-repository.js";
import { mongoSuspensionRequestRepository } from "../../src/infra/db/mongo-suspension-request-repository.js";
import { mongoMembershipReconfirmationRepository } from "../../src/infra/db/mongo-membership-reconfirmation-repository.js";
import { mongoClubViolationRepository } from "../../src/infra/db/mongo-club-violation-repository.js";
import { mongoClubEvaluationRepository } from "../../src/infra/db/mongo-club-evaluation-repository.js";
import { mongoApplicationExpiryRepository } from "../../src/infra/db/mongo-application-expiry-repository.js";
import { mongoAccessRepository } from "../../src/infra/db/mongo-access-repository.js";
import { resolveClubPermissions } from "../../src/domain/access.js";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoClubInvitationRepository } from "../../src/infra/db/mongo-club-invitation-repository.js";
import { mongoClubPeriodicReportRepository } from "../../src/infra/db/mongo-club-periodic-report-repository.js";
import { mongoPeriodicReportRepository } from "../../src/infra/db/mongo-periodic-report-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";
const uri = process.env.MONGO_URI;
const now = new Date("2026-10-15T00:00:00Z");
const club = new Types.ObjectId();
const other = new Types.ObjectId();
const leader = new Types.ObjectId();
const member = new Types.ObjectId();
const officer = new Types.ObjectId();
const term = new Types.ObjectId();
const membership = new Types.ObjectId();
const position = new Types.ObjectId();

describe.skipIf(!uri)("remaining club UC transactions", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName: `ucms-remaining-test-${process.pid}` });
    await ensureUcmsDatabase();
    await m.users!.insertMany([leader, member, officer].map((id, n) => ({ _id: id, email: `user${n}@test.edu`, displayName: `User ${n}`, googleSubject: `subject${n}`, accountState: "Active", createdAt: now })));
    await m.clubs!.insertMany([{ _id: club, code: "ONE", name: "One", field: "Art", state: "Active", createdAt: now },
      { _id: other, code: "TWO", name: "Two", field: "Art", state: "Active", createdAt: now }]);
    await m.clubTerms!.create({ _id: term, clubId: club, name: "2026", startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01"), state: "Active" });
    await m.clubMemberships!.insertMany([{ _id: membership, clubId: club, userId: leader, state: "Active", joinedAt: now, statusHistory: [] },
      { clubId: club, userId: member, state: "Active", joinedAt: now, statusHistory: [] }]);
    await m.clubPositions!.create({ _id: position, clubId: club, code: "PRESIDENT", name: "President", isLeaderRole: true, isBoardSeat: true, isActive: true, permissionCodes: [] });
    await m.clubPositionAssignments!.create({ clubId: club, termId: term, positionId: position, membershipId: membership, effectiveFrom: new Date("2026-01-01"), assignedBy: officer, confirmedBy: officer });
    const role = await m.roles!.create({ code: "ICPDP_OFFICER", name: "Officer", scope: "system", isSystem: true, permissionCodes: [] });
    await m.userRoleAssignments!.create({ userId: officer, roleId: role._id, grantedBy: officer, grantedAt: now });
  }, 30_000);
  afterAll(async () => { if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

  async function invitation(status = "Pending", deadline = new Date("2026-10-20")) {
    const event = await m.events!.create({ organizerType: "ICPDP", clubName: "ICPDP", title: "Festival", startAt: new Date("2026-11-01"), endAt: new Date("2026-11-02"), semesterCode: "Fall 2026", capacity: 100, audienceScope: "PUBLIC", state: "Approved", currentRevisionNo: 1, createdAt: now });
    return m.eventInvitations!.create({ eventId: event._id, clubId: club, clubName: "One", status, deadline, invitedBy: officer, invitedAt: now, createdAt: now, updatedAt: now });
  }
  it("UC54 serializes competing responses and atomically notifies the inviter once", async () => {
    const inv = await invitation();
    const repo = mongoClubInvitationRepository();
    const attempts = await Promise.allSettled([repo.respond(String(club), String(inv._id), { outcome: "Accepted", responseDetails: { members: 10 } }, String(leader), now),
      repo.respond(String(club), String(inv._id), { outcome: "Declined", responseNote: "Unavailable" }, String(leader), now)]);
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await m.auditLogs!.countDocuments({ entityType: "EventInvitation", entityId: inv._id })).toBe(1);
    expect(await m.notifications!.countDocuments({ entityId: inv._id, recipientUserId: officer })).toBe(1);
    expect((await repo.list(String(club)))[0]?.event).not.toHaveProperty("checkInCode");
    expect(await repo.list(String(other))).toEqual([]);
  });
  it("UC54 rejects cross-club, member, withdrawn and exact-deadline responses", async () => {
    const inv = await invitation();
    const repo = mongoClubInvitationRepository();
    await expect(repo.respond(String(other), String(inv._id), { outcome: "Accepted" }, String(leader), now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(repo.respond(String(club), String(inv._id), { outcome: "Accepted" }, String(member), now)).rejects.toMatchObject({ kind: "forbidden" });
    for (const doc of [await invitation("Withdrawn"), await invitation("Pending", now)]) {
      await expect(repo.respond(String(club), String(doc._id), { outcome: "Accepted" }, String(leader), now)).rejects.toMatchObject({ kind: "conflict" });
      expect(await m.auditLogs!.countDocuments({ entityId: doc._id })).toBe(0);
    }
  });
  it("UC38/39 preserves three immutable submissions and two return decisions with optimistic saves", async () => {
    const repo = mongoClubPeriodicReportRepository();
    const review = mongoPeriodicReportRepository();
    let report = await repo.create(String(club), "Summer 2026", new Date("2026-09-07"), String(leader), now);
    await expect(repo.create(String(club), "Summer 2026", now, String(leader), now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(repo.submit(String(club), report.id, report.revision!, String(leader), now)).rejects.toMatchObject({ kind: "validation" });
    for (let n = 1; n <= 3; n++) {
      const revision = report.revision!;
      report = await repo.save(String(club), report.id, revision, { narrative: `Report ${n}`, nextPlan: `Plan ${n}`, evidence: [{ note: `Minutes ${n}` }] }, String(leader), now);
      await expect(repo.save(String(club), report.id, revision, { narrative: "Stale", nextPlan: "Stale", evidence: [] }, String(leader), now)).rejects.toMatchObject({ kind: "conflict" });
      report = await repo.submit(String(club), report.id, report.revision!, String(leader), now);
      expect(report).toMatchObject({ versionNo: n, state: "Submitted", lateFlag: true });
      await expect(repo.save(String(club), report.id, report.revision!, { narrative: "Locked", nextPlan: "Locked", evidence: [] }, String(leader), now)).rejects.toMatchObject({ kind: "conflict" });
      report = await review.decide(report.id, String(officer), n === 3 ? { outcome: "Accept", observation: "Complete" }
        : { outcome: "Return", reason: `Correction ${n}`, sections: ["narrative"] }, new Date(now.getTime() + n));
    }
    expect(report.versions?.map((v) => [v.versionNo, v.narrative, v.decision?.outcome]).sort()).toEqual([[1, "Report 1", "Return"], [2, "Report 2", "Return"], [3, "Report 3", "Accept"]]);
    expect(await m.approvalTasks!.countDocuments({ entityId: new Types.ObjectId(report.id), state: "Decided" })).toBe(3);
    expect(await m.approvalTasks!.countDocuments({ entityId: new Types.ObjectId(report.id), state: "Open" })).toBe(0);
    expect((await repo.list(String(other)))).toEqual([]);
  });
  async function governedClub() {
    const id = new Types.ObjectId(); const president = new Types.ObjectId(); const candidateUser = new Types.ObjectId();
    const presidentMember = new Types.ObjectId(); const candidateMember = new Types.ObjectId(); const termId = new Types.ObjectId(); const seat = new Types.ObjectId();
    await m.users!.insertMany([president, candidateUser].map((u) => ({ _id: u, email: `${String(u)}@test.edu`, displayName: String(u), googleSubject: String(u), accountState: "Active", createdAt: now })));
    await m.clubs!.create({ _id: id, code: String(id), name: "Governed", field: "Art", state: "Active", createdAt: now });
    await m.clubTerms!.create({ _id: termId, clubId: id, name: "Current", state: "Active", startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") });
    await m.clubPositions!.create({ _id: seat, clubId: id, code: "PRESIDENT", name: "President", isLeaderRole: true, isBoardSeat: true, isSingleHolder: true, isActive: true, permissionCodes: [] });
    await m.clubMemberships!.insertMany([{ _id: presidentMember, clubId: id, userId: president, state: "Active", joinedAt: new Date("2026-01-01"), statusHistory: [] },
      { _id: candidateMember, clubId: id, userId: candidateUser, state: "Active", joinedAt: new Date("2026-01-01"), statusHistory: [] }]);
    await m.clubPositionAssignments!.create({ clubId: id, termId, positionId: seat, membershipId: presidentMember, effectiveFrom: new Date("2026-01-01"), assignedBy: officer, confirmedBy: officer });
    return { id, president, candidateUser, presidentMember, candidateMember, termId, seat };
  }
  it("UC12/13 loads obligations, returns/resubmits, and only confirmation changes authority", async () => {
    const g = await governedClub(); const repo = mongoClubTransitionPlanRepository(); const review = mongoLeadershipTransitionRepository();
    const event = await m.events!.create({ clubId: g.id, clubName: "Governed", organizerType: "CLUB", title: "Handover event", state: "Upcoming", startAt: new Date("2026-12-01"), endAt: new Date("2026-12-02"), semesterCode: "Fall", capacity: 10, audienceScope: "PUBLIC", currentRevisionNo: 1, createdAt: now });
    const input = { toTerm: { name: "Next", startAt: new Date("2026-11-01"), endAt: new Date("2027-11-01") }, candidates: [{ positionCode: "PRESIDENT", membershipId: String(g.candidateMember) }], handoverItems: [{ id: "1", description: "Keys" }], assignees: {} as Record<string, string> };
    let plan = await repo.create(String(g.id), input, String(g.president), now);
    await expect(repo.submit(String(g.id), plan.id, plan.revision, String(g.president), now)).rejects.toMatchObject({ kind: "validation" });
    plan = await repo.save(String(g.id), plan.id, plan.revision, { ...input, earlyReason: "Graduation" }, String(g.president), now);
    await expect(repo.submit(String(g.id), plan.id, plan.revision, String(g.president), now)).rejects.toThrow(/assignee/);
    const updated = { ...input, earlyReason: "Graduation", assignees: { [`EVENT:${String(event._id)}`]: String(g.candidateMember) } };
    plan = await repo.save(String(g.id), plan.id, plan.revision, updated, String(g.president), now);
    const stale = plan.revision;
    plan = await repo.submit(String(g.id), plan.id, plan.revision, String(g.president), now);
    await expect(repo.submit(String(g.id), plan.id, stale, String(g.president), now)).rejects.toMatchObject({ kind: "conflict" });
    expect(resolveClubPermissions((await mongoAccessRepository().findSnapshot(String(g.candidateUser), String(g.id)))!, now)).toEqual([]);
    await review.claim(plan.id, String(officer), now);
    await review.decide(plan.id, String(officer), { outcome: "Request revision", reason: "More details", followUpObligationIds: [] }, now);
    plan = (await repo.context(String(g.id), now)).plans[0]!;
    plan = await repo.save(String(g.id), plan.id, plan.revision, updated, String(g.president), now);
    plan = await repo.submit(String(g.id), plan.id, plan.revision, String(g.president), now);
    await review.claim(plan.id, String(officer), now);
    const confirmed = await review.decide(plan.id, String(officer), { outcome: "Approve", followUpObligationIds: [`EVENT:${String(event._id)}`] }, now);
    expect(confirmed.decisions).toHaveLength(2);
    expect(confirmed.followUpConditions).toHaveLength(1);
    expect(resolveClubPermissions((await mongoAccessRepository().findSnapshot(String(g.president), String(g.id)))!, now)).toEqual([]);
    expect(resolveClubPermissions((await mongoAccessRepository().findSnapshot(String(g.candidateUser), String(g.id)))!, now)).toContain("club.transition.plan");
  });
  it("UC12/13 rejects a president candidate who leads another club in an overlapping term (BR06)", async () => {
    const a = await governedClub(); const b = await governedClub(); const repo = mongoClubTransitionPlanRepository(); const review = mongoLeadershipTransitionRepository();
    const input = { toTerm: { name: "Next", startAt: new Date("2026-11-01"), endAt: new Date("2027-11-01") }, candidates: [{ positionCode: "PRESIDENT", membershipId: String(a.candidateMember) }],
      handoverItems: [{ id: "1", description: "Keys" }], earlyReason: "Graduation", assignees: {} as Record<string, string> };
    // The candidate of club A is already the president of club B.
    const inB = await m.clubMemberships!.create({ clubId: b.id, userId: a.candidateUser, state: "Active", joinedAt: new Date("2026-01-01"), statusHistory: [] });
    const bAssignment = await m.clubPositionAssignments!.create({ clubId: b.id, termId: b.termId, positionId: b.seat, membershipId: inB._id, effectiveFrom: new Date("2026-01-01"), assignedBy: officer, confirmedBy: officer });
    let plan = await repo.create(String(a.id), input, String(a.president), now);
    await expect(repo.submit(String(a.id), plan.id, plan.revision, String(a.president), now)).rejects.toThrow(/another club/);
    // Submitted while eligible, then the candidate takes club B's chair before ICPDP confirms.
    await m.clubPositionAssignments!.updateOne({ _id: bAssignment._id }, { $set: { effectiveTo: now } });
    plan = await repo.submit(String(a.id), plan.id, plan.revision, String(a.president), now);
    await m.clubPositionAssignments!.updateOne({ _id: bAssignment._id }, { $set: { effectiveTo: null } });
    await review.claim(plan.id, String(officer), now);
    await expect(review.decide(plan.id, String(officer), { outcome: "Approve", followUpObligationIds: [] }, now)).rejects.toThrow(/BR06/);
    expect(await m.transitionPlans!.findById(plan.id).lean()).toMatchObject({ state: "Pending Confirmation" });
    expect(resolveClubPermissions((await mongoAccessRepository().findSnapshot(String(a.candidateUser), String(a.id)))!, now)).toEqual([]);
  });
  it("UC14/15 requires fresh impact acknowledgement and commits only one competing decision", async () => {
    const g = await governedClub(); const repo = mongoSuspensionRequestRepository();
    const event = await m.events!.create({ clubId: g.id, clubName: "Governed", organizerType: "CLUB", title: "Future event", state: "Upcoming", startAt: new Date("2026-12-01"), endAt: new Date("2026-12-02"), semesterCode: "Fall", capacity: 10, audienceScope: "PUBLIC", currentRevisionNo: 1, createdAt: now });
    const input = { reason: "Exam period", until: new Date("2026-12-30"), obligationsPlan: "Treasurer retains obligations", recoveryPlan: "Resume after exams", acknowledgedImpactIds: [] as string[] };
    await expect(repo.submit(String(g.id), input, String(g.president), now)).rejects.toThrow(/affected/);
    const request = await repo.submit(String(g.id), { ...input, acknowledgedImpactIds: (await repo.context(String(g.id), now)).impacts.map((i) => i.id) }, String(g.president), now);
    expect(await m.clubs!.findById(g.id).lean()).toMatchObject({ state: "Active" });
    const attempts = await Promise.allSettled([repo.decide(request.id, "Approve", "Approved", String(officer), now), repo.decide(request.id, "Approve", "Approved again", String(officer), now)]);
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await m.clubs!.findById(g.id).lean()).toMatchObject({ state: "Suspended" });
    expect(await m.events!.findById(event._id).lean()).toMatchObject({ state: "Cancelled" });
    expect(await m.approvalDecisions!.countDocuments({ reason: { $in: ["Approved", "Approved again"] } })).toBe(1);
    const g2 = await governedClub(); const rejected = await repo.submit(String(g2.id), input, String(g2.president), now);
    await repo.decide(rejected.id, "Reject", "Keep operating", String(officer), now);
    expect(await m.clubs!.findById(g2.id).lean()).toMatchObject({ state: "Active" });
  });
  it("UC21 A2 opens once, exempts Leader, confirms ownership and expires at exactly 14 days", async () => {
    const g = await governedClub(); const repo = mongoMembershipReconfirmationRepository();
    const period = { code: "Reconfirmation", startAt: now, endAt: new Date("2026-12-31") }; const dueAt = new Date(now.getTime() + 14 * 86400000);
    await repo.run(period, dueAt, now);
    expect((await repo.listMine(String(g.president)))[0]?.state).toBe("Exempt");
    const pending = (await repo.listMine(String(g.candidateUser)))[0]!;
    expect(pending.state).toBe("Pending");
    await expect(repo.confirm(pending.id, String(g.president), now)).rejects.toMatchObject({ kind: "forbidden" });
    await repo.confirm(pending.id, String(g.candidateUser), new Date(dueAt.getTime() - 1));
    const g2 = await governedClub();
    await repo.run(period, dueAt, now);
    const expires = (await repo.listMine(String(g2.candidateUser)))[0]!;
    await expect(repo.confirm(expires.id, String(g2.candidateUser), dueAt)).rejects.toMatchObject({ kind: "conflict" });
    await Promise.all([repo.run(period, dueAt, dueAt), repo.run(period, dueAt, dueAt)]);
    expect(await m.clubMemberships!.findById(g2.candidateMember).lean()).toMatchObject({ state: "Inactive" });
    expect(await m.clubMemberships!.findById(g.candidateMember).lean()).toMatchObject({ state: "Active" });
    expect(await m.clubMemberships!.findById(g2.presidentMember).lean()).toMatchObject({ state: "Active" });
    expect(await m.auditLogs!.countDocuments({ entityId: g2.candidateMember, action: "MEMBERSHIP_RECONFIRMATION_EXPIRED" })).toBe(1);
    expect(await m.membershipReconfirmations!.countDocuments({ membershipId: g2.candidateMember, periodCode: period.code })).toBe(1);
  });
  it("UC21 A2 expires an overdue request of a semester that has already ended", async () => {
    const g = await governedClub(); const repo = mongoMembershipReconfirmationRepository();
    const ended = { code: "Ended semester", startAt: new Date("2026-09-01"), endAt: new Date("2026-10-01") };
    const dueAt = new Date(ended.startAt.getTime() + 14 * 86400000);
    await repo.run(ended, dueAt, new Date("2026-09-02"));
    expect((await repo.listMine(String(g.candidateUser))).find((r) => r.periodCode === ended.code)?.state).toBe("Pending");
    // The server was down past the deadline and past the end of the semester.
    const later = new Date("2026-10-15");
    const first = await repo.expireOverdue(later);
    expect(first.expired).toBeGreaterThanOrEqual(1);
    expect((await repo.listMine(String(g.candidateUser))).find((r) => r.periodCode === ended.code)?.state).toBe("Expired");
    expect(await m.clubMemberships!.findById(g.candidateMember).lean()).toMatchObject({ state: "Inactive" });
    expect((await repo.listMine(String(g.president))).find((r) => r.periodCode === ended.code)?.state).toBe("Exempt");
    expect(await m.clubMemberships!.findById(g.presidentMember).lean()).toMatchObject({ state: "Active" });
    expect(await repo.expireOverdue(later)).toEqual({ expired: 0, exempt: 0 });
  });
  it("UC40 lists a no-violation closure issued before any response request", async () => {
    const g = await governedClub(); const repo = mongoClubViolationRepository();
    const closed = await m.violations!.create({ clubId: g.id, title: "Unfounded report", originType: "OTHER", severity: "MINOR", state: "Closed", openedBy: officer, openedAt: now,
      evidence: [], decisionReason: "No violation found", decidedBy: officer, decidedAt: now, resolvedAt: now });
    const dropped = await m.violations!.create({ clubId: g.id, title: "Opened in error", originType: "OTHER", severity: "MINOR", state: "Closed", openedBy: officer, openedAt: now, evidence: [] });
    const ids = (await repo.list(String(g.id), now)).map((v) => v.id);
    expect(ids).toContain(String(closed._id));
    expect(ids).not.toContain(String(dropped._id));
  });
  it("UC40 accepts one explanation even late, preserves the request, and submits corrective evidence", async () => {
    const g = await governedClub(); const repo = mongoClubViolationRepository(); const id = new Types.ObjectId();
    const response = { requestMessage: "Explain incident", requestedBy: officer, requestedAt: new Date(now.getTime() - 86400000), dueAt: new Date(now.getTime() - 1) };
    await m.violations!.create({ _id: id, clubId: g.id, title: "Incident", originType: "OTHER", severity: "MINOR", state: "Awaiting Club Response", openedBy: officer, openedAt: now, evidence: [], clubResponse: response });
    const hidden = await m.violations!.create({ clubId: g.id, title: "Internal investigation", originType: "OTHER", severity: "MINOR", state: "Under Investigation", openedBy: officer, openedAt: now, evidence: [] });
    expect((await repo.list(String(g.id), now)).map((v) => v.id)).toEqual([String(id)]);
    expect((await repo.list(String(other), now))).toEqual([]);
    const attempts = await Promise.allSettled([repo.respond(String(g.id), String(id), "Explanation", String(g.president), now), repo.respond(String(g.id), String(id), "Duplicate", String(g.president), now)]);
    expect(attempts.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await m.violations!.findById(id).lean())?.clubResponse).toMatchObject({ ...response, source: "CLUB", respondedAt: now });
    await expect(repo.respond(String(g.id), String(hidden._id), "Not disclosed", String(g.president), now)).rejects.toMatchObject({ kind: "conflict" });
    await m.violations!.updateOne({ _id: id }, { $set: { state: "Corrective Action", decidedBy: officer } });
    const action = await m.correctiveActions!.create({ violationId: id, description: "Repair", state: "Pending", dueAt: new Date("2026-11-01") });
    await repo.submitAction(String(g.id), String(id), String(action._id), { note: "Repaired", evidence: [{ note: "Photo", url: "https://example.org/photo" }] }, String(g.president), now);
    expect(await m.correctiveActions!.findById(action._id).lean()).toMatchObject({ state: "Pending", submission: { note: "Repaired" } });
    expect((await repo.list(String(g.id), now))[0]?.actions[0]?.submission?.note).toBe("Repaired");
  });
  it("UC43 hides draft revisions and other clubs while retaining Published versions", async () => {
    const g = await governedClub(); const schemeId = new Types.ObjectId(); const repo = mongoClubEvaluationRepository();
    for (const [revisionNo, state] of [[1, "Published"], [2, "Data Ready"]] as const) {
      await m.evaluations!.create({ clubId: g.id, periodCode: "Fall", schemeId, schemeVersion: 1, state, revisionNo, generatedAt: now, ...(state === "Published" ? { publishedAt: now, totalScore: 80, classification: "GOOD" } : {}) });
    }
    const records = await repo.listPublished(String(g.id)); expect(records).toHaveLength(1);
    expect(records[0]?.revisions).toHaveLength(1); expect(records[0]?.revisionNo).toBe(1);
    expect(await repo.listPublished(String(other))).toEqual([]);
  });
  it("UC07/08 expires only overdue revision requests once, at the exact deadline", async () => {
    const repo = mongoApplicationExpiryRepository();
    const application = await m.clubApplications!.create({ clubName: "Expired candidate", field: "Art", founderUserId: leader, state: "Revision Requested", revisionDeadlineAt: now, createdAt: now });
    const submitted = await m.clubApplications!.create({ clubName: "Submitted candidate", field: "Art", founderUserId: leader, state: "Submitted", revisionDeadlineAt: now, createdAt: now });
    const attempts = await Promise.all([repo.expire(now), repo.expire(now)]); expect(attempts.reduce((a, b) => a + b)).toBe(1);
    expect(await m.clubApplications!.findById(application._id).lean()).toMatchObject({ state: "Expired" });
    expect(await m.clubApplications!.findById(submitted._id).lean()).toMatchObject({ state: "Submitted" });
    expect(await m.notifications!.countDocuments({ entityId: application._id, eventCode: "CLUB_APPLICATION_EXPIRED" })).toBe(1);
  });

});
