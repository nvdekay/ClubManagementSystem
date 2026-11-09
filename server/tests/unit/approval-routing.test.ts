import { describe, expect, it, vi } from "vitest";
import {
  resolveApprovalRoute, simulateRouting, validateRoutingRules, type ApprovalRoutingRepository, type RoutingRule,
} from "../../src/domain/approval-routing.js";
import { activateRoutingRuleSet, createRoutingDraft, listRoutingRuleSets } from "../../src/usecase/approval-routing.js";

const now = new Date("2026-11-07T00:00:00Z");
const bigBudget: RoutingRule = { id: "big", requestType: "EVENT_PROPOSAL", minAmount: 20_000_000, slaHours: 72 };
const highRisk: RoutingRule = { id: "risk", requestType: "EVENT_PROPOSAL", maxAmount: 20_000_000, riskCategories: ["HIGH"],
  slaHours: 48 };
const stage: RoutingRule = { id: "stage", requestType: "PROPERTY_BOOKING", propertyTypes: ["STAGE"], slaHours: 24 };

describe("UC05 routing rules", () => {
  it("accepts disjoint rules and refuses overlapping ones with the offending pairs (E1)", () => {
    expect(validateRoutingRules([bigBudget, highRisk, stage])).toHaveLength(3);
    expect(() => validateRoutingRules([bigBudget, { ...highRisk, maxAmount: undefined }]))
      .toThrowError(expect.objectContaining({ kind: "validation", details: { overlaps: [["big", "risk"]] } }));
    expect(() => validateRoutingRules([stage, { ...stage, id: "all-bookings", propertyTypes: undefined }])).toThrow(/overlap/);
    expect(() => validateRoutingRules([{ ...stage, propertyTypes: ["ROOM"] }])).toThrow(/property type/);
    expect(() => validateRoutingRules([{ ...bigBudget, maxAmount: 10 }])).toThrow(/upper bound/);
    expect(() => validateRoutingRules([bigBudget, { ...stage, id: "big" }])).toThrow(/unique/);
  });

  it("gives a matching request its rule's SLA and anything else no rule (BR16)", () => {
    const set = { id: "set", rules: [bigBudget, highRisk, stage] };
    expect(resolveApprovalRoute(set, { requestType: "EVENT_PROPOSAL", amount: 25_000_000, openViolations: 0 }))
      .toEqual({ routingRuleSetId: "set", routingRuleId: "big", slaHours: 72 });
    expect(resolveApprovalRoute(set, { requestType: "EVENT_PROPOSAL", amount: 1_000, riskCategory: "HIGH", openViolations: 0 }))
      .toMatchObject({ routingRuleId: "risk", slaHours: 48 });
    expect(resolveApprovalRoute(set, { requestType: "EVENT_PROPOSAL", amount: 1_000, riskCategory: "LOW", openViolations: 0 }))
      .toEqual({ routingRuleSetId: "set" });
    expect(resolveApprovalRoute(null, { requestType: "PROPERTY_BOOKING", propertyType: "STAGE", openViolations: 0 }))
      .toEqual({});
  });

  it("drops a legacy requiredLevel from a submitted rule", () => {
    const legacy = { ...stage, requiredLevel: 2 } as RoutingRule;
    expect(validateRoutingRules([legacy])[0]).toEqual(stage);
  });

  it("simulates without writing and counts requests that match a rule (A1)", () => {
    const samples = [
      { entityType: "PROPERTY_BOOKING" as const, entityId: "b1", title: "Stage", decidedAt: now,
        facts: { requestType: "PROPERTY_BOOKING" as const, propertyType: "STAGE", openViolations: 0 } },
      { entityType: "CLUB_APPLICATION" as const, entityId: "a1", title: "Club", decidedAt: now,
        facts: { requestType: "CLUB_APPLICATION" as const, openViolations: 0 } },
    ];
    const result = simulateRouting([stage], samples);
    expect(result).toMatchObject({ total: 2, matched: 1, items: [{ entityId: "b1", ruleId: "stage", slaHours: 24 }, { entityId: "a1" }] });
    expect(result.items[1]).not.toHaveProperty("ruleId");
  });

});

describe("UC05 use cases (D1)", () => {
  function repo(): ApprovalRoutingRepository {
    const draft = { id: "a".repeat(24), versionNo: 1, state: "Draft" as const, rules: [stage], createdBy: "u", createdAt: now };
    return { list: vi.fn(async () => [draft]), find: vi.fn(async () => draft), createDraft: vi.fn(async () => draft),
      saveDraft: vi.fn(async () => draft), activate: vi.fn(async () => ({ ...draft, state: "Active" as const })),
      recentDecided: vi.fn(async () => []) };
  }
  function auth(roles: string[]) { return { systemRoleCodes: vi.fn(async () => roles) }; }
  const actor = { id: "b".repeat(24), accountState: "Active" as const };

  it("lets officers read but only ICPDP_HEAD (with ICPDP_OFFICER) change or activate", async () => {
    const r = repo();
    await listRoutingRuleSets(r, auth(["ICPDP_OFFICER"]), actor);
    await expect(createRoutingDraft(r, auth(["ICPDP_OFFICER"]), actor, [stage], now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(createRoutingDraft(r, auth(["ICPDP_HEAD"]), actor, [stage], now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(activateRoutingRuleSet(r, auth(["ICPDP_OFFICER"]), actor, "a".repeat(24), now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(r.activate).not.toHaveBeenCalled();
    await activateRoutingRuleSet(r, auth(["ICPDP_OFFICER", "ICPDP_HEAD"]), actor, "a".repeat(24), now);
    expect(r.activate).toHaveBeenCalledWith("a".repeat(24), actor.id, now);
  });
});
