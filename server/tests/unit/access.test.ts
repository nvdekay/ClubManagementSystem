import { describe, expect, it } from "vitest";
import {
  normalizeAllowedGoogleEmail,
  requireClubPermission,
  resolveClubPermissions,
  type ClubAccessSnapshot,
  type ClubAccessRepository,
} from "../../src/domain/access.js";
import { assertClubAccess } from "../../src/usecase/access.js";

const now = new Date("2026-10-02T12:00:00.000Z");

function snapshot(): ClubAccessSnapshot {
  return {
    clubId: "club-a",
    clubName: "Club A",
    clubState: "Active",
    membership: { id: "member-a", clubId: "club-a", state: "Active" },
    terms: [{
      id: "term-a", clubId: "club-a", state: "Active",
      startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01"),
    }],
    positions: [{
      id: "position-a", clubId: "club-a", isActive: true, isLeaderRole: false,
      permissionCodes: ["club.event.manage", "club.role.manage"],
    }],
    assignments: [{
      clubId: "club-a", termId: "term-a", positionId: "position-a",
      membershipId: "member-a", effectiveFrom: new Date("2026-01-01"),
    }],
    isApprovedFounder: false,
  };
}

describe("club permission resolver", () => {
  it("grants only catalogued assignable permissions to a current club member", () => {
    expect(resolveClubPermissions(snapshot(), now)).toEqual(["club.event.manage"]);
    expect(() => requireClubPermission(snapshot(), "club.role.manage", now)).toThrowError(
      expect.objectContaining({ kind: "forbidden" }),
    );
  });

  it("rejects mismatched membership, club, expired term, expired assignment and disabled position", () => {
    const base = snapshot();
    const changes: ClubAccessSnapshot[] = [
      { ...base, membership: { id: "member-b", clubId: "club-a", state: "Active" } },
      { ...base, membership: { id: "member-a", clubId: "club-b", state: "Active" } },
      { ...base, membership: { id: "member-a", clubId: "club-a", state: "Left" } },
      { ...base, terms: [{ ...base.terms[0]!, state: "Closed" }] },
      { ...base, terms: [{ ...base.terms[0]!, endAt: now }] },
      { ...base, assignments: [{ ...base.assignments[0]!, clubId: "club-b" }] },
      { ...base, assignments: [{ ...base.assignments[0]!, effectiveTo: now }] },
      { ...base, positions: [{ ...base.positions[0]!, clubId: "club-b" }] },
      { ...base, positions: [{ ...base.positions[0]!, isActive: false }] },
    ];
    for (const changed of changes) expect(resolveClubPermissions(changed, now)).toEqual([]);
  });

  it("grants leader rights only for a confirmed current leader assignment", () => {
    const base = snapshot();
    const leader: ClubAccessSnapshot = {
      ...base,
      positions: [{ ...base.positions[0]!, isLeaderRole: true, permissionCodes: [] }],
    };
    expect(resolveClubPermissions(leader, now)).toEqual([]);
    const confirmed: ClubAccessSnapshot = {
      ...leader,
      assignments: [{ ...leader.assignments[0]!, confirmedBy: "officer-a" }],
    };
    expect(resolveClubPermissions(confirmed, now)).toHaveLength(15);
    expect(resolveClubPermissions(confirmed, now)).toContain("club.suspension.request");
  });

  it("limits an approved founder to UC09, UC10 and UC23 during Pending Setup", () => {
    const founder: ClubAccessSnapshot = {
      ...snapshot(), membership: null, clubState: "Pending Setup", isApprovedFounder: true,
    };
    expect(resolveClubPermissions(founder, now)).toEqual([
      "club.profile.manage", "club.role.manage", "club.board.nominate",
    ]);
    expect(resolveClubPermissions({ ...founder, clubState: "Active" }, now)).toEqual([]);
  });
});

describe("Google email policy", () => {
  it("normalizes a verified address and matches the whole domain", () => {
    expect(normalizeAllowedGoogleEmail(" Student@FPT.EDU.VN ", true, ["@fpt.edu.vn"]))
      .toBe("student@fpt.edu.vn");
  });

  it("rejects unverified, malformed and suffix-spoofed addresses", () => {
    for (const [email, verified] of [
      ["student@fpt.edu.vn", false],
      ["student@fpt.edu.vn.attacker.test", true],
      ["student@sub.fpt.edu.vn", true],
      ["student-fpt.edu.vn", true],
    ] as const) {
      expect(() => normalizeAllowedGoogleEmail(email, verified, ["fpt.edu.vn"]))
        .toThrowError(expect.objectContaining({ kind: "forbidden" }));
    }
  });

  it("admits any verified domain with the * entry but still rejects unverified or malformed emails", () => {
    expect(normalizeAllowedGoogleEmail("Someone@Gmail.com", true, ["*"])).toBe("someone@gmail.com");
    expect(normalizeAllowedGoogleEmail("staff@fpt.edu.vn", true, ["*"])).toBe("staff@fpt.edu.vn");
    for (const [email, verified] of [
      ["someone@gmail.com", false],
      ["no-at-sign.gmail.com", true],
      ["two@at@gmail.com", true],
    ] as const) {
      expect(() => normalizeAllowedGoogleEmail(email, verified, ["*"]))
        .toThrowError(expect.objectContaining({ kind: "forbidden" }));
    }
  });
});

describe("club access use case", () => {
  const actor = { id: "0123456789abcdef01234567", accountState: "Active" as const };
  const clubId = "abcdef0123456789abcdef01";
  let lookups = 0;
  const repo: ClubAccessRepository = {
    async findSnapshot() {
      lookups += 1;
      return { ...snapshot(), clubId };
    },
  };

  it("returns 401 without a session and 423 for a locked account before querying", async () => {
    lookups = 0;
    await expect(assertClubAccess(repo, null, clubId, "club.event.manage", now))
      .rejects.toMatchObject({ kind: "unauthorized" });
    await expect(assertClubAccess(repo, { ...actor, accountState: "Locked", lockReason: "case" },
      clubId, "club.event.manage", now)).rejects.toMatchObject({ kind: "locked", message: "case" });
    expect(lookups).toBe(0);
  });

  it("rejects invalid identifiers before querying", async () => {
    lookups = 0;
    await expect(assertClubAccess(repo, actor, "{ $ne: null }", "club.event.manage", now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(lookups).toBe(0);
  });

  it("returns 403 for a missing club snapshot", async () => {
    const missing: ClubAccessRepository = { findSnapshot: async () => null };
    await expect(assertClubAccess(missing, actor, clubId, "club.event.manage", now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });
});
