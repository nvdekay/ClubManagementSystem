import { describe, expect, it } from "vitest";
import {
  decideReconciliation, MISSING_EVIDENCE_REASON, reconciliationMode, totalsOf, type Expense,
} from "../../src/domain/budget-reconciliation.js";

const now = new Date("2026-10-10T08:00:00Z");

function expense(id: string, amount: number, change: Partial<Expense> = {}): Expense {
  return { id, category: "Âm thanh", amount, spentAt: now, isOutOfCategory: false, isOverRemaining: false, hasEvidence: true,
    evidence: [], ...change };
}

describe("budget reconciliation rules", () => {
  it("splits recorded spending into supported and unsupported", () => {
    expect(totalsOf([expense("a", 1_000_000), expense("b", 500_000, { hasEvidence: false })], 4_000_000, 3_000_000))
      .toEqual({ approvedTotal: 4_000_000, advancedTotal: 3_000_000, recordedTotal: 1_500_000, supportedTotal: 1_000_000,
        unsupportedTotal: 500_000, remaining: 1_500_000 });
  });

  it("reconciles a submitted settlement, or an overdue one without it (A2)", () => {
    expect(reconciliationMode({ state: "Settlement Submitted" }, now)).toBe("settlement");
    expect(reconciliationMode({ state: "Disbursed", settlementDueAt: new Date(now.getTime() - 1) }, now)).toBe("overdue");
    expect(reconciliationMode({ state: "Disbursed", settlementDueAt: new Date(now.getTime() + 1) }, now)).toBeUndefined();
    expect(reconciliationMode({ state: "Reconciled" }, now)).toBeUndefined();
  });

  it("always rejects unsupported expenses and needs a reason for flagged or rejected ones", () => {
    const expenses = [expense("a", 1_000_000), expense("b", 500_000, { hasEvidence: false }),
      expense("c", 300_000, { isOutOfCategory: true })];
    const base = { expenses, approvedTotal: 4_000_000, advancedTotal: 2_000_000, mode: "settlement" as const };
    expect(() => decideReconciliation({ ...base, reviews: [] }, now)).toThrow(/flagged/);
    expect(() => decideReconciliation({ ...base, reviews: [{ expenseId: "c", outcome: "Accepted" }] }, now)).toThrow(/flagged/);
    expect(() => decideReconciliation({ ...base, reviews: [{ expenseId: "c", outcome: "Accepted", reason: "Hợp lý" },
      { expenseId: "a", outcome: "Rejected" }] }, now)).toThrow(/reason/);
    const decided = decideReconciliation({ ...base, reviews: [{ expenseId: "c", outcome: "Rejected", reason: "Ngoài hạng mục" },
      { expenseId: "b", outcome: "Accepted" }] }, now);
    expect(decided.reviews).toEqual([{ expenseId: "a", outcome: "Accepted" },
      { expenseId: "b", outcome: "Rejected", reason: MISSING_EVIDENCE_REASON },
      { expenseId: "c", outcome: "Rejected", reason: "Ngoài hạng mục" }]);
    expect(decided.result).toMatchObject({ acceptedTotal: 1_000_000, settlementBalance: -1_000_000, outcome: "Recovery Pending",
      recoveryAmount: 1_000_000, recoveryDueAt: new Date("2026-10-24T08:00:00Z") });
  });

  it("closes at zero, waits for a top-up when positive, and caps at the approved total", () => {
    const base = { reviews: [], advancedTotal: 1_000_000, mode: "settlement" as const };
    expect(decideReconciliation({ ...base, expenses: [expense("a", 1_000_000)], approvedTotal: 2_000_000 }, now).result)
      .toMatchObject({ outcome: "Closed", settlementBalance: 0 });
    expect(decideReconciliation({ ...base, expenses: [expense("a", 1_800_000)], approvedTotal: 2_000_000 }, now).result)
      .toMatchObject({ outcome: "Reconciled", settlementBalance: 800_000 });
    expect(decideReconciliation({ ...base, expenses: [expense("a", 3_000_000)], approvedTotal: 2_000_000 }, now).result)
      .toMatchObject({ acceptedTotal: 2_000_000, settlementBalance: 1_000_000 });
    expect(() => decideReconciliation({ ...base, expenses: [], approvedTotal: 500_000 }, now)).toThrow(/advanced than approved/);
    expect(() => decideReconciliation({ ...base, expenses: [expense("a", 1)], approvedTotal: 2_000_000,
      reviews: [{ expenseId: "zzz", outcome: "Accepted" }] }, now)).toThrow(/different expense/);
  });
});
