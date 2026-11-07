import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mongoComplaintRepository } from "../../src/infra/db/mongo-complaint-repository.js";
import { ensureUcmsDatabase, ucmsModels as m } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-complaint-test-${process.pid}`;
const now = new Date("2026-11-07T10:00:00Z");
const triage = { severity: "MODERATE" as const, validity: "VALID" as const, reason: "Checked with the event log" };

describe.skipIf(!uri)("Mongo complaint repository (UC50–UC52)", () => {
  const ids = { clubA: new Types.ObjectId(), clubB: new Types.ObjectId(), student: new Types.ObjectId(),
    officer: new Types.ObjectId(), leader: new Types.ObjectId(), member: new Types.ObjectId() };

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
  }, 30_000);
  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    for (const model of Object.values(m)) await model.deleteMany({});
    await m.clubs!.insertMany([
      { _id: ids.clubA, code: "CLB-A", name: "Club A", field: "Arts", state: "Active", createdAt: now },
      { _id: ids.clubB, code: "CLB-B", name: "Club B", field: "Arts", state: "Active", createdAt: now },
    ]);
    await m.users!.insertMany([
      { _id: ids.student, email: "secret.student@fpt.edu.vn", displayName: "Secret Student", accountState: "Active", createdAt: now },
      { _id: ids.officer, email: "officer@fpt.edu.vn", displayName: "Officer", accountState: "Active", createdAt: now },
      { _id: ids.leader, email: "leader@fpt.edu.vn", displayName: "Leader", accountState: "Active", createdAt: now },
      { _id: ids.member, email: "member@fpt.edu.vn", displayName: "Member", accountState: "Active", createdAt: now },
    ]);
    const [role] = await m.roles!.create([{ code: "ICPDP_OFFICER", name: "ICPDP OFFICER", scope: "system", permissionCodes: [], isSystem: true }]);
    await m.userRoleAssignments!.create({ userId: ids.officer, roleId: role!._id, grantedBy: ids.officer, grantedAt: now });
    const term = await m.clubTerms!.create({ clubId: ids.clubA, name: "T", state: "Active", startAt: new Date("2026-01-01"),
      endAt: new Date("2027-01-01") });
    const seat = await m.clubPositions!.create({ clubId: ids.clubA, code: "CLUB_LEADER", name: "Chủ nhiệm", isBoardSeat: true,
      isLeaderRole: true, isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: [], isActive: true });
    const [leaderMembership] = await m.clubMemberships!.create([
      { clubId: ids.clubA, userId: ids.leader, state: "Active", joinedAt: now, statusHistory: [] },
      { clubId: ids.clubA, userId: ids.member, state: "Active", joinedAt: now, statusHistory: [] }]);
    await m.clubPositionAssignments!.create({ clubId: ids.clubA, termId: term._id, positionId: seat._id,
      membershipId: leaderMembership!._id, effectiveFrom: new Date("2026-01-01"), assignedBy: ids.officer, confirmedBy: ids.officer });
  });

  async function submitted() {
    return mongoComplaintRepository().submit({ studentId: String(ids.student), clubId: String(ids.clubA), type: "CONDUCT",
      description: "Rude at the booth", evidence: [{ label: "photo", url: "https://example.com/p.jpg" }], now });
  }

  it("AC19: only ICPDP sees a new complaint; the club gets it only after Forwarded, never with the complainant (D5)", async () => {
    const repo = mongoComplaintRepository();
    const created = await submitted();
    expect(await m.approvalTasks!.countDocuments({ entityType: "COMPLAINT", entityId: new Types.ObjectId(created.id), state: "Open" })).toBe(1);
    expect(await m.notifications!.distinct("recipientUserId", { eventCode: "COMPLAINT_SUBMITTED" })).toEqual([ids.officer]);
    expect(await repo.clubInbox(String(ids.clubA))).toEqual([]);
    const audit = await m.auditLogs!.findOne({ action: "COMPLAINT_SUBMITTED" }).lean();
    expect(JSON.stringify(audit)).not.toContain("Rude at the booth");

    await repo.decide(created.id, String(ids.officer), { kind: "open" }, now);
    expect(await repo.clubInbox(String(ids.clubA))).toEqual([]);
    const due = new Date("2026-11-14T10:00:00Z");
    await repo.decide(created.id, String(ids.officer), { kind: "triage", outcome: "Forwarded", ...triage, responseDueAt: due }, now);
    const inbox = await repo.clubInbox(String(ids.clubA));
    expect(inbox).toEqual([expect.objectContaining({ id: created.id, state: "Forwarded", forwardNote: triage.reason, responseDueAt: due })]);
    expect(await repo.clubInbox(String(ids.clubB))).toEqual([]);
    const payload = JSON.stringify(inbox);
    expect(payload).not.toMatch(/secret\.student|Secret Student|complainant/);
    expect(await m.notifications!.distinct("recipientUserId", { eventCode: "COMPLAINT_FORWARDED" })).toEqual([ids.leader]);
    const clubNotice = await m.notifications!.findOne({ eventCode: "COMPLAINT_FORWARDED" }).lean();
    expect(JSON.stringify(clubNotice)).not.toMatch(/secret|Secret|complainant/);

    const answered = await repo.respond(String(ids.clubA), created.id, String(ids.leader),
      { text: "We apologised", action: "Booth rota changed", evidence: [] }, now);
    expect(answered.state).toBe("Club Responded");
    await expect(repo.respond(String(ids.clubA), created.id, String(ids.leader), { text: "Again", action: "x", evidence: [] }, now))
      .rejects.toMatchObject({ kind: "conflict" });
    const closed = await repo.decide(created.id, String(ids.officer), { kind: "close", reason: "Action verified" }, now);
    expect(closed).toMatchObject({ state: "Closed", closure: { reason: "Action verified" } });
    expect(await m.approvalTasks!.countDocuments({ entityType: "COMPLAINT", state: "Open" })).toBe(0);
  });

  it("AC19: Escalated opens a violation linked both ways in the same transaction", async () => {
    const repo = mongoComplaintRepository();
    const created = await submitted();
    await repo.decide(created.id, String(ids.officer), { kind: "open" }, now);
    const escalated = await repo.decide(created.id, String(ids.officer), { kind: "triage", outcome: "Escalated", ...triage }, now);
    expect(escalated.state).toBe("Escalated");
    const violation = await m.violations!.findById(escalated.violationId).lean();
    expect(violation).toMatchObject({ clubId: ids.clubA, originType: "COMPLAINT", originRefId: new Types.ObjectId(created.id),
      severity: "MODERATE", state: "Open" });
    expect(await repo.clubInbox(String(ids.clubA))).toEqual([]);
  });

  /** UC50 E1: ICPDP links `follower` into `root` while reviewing. */
  async function link(followerId: string, rootId: string) {
    return mongoComplaintRepository().decide(followerId, String(ids.officer), { kind: "link", targetId: rootId, reason: "Same incident" }, now);
  }

  it("UC50 E1: never links at submission; ICPDP links only the same student's undecided complaints about the same club", async () => {
    const repo = mongoComplaintRepository();
    const first = await submitted();
    const second = await submitted();
    expect(second.linkedComplaintId).toBeUndefined();
    expect(await m.approvalTasks!.countDocuments({ state: "Open" })).toBe(2);
    const otherClub = await repo.submit({ studentId: String(ids.student), clubId: String(ids.clubB), type: "CONDUCT",
      description: "x", evidence: [], now });
    const otherStudent = await repo.submit({ studentId: String(ids.member), clubId: String(ids.clubA), type: "CONDUCT",
      description: "x", evidence: [], now });
    for (const target of [otherClub.id, otherStudent.id, second.id]) {
      await expect(link(target === second.id ? second.id : first.id, target)).rejects.toMatchObject({ kind: "conflict" });
    }
    await link(second.id, first.id);
    expect((await m.complaints!.findById(second.id).lean())?.linkedComplaintId?.toString()).toBe(first.id);
    expect(await m.approvalTasks!.countDocuments({ entityId: new Types.ObjectId(second.id), state: "Open" })).toBe(0);
    expect(await m.auditLogs!.countDocuments({ entityId: new Types.ObjectId(second.id), action: "COMPLAINT_LINKED" })).toBe(1);
    // A decided complaint cannot be linked or linked to.
    await repo.decide(otherClub.id, String(ids.officer), { kind: "open" }, now);
    await repo.decide(otherClub.id, String(ids.officer), { kind: "triage", outcome: "Dismissed", ...triage }, now);
    await expect(link(otherClub.id, first.id)).rejects.toMatchObject({ kind: "conflict" });
  });

  it("linked duplicates share the triage outcome, the club answer and the final outcome", async () => {
    const repo = mongoComplaintRepository();
    const root = await submitted();
    const follower = await submitted();
    await link(follower.id, root.id);
    await repo.decide(root.id, String(ids.officer), { kind: "open" }, now);
    await repo.decide(root.id, String(ids.officer), { kind: "triage", outcome: "Forwarded", ...triage,
      responseDueAt: new Date("2026-11-20T00:00:00Z") }, now);
    expect((await repo.clubInbox(String(ids.clubA))).map((item) => item.id)).toEqual([root.id]);
    await repo.respond(String(ids.clubA), root.id, String(ids.leader), { text: "Sorry", action: "Fixed", evidence: [] }, now);
    await repo.decide(root.id, String(ids.officer), { kind: "escalate", severity: "MINOR", reason: "Repeated" }, now);
    const pair = await m.complaints!.find({ _id: { $in: [new Types.ObjectId(root.id), new Types.ObjectId(follower.id)] } }).lean();
    expect(pair.map((doc) => doc.state)).toEqual(["Escalated", "Escalated"]);
    expect(new Set(pair.map((doc) => String(doc.violationId))).size).toBe(1);
    const forwarded = await m.auditLogs!.findOne({ entityId: new Types.ObjectId(follower.id), action: "COMPLAINT_FORWARDED" }).lean();
    expect(forwarded?.before).toEqual({ state: "Submitted" });
    expect(await m.auditLogs!.countDocuments({ entityId: new Types.ObjectId(follower.id), action: "COMPLAINT_CLUB_RESPONDED" })).toBe(1);
  });

  it("never handles a linked duplicate on its own: not queued and refused by every step", async () => {
    const repo = mongoComplaintRepository();
    const root = await submitted();
    const follower = await submitted();
    await link(follower.id, root.id);
    expect((await repo.queue({})).map((item) => item.id)).toEqual([root.id]);
    expect((await repo.findForIcpdp(root.id))?.linkedComplaintIds).toEqual([follower.id]);
    for (const decision of [{ kind: "open" as const }, { kind: "triage" as const, outcome: "Forwarded" as const, ...triage },
      { kind: "close" as const, reason: "x" }, { kind: "escalate" as const, severity: "MINOR" as const, reason: "x" },
      { kind: "link" as const, targetId: root.id, reason: "x" }]) {
      await expect(repo.decide(follower.id, String(ids.officer), decision, now)).rejects.toMatchObject({ kind: "conflict" });
    }
    await repo.decide(root.id, String(ids.officer), { kind: "open" }, now);
    await repo.decide(root.id, String(ids.officer), { kind: "triage", outcome: "Forwarded", ...triage }, now);
    await expect(repo.respond(String(ids.clubA), follower.id, String(ids.leader), { text: "t", action: "a", evidence: [] }, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });

  it("hands the review to the oldest duplicate when the root is withdrawn", async () => {
    const repo = mongoComplaintRepository();
    const root = await submitted();
    const first = await submitted();
    const second = await submitted();
    await link(first.id, root.id);
    await link(second.id, root.id);
    await repo.withdraw(String(ids.student), root.id, now);
    expect((await m.complaints!.findById(first.id).lean())?.linkedComplaintId).toBeUndefined();
    expect(String((await m.complaints!.findById(second.id).lean())?.linkedComplaintId)).toBe(first.id);
    expect(await m.approvalTasks!.countDocuments({ entityId: new Types.ObjectId(first.id), state: "Open" })).toBe(1);
    expect((await repo.queue({ state: "Submitted" })).map((item) => item.id)).toEqual([first.id]);
  });

  it("withdraws only an undecided own complaint, and two concurrent openings let exactly one win", async () => {
    const repo = mongoComplaintRepository();
    const created = await submitted();
    expect(await repo.withdraw(String(ids.officer), created.id, now)).toBeNull();
    const results = await Promise.allSettled([repo.decide(created.id, String(ids.officer), { kind: "open" }, now),
      repo.decide(created.id, String(ids.officer), { kind: "open" }, now)]);
    expect(results.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(await repo.withdraw(String(ids.student), created.id, now)).toMatchObject({ state: "Withdrawn" });
    expect(await repo.withdraw(String(ids.student), created.id, now)).toBeNull();
    expect(await m.approvalTasks!.countDocuments({ state: "Open" })).toBe(0);
  });

  it("raises the overdue-response signal once (UC52 E1)", async () => {
    const repo = mongoComplaintRepository();
    const created = await submitted();
    await repo.decide(created.id, String(ids.officer), { kind: "open" }, now);
    await repo.decide(created.id, String(ids.officer), { kind: "triage", outcome: "Forwarded", ...triage,
      responseDueAt: new Date("2026-11-08T00:00:00Z") }, now);
    const later = new Date("2026-11-09T00:00:00Z");
    // Two workers (e.g. two server instances) racing still raise the signal once.
    const [first, second] = await Promise.all([repo.flagOverdueResponses(later), mongoComplaintRepository().flagOverdueResponses(later)]);
    expect(first + second).toBe(1);
    expect(await repo.flagOverdueResponses(later)).toBe(0);
    expect(await m.notifications!.countDocuments({ eventCode: "COMPLAINT_RESPONSE_OVERDUE" })).toBe(1);
  });
});
