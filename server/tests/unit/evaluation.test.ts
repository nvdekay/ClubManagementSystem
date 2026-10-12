import { describe, expect, it } from "vitest";
import {
  checkManualScore, classify, METRIC_KEYS, scoreDimensions, totalOf, type ClubMetrics, type MetricKey,
} from "../../src/domain/evaluation.js";
import { DEFAULT_SCHEME_SETTINGS } from "../../src/domain/evaluation-scheme.js";

function metrics(values: Partial<Record<MetricKey, number>>): ClubMetrics {
  return Object.fromEntries(METRIC_KEYS.map((key) => [key, { value: values[key] ?? 0, sourceEntity: "x", sourceIds: [] }])) as unknown as ClubMetrics;
}

const thresholds = { excellent: 85, good: 70, fair: 50 };

describe("evaluation scoring", () => {
  it("scores each dimension from operational data and keeps the lineage", () => {
    const results = scoreDimensions(metrics({ registrations: 10, attendances: 8, uniqueAttendees: 8, activeMembers: 10,
      outsiderAttendees: 4, publicCompletedEvents: 2, acceptedInvitations: 1, applications: 5, completedEvents: 3,
      cancelledEvents: 1, feedbackCount: 6, feedbackAverage: 4.5, budgets: 2, budgetsClean: 1, leaderSeated: 1,
      membersLeft: 2, violationPenalty: 25, openViolations: 1 }), DEFAULT_SCHEME_SETTINGS, "Fall 2026", 5);
    const score = Object.fromEntries(results.map((item) => [item.code, item.score]));
    expect(score).toEqual({ D1: 80, D2: 60, D3: 87.5, D4: 75, D5: undefined, D6: 50, D7: 91.7, D8: 70 });
    expect(results.find((item) => item.code === "D5")).toMatchObject({ insufficientData: true });
    expect(results[0]!.evidence.map((item) => item.metric)).toContain("attendances");
    expect(results[0]!.evidence[0]).toMatchObject({ sourcePeriod: "Fall 2026" });
  });

  it("marks satisfaction as insufficient below the minimum respondents instead of scoring 0", () => {
    const [d3] = scoreDimensions(metrics({ feedbackCount: 3, feedbackAverage: 5 }), { dimensions: [{ code: "D3", weight: 100, allowsManual: false }] },
      "Fall 2026", 5);
    expect(d3).toMatchObject({ insufficientData: true });
    expect(d3!.score).toBeUndefined();
  });

  it("re-spreads weights over scored dimensions and classifies the total", () => {
    expect(totalOf([{ score: 80, weight: 20 }, { score: undefined, weight: 30 }, { score: 60, weight: 20 }], thresholds))
      .toEqual({ totalScore: 70, classification: "GOOD" });
    expect(totalOf([{ score: undefined, weight: 50 }], thresholds)).toEqual({});
    expect(classify(85, thresholds)).toBe("EXCELLENT");
    expect(classify(49.9, thresholds)).toBe("NEEDS_IMPROVEMENT");
  });

  it("allows a manual score only where the scheme does, with a justification", () => {
    expect(() => checkManualScore({ allowsManual: false }, { score: 50, justification: "x" })).toThrow(/does not allow/);
    expect(() => checkManualScore({ allowsManual: true }, { score: 120, justification: "x" })).toThrow(/between 0 and 100/);
    expect(() => checkManualScore({ allowsManual: true }, { score: 50, justification: "  " })).toThrow(/justification/);
    expect(checkManualScore({ allowsManual: true }, { score: 72.25, justification: " Báo cáo đầy đủ " }))
      .toEqual({ score: 72.3, justification: "Báo cáo đầy đủ" });
    expect(checkManualScore({ allowsManual: true }, null)).toBeNull();
  });
});
