import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoEventProposalReviewRepository } from "../../src/infra/db/mongo-event-proposal-review-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-event-review-test-${process.pid}`;
const DAY = 24 * 60 * 60 * 1000;

describe.skipIf(!uri)("Mongo event proposal review repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const officer = new Types.ObjectId();
  const otherOfficer = new Types.ObjectId();
  const member = new Types.ObjectId();
  const clubId = new Types.ObjectId();
  const budgetLines = [
    { category: "Truyền thông", amount: 2_000_000, purpose: "In poster" },
    { category: "Hậu cần", amount: 3_000_000, purpose: "Nước uống" },
  ];

  /** What the club side writes on submit (UC25 contract in the SPEC). */
  async function submit(title: string, lines: typeof budgetLines | null, eventId = new Types.ObjectId(), revisionNo = 1) {
    const startAt = new Date(now.getTime() + 10 * DAY);
    if (revisionNo === 1) {
      await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId, clubName: "HEBE", title,
        startAt, endAt: new Date(startAt.getTime() + 3 * 3_600_000), semesterCode: "Fall 2026",
        venueText: "Sảnh Delta", audienceScope: "PUBLIC", capacity: 80, riskCategory: "MEDIUM",
        conflictResult: "No Conflict", state: "Pending Approval", currentRevisionNo: 1, createdAt: now });
    } else {
      await ucmsModels.events!.updateOne({ _id: eventId }, { $set: { state: "Pending Approval", currentRevisionNo: revisionNo } });
    }
    await ucmsModels.eventProposalVersions!.create({ eventId, revisionNo, submittedBy: member, submittedAt: now,
      payload: { title, plan: "Kế hoạch chi tiết" },
      ...(lines ? { budgetLines: lines, requestedBudgetTotal: lines.reduce((sum, line) => sum + line.amount, 0) } : {}) });
    await ucmsModels.approvalTasks!.create({ entityType: "EVENT_PROPOSAL", entityId: eventId, clubId, title,
      state: "Open", openedAt: new Date(now.getTime() + revisionNo) });
    return String(eventId);
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.users!.insertMany([
      { _id: officer, email: "o@fpt.edu.vn", displayName: "Officer", googleSubject: "o", accountState: "Active", createdAt: now },
      { _id: otherOfficer, email: "p@fpt.edu.vn", displayName: "Other", googleSubject: "p", accountState: "Active", createdAt: now },
      { _id: member, email: "m@fpt.edu.vn", displayName: "Trưởng ban sự kiện", googleSubject: "m", accountState: "Active", createdAt: now }]);
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-HEBE", name: "HEBE", field: "Nghệ thuật", state: "Active", createdAt: now });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("claims, requests a revision, then approves the resubmission with a reduced budget", async () => {
    const repo = mongoEventProposalReviewRepository();
    const id = await submit("Đêm nhạc acoustic", budgetLines);
    expect((await repo.listOpen()).map((item) => [item.event.title, item.event.requestedBudgetTotal]))
      .toContainEqual(["Đêm nhạc acoustic", 5_000_000]);

    const claimed = await repo.claim(id, String(officer), now);
    expect(claimed.event.state).toBe("Under Review");
    expect(claimed.task.assigneeId).toBe(String(officer));
    expect(claimed.versions[0]?.submittedByName).toBe("Trưởng ban sự kiện");
    await expect(repo.claim(id, String(otherOfficer), now)).rejects.toMatchObject({ kind: "conflict" });

    const deadline = new Date(now.getTime() + 3 * DAY);
    const revised = await repo.decide(id, String(officer), { outcome: "Request revision", reason: "Làm rõ chi phí",
      sections: ["budget"], revisionDeadlineAt: deadline, conditions: [], budgetLines: [] }, now);
    expect(revised.event).toMatchObject({ state: "Revision Requested", revisionDeadlineAt: deadline });
    await expect(repo.decide(id, String(officer), { outcome: "Reject", reason: "x", sections: [], conditions: [],
      budgetLines: [] }, now)).rejects.toMatchObject({ kind: "conflict" });

    await submit("Đêm nhạc acoustic", budgetLines, new Types.ObjectId(id), 2);
    await repo.claim(id, String(officer), now);
    await expect(repo.decide(id, String(officer), { outcome: "Approve", sections: [], conditions: [],
      budgetLines: [{ approvedAmount: 2_000_000 }] }, now)).rejects.toMatchObject({ kind: "validation" });
    const approved = await repo.decide(id, String(officer), { outcome: "Approve", sections: [],
      conditions: ["Có bảo vệ trực"], budgetLines: [{ approvedAmount: 1_500_000, reason: "Giảm số poster" },
        { approvedAmount: 3_000_000 }] }, now);
    expect(approved.event).toMatchObject({ state: "Approved", approvalConditions: ["Có bảo vệ trực"] });
    expect(approved.event.revisionDeadlineAt).toBeUndefined();
    expect(approved.decisions.map((decision) => decision.outcome)).toEqual(["Request revision", "Approve"]);
    expect(approved.budget).toMatchObject({ state: "Approved", requestedTotal: 5_000_000, approvedTotal: 4_500_000,
      lines: [{ category: "Truyền thông", requestedAmount: 2_000_000, approvedAmount: 1_500_000, reason: "Giảm số poster" },
        { category: "Hậu cần", requestedAmount: 3_000_000, approvedAmount: 3_000_000 }] });
    expect(await ucmsModels.eventBudgets!.countDocuments({ eventId: new Types.ObjectId(id) })).toBe(1);
    expect(await ucmsModels.notifications!.countDocuments({ recipientUserId: member, entityId: new Types.ObjectId(id) })).toBe(2);
    expect(await ucmsModels.auditLogs!.countDocuments({ entityId: new Types.ObjectId(id), action: "EVENT_PROPOSAL_APPROVED" })).toBe(1);
    expect((await repo.listOpen()).some((item) => item.event.id === id)).toBe(false);

    const second = await submit("Hội thảo khởi nghiệp", null);
    await repo.claim(second, String(officer), now);
    const other = await repo.find(second, now);
    expect(other?.semesterBudgets.map((budget) => [budget.eventTitle, budget.approvedTotal]))
      .toEqual([["Đêm nhạc acoustic", 4_500_000]]);
  });

  it("approves a proposal without budget lines without creating a budget, and rejects with a reason", async () => {
    const repo = mongoEventProposalReviewRepository();
    const id = await submit("Sinh hoạt định kỳ", null);
    await repo.claim(id, String(officer), now);
    const approved = await repo.decide(id, String(officer), { outcome: "Approve", sections: [], conditions: [],
      budgetLines: [] }, now);
    expect(approved.event.state).toBe("Approved");
    expect(approved.budget).toBeUndefined();

    const rejected = await submit("Cắm trại qua đêm", null);
    await expect(repo.decide(rejected, String(officer), { outcome: "Reject", reason: "Rủi ro cao", sections: [],
      conditions: [], budgetLines: [] }, now)).rejects.toMatchObject({ kind: "conflict" });
    await repo.claim(rejected, String(officer), now);
    expect((await repo.decide(rejected, String(officer), { outcome: "Reject", reason: "Rủi ro cao", sections: [],
      conditions: [], budgetLines: [] }, now)).event.state).toBe("Rejected");
  });

  it("expires overdue revisions and moves published events along their own times", async () => {
    const repo = mongoEventProposalReviewRepository();
    const id = await submit("Quá hạn sửa", null);
    await repo.claim(id, String(officer), now);
    await repo.decide(id, String(officer), { outcome: "Request revision", reason: "Bổ sung kế hoạch",
      sections: ["content"], revisionDeadlineAt: new Date(now.getTime() + DAY), conditions: [], budgetLines: [] }, now);
    function published(title: string, startAt: Date, endAt: Date, state: string) {
      return { organizerType: "CLUB", clubId, clubName: "HEBE", title, startAt, endAt, semesterCode: "Fall 2026",
        audienceScope: "PUBLIC", capacity: 10, state, createdAt: now };
    }
    const later = new Date(now.getTime() + 2 * DAY);
    const [running, finished] = await ucmsModels.events!.insertMany([
      published("Đang diễn ra", new Date(later.getTime() - 3_600_000), new Date(later.getTime() + 3_600_000), "Upcoming"),
      published("Đã xong", new Date(later.getTime() - 5 * 3_600_000), new Date(later.getTime() - 3_600_000), "Ongoing")]);

    expect(await repo.advanceLifecycle(later)).toMatchObject({ expired: 1, started: 1, completed: 1 });
    expect((await ucmsModels.events!.findById(id).lean())?.state).toBe("Expired");
    expect((await ucmsModels.events!.findById(running!._id).lean())?.state).toBe("Ongoing");
    expect((await ucmsModels.events!.findById(finished!._id).lean())?.state).toBe("Completed");
    expect(await repo.advanceLifecycle(later)).toMatchObject({ expired: 0, started: 0, completed: 0 });
  });
});
