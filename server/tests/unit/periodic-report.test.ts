import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import {
  normalizedPeriodicDecision, periodicDueAt, periodicDueDays, type PeriodicReportRepository,
} from "../../src/domain/periodic-report.js";
import type { PolicyRepository } from "../../src/domain/policy.js";
import { periodicReportOverview, recordMissingPeriodicReport } from "../../src/usecase/periodic-report.js";

const now = new Date("2026-10-10T08:00:00Z");
const officer = { id: "000000000000000000000001", accountState: "Active" as const };
const calendar = [
  { code: "Summer 2026", startAt: new Date("2026-05-01T00:00:00Z"), endAt: new Date("2026-08-31T00:00:00Z") },
  { code: "Fall 2026", startAt: new Date("2026-09-01T00:00:00Z"), endAt: new Date("2026-12-31T00:00:00Z") },
];

function deps(roles = ["ICPDP_OFFICER"]) {
  const repo: PeriodicReportRepository = { overview: vi.fn(async () => []), find: vi.fn(async () => null),
    decide: vi.fn(async () => ({}) as never), recordMissing: vi.fn(async () => ({ violationId: "x" })) };
  const policy: PolicyRepository = { findEffective: vi.fn(async () => ({ academicCalendar: calendar, reportDeadlines: [] }) as never) };
  const auth: Pick<AuthRepository, "systemRoleCodes"> = { systemRoleCodes: async () => roles };
  return { repo, policy, auth };
}

describe("periodic report rules", () => {
  it("is due a policy-set number of days after the semester ends, 7 by default", () => {
    expect(periodicDueDays([{ reportType: "periodic", dueDaysAfterPeriodEnd: 10, remindBeforeDays: 1, overdueAfterDays: 1,
      escalateAfterDays: 1 }])).toBe(10);
    expect(periodicDueDays(undefined)).toBe(7);
    expect(periodicDueAt(calendar[0]!, 7).toISOString()).toBe("2026-09-07T00:00:00.000Z");
  });

  it("accepts with an optional observation and returns only with a reason and sections", () => {
    expect(normalizedPeriodicDecision({ outcome: "Accept", observation: " Thiếu ảnh " })).toEqual({ outcome: "Accept", observation: "Thiếu ảnh" });
    expect(() => normalizedPeriodicDecision({ outcome: "Accept", reason: "x" })).toThrow(/return/);
    expect(() => normalizedPeriodicDecision({ outcome: "Return", sections: ["narrative"] })).toThrow(/reason/);
    expect(() => normalizedPeriodicDecision({ outcome: "Return", reason: "Sửa" })).toThrow(/parts/);
    expect(normalizedPeriodicDecision({ outcome: "Return", reason: "Sửa", sections: ["figures", "figures"] }))
      .toEqual({ outcome: "Return", reason: "Sửa", sections: ["figures"] });
  });

  it("defaults to the latest ended semester and refuses a missing report before it is due", async () => {
    const ok = deps();
    const overview = await periodicReportOverview(ok, officer, undefined, now);
    expect(overview).toMatchObject({ periodCode: "Summer 2026", dueAt: new Date("2026-09-07T00:00:00Z") });
    await expect(periodicReportOverview(ok, officer, "Spring 2030", now)).rejects.toMatchObject({ kind: "validation" });
    await expect(recordMissingPeriodicReport(ok, officer, { clubId: "000000000000000000000002", periodCode: "Fall 2026",
      severity: "MINOR" }, now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(periodicReportOverview(deps([]), officer, undefined, now)).rejects.toMatchObject({ kind: "forbidden" });
  });
});
