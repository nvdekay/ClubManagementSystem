import { describe, expect, it, vi } from "vitest";
import {
  actOnEventFinance,
  getEventFinance,
  listEventFinances,
  type EventFinanceDeps,
} from "../../src/usecase/event-finance.js";
import {
  actOnPostEventReport,
  listPostEventReports,
  type PostEventReportDeps,
} from "../../src/usecase/post-event-report.js";
const id = "111111111111111111111111",
  clubId = "222222222222222222222222";
const now = new Date("2026-10-11T00:00:00Z");
function deps() {
  const read = vi.fn(async () => null);
  const write = vi.fn(async () => {
    throw new Error("must not reach repository");
  });
  const shared = {
    access: { findSnapshot: async () => null },
    auth: { systemRoleCodes: async () => [] },
  };
  const finance: EventFinanceDeps = {
    ...shared,
    repo: { list: async () => [], find: read, act: write },
  };
  const report: PostEventReportDeps = {
    ...shared,
    repo: { list: async () => [], find: read, act: write },
  };
  return { finance, report, read, write };
}
describe("Accountability access boundaries", () => {
  it("rejects unauthenticated, locked and non-officer callers before repository reads", async () => {
    const d = deps();
    await expect(
      listEventFinances(d.finance, null, undefined, now),
    ).rejects.toMatchObject({ kind: "unauthorized" });
    await expect(
      listPostEventReports(
        d.report,
        { id, accountState: "Locked" },
        undefined,
        now,
      ),
    ).rejects.toMatchObject({ kind: "locked" });
    await expect(
      getEventFinance(
        d.finance,
        { id, accountState: "Active" },
        id,
        undefined,
        now,
      ),
    ).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.read).not.toHaveBeenCalled();
  });
  it("denies cross-club mutation even when an officer also holds club membership elsewhere", async () => {
    const d = deps();
    d.finance.auth.systemRoleCodes = async () => ["ICPDP_OFFICER"];
    await expect(
      actOnEventFinance(
        d.finance,
        { id, accountState: "Active" },
        id,
        clubId,
        { kind: "submit", revision: 0 },
        now,
      ),
    ).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.write).not.toHaveBeenCalled();
  });
  it("does not allow officers to bypass the club permission by using admin save/expense actions", async () => {
    const d = deps();
    d.finance.auth.systemRoleCodes = async () => ["ICPDP_OFFICER"];
    d.report.auth.systemRoleCodes = async () => ["ICPDP_OFFICER"];
    await expect(
      actOnEventFinance(
        d.finance,
        { id, accountState: "Active" },
        id,
        undefined,
        {
          kind: "expense",
          revision: 0,
          input: { category: "Supplies", amount: 10, spentAt: now },
        },
        now,
      ),
    ).rejects.toMatchObject({ kind: "forbidden" });
    await expect(
      actOnPostEventReport(
        d.report,
        { id, accountState: "Active" },
        id,
        undefined,
        {
          kind: "save",
          revision: 0,
          input: { actualResult: "Results", evidence: [] },
        },
        now,
      ),
    ).rejects.toMatchObject({ kind: "forbidden" });
    expect(d.write).not.toHaveBeenCalled();
  });
});
