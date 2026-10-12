import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import {
  allowedFlow, settlementDueAt, stateAfterFlow,
  type BudgetDetail, type BudgetDisbursementRepository,
} from "../../src/domain/budget-disbursement.js";
import { listBudgets, normalizedBudgetFlow, recordBudgetFlow } from "../../src/usecase/budget-disbursement.js";

const now = new Date("2026-10-10T08:00:00Z");
const officer = { id: "000000000000000000000001", accountState: "Active" as const };
const budgetId = "000000000000000000000002";

function budget(change: Partial<BudgetDetail> = {}): BudgetDetail {
  return { id: budgetId, eventId: "000000000000000000000003", eventTitle: "Workshop", eventState: "Approved",
    eventStartAt: now, eventEndAt: now, clubId: "000000000000000000000004", clubName: "HEBE", state: "Approved",
    requestedTotal: 5_000_000, approvedTotal: 4_000_000, disbursedTotal: 0, refundedTotal: 0, createdAt: now,
    lines: [], flows: [], ...change };
}

function auth(roles: string[]): Pick<AuthRepository, "systemRoleCodes"> {
  return { systemRoleCodes: async () => roles };
}

function repo(found: BudgetDetail): BudgetDisbursementRepository {
  return { list: vi.fn(async () => []), find: vi.fn(async () => found), record: vi.fn(async () => found) };
}

describe("budget disbursement rules", () => {
  it("allows advances up to the approved total while the event can still run", () => {
    expect(allowedFlow(budget())).toEqual({ kind: "Advance", max: 4_000_000 });
    expect(allowedFlow(budget({ state: "Disbursed", disbursedTotal: 1_000_000 }))).toEqual({ kind: "Advance", max: 3_000_000 });
    expect(allowedFlow(budget({ state: "Disbursed", disbursedTotal: 4_000_000 }))).toBeUndefined();
    expect(allowedFlow(budget({ eventState: "Cancelled" }))).toBeUndefined();
  });

  it("allows an exact top-up after reconciliation and a refund of what is still owed", () => {
    expect(allowedFlow(budget({ state: "Reconciled", disbursedTotal: 3_000_000, settlementBalance: 500_000 })))
      .toEqual({ kind: "TopUp", max: 500_000, exact: 500_000 });
    expect(allowedFlow(budget({ state: "Reconciled", disbursedTotal: 3_000_000, settlementBalance: 0 }))).toBeUndefined();
    expect(allowedFlow(budget({ state: "Recovery Pending", recoveryAmount: 800_000, refundedTotal: 300_000 })))
      .toEqual({ kind: "Refund", max: 500_000 });
  });

  it("closes a budget after a top-up or a full refund", () => {
    expect(stateAfterFlow(budget(), { kind: "Advance", amount: 1 })).toBe("Disbursed");
    expect(stateAfterFlow(budget({ state: "Reconciled" }), { kind: "TopUp", amount: 1 })).toBe("Closed");
    const owed = budget({ state: "Recovery Pending", recoveryAmount: 800_000, refundedTotal: 300_000 });
    expect(stateAfterFlow(owed, { kind: "Refund", amount: 200_000 })).toBe("Recovery Pending");
    expect(stateAfterFlow(owed, { kind: "Refund", amount: 500_000 })).toBe("Closed");
  });

  it("sets the settlement deadline 14 days after the event ends", () => {
    expect(settlementDueAt(new Date("2026-10-20T10:00:00Z")).toISOString()).toBe("2026-11-03T10:00:00.000Z");
  });

  it("validates the money flow input", () => {
    expect(() => normalizedBudgetFlow({ kind: "Advance", amount: 0 }, now)).toThrow(/above zero/);
    expect(() => normalizedBudgetFlow({ kind: "Advance", amount: 1.5 }, now)).toThrow(/whole number/);
    expect(() => normalizedBudgetFlow({ kind: "Advance", amount: 1, disbursedAt: new Date("2026-10-11") }, now))
      .toThrow(/future/);
    expect(normalizedBudgetFlow({ kind: "Refund", amount: 5, paymentReference: "  ", note: " ok " }, now))
      .toEqual({ kind: "Refund", amount: 5, disbursedAt: now, paymentReference: undefined, note: "ok" });
  });
});

describe("budget disbursement use cases", () => {
  it("requires an ICPDP officer", async () => {
    await expect(listBudgets(repo(budget()), auth([]), officer)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(listBudgets(repo(budget()), auth([]), null)).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("rejects an advance over the approved total and a flow of the wrong kind before writing", async () => {
    const found = repo(budget({ state: "Disbursed", disbursedTotal: 3_500_000 }));
    await expect(recordBudgetFlow(found, auth(["ICPDP_OFFICER"]), officer, budgetId,
      { kind: "Advance", amount: 600_000 }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(recordBudgetFlow(found, auth(["ICPDP_OFFICER"]), officer, budgetId,
      { kind: "Refund", amount: 1 }, now)).rejects.toMatchObject({ kind: "conflict" });
    const reconciled = repo(budget({ state: "Reconciled", disbursedTotal: 3_000_000, settlementBalance: 500_000 }));
    await expect(recordBudgetFlow(reconciled, auth(["ICPDP_OFFICER"]), officer, budgetId,
      { kind: "TopUp", amount: 400_000 }, now)).rejects.toMatchObject({ kind: "validation" });
    expect(found.record).not.toHaveBeenCalled();
  });

  it("records a valid advance", async () => {
    const found = repo(budget());
    await recordBudgetFlow(found, auth(["ICPDP_OFFICER"]), officer, budgetId,
      { kind: "Advance", amount: 2_000_000, paymentReference: "UNC-01" }, now);
    expect(found.record).toHaveBeenCalledWith(budgetId, officer.id,
      expect.objectContaining({ kind: "Advance", amount: 2_000_000, paymentReference: "UNC-01" }), now);
  });
});
