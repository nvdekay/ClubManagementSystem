import { describe, expect, it } from "vitest";
import {
  assertFinanceEditable,
  assertSettlementEvent,
  financeTotals,
  reconcileExpenses,
  validateExpense,
  validateFinancialEvidence,
  type Expense,
} from "../../src/domain/event-finance.js";
const now = new Date("2026-10-11T00:00:00Z");
function expense(id: string, amount: number, hasEvidence: boolean): Expense {
  return {
    id,
    category: "Supplies",
    amount,
    spentAt: now,
    isOutOfCategory: false,
    isOverRemaining: false,
    hasEvidence,
    evidences: [],
  };
}
describe("Event finance rules", () => {
  it("accepts an expense but rejects fractional, negative, unsafe or future money inputs", () => {
    expect(
      validateExpense({ category: " Supplies ", amount: 10, spentAt: now }, now)
        .category,
    ).toBe("Supplies");
    for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(() =>
        validateExpense({ category: "Supplies", amount, spentAt: now }, now),
      ).toThrow();
    expect(() =>
      validateExpense(
        {
          category: "Supplies",
          amount: 10,
          spentAt: new Date(now.getTime() + 1),
        },
        now,
      ),
    ).toThrow();
  });
  it("evidence allows only HTTPS without embedded credentials", () => {
    expect(
      validateFinancialEvidence({
        type: "RECEIPT",
        externalLink: "https://example.edu/receipt",
      }).externalLink,
    ).toBe("https://example.edu/receipt");
    for (const externalLink of [
      "http://example.edu/receipt",
      "javascript:alert(1)",
      "https://user:pass@example.edu/receipt",
    ])
      expect(() =>
        validateFinancialEvidence({ type: "INVOICE", externalLink }),
      ).toThrow();
  });
  it("separates supported, unsupported and negative unspent balance", () => {
    expect(
      financeTotals(200, 100, [
        expense("a", 80, true),
        expense("b", 50, false),
      ]),
    ).toMatchObject({
      recordedTotal: 130,
      supportedTotal: 80,
      unsupportedTotal: 50,
      remaining: -30,
    });
  });
  it.each([
    [100, "Closed", 0],
    [150, "Reconciled", 50],
    [70, "Recovery Pending", -30],
  ])("reconciles accepted spend %s", (amount, state, settlementBalance) => {
    const rows = [expense("a", Number(amount), true)];
    expect(
      reconcileExpenses(financeTotals(200, 100, rows), rows, [
        { expenseId: "a", outcome: "Accepted", reason: "Valid receipt" },
      ]),
    ).toMatchObject({ state, settlementBalance });
  });
  it.each([[70, "Recovery Pending", -30], [100, "Closed", 0], [150, "Closed", 0]])("A2 caps supported spend %s at the advance and never creates a top-up", (amount, state, settlementBalance) => {
    const rows = [expense("a", Number(amount), true)];
    expect(reconcileExpenses(financeTotals(200, 100, rows), rows, [{ expenseId: "a", outcome: "Accepted", reason: "Valid" }], true)).toMatchObject({ state, settlementBalance });
  });
  it("caps valid expenses and never accepts unsupported expenses or incomplete reviews", () => {
    const rows = [expense("a", 300, true)];
    expect(
      reconcileExpenses(financeTotals(200, 100, rows), rows, [
        { expenseId: "a", outcome: "Accepted", reason: "Valid" },
      ]).acceptedTotal,
    ).toBe(200);
    expect(() =>
      reconcileExpenses(financeTotals(200, 100, rows), rows, []),
    ).toThrow();
    expect(() =>
      reconcileExpenses(
        financeTotals(200, 100, [expense("a", 100, false)]),
        [expense("a", 100, false)],
        [{ expenseId: "a", outcome: "Accepted", reason: "Valid" }],
      ),
    ).toThrow();
  });
  it("locks submitted/closed budgets and allows settlement after the report closed the event", () => {
    for (const state of [
      "Approved",
      "Settlement Submitted",
      "Reconciled",
      "Recovery Pending",
      "Closed",
      "Cancelled",
    ])
      expect(() => assertFinanceEditable(state)).toThrow();
    for (const state of [
      "Completed",
      "Report Submitted",
      "Closed",
      "Cancelled",
    ])
      expect(() => assertSettlementEvent(state, now, now)).not.toThrow();
    expect(() => assertSettlementEvent("Ongoing", now, now)).toThrow();
  });
});
