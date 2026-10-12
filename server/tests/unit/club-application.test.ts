import { describe, expect, it } from "vitest";
import { GRANTABLE_CLUB_PERMISSIONS, LEADER_ONLY_CLUB_PERMISSIONS } from "../../src/domain/access.js";
import {
  FOUNDING_POSITIONS, foundingSubmissionIssues, validateClubApplicationSubmission,
  type ClubApplicationDraft,
} from "../../src/domain/club-application.js";
import { DEFAULT_FORM_REQUIREMENTS, type FoundingRequirements } from "../../src/domain/policy.js";

const founder = "000000000000000000000001";
const member2 = "000000000000000000000002";
const member3 = "000000000000000000000003";
const requirements: FoundingRequirements = {
  policyVersionId: "policy-1", minFoundingMembers: 3, required: DEFAULT_FORM_REQUIREMENTS.clubFounding,
};

function validDraft(): ClubApplicationDraft {
  function document(documentType: string) {
    return { id: documentType, documentType, fileName: "f", mimeType: "application/pdf", bytes: 1,
      assetId: "a", uploadedAt: new Date() };
  }
  return {
    clubName: "Robotics Club", fieldId: "00000000000000000000000a", field: "Công nghệ",
    summary: "Robots", objectives: "Build robots", fanpageUrl: "", contactEmail: "",
    founders: [{ userId: founder, role: "LEADER" }, { userId: member2, role: "VICE_LEADER" },
      { userId: member3, role: "MEMBER" }],
    documents: [document("PROPOSAL"), document("LOGO")],
  };
}

describe("UC07 submission validation", () => {
  it("accepts a complete founding application under the effective policy", () => {
    expect(foundingSubmissionIssues(validDraft(), founder, requirements)).toEqual([]);
    expect(() => validateClubApplicationSubmission(validDraft(), founder, requirements)).not.toThrow();
  });

  it("requires distinct founders including the applicant and the policy minimum", () => {
    const valid = validDraft();
    expect(foundingSubmissionIssues({ ...valid, founders: valid.founders.slice(0, 2) }, founder,
      requirements)).toEqual(["foundersTooFew"]);
    expect(foundingSubmissionIssues({ ...valid, founders: [...valid.founders.slice(0, 2),
      { userId: member2, role: "MEMBER" }] }, founder, requirements)).toEqual(["duplicateFounder"]);
    expect(foundingSubmissionIssues(valid, "000000000000000000000009", requirements))
      .toEqual(["applicantNotFounder"]);
  });

  it("requires only the fields the policy marks as required", () => {
    const sparse = { ...validDraft(), summary: " ", objectives: "", documents: [] };
    expect(foundingSubmissionIssues(sparse, founder, requirements))
      .toEqual(["summary", "objectives", "proposal", "logo"]);
    expect(foundingSubmissionIssues(sparse, founder, { ...requirements,
      required: { ...requirements.required, summary: false, objectives: false, proposal: false, logo: false } }))
      .toEqual([]);
    expect(foundingSubmissionIssues(validDraft(), founder, { ...requirements,
      required: { ...requirements.required, fanpageUrl: true, contactEmail: true } }))
      .toEqual(["fanpageUrl", "contactEmail"]);
  });

  it("requires exactly one leader and one or two vice leaders", () => {
    const valid = validDraft();
    function roles(...values: ("LEADER" | "VICE_LEADER" | "MEMBER")[]): ClubApplicationDraft {
      return { ...valid, founders: values.map((role, index) => ({
        userId: `00000000000000000000000${index + 1}`, role })) };
    }
    expect(foundingSubmissionIssues(roles("LEADER", "LEADER", "VICE_LEADER"), founder, requirements))
      .toEqual(["leaderCount"]);
    expect(foundingSubmissionIssues(roles("LEADER", "MEMBER", "MEMBER"), founder, requirements))
      .toEqual(["viceLeaderCount"]);
    expect(foundingSubmissionIssues(roles("LEADER", "VICE_LEADER", "VICE_LEADER"), founder, requirements))
      .toEqual([]);
    expect(foundingSubmissionIssues(roles("LEADER", "VICE_LEADER", "VICE_LEADER", "VICE_LEADER"),
      founder, requirements)).toEqual(["viceLeaderCount"]);
  });

  it("reports every gap with the policy minimum in the error details", () => {
    expect(() => validateClubApplicationSubmission({ ...validDraft(), clubName: "", fieldId: "" },
      founder, requirements)).toThrow(expect.objectContaining({
      kind: "validation", details: { issues: ["clubName", "field"], required: 3 } }));
  });

  it("gives vice leaders every grantable permission and never a leader-only one", () => {
    const viceLeader = FOUNDING_POSITIONS.find((position) => position.founderRole === "VICE_LEADER")!;
    expect([...viceLeader.permissionCodes].sort()).toEqual([...GRANTABLE_CLUB_PERMISSIONS].sort());
    expect(viceLeader.permissionCodes.some((code) =>
      (LEADER_ONLY_CLUB_PERMISSIONS as readonly string[]).includes(code))).toBe(false);
    expect(FOUNDING_POSITIONS.filter((position) => position.isLeaderRole)).toHaveLength(1);
    expect(FOUNDING_POSITIONS.filter((position) => position.isDefaultMemberRole)).toHaveLength(1);
  });
});
