import { describe, expect, it, vi } from "vitest";
import { normalizePeriodicDraft, type ClubPeriodicReportRepository } from "../../src/domain/club-periodic-report.js";
import { changeClubPeriodicReport, createClubPeriodicReport } from "../../src/usecase/club-periodic-report.js";
const clubId = "000000000000000000000001";
const userId = "000000000000000000000002";
const now = new Date("2026-10-15T00:00:00Z");
const actor = { id: userId, accountState: "Active" as const };
const denied = { findSnapshot: async () => null };
function repository(): ClubPeriodicReportRepository {
  return { list: async () => [], create: vi.fn(), save: vi.fn(), submit: vi.fn() };
}
describe("UC38 periodic submission rules", () => {
  it("allows an empty draft but requires all sections and evidence on submission", () => {
    const input = { narrative: " ", nextPlan: " ", evidence: [] };
    expect(normalizePeriodicDraft(input)).toEqual({ narrative: "", nextPlan: "", evidence: [] });
    expect(() => normalizePeriodicDraft(input, true)).toThrow(/required/);
    expect(normalizePeriodicDraft({ narrative: " Semester report ", nextPlan: " Next semester ", evidence: [{ note: " Minutes " }] }, true))
      .toEqual({ narrative: "Semester report", nextPlan: "Next semester", evidence: [{ note: "Minutes" }] });
  });
  it("rejects executable evidence URLs, empty evidence and oversized content", () => {
    for (const entry of [{ url: "javascript:alert(1)" }, { url: "file:///tmp/a" }, { note: " " }, { url: "invalid" }]) {
      expect(() => normalizePeriodicDraft({ narrative: "Report", nextPlan: "Plan", evidence: [entry] })).toThrow();
    }
    expect(() => normalizePeriodicDraft({ narrative: "x".repeat(20_001), nextPlan: "", evidence: [] })).toThrow(/long/);
  });
  it("denies member or other club access before creating, editing or submitting", async () => {
    const repo = repository();
    const policy = { findEffective: vi.fn(async () => null) };
    await expect(createClubPeriodicReport(repo, policy, denied, actor, clubId, "Fall 2026", now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(changeClubPeriodicReport(repo, denied, actor, clubId, clubId, 1, null, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.submit).not.toHaveBeenCalled();
    expect(policy.findEffective).not.toHaveBeenCalled();
  });
});
