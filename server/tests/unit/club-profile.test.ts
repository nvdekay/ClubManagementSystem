import { describe, expect, it, vi } from "vitest";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import type { ClubProfileRepository } from "../../src/domain/club-profile.js";
import {
  DEFAULT_FORM_REQUIREMENTS, type PolicyRepository, type PolicyVersion,
} from "../../src/domain/policy.js";
import {
  createClubDepartment,
  getClubSettings,
  updateClubProfile,
} from "../../src/usecase/club-profile.js";

const now = new Date("2026-10-08T12:00:00Z");
const actor = { id: "000000000000000000000001", accountState: "Active" as const };
const clubId = "000000000000000000000002";

const noPolicy: PolicyRepository = { findEffective: async () => null };

function policyRequiring(fields: Partial<PolicyVersion["formRequirements"]["clubProfile"]>): PolicyRepository {
  return { findEffective: async () => ({ formRequirements: { ...DEFAULT_FORM_REQUIREMENTS,
    clubProfile: { ...DEFAULT_FORM_REQUIREMENTS.clubProfile, ...fields } } }) as PolicyVersion };
}

function snapshot(): ClubAccessSnapshot {
  return {
    clubId, clubName: "Robotics Club", clubState: "Pending Setup", membership: null,
    terms: [], positions: [], assignments: [], isApprovedFounder: true,
  };
}

function access(value: ClubAccessSnapshot | null = snapshot()): ClubAccessRepository {
  return { findSnapshot: async () => value };
}

function repository(overrides: Partial<ClubProfileRepository> = {}): ClubProfileRepository {
  return {
    findProfile: async () => ({ id: clubId, code: "CLB-001", name: "Robotics Club",
      field: "Technology", state: "Pending Setup", channels: [] }),
    listDepartments: async () => [],
    updateProfile: async (_clubId, _actorId, input) => ({ id: clubId, code: "CLB-001",
      name: "Robotics Club", field: "Technology", state: "Pending Setup", ...input }),
    applyDepartmentTemplate: async () => [],
    createDepartment: async (_clubId, _actorId, input) => ({ id: "000000000000000000000003",
      clubId, ...input, isActive: true, createdAt: now }),
    updateDepartment: async () => { throw new Error("unused"); },
    deactivateDepartment: async () => { throw new Error("unused"); },
    ...overrides,
  };
}

describe("UC09 club profile and structure use case", () => {
  it("allows the approved founder to view settings while access resolves club.role.manage", async () => {
    await expect(getClubSettings(repository(), access(), noPolicy, actor, clubId, now))
      .resolves.toMatchObject({ profile: { state: "Pending Setup" }, departments: [] });
    await expect(getClubSettings(repository(), access(null), noPolicy, actor, clubId, now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });

  it("rejects settings reads and profile or department writes from ordinary members", async () => {
    for (const state of ["Active", "Inactive"]) {
      const memberAccess = access({ ...snapshot(), isApprovedFounder: false,
        membership: { id: actor.id, clubId, state } });
      await expect(getClubSettings(repository(), memberAccess, noPolicy, actor, clubId, now))
        .rejects.toMatchObject({ kind: "forbidden" });
      const updateProfile = vi.fn(repository().updateProfile);
      await expect(updateClubProfile(repository({ updateProfile }), memberAccess, noPolicy, actor,
        clubId, { channels: [] }, now)).rejects.toMatchObject({ kind: "forbidden" });
      expect(updateProfile).not.toHaveBeenCalled();
      await expect(createClubDepartment(repository(), memberAccess, actor, clubId,
        { name: "Events", sortOrder: 1 }, now)).rejects.toMatchObject({ kind: "forbidden" });
    }
  });

  it("rejects outsiders, former members, banned members and locked accounts", async () => {
    for (const state of ["Left", "Banned"]) {
      await expect(getClubSettings(repository(), access({ ...snapshot(), isApprovedFounder: false,
        membership: { id: actor.id, clubId, state } }), noPolicy, actor, clubId, now))
        .rejects.toMatchObject({ kind: "forbidden" });
    }
    await expect(getClubSettings(repository(), access(), noPolicy, null, clubId, now))
      .rejects.toMatchObject({ kind: "unauthorized" });
    await expect(getClubSettings(repository(), access(), noPolicy,
      { ...actor, accountState: "Locked" }, clubId, now)).rejects.toMatchObject({ kind: "locked" });
  });

  it("normalizes editable fields without accepting institutional fields", async () => {
    const updateProfile = vi.fn(repository().updateProfile);
    await updateClubProfile(repository({ updateProfile }), access(), noPolicy, actor, clubId, {
      description: "  A practical club  ", contactEmail: " CLUB@EXAMPLE.EDU ",
      contactPhone: " 0123456789 ", charterUrl: "https://example.edu/charter",
      channels: [{ label: " Facebook ", url: "https://facebook.com/example" }],
      operatingScope: " Campus ",
    }, now);
    expect(updateProfile).toHaveBeenCalledWith(clubId, actor.id, {
      description: "A practical club", contactEmail: "club@example.edu",
      contactPhone: "0123456789", charterUrl: "https://example.edu/charter",
      channels: [{ label: "Facebook", url: "https://facebook.com/example" }],
      operatingScope: "Campus",
    }, now);
  });

  it("rejects malformed contact data before writing", async () => {
    const updateProfile = vi.fn(repository().updateProfile);
    await expect(updateClubProfile(repository({ updateProfile }), access(), noPolicy, actor, clubId, {
      contactEmail: "not-an-email", channels: [],
    }, now)).rejects.toMatchObject({ kind: "validation" });
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it("rejects a profile missing a field the current policy requires", async () => {
    const updateProfile = vi.fn(repository().updateProfile);
    await expect(updateClubProfile(repository({ updateProfile }), access(),
      policyRequiring({ contactEmail: true, channels: true }), actor, clubId,
      { description: "Robots", channels: [] }, now))
      .rejects.toMatchObject({ kind: "validation",
        details: { missing: ["contactEmail", "channels"] } });
    expect(updateProfile).not.toHaveBeenCalled();
    await expect(getClubSettings(repository(), access(), policyRequiring({ contactEmail: true }),
      actor, clubId, now)).resolves.toMatchObject({ requiredProfileFields: { contactEmail: true } });
  });

  it("validates department name and display order before writing", async () => {
    const createDepartment = vi.fn(repository().createDepartment);
    await expect(createClubDepartment(repository({ createDepartment }), access(), actor, clubId,
      { name: " ", sortOrder: -1 }, now)).rejects.toMatchObject({ kind: "validation" });
    expect(createDepartment).not.toHaveBeenCalled();
  });
});

describe("club settings visibility", () => {
  it("denies settings to an ordinary member even with delegated profile permissions", async () => {
    const member: ClubAccessSnapshot = { ...snapshot(), clubState: "Active", isApprovedFounder: false,
      membership: { id: "membership", clubId, state: "Active" },
      positions: [{ id: "default", clubId, isActive: true, isLeaderRole: false, isDefaultMemberRole: true,
        permissionCodes: ["club.profile.manage"] }] };
    const findProfile = vi.fn(repository().findProfile);
    await expect(getClubSettings(repository({ findProfile }), access(member), noPolicy, actor, clubId, now))
      .rejects.toMatchObject({ kind: "forbidden" });
    expect(findProfile).not.toHaveBeenCalled();
  });
});
