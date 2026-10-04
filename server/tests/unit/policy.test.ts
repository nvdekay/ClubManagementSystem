import { describe, expect, it } from "vitest";
import type { PolicyRepository, PolicyVersion } from "../../src/domain/policy.js";
import { foundingRequirementsAt, resolvePolicyAt } from "../../src/usecase/policy.js";

const at = new Date("2026-10-03T12:00:00Z");
const policy: PolicyVersion = {
  id: "version-1",
  allowedEmailDomains: ["fpt.edu.vn"],
  minFoundingMembers: 5,
  mandatoryApplicationDocuments: ["charter", "member-list"],
  reportDeadlines: [{ reportType: "periodic", dueDaysAfterPeriodEnd: 10,
    remindBeforeDays: 3, overdueAfterDays: 2, escalateAfterDays: 5 }],
  conflictThresholdMinutes: 30,
  feedbackWindowHours: 48,
  feedbackMinRespondents: 5,
  allowOverbooking: false,
  enforceOverdueReportBlock: true,
  academicCalendar: [{ code: "FA26", startAt: new Date("2026-09-01"),
    endAt: new Date("2026-12-31") }],
  effectiveFrom: new Date("2026-10-01T00:00:00Z"),
  createdBy: "officer",
  createdAt: new Date("2026-09-30T00:00:00Z"),
};

describe("effective policy use case", () => {
  it("passes the decision time to the repository and returns its snapshot", async () => {
    let requestedAt: Date | undefined;
    const repo: PolicyRepository = {
      async findEffective(date) { requestedAt = date; return policy; },
    };
    expect(await resolvePolicyAt(repo, at)).toBe(policy);
    expect(requestedAt).toBe(at);
    expect(await foundingRequirementsAt(repo, at)).toEqual({
      policyVersionId: "version-1", minFoundingMembers: 5,
      mandatoryApplicationDocuments: ["charter", "member-list"],
    });
  });

  it("refuses a missing or malformed founding policy before an application can be submitted", async () => {
    const missing: PolicyRepository = { async findEffective() { return null; } };
    await expect(foundingRequirementsAt(missing, at))
      .rejects.toMatchObject({ kind: "unavailable" });
    for (const invalid of [
      { ...policy, minFoundingMembers: 0 },
      { ...policy, minFoundingMembers: 1.5 },
      { ...policy, mandatoryApplicationDocuments: ["charter", " "] },
    ]) {
      const repo: PolicyRepository = { async findEffective() { return invalid; } };
      await expect(foundingRequirementsAt(repo, at))
        .rejects.toMatchObject({ kind: "unavailable" });
    }
  });

  it("rejects an invalid decision date without querying storage", async () => {
    const repo: PolicyRepository = {
      async findEffective() { throw new Error("storage should not be queried"); },
    };
    await expect(resolvePolicyAt(repo, new Date(Number.NaN)))
      .rejects.toMatchObject({ kind: "validation" });
  });
});
