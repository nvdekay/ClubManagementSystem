import mongoose, { Types } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mongoBudgetDisbursementRepository } from "../../src/infra/db/mongo-budget-disbursement-repository.js";
import { mongoBudgetReconciliationRepository } from "../../src/infra/db/mongo-budget-reconciliation-repository.js";
import { ensureUcmsDatabase, ucmsModels } from "../../src/infra/db/ucms-models.js";

const uri = process.env.MONGO_URI;
const dbName = `ucms-reconciliation-test-${process.pid}`;
const DAY = 24 * 60 * 60 * 1000;

function decimal(value: number) {
  return Types.Decimal128.fromString(String(value));
}

describe.skipIf(!uri)("Mongo budget reconciliation repository", () => {
  const now = new Date("2026-10-10T08:00:00Z");
  const officer = new Types.ObjectId();
  const clubId = new Types.ObjectId();

  /** A budget advanced `advanced`, with the given expenses (amount, evidence?, flagged?). */
  async function budget(state: string, advanced: number, items: [number, boolean, boolean?][], extra: Record<string, unknown> = {}) {
    const eventId = new Types.ObjectId();
    await ucmsModels.events!.create({ _id: eventId, organizerType: "CLUB", clubId, clubName: "HEBE", title: "Đêm nhạc",
      startAt: new Date(now.getTime() - 20 * DAY), endAt: new Date(now.getTime() - 20 * DAY + 3_600_000), semesterCode: "Fall 2026",
      audienceScope: "PUBLIC", capacity: 50, state: "Closed", currentRevisionNo: 1, createdAt: now });
    const doc = await ucmsModels.eventBudgets!.create({ eventId, clubId, state, periodCode: "Fall 2026",
      lines: [{ category: "Âm thanh", requestedAmount: 4_000_000, approvedAmount: 4_000_000 }],
      requestedTotal: decimal(4_000_000), approvedTotal: decimal(4_000_000), approvedByDecisionId: new Types.ObjectId(),
      disbursedTotal: decimal(advanced), refundedTotal: decimal(0), isSettlementLate: false, createdAt: now, ...extra });
    await ucmsModels.budgetDisbursements!.create({ eventBudgetId: doc._id, kind: "Advance", amount: decimal(advanced),
      disbursedAt: now, recordedBy: officer });
    const ids: string[] = [];
    for (const [amount, evidence, flagged] of items) {
      const expense = await ucmsModels.expenses!.create({ clubId, eventBudgetId: doc._id, eventId, category: "Âm thanh",
        amount: decimal(amount), spentAt: now, isOutOfCategory: flagged === true, isOverRemaining: false, hasEvidence: evidence,
        recordedBy: officer, createdAt: now });
      if (evidence) {
        await ucmsModels.financialEvidences!.create({ expenseId: expense._id, type: "INVOICE",
          externalLink: "https://drive.google.com/x", uploadedBy: officer, uploadedAt: now });
      }
      ids.push(String(expense._id));
    }
    return { id: String(doc._id), expenses: ids };
  }

  beforeAll(async () => {
    await mongoose.connect(uri ?? "", { dbName });
    await ensureUcmsDatabase();
    await ucmsModels.clubs!.create({ _id: clubId, code: "CLB-HEBE", name: "HEBE", field: "Nghệ thuật", state: "Active", createdAt: now });
  }, 30_000);

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });

  it("settles a submitted settlement into a top-up that UC35 then closes", async () => {
    const repo = mongoBudgetReconciliationRepository();
    const { id, expenses } = await budget("Settlement Submitted", 3_000_000, [[2_500_000, true], [900_000, true, true], [200_000, false]]);
    const view = await repo.find(id, now);
    expect(view).toMatchObject({ mode: "settlement", canRequestEvidence: true, totals: { advancedTotal: 3_000_000,
      recordedTotal: 3_600_000, supportedTotal: 3_400_000, unsupportedTotal: 200_000 } });
    await expect(repo.reconcile(id, String(officer), [], now)).rejects.toMatchObject({ kind: "validation" });

    const done = await repo.reconcile(id, String(officer), [{ expenseId: expenses[1]!, outcome: "Accepted", reason: "Có giải trình" }], now);
    expect(done).toMatchObject({ state: "Reconciled", result: { acceptedTotal: 3_400_000, settlementBalance: 400_000, outcome: "Reconciled" } });
    expect(done.expenses.map((item) => item.reviewOutcome)).toEqual(["Accepted", "Accepted", "Rejected"]);
    await expect(repo.reconcile(id, String(officer), [], now)).rejects.toMatchObject({ kind: "conflict" });

    const topUp = await mongoBudgetDisbursementRepository().record(id, String(officer), { kind: "TopUp", amount: 400_000, disbursedAt: now }, now);
    expect(topUp.state).toBe("Closed");
    expect((await repo.find(id, now))?.result?.closedAt).toEqual(now);
  });

  it("sends a settlement back for evidence, then reconciles it once overdue into a refund and a case (A1, A2, E2)", async () => {
    const repo = mongoBudgetReconciliationRepository();
    const { id } = await budget("Settlement Submitted", 3_000_000, [[1_000_000, true]],
      { settlementDueAt: new Date(now.getTime() - DAY) });
    const back = await repo.requestEvidence(id, String(officer), "Bổ sung hoá đơn thuê loa", now);
    expect(back).toMatchObject({ state: "Reconciliation Pending", canRequestEvidence: false, mode: "overdue",
      lastEvidenceRequest: { message: "Bổ sung hoá đơn thuê loa" } });

    const settled = await repo.reconcile(id, String(officer), [], now);
    expect(settled).toMatchObject({ state: "Recovery Pending", result: { outcome: "Recovery Pending", isOverdueSettlement: true,
      recoveryAmount: 2_000_000 } });
    expect(await ucmsModels.eventBudgets!.findById(id).lean()).toMatchObject({ isSettlementLate: true });

    await expect(repo.openCase(id, String(officer), "MODERATE", now)).rejects.toMatchObject({ kind: "conflict" });
    const later = new Date(now.getTime() + 20 * DAY);
    expect((await repo.find(id, later))?.recoveryOverdue).toBe(true);
    const { violationId } = await repo.openCase(id, String(officer), "MODERATE", later);
    expect(await ucmsModels.violations!.findById(violationId).lean()).toMatchObject({ originType: "FINANCIAL_EXCEPTION" });
    expect((await repo.find(id, later))?.caseId).toBe(violationId);
    await expect(repo.openCase(id, String(officer), "MODERATE", later)).rejects.toMatchObject({ kind: "conflict" });
  });

  it("closes at once when the accepted spending equals the advance", async () => {
    const repo = mongoBudgetReconciliationRepository();
    const { id } = await budget("Settlement Submitted", 1_000_000, [[1_000_000, true]]);
    expect(await repo.reconcile(id, String(officer), [], now)).toMatchObject({ state: "Closed", result: { outcome: "Reconciled",
      closedAt: now } });
  });
});
