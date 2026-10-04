import { describe, expect, it } from "vitest";
import type { ClubApplicationSubmission } from "../../src/domain/club-application.js";
import { validateClubApplicationSubmission } from "../../src/domain/club-application.js";
import type { FoundingRequirements } from "../../src/domain/policy.js";

const founder = "000000000000000000000001";
const member2 = "000000000000000000000002";
const member3 = "000000000000000000000003";
const requirements: FoundingRequirements = {
  policyVersionId: "policy-1", minFoundingMembers: 3,
  mandatoryApplicationDocuments: ["charter", "founder-list"],
};

function validSubmission(): ClubApplicationSubmission {
  return {
    clubName: "Robotics Club", field: "Technology", objectives: "Build robots",
    founderUserId: founder, foundingUserIds: [founder, member2, member3],
    documentTypes: ["charter", "founder-list"],
    proposedRoles: [
      { code: "CLUB_LEADER", name: "Club Leader", isBoardSeat: true, isLeaderRole: true,
        isDefaultMemberRole: false, isSingleHolder: true, permissionCodes: [] },
      { code: "MEMBERS", name: "Members", isBoardSeat: false, isLeaderRole: false,
        isDefaultMemberRole: true, isSingleHolder: false, permissionCodes: [] },
      { code: "EVENT", name: "Event coordinator", isBoardSeat: false,
        isLeaderRole: false, isDefaultMemberRole: false, isSingleHolder: false,
        permissionCodes: ["club.event.manage"] },
    ],
  };
}

describe("UC07 submission validation", () => {
  it("accepts a complete founding application under the effective policy", () => {
    expect(() => validateClubApplicationSubmission(validSubmission(), requirements)).not.toThrow();
  });

  it("requires distinct founding users including the applicant and the policy minimum", () => {
    const valid = validSubmission();
    for (const foundingUserIds of [
      [founder, member2], [founder, member2, member2], [member2, member3, "000000000000000000000004"],
      [founder, member2, "invalid-id"],
    ]) {
      expect(() => validateClubApplicationSubmission({ ...valid, foundingUserIds }, requirements))
        .toThrow();
    }
  });

  it("reports missing required documents from policy", () => {
    try {
      validateClubApplicationSubmission({ ...validSubmission(), documentTypes: ["charter"] }, requirements);
      throw new Error("expected a validation error");
    } catch (error) {
      expect(error).toMatchObject({
        kind: "validation", details: { missingDocuments: ["founder-list"] },
      });
    }
  });

  it("rejects missing or invalid leader and Members roles", () => {
    const valid = validSubmission();
    const [leader, members, event] = valid.proposedRoles;
    for (const proposedRoles of [
      [members!, event!],
      [leader!, event!],
      [leader!, { ...leader!, code: "SECOND_LEADER" }, members!],
      [{ ...leader!, isBoardSeat: false }, members!],
      [leader!, { ...members!, isSingleHolder: true }],
      [leader!, members!, { ...event!, code: "members" }],
    ]) {
      expect(() => validateClubApplicationSubmission({ ...valid, proposedRoles }, requirements))
        .toThrow();
    }
  });

  it("never grants a Club Leader reserved or unknown permission through a role", () => {
    const valid = validSubmission();
    for (const permissionCodes of [["club.role.manage"], ["unknown.permission"],
      ["club.event.manage", "club.event.manage"]]) {
      const proposedRoles = valid.proposedRoles.map((role) => role.code === "EVENT"
        ? { ...role, permissionCodes } : role);
      expect(() => validateClubApplicationSubmission({ ...valid, proposedRoles }, requirements))
        .toThrow();
    }
  });
});
