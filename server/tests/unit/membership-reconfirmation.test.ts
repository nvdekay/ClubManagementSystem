import { describe, expect, it } from "vitest";
import type { MembershipReconfirmationRepository } from "../../src/domain/membership-reconfirmation.js";
import type { PolicyRepository } from "../../src/domain/policy.js";
import { runMembershipReconfirmation } from "../../src/usecase/membership-reconfirmation.js";

describe("runMembershipReconfirmation", () => {
  it("expires overdue requests even when no semester is current", async () => {
    const calls: string[] = [];
    const repo = {
      run: async () => { calls.push("run"); return { opened: 0, expired: 0, exempt: 0 }; },
      expireOverdue: async (now: Date) => { calls.push(`sweep:${now.toISOString()}`); return { expired: 2, exempt: 1 }; },
    } as unknown as MembershipReconfirmationRepository;
    const ended = { code: "Summer 2026", startAt: new Date("2026-05-01"), endAt: new Date("2026-09-01") };
    const policy = { findEffective: async () => ({ academicCalendar: [ended] }) } as unknown as PolicyRepository;
    const now = new Date("2026-10-15T00:00:00Z");
    expect(await runMembershipReconfirmation(repo, policy, now)).toEqual({ opened: 0, expired: 2, exempt: 1 });
    expect(calls).toEqual([`sweep:${now.toISOString()}`]);
  });
});
