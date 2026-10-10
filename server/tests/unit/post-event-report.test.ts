import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import type { PolicyRepository } from "../../src/domain/policy.js";
import {
  attendanceMismatch, normalizedPostEventDecision, postEventDueDays, reportDueAt,
  type PostEventReportRepository,
} from "../../src/domain/post-event-report.js";
import { decidePostEventReport, postEventReportQueue, recordMissingPostEventReport } from "../../src/usecase/post-event-report.js";

const now = new Date("2026-10-10T08:00:00Z");
const officer = { id: "000000000000000000000001", accountState: "Active" as const };
const reportId = "000000000000000000000002";

function deps(roles = ["ICPDP_OFFICER"]) {
  const repo: PostEventReportRepository = { queue: vi.fn(async () => ({ submitted: [], missing: [] })), find: vi.fn(async () => null),
    decide: vi.fn(async () => ({}) as never), recordMissing: vi.fn(async () => ({ violationId: "x" })) };
  const policy: PolicyRepository = { findEffective: vi.fn(async () => ({ reportDeadlines: [{ reportType: "post_event",
    dueDaysAfterPeriodEnd: 5, remindBeforeDays: 1, overdueAfterDays: 1, escalateAfterDays: 2 }] }) as never) };
  const auth: Pick<AuthRepository, "systemRoleCodes"> = { systemRoleCodes: async () => roles };
  return { repo, policy, auth };
}

describe("post-event report rules", () => {
  it("takes the deadline from the POST_EVENT policy entry, 7 days otherwise", () => {
    expect(postEventDueDays([{ reportType: "Post_Event", dueDaysAfterPeriodEnd: 3, remindBeforeDays: 1, overdueAfterDays: 1,
      escalateAfterDays: 1 }])).toBe(3);
    expect(postEventDueDays([])).toBe(7);
    expect(reportDueAt(new Date("2026-10-01T10:00:00Z"), 7).toISOString()).toBe("2026-10-08T10:00:00.000Z");
  });

  it("flags frozen check-ins that differ from the attendance table", () => {
    expect(attendanceMismatch({ attendance: { checkedIn: 40 } }, { checkedIn: 40 })).toBe(false);
    expect(attendanceMismatch({ attendance: { checkedIn: 45 } }, { checkedIn: 40 })).toBe(true);
    expect(attendanceMismatch({}, { checkedIn: 40 })).toBe(false);
  });

  it("requires a reason to return or record a finding, and a complete finding", () => {
    expect(normalizedPostEventDecision({ outcome: "Accept" })).toEqual({ outcome: "Accept" });
    expect(() => normalizedPostEventDecision({ outcome: "Return" })).toThrow(/reason/);
    expect(() => normalizedPostEventDecision({ outcome: "AcceptWithFinding", reason: "Chi sai" })).toThrow(/finding/);
    expect(() => normalizedPostEventDecision({ outcome: "Accept", finding: { severity: "MINOR", title: "x" } })).toThrow(/finding/);
    expect(normalizedPostEventDecision({ outcome: "AcceptWithFinding", reason: "Chi sai",
      finding: { severity: "MODERATE", title: " Vượt sức chứa " } })).toEqual({ outcome: "AcceptWithFinding", reason: "Chi sai",
      finding: { severity: "MODERATE", title: "Vượt sức chứa" } });
  });

  it("is for ICPDP officers only and passes the policy deadline down", async () => {
    await expect(postEventReportQueue(deps([]), officer, now)).rejects.toMatchObject({ kind: "forbidden" });
    const ok = deps();
    await postEventReportQueue(ok, officer, now);
    expect(ok.repo.queue).toHaveBeenCalledWith(now, 5);
    await expect(decidePostEventReport(ok, officer, reportId, { outcome: "Return" }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(recordMissingPostEventReport(ok, officer, "bad", { severity: "MINOR" }, now)).rejects.toMatchObject({ kind: "validation" });
    expect(ok.repo.decide).not.toHaveBeenCalled();
  });
});
