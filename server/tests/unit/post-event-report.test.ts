import { describe, expect, it } from "vitest";
import {
  assertReportSubmission,
  normalizeReport,
} from "../../src/domain/post-event-report.js";
describe("Post-event report rules", () => {
  it("requires completed finalized attendance and excludes Internal without budget", () => {
    expect(() =>
      assertReportSubmission("Completed", true, false),
    ).not.toThrow();
    expect(() => assertReportSubmission("Completed", false, false)).toThrow();
    expect(() => assertReportSubmission("Closed", true, false)).toThrow();
    expect(() => assertReportSubmission("Completed", true, true)).toThrow();
  });
  it("normalizes results and validates HTTPS evidence", () => {
    expect(
      normalizeReport({ actualResult: " Results ", evidence: [] }).actualResult,
    ).toBe("Results");
    expect(() =>
      normalizeReport({ actualResult: " ", evidence: [] }),
    ).toThrow();
    expect(() =>
      normalizeReport({
        actualResult: "Results",
        evidence: [{ note: "Photo", url: "javascript:alert(1)" }],
      }),
    ).toThrow();
  });
});
