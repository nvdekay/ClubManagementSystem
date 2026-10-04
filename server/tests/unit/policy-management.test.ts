import { describe, expect, it } from "vitest";
import type { PolicyManagementRepository, PolicySettings, PolicyVersion } from "../../src/domain/policy.js";
import {
  createPolicyVersion, listPolicyVersions, normalizePolicySettings,
} from "../../src/usecase/policy.js";

const now = new Date("2026-10-03T12:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const officer = { systemRoleCodes: async () => ["ICPDP_OFFICER"] };
const student = { systemRoleCodes: async () => [] };

function settings(): PolicySettings {
  return {
    allowedEmailDomains: ["FPT.EDU.VN"], minFoundingMembers: 5,
    mandatoryApplicationDocuments: ["charter", "founder-list"],
    reportDeadlines: [{ reportType: "periodic", dueDaysAfterPeriodEnd: 10,
      remindBeforeDays: 3, overdueAfterDays: 2, escalateAfterDays: 5 }],
    conflictThresholdMinutes: 30, feedbackWindowHours: 48,
    feedbackMinRespondents: 5, allowOverbooking: false,
    enforceOverdueReportBlock: true,
    academicCalendar: [
      { code: "FA26", startAt: new Date("2026-09-01"), endAt: new Date("2026-12-31") },
      { code: "SP27", startAt: new Date("2027-01-01"), endAt: new Date("2027-04-30") },
    ],
  };
}

function repository() {
  const saved: PolicyVersion[] = [];
  const repo: PolicyManagementRepository = {
    async findEffective(at) {
      return saved.filter((version) => version.effectiveFrom <= at)
        .sort((left, right) => right.effectiveFrom.getTime() - left.effectiveFrom.getTime())[0] ?? null;
    },
    async listRecent(limit) { return saved.slice(-limit).reverse(); },
    async append(input) {
      const version = { ...input.settings, id: `version-${saved.length + 1}`,
        effectiveFrom: input.effectiveFrom, createdBy: input.createdBy, createdAt: input.createdAt };
      saved.push(version);
      return version;
    },
  };
  return { repo, saved };
}

describe("UC04 policy management", () => {
  it("normalizes domains and rejects duplicate or invalid values", () => {
    expect(normalizePolicySettings(settings()).allowedEmailDomains).toEqual(["fpt.edu.vn"]);
    for (const allowedEmailDomains of [["fpt.edu.vn", "FPT.EDU.VN"], ["not a domain"]]) {
      expect(() => normalizePolicySettings({ ...settings(), allowedEmailDomains }))
        .toThrowError(/allowedEmailDomains/);
    }
    expect(() => normalizePolicySettings({ ...settings(), minFoundingMembers: 0 }))
      .toThrowError(/minFoundingMembers/);
    expect(() => normalizePolicySettings({ ...settings(), feedbackMinRespondents: 1 }))
      .toThrowError(/feedbackMinRespondents/);
  });

  it("rejects conflicting deadline and semester values", () => {
    const base = settings();
    const deadline = base.reportDeadlines[0]!;
    expect(() => normalizePolicySettings({ ...base,
      reportDeadlines: [null] as unknown as PolicySettings["reportDeadlines"],
    })).toThrowError(/reportDeadlines/);
    expect(() => normalizePolicySettings({ ...base,
      reportDeadlines: [{ ...deadline, escalateAfterDays: deadline.overdueAfterDays }],
    })).toThrowError(/reportDeadlines/);
    expect(() => normalizePolicySettings({ ...base,
      reportDeadlines: [deadline, { ...deadline, reportType: "PERIODIC" }],
    })).toThrowError(/reportDeadlines/);
    expect(() => normalizePolicySettings({ ...base,
      academicCalendar: [base.academicCalendar[0]!,
        { code: "SP27", startAt: new Date("2026-12-01"), endAt: new Date("2027-04-30") }],
    })).toThrowError(/academicCalendar/);
    expect(() => normalizePolicySettings({ ...base,
      academicCalendar: [null] as unknown as PolicySettings["academicCalendar"],
    })).toThrowError(/academicCalendar/);
  });

  it("requires a current ICPDP role and rejects a past effective date before appending", async () => {
    const { repo, saved } = repository();
    await expect(createPolicyVersion(repo, student, actor, settings(), undefined, undefined, now))
      .rejects.toMatchObject({ kind: "forbidden" });
    await expect(createPolicyVersion(repo, officer, null, settings(), undefined, undefined, now))
      .rejects.toMatchObject({ kind: "unauthorized" });
    await expect(createPolicyVersion(repo, officer, actor, settings(), new Date("2026-10-02"),
      undefined, now)).rejects.toMatchObject({ kind: "validation" });
    expect(saved).toHaveLength(0);
  });

  it("creates an immediate version and schedules a future version without changing current", async () => {
    const { repo, saved } = repository();
    const initial = await createPolicyVersion(repo, officer, actor, settings(), undefined,
      "initial policy", now);
    const future = new Date("2026-11-01T00:00:00Z");
    const scheduled = await createPolicyVersion(repo, officer, actor,
      { ...settings(), minFoundingMembers: 7 }, future, undefined, now);
    expect(initial.createdBy).toBe(actor.id);
    expect(initial.effectiveFrom).toEqual(now);
    expect(scheduled.effectiveFrom).toEqual(future);
    expect(saved).toHaveLength(2);
    expect((await listPolicyVersions(repo, officer, actor, now)).current?.id).toBe(initial.id);
    expect((await listPolicyVersions(repo, officer, actor, now)).versions).toHaveLength(2);
  });
});
