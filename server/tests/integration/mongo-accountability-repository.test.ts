import { mongoAccountabilityReminderRepository } from "../../src/infra/db/mongo-accountability-reminder-repository.js";
import { applyEventAttendanceAction } from "../../src/infra/db/event-attendance-actions.js";
import { overduePostEventReports } from "../../src/infra/db/post-event-report-deadlines.js";
import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoEventFinanceRepository } from "../../src/infra/db/mongo-event-finance-repository.js";
import { mongoPostEventReportRepository } from "../../src/infra/db/mongo-post-event-report-repository.js";
import { mongoBudgetDisbursementRepository } from "../../src/infra/db/mongo-budget-disbursement-repository.js";
import {
  ensureUcmsDatabase,
  ucmsModels as m,
} from "../../src/infra/db/ucms-models.js";
import { DEFAULT_FORM_REQUIREMENTS } from "../../src/domain/policy.js";
import type { FinanceDetail } from "../../src/domain/event-finance.js";
const uri = process.env.MONGO_URI;
const now = new Date("2026-10-11T00:00:00Z");
const DAY = 86400000;
const actor = new Types.ObjectId(),
  club = new Types.ObjectId();
const finance = mongoEventFinanceRepository({
  recoveryDueDays: 14,
  evidenceTypes: ["INVOICE", "RECEIPT", "PROOF_OF_PAYMENT"],
});
const reports = mongoPostEventReportRepository();
function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}
async function fixture(advance = 100, endedDays = 3, state = "Completed") {
  const event = await m.events!.create({
    organizerType: "CLUB",
    clubId: club,
    clubName: "Wave 4",
    title: "Completed workshop",
    state,
    startAt: new Date(now.getTime() - (endedDays + 1) * DAY),
    endAt: new Date(now.getTime() - endedDays * DAY),
    semesterCode: "Fall",
    audienceScope: "PUBLIC",
    capacity: 20,
    currentRevisionNo: 1,
    attendanceFinalized: true,
    createdAt: now,
  });
  await m.eventProposalVersions!.create({
    eventId: event._id,
    revisionNo: 1,
    payload: { title: event.title, objective: "Goal" },
    submittedBy: actor,
    submittedAt: now,
  });
  const budget = await m.eventBudgets!.create({
    eventId: event._id,
    clubId: club,
    lines: [{ category: "Supplies", approvedAmount: 200 }],
    requestedTotal: decimal(200),
    approvedTotal: decimal(200),
    approvedByDecisionId: new Types.ObjectId(),
    disbursedTotal: decimal(advance),
    refundedTotal: decimal(0),
    state: "Disbursed",
    settlementDueAt: new Date(now.getTime() + (14 - endedDays) * DAY),
    createdAt: now,
  });
  await m.budgetDisbursements!.create({
    eventBudgetId: budget._id,
    kind: "Advance",
    amount: decimal(advance),
    disbursedAt: now,
    recordedBy: actor,
  });
  return { eventId: String(event._id), budgetId: String(budget._id) };
}
async function expense(
  detail: FinanceDetail,
  amount = 80,
  category = "Supplies",
  supported = true,
) {
  let d = await finance.act(
    detail.id,
    String(club),
    String(actor),
    {
      kind: "expense",
      revision: detail.revision,
      input: { category, amount, spentAt: now },
    },
    now,
  );
  if (supported)
    d = await finance.act(
      d.id,
      String(club),
      String(actor),
      {
        kind: "evidence",
        revision: d.revision,
        expenseId: d.expenses.at(-1)!.id,
        input: { type: "RECEIPT", externalLink: "https://example.edu/receipt" },
      },
      now,
    );
  return d;
}
describe.skipIf(!uri)("Wave 4 Mongo accountability", () => {
  beforeAll(async () => {
    await mongoose.connect(uri ?? "", {
      dbName: `ucms-wave4-test-${process.pid}`,
    });
    await ensureUcmsDatabase();
    await m.users!.create({
      _id: actor,
      email: "wave4@test.edu",
      googleSubject: "wave4",
      displayName: "Officer",
      accountState: "Active",
      createdAt: now,
    });
    await m.clubs!.create({
      _id: club,
      code: "W4",
      name: "Wave 4",
      field: "Technology",
      state: "Active",
      createdAt: now,
    });
    await m.clubMemberships!.create({
      clubId: club,
      userId: actor,
      state: "Active",
      joinedAt: now,
      statusHistory: [],
    });
    await m.clubPositions!.create({
      clubId: club,
      code: "MEMBERS",
      name: "Members",
      isDefaultMemberRole: true,
      isActive: true,
      permissionCodes: ["club.expense.record", "club.report.submit"],
    });
    const role = await m.roles!.create({
      code: "ICPDP_OFFICER",
      name: "Officer",
      scope: "system",
      permissionCodes: [],
    });
    await m.userRoleAssignments!.create({
      userId: actor,
      roleId: role._id,
      grantedBy: actor,
      grantedAt: now,
    });
    await m.policyVersions!.create({
      minFoundingMembers: 5,
      formRequirements: DEFAULT_FORM_REQUIREMENTS,
      reportDeadlines: [
        {
          reportType: "POST_EVENT",
          dueDaysAfterPeriodEnd: 7,
          remindBeforeDays: 2,
          overdueAfterDays: 8,
          escalateAfterDays: 14,
        },
      ],
      conflictThresholdMinutes: 15,
      feedbackWindowHours: 72,
      feedbackMinRespondents: 2,
      allowOverbooking: false,
      enforceOverdueReportBlock: true,
      academicCalendar: [],
      effectiveFrom: new Date(now.getTime() - 100 * DAY),
      createdBy: actor,
      createdAt: now,
    });
  }, 30000);
  afterAll(async () => {
    if (mongoose.connection.readyState === 1)
      await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  it("locks expenses at submit, permits corrections, preserves snapshots and recovers partial advances", async () => {
    const f = await fixture();
    let d = await expense((await finance.find(f.budgetId))!);
    const result = await Promise.allSettled(
      [1, 2].map(() =>
        finance.act(
          d.id,
          String(club),
          String(actor),
          { kind: "submit", revision: d.revision },
          now,
        ),
      ),
    );
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      await m.approvalTasks!.countDocuments({
        entityType: "BUDGET_SETTLEMENT",
        entityId: d.id,
      }),
    ).toBe(1);
    d = (await finance.find(d.id))!;
    await expect(
      finance.act(
        d.id,
        String(club),
        String(actor),
        {
          kind: "expense",
          revision: d.revision,
          input: { category: "Supplies", amount: 50, spentAt: now },
        },
        now,
      ),
    ).rejects.toMatchObject({ kind: "conflict" });
    d = await finance.act(
      d.id,
      undefined,
      String(actor),
      { kind: "claim", revision: d.revision },
      now,
    );
    d = await finance.act(
      d.id,
      undefined,
      String(actor),
      { kind: "return", revision: d.revision, reason: "Add receipt" },
      now,
    );
    d = await finance.act(
      d.id,
      String(club),
      String(actor),
      { kind: "submit", revision: d.revision },
      now,
    );
    d = await finance.act(
      d.id,
      undefined,
      String(actor),
      { kind: "claim", revision: d.revision },
      now,
    );
    d = await finance.act(
      d.id,
      undefined,
      String(actor),
      {
        kind: "finalize",
        revision: d.revision,
        reviews: d.expenses.map((e) => ({
          expenseId: e.id,
          outcome: "Accepted",
          reason: "Valid",
        })),
      },
      now,
    );
    expect(d).toMatchObject({
      state: "Recovery Pending",
      recoveryAmount: 20,
      recoveryDueAt: new Date(now.getTime() + 14 * DAY),
    });
    expect(
      d.history.filter((h) => h.action === "SETTLEMENT_SUBMIT"),
    ).toHaveLength(2);
    const flows = mongoBudgetDisbursementRepository();
    expect(
      (
        await flows.record(
          d.id,
          String(actor),
          { kind: "Refund", amount: 10, disbursedAt: now },
          now,
        )
      ).state,
    ).toBe("Recovery Pending");
    expect(
      (
        await flows.record(
          d.id,
          String(actor),
          { kind: "Refund", amount: 10, disbursedAt: now },
          now,
        )
      ).state,
    ).toBe("Closed");
  });
  it("handles top-up and zero balance, denies orphan evidence, and marks category exceptions", async () => {
    for (const amount of [100, 150]) {
      const f = await fixture();
      let d = await expense((await finance.find(f.budgetId))!, amount, "Other");
      expect(d.expenses[0]).toMatchObject({
        isOutOfCategory: true,
        isOverRemaining: true,
      });
      await expect(
        finance.act(
          d.id,
          String(club),
          String(actor),
          {
            kind: "evidence",
            revision: d.revision,
            expenseId: String(new Types.ObjectId()),
            input: { type: "RECEIPT", externalLink: "https://example.edu" },
          },
          now,
        ),
      ).rejects.toMatchObject({ kind: "not_found" });
      d = await finance.act(
        d.id,
        String(club),
        String(actor),
        { kind: "submit", revision: d.revision },
        now,
      );
      d = await finance.act(
        d.id,
        undefined,
        String(actor),
        { kind: "claim", revision: d.revision },
        now,
      );
      d = await finance.act(
        d.id,
        undefined,
        String(actor),
        {
          kind: "finalize",
          revision: d.revision,
          reviews: d.expenses.map((e) => ({
            expenseId: e.id,
            outcome: "Accepted",
            reason: "Valid exception",
          })),
        },
        now,
      );
      expect(d.state).toBe(amount === 100 ? "Closed" : "Reconciled");
      if (amount === 150)
        expect(
          (
            await mongoBudgetDisbursementRepository().record(
              d.id,
              String(actor),
              { kind: "TopUp", amount: 50, disbursedAt: now },
              now,
            )
          ).state,
        ).toBe("Closed");
    }
  });
  it("serializes overdue A2 against submission and excludes unsupported spend", async () => {
    const f = await fixture(100, 20, "Cancelled");
    const d = await expense(
      (await finance.find(f.budgetId))!,
      20,
      "Supplies",
      false,
    );
    const results = await Promise.allSettled([
      finance.act(
        d.id,
        String(club),
        String(actor),
        { kind: "submit", revision: d.revision },
        now,
      ),
      finance.act(
        d.id,
        undefined,
        String(actor),
        {
          kind: "finalize",
          overdue: true,
          revision: d.revision,
          reviews: d.expenses.map((e) => ({
            expenseId: e.id,
            outcome: "Rejected",
            reason: "Missing receipt",
          })),
        },
        now,
      ),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await finance.find(d.id))?.isSettlementLate).toBe(true);
  });
  it("submits immutable report versions, freezes feedback privacy and prevents duplicate tasks", async () => {
    const f = await fixture();
    let d = (await reports.find(f.eventId, String(club), now))!;
    d = await reports.act(
      f.eventId,
      String(club),
      String(actor),
      {
        kind: "save",
        revision: d.obligation.revision,
        input: { actualResult: "Workshop succeeded", evidence: [] },
      },
      now,
    );
    const result = await Promise.allSettled(
      [1, 2].map(() =>
        reports.act(
          f.eventId,
          String(club),
          String(actor),
          { kind: "submit", revision: d.obligation.revision },
          now,
        ),
      ),
    );
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    d = (await reports.find(f.eventId, undefined, now))!;
    expect(d.versions[0]?.preloadedFigures.feedback).toEqual({
      respondents: 0,
      visible: false,
    });
    const snapshot = d.versions[0]!.preloadedFigures;
    d = await reports.act(
      f.eventId,
      undefined,
      String(actor),
      { kind: "claim", revision: d.obligation.revision },
      now,
    );
    d = await reports.act(
      f.eventId,
      undefined,
      String(actor),
      {
        kind: "decision",
        revision: d.obligation.revision,
        outcome: "return",
        reason: "Clarify lessons",
      },
      now,
    );
    d = await reports.act(
      f.eventId,
      String(club),
      String(actor),
      {
        kind: "save",
        revision: d.obligation.revision,
        input: { actualResult: "Revised results", evidence: [] },
      },
      now,
    );
    d = await reports.act(
      f.eventId,
      String(club),
      String(actor),
      { kind: "submit", revision: d.obligation.revision },
      now,
    );
    expect(d.versions).toHaveLength(2);
    expect(d.versions[1]!.preloadedFigures).toEqual(snapshot);
    d = await reports.act(
      f.eventId,
      undefined,
      String(actor),
      { kind: "claim", revision: d.obligation.revision },
      now,
    );
    d = await reports.act(
      f.eventId,
      undefined,
      String(actor),
      {
        kind: "decision",
        revision: d.obligation.revision,
        outcome: "accept",
        reason: "Verified",
      },
      now,
    );
    expect(d.obligation.state).toBe("Closed");
    expect((await finance.find(f.budgetId))?.state).toBe("Disbursed");
  });
  it("keeps report snapshots private, blocks attendance unlocking and requires valid finding ownership", async () => {
    const f = await fixture();
    const students = [new Types.ObjectId(), new Types.ObjectId()];
    await m.eventFeedbacks!.create({
      eventId: f.eventId,
      clubId: club,
      studentId: students[0],
      attendanceId: new Types.ObjectId(),
      scores: [{ criterionCode: "overall", score: 5 }],
      comment: "Private comment",
      isAnonymous: false,
      submittedAt: now,
    });
    let d = (await reports.find(f.eventId, String(club), now))!;
    expect(d.preview.feedback).toEqual({ respondents: 1, visible: false });
    d = await reports.act(
      f.eventId,
      String(club),
      String(actor),
      {
        kind: "save",
        revision: d.obligation.revision,
        input: { actualResult: "Results", evidence: [] },
      },
      now,
    );
    await reports.act(
      f.eventId,
      String(club),
      String(actor),
      { kind: "submit", revision: d.obligation.revision },
      now,
    );
    await m.eventFeedbacks!.create({
      eventId: f.eventId,
      clubId: club,
      studentId: students[1],
      attendanceId: new Types.ObjectId(),
      scores: [{ criterionCode: "overall", score: 3 }],
      comment: "Visible after threshold",
      isAnonymous: true,
      submittedAt: now,
    });
    d = (await reports.find(f.eventId, undefined, now))!;
    expect(d.preview.feedback).toMatchObject({
      visible: true,
      averageRating: 4,
    });
    expect(d.versions[0]!.preloadedFigures.feedback).toEqual({
      respondents: 1,
      visible: false,
    });
    expect(JSON.stringify(d)).not.toContain(String(students[0]));
    await expect(
      mongoose.connection.transaction(async (session) => {
        const event = await m
          .events!.findById(f.eventId)
          .session(session)
          .lean();
        await applyEventAttendanceAction(
          session,
          event!,
          { kind: "unlock", reason: "Correction" },
          actor,
          now,
          false,
        );
      }),
    ).rejects.toThrow("report history");
    d = await reports.act(
      f.eventId,
      undefined,
      String(actor),
      { kind: "claim", revision: d.obligation.revision },
      now,
    );
    await expect(
      reports.act(
        f.eventId,
        undefined,
        String(actor),
        {
          kind: "decision",
          revision: d.obligation.revision,
          outcome: "finding",
          reason: "Detected issue",
          violationId: String(new Types.ObjectId()),
        },
        now,
      ),
    ).rejects.toMatchObject({ kind: "validation" });
    const violation = await m.violations!.create({
      clubId: club,
      originType: "REPORT_FINDING",
      originRefId: f.eventId,
      severity: "MINOR",
      title: "Issue",
      state: "Open",
      openedBy: actor,
      openedAt: now,
    });
    d = await reports.act(
      f.eventId,
      undefined,
      String(actor),
      {
        kind: "decision",
        revision: d.obligation.revision,
        outcome: "finding",
        reason: "Detected issue",
        violationId: String(violation._id),
      },
      now,
    );
    expect(d.versions[0]!.findingViolationId).toBe(String(violation._id));
  });
  it("reminders are idempotent and submitted reports stop overdue blocking", async () => {
    const f = await fixture(100, 20);
    let d = (await reports.find(f.eventId, undefined, now))!;
    expect(d.obligation.overdue).toBe(true);
    expect((await overduePostEventReports(club, now)).map(String)).toContain(
      f.eventId,
    );
    const reminders = mongoAccountabilityReminderRepository();
    await reminders.remind(now);
    const notices = await m.notifications!.countDocuments();
    expect(await reminders.remind(now)).toBe(0);
    expect(await m.notifications!.countDocuments()).toBe(notices);
    d = (await reports.find(f.eventId, undefined, now))!;
    d = await reports.act(
      f.eventId,
      undefined,
      String(actor),
      { kind: "overdue", revision: d.obligation.revision, reason: "No report" },
      now,
    );
    await expect(
      reports.act(
        f.eventId,
        undefined,
        String(actor),
        {
          kind: "overdue",
          revision: d.obligation.revision,
          reason: "No report",
        },
        now,
      ),
    ).rejects.toMatchObject({ kind: "conflict" });
    d = await reports.act(
      f.eventId,
      String(club),
      String(actor),
      {
        kind: "save",
        revision: d.obligation.revision,
        input: { actualResult: "Late results", evidence: [] },
      },
      now,
    );
    d = await reports.act(
      f.eventId,
      String(club),
      String(actor),
      { kind: "submit", revision: d.obligation.revision },
      now,
    );
    expect(d.versions[0]?.lateFlag).toBe(true);
    expect(
      (await overduePostEventReports(club, now)).map(String),
    ).not.toContain(f.eventId);
  });
  it("checks permission at commit, skips Internal and rejects unfinalized or contradictory report data", async () => {
    const f = await fixture();
    const other = String(new Types.ObjectId());
    expect(await finance.find(f.budgetId, other)).toBeNull();
    expect(await reports.find(f.eventId, other, now)).toBeNull();
    let d = (await reports.find(f.eventId, undefined, now))!;
    await m.events!.updateOne(
      { _id: f.eventId },
      { $set: { attendanceFinalized: false } },
    );
    await expect(
      reports.act(
        f.eventId,
        String(club),
        String(actor),
        {
          kind: "save",
          revision: d.obligation.revision,
          input: { actualResult: "Results", evidence: [] },
        },
        now,
      ),
    ).rejects.toMatchObject({ kind: "conflict" });
    await m.events!.updateOne(
      { _id: f.eventId },
      { $set: { attendanceFinalized: true } },
    );
    d = await reports.act(
      f.eventId,
      String(club),
      String(actor),
      {
        kind: "save",
        revision: d.obligation.revision,
        input: { actualResult: "Results", evidence: [] },
      },
      now,
    );
    d = await reports.act(
      f.eventId,
      String(club),
      String(actor),
      { kind: "submit", revision: d.obligation.revision },
      now,
    );
    d = await reports.act(
      f.eventId,
      undefined,
      String(actor),
      { kind: "claim", revision: d.obligation.revision },
      now,
    );
    await m.attendances!.create({
      eventId: f.eventId,
      studentId: new Types.ObjectId(),
      checkedInAt: now,
      method: "manual",
      finalized: true,
    });
    await expect(
      reports.act(
        f.eventId,
        undefined,
        String(actor),
        {
          kind: "decision",
          revision: d.obligation.revision,
          outcome: "accept",
          reason: "OK",
        },
        now,
      ),
    ).rejects.toThrow("disagree");
    await m.clubPositions!.updateMany(
      { clubId: club },
      { $set: { permissionCodes: [] } },
    );
    await expect(
      finance.act(
        f.budgetId,
        String(club),
        String(actor),
        {
          kind: "expense",
          revision: 0,
          input: { category: "Supplies", amount: 10, spentAt: now },
        },
        now,
      ),
    ).rejects.toMatchObject({ kind: "forbidden" });
    await m.clubPositions!.updateMany(
      { clubId: club },
      {
        $set: {
          permissionCodes: ["club.expense.record", "club.report.submit"],
        },
      },
    );
    const internal = await fixture();
    await m.eventBudgets!.deleteOne({ _id: internal.budgetId });
    await m.events!.updateOne(
      { _id: internal.eventId },
      { $set: { audienceScope: "MEMBERS_ONLY" } },
    );
    expect(await reports.find(internal.eventId, undefined, now)).toBeNull();
  });
});
