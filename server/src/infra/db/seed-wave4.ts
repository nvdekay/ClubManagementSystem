import { Types } from "mongoose";
import type { EventFinanceRepository } from "../../domain/event-finance.js";
import { mongoPostEventReportRepository } from "./mongo-post-event-report-repository.js";
import { ucmsModels as m } from "./ucms-models.js";
function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}
/** Creates only owned demo fixtures; an existing fixture is never reset after a user action. */
export async function seedWave4(
  owner: Types.ObjectId,
  clubId: Types.ObjectId,
  now: Date,
  finance?: EventFinanceRepository,
): Promise<void> {
  const policy = await m
    .policyVersions!.findOne({ effectiveFrom: { $lte: now } })
    .sort({ effectiveFrom: -1, createdAt: -1, _id: -1 })
    .lean();
  if (
    !((policy?.reportDeadlines ?? []) as { reportType: string }[]).some(
      (d) => d.reportType === "POST_EVENT",
    )
  ) {
    console.log(
      "Wave 4 report demo skipped: configure POST_EVENT in UC04 before running seed:demo again",
    );
    return;
  }
  const club = await m.clubs!.findById(clubId).lean();
  for (const [suffix, amount, state] of [
    ["balanced", 1000000, "Completed"],
    ["top-up", 1200000, "Completed"],
    ["refund", 800000, "Completed"],
    ["cancelled", 200000, "Cancelled"],
  ] as const) {
    const title = `Wave 4 demo: ${suffix}`;
    if (await m.events!.exists({ clubId, title })) continue;
    // Completion at the seed time uses the currently configured policy, without backdating it.
    const event = await m.events!.create({
      organizerType: "CLUB",
      clubId,
      clubName: club?.name,
      title,
      state,
      audienceScope: "PUBLIC",
      capacity: 10,
      startAt: new Date(now.getTime() - 3600000),
      endAt: now,
      currentRevisionNo: 1,
      attendanceFinalized: state === "Completed",
      semesterCode: "Fall 2026",
      createdAt: now,
    });
    await m.eventProposalVersions!.create({
      eventId: event._id,
      revisionNo: 1,
      payload: {
        title,
        objective: "Practice and demonstrate the post-event workflow",
        plan: "Workshop and discussion",
      },
      budgetLines: [{ category: "Supplies", amount: 1500000 }],
      submittedBy: owner,
      submittedAt: now,
    });
    const budget = await m.eventBudgets!.create({
      eventId: event._id,
      clubId,
      lines: [
        {
          category: "Supplies",
          requestedAmount: 1500000,
          approvedAmount: 1500000,
        },
      ],
      requestedTotal: decimal(1500000),
      approvedTotal: decimal(1500000),
      approvedByDecisionId: new Types.ObjectId(),
      disbursedTotal: decimal(1000000),
      refundedTotal: decimal(0),
      state: "Disbursed",
      settlementDueAt: new Date(now.getTime() + 14 * 86400000),
      createdAt: now,
    });
    await m.budgetDisbursements!.create({
      eventBudgetId: budget._id,
      kind: "Advance",
      amount: decimal(1000000),
      disbursedAt: now,
      recordedBy: owner,
      note: "Wave 4 demo advance",
    });
    if (finance) {
      let detail = (await finance.find(String(budget._id)))!;
      detail = await finance.act(
        detail.id,
        String(clubId),
        String(owner),
        {
          kind: "expense",
          revision: detail.revision,
          input: {
            category: "Supplies",
            amount,
            spentAt: now,
            description: "Wave 4 demo expense",
          },
        },
        now,
      );
      if (suffix !== "cancelled")
        await finance.act(
          detail.id,
          String(clubId),
          String(owner),
          {
            kind: "evidence",
            revision: detail.revision,
            expenseId: detail.expenses[0]!.id,
            input: {
              type: "RECEIPT",
              externalLink: "https://example.org/demo-receipt",
            },
          },
          now,
        );
    }
    if (state === "Completed") {
      const reports = mongoPostEventReportRepository();
      const current = (await reports.find(
        String(event._id),
        String(clubId),
        now,
      ))!;
      await reports.act(
        String(event._id),
        String(clubId),
        String(owner),
        {
          kind: "save",
          revision: current.obligation.revision,
          input: {
            actualResult:
              "Demo workshop completed; verify attendance and actual expenses before submission.",
            incidents: "",
            lessonsLearned: "Prepare materials earlier.",
            evidence: [],
          },
        },
        now,
      );
    }
  }
}
