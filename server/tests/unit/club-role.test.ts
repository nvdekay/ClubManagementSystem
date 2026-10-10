import { describe, expect, it } from "vitest";
import {
  GRANTABLE_CLUB_PERMISSIONS,
  LEADER_ONLY_CLUB_PERMISSIONS,
  resolveClubPermissions,
  type ClubAccessRepository,
  type ClubAccessSnapshot,
} from "../../src/domain/access.js";
import type { ClubRole, ClubRoleOverview, ClubRoleRepository } from "../../src/domain/club-role.js";
import {
  assignClubRole,
  createClubRole,
  deactivateClubRole,
  getClubRoles,
  revokeClubRole,
  updateClubRole,
} from "../../src/usecase/club-role.js";

const now = new Date("2026-10-10T12:00:00Z");
const clubId = "c00000000000000000000001";
const termId = "700000000000000000000001";
const leader = { id: "a00000000000000000000001", accountState: "Active" as const };
const m = { leader: "b00000000000000000000001", vice: "b00000000000000000000002",
  active: "b00000000000000000000003", other: "b00000000000000000000004", inactive: "b00000000000000000000005" };
const ids = { leader: "d00000000000000000000001", vice: "d00000000000000000000002", members: "d00000000000000000000003" };

function role(id: string, overrides: Partial<ClubRole>): ClubRole {
  return { id, code: id, name: id, isBoardSeat: false, isLeaderRole: false, isDefaultMemberRole: false,
    isSingleHolder: false, permissionCodes: [], isActive: true, holders: [], ...overrides };
}

function holder(membershipId: string, assignmentId: string) {
  return { assignmentId, membershipId, displayName: membershipId, email: `${membershipId}@x.edu`,
    effectiveFrom: new Date("2026-09-01T00:00:00Z") };
}

/** In-memory port: same contract as the Mongo repository, including one version per structural change. */
function fakeRepo(clubState = "Active", activeTermId: string | null = termId) {
  let sequence = 0;
  function nextId() { return `e${String(++sequence).padStart(23, "0")}`; }
  const notifications: string[] = [];
  const state: ClubRoleOverview = {
    clubId, clubState, activeTermId, departments: ["Ban Sự kiện"],
    roles: [
      role(ids.leader, { name: "Chủ nhiệm", isLeaderRole: true, isBoardSeat: true, isSingleHolder: true,
        holders: [holder(m.leader, "f00000000000000000000001")] }),
      role(ids.vice, { name: "Phó chủ nhiệm", isBoardSeat: true, permissionCodes: ["club.event.manage"],
        holders: [holder(m.vice, "f00000000000000000000002")] }),
      role(ids.members, { name: "Thành viên", isDefaultMemberRole: true }),
    ],
    members: [
      { membershipId: m.leader, displayName: "L", email: "l@x.edu", state: "Active" },
      { membershipId: m.vice, displayName: "V", email: "v@x.edu", state: "Active" },
      { membershipId: m.active, displayName: "A", email: "a@x.edu", state: "Active" },
      { membershipId: m.other, displayName: "O", email: "o@x.edu", state: "Active" },
      { membershipId: m.inactive, displayName: "I", email: "i@x.edu", state: "Inactive" },
    ],
    versions: [],
  };
  function version() {
    state.versions.unshift({ id: nextId(), versionNo: state.versions.length + 1, effectiveFrom: now,
      source: state.versions.length ? "ROLE_MANAGEMENT" : "APPLICATION", createdBy: leader.id, createdAt: now,
      roles: state.roles.map(({ id, holders: _holders, isActive: _active, ...rest }) =>
        ({ ...structuredClone(rest), positionId: id })) });
  }
  version();
  const repo: ClubRoleRepository = {
    overview: async () => structuredClone(state),
    async createRole(_clubId, _actorId, input) {
      state.roles.push(role(nextId(), { name: input.name, unit: input.unit, isSingleHolder: input.isSingleHolder,
        permissionCodes: input.permissionCodes }));
      version();
    },
    async updateRole(_clubId, roleId, _actorId, input) {
      Object.assign(state.roles.find((item) => item.id === roleId)!, { name: input.name, unit: input.unit,
        isSingleHolder: input.isSingleHolder, permissionCodes: input.permissionCodes });
      version();
    },
    async deactivateRole(_clubId, roleId) {
      state.roles = state.roles.filter((item) => item.id !== roleId);
      version();
    },
    async assign(_clubId, roleId, _termId, _actorId, input) {
      state.roles.find((item) => item.id === roleId)!.holders.push({ ...holder(input.membershipId, nextId()),
        effectiveFrom: input.effectiveFrom, ...(input.effectiveTo ? { effectiveTo: input.effectiveTo } : {}) });
      notifications.push(`CLUB_ROLE_ASSIGNED:${input.membershipId}`);
    },
    async revoke(_clubId, roleId, assignmentId) {
      const target = state.roles.find((item) => item.id === roleId)!;
      const revoked = target.holders.find((item) => item.assignmentId === assignmentId)!;
      target.holders = target.holders.filter((item) => item !== revoked);
      notifications.push(`CLUB_ROLE_REVOKED:${revoked.membershipId}`);
    },
  };
  /** Permissions a member resolves from the live store — what the next request would see. */
  function permissionsOf(membershipId: string): string[] {
    const member = state.members.find((item) => item.membershipId === membershipId)!;
    const snapshot: ClubAccessSnapshot = {
      clubId, clubName: "Club", clubState, isApprovedFounder: false,
      membership: { id: membershipId, clubId, state: member.state },
      terms: [{ id: termId, clubId, state: "Active", startAt: new Date("2026-09-01"), endAt: new Date("2027-09-01") }],
      positions: state.roles.map((item) => ({ id: item.id, clubId, isActive: true, isLeaderRole: item.isLeaderRole,
        isDefaultMemberRole: item.isDefaultMemberRole, permissionCodes: item.permissionCodes })),
      assignments: state.roles.flatMap((item) => item.holders.map((entry) => ({ clubId, termId,
        positionId: item.id, membershipId: entry.membershipId, effectiveFrom: entry.effectiveFrom,
        effectiveTo: entry.effectiveTo ?? null, confirmedBy: leader.id }))),
    };
    return resolveClubPermissions(snapshot, now);
  }
  return { repo, state, notifications, permissionsOf };
}

function leaderAccess(clubState = "Active"): ClubAccessRepository {
  return { findSnapshot: async () => ({
    clubId, clubName: "Club", clubState, isApprovedFounder: false,
    membership: { id: m.leader, clubId, state: "Active" },
    terms: [{ id: termId, clubId, state: "Active", startAt: new Date("2026-09-01"), endAt: new Date("2027-09-01") }],
    positions: [{ id: ids.leader, clubId, isActive: true, isLeaderRole: true, permissionCodes: [] }],
    assignments: [{ clubId, termId, positionId: ids.leader, membershipId: m.leader,
      effectiveFrom: new Date("2026-09-01"), confirmedBy: leader.id }],
  }) };
}

const treasurer = { name: "  Thủ quỹ ", isSingleHolder: true,
  permissionCodes: ["club.report.submit", "club.expense.record", "club.expense.record"] };

async function withTreasurer() {
  const fake = fakeRepo();
  const overview = await createClubRole(fake.repo, leaderAccess(), leader, clubId, treasurer, now);
  return { ...fake, treasurerId: overview.roles.find((item) => item.name === "Thủ quỹ")!.id };
}

describe("UC23 club role management", () => {
  it("E5: only a caller holding club.role.manage may open or change roles", async () => {
    const vice: ClubAccessRepository = { findSnapshot: async () => ({
      ...(await leaderAccess().findSnapshot(leader.id, clubId))!,
      positions: [{ id: ids.vice, clubId, isActive: true, isLeaderRole: false,
        permissionCodes: ["club.member.manage", "club.role.manage"] }],
      assignments: [{ clubId, termId, positionId: ids.vice, membershipId: m.leader,
        effectiveFrom: new Date("2026-09-01") }] }) };
    await expect(getClubRoles(fakeRepo().repo, vice, leader, clubId, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(createClubRole(fakeRepo().repo, vice, leader, clubId, treasurer, now))
      .rejects.toMatchObject({ kind: "forbidden" });
    const founder: ClubAccessRepository = { findSnapshot: async () => ({ clubId, clubName: "Club",
      clubState: "Pending Setup", membership: null, terms: [], positions: [], assignments: [], isApprovedFounder: true }) };
    await expect(getClubRoles(fakeRepo("Pending Setup").repo, founder, leader, clubId, now))
      .resolves.toMatchObject({ clubState: "Pending Setup" });
  });

  it("step 3: offers only the grantable catalogue, never leader-only permissions", async () => {
    const overview = await getClubRoles(fakeRepo().repo, leaderAccess(), leader, clubId, now);
    expect(overview.grantablePermissions).toHaveLength(11);
    for (const code of LEADER_ONLY_CLUB_PERMISSIONS) expect(overview.grantablePermissions).not.toContain(code);
  });

  it("step 4 / BR56: creating a role stores normalized permissions and appends a new version", async () => {
    const fake = fakeRepo();
    const original = structuredClone(fake.state.versions[0]);
    const overview = await createClubRole(fake.repo, leaderAccess(), leader, clubId, treasurer, now);
    expect(overview.roles.at(-1)).toMatchObject({ name: "Thủ quỹ", isBoardSeat: false, isSingleHolder: true,
      permissionCodes: ["club.report.submit", "club.expense.record"] });
    expect(overview.versions.map((item) => item.versionNo)).toEqual([2, 1]);
    expect(overview.versions[0]!.roles.map((item) => item.name)).toContain("Thủ quỹ");
    expect(overview.versions[1]).toEqual(original);
  });

  it("E3: rejects leader-only and unknown permissions before writing", async () => {
    const fake = fakeRepo();
    await expect(createClubRole(fake.repo, leaderAccess(), leader, clubId,
      { ...treasurer, permissionCodes: ["club.role.manage"] }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(updateClubRole(fake.repo, leaderAccess(), leader, clubId, ids.vice,
      { name: "Phó chủ nhiệm", isSingleHolder: false, permissionCodes: ["club.board.nominate"] }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(createClubRole(fake.repo, leaderAccess(), leader, clubId,
      { ...treasurer, permissionCodes: ["club.everything"] }, now)).rejects.toMatchObject({ kind: "validation" });
    expect(fake.state.versions).toHaveLength(1);
  });

  it("validates role name uniqueness and that the unit is an active department", async () => {
    const fake = fakeRepo();
    await expect(createClubRole(fake.repo, leaderAccess(), leader, clubId, { ...treasurer, name: "phó CHỦ nhiệm" }, now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(createClubRole(fake.repo, leaderAccess(), leader, clubId, { ...treasurer, unit: "Ban Ma" }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(createClubRole(fake.repo, leaderAccess(), leader, clubId, { ...treasurer, unit: "Ban Sự kiện" }, now))
      .resolves.toMatchObject({ roles: expect.arrayContaining([expect.objectContaining({ unit: "Ban Sự kiện" })]) });
  });

  it("steps 5-6 / A1: assigning an Active member and editing permissions apply immediately", async () => {
    const fake = await withTreasurer();
    expect(fake.permissionsOf(m.active)).toEqual([]);
    const assigned = await assignClubRole(fake.repo, leaderAccess(),
      leader, clubId, fake.treasurerId, { membershipId: m.active, effectiveFrom: new Date("2026-01-01") }, now);
    expect(assigned.roles.find((item) => item.id === fake.treasurerId)!.holders[0])
      .toMatchObject({ membershipId: m.active, effectiveFrom: now });
    expect(fake.notifications).toEqual([`CLUB_ROLE_ASSIGNED:${m.active}`]);
    expect(fake.permissionsOf(m.active)).toEqual(["club.report.submit", "club.expense.record"]);

    const updated = await updateClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId,
      { name: "Thủ quỹ", isSingleHolder: true, permissionCodes: ["club.expense.record"], reason: "Tách báo cáo" }, now);
    expect(updated.versions[0]).toMatchObject({ versionNo: 3 });
    expect(fake.permissionsOf(m.active)).toEqual(["club.expense.record"]);
  });

  it("E1: rejects assigning a member who is not Active or not in the club", async () => {
    const fake = await withTreasurer();
    for (const membershipId of [m.inactive, "b0000000000000000000ffff"]) {
      await expect(assignClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId,
        { membershipId }, now)).rejects.toMatchObject({ kind: "conflict" });
    }
    expect(fake.notifications).toEqual([]);
  });

  it("E2: a single-holder role takes one holder, and cannot become single-holder with several", async () => {
    const fake = await withTreasurer();
    await assignClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId, { membershipId: m.active }, now);
    await expect(assignClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId,
      { membershipId: m.other }, now)).rejects.toMatchObject({ kind: "conflict" });

    await updateClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId,
      { ...treasurer, isSingleHolder: false }, now);
    await assignClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId, { membershipId: m.other }, now);
    await expect(assignClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId,
      { membershipId: m.other }, now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(updateClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId, treasurer, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });

  it("rejects an assignment that ends before it starts", async () => {
    const fake = await withTreasurer();
    await expect(assignClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId,
      { membershipId: m.active, effectiveTo: new Date("2026-10-01") }, now)).rejects.toMatchObject({ kind: "validation" });
  });

  it("A2 / E4: revoking removes the permission at once; a held role cannot be deactivated", async () => {
    const fake = await withTreasurer();
    const assigned = await assignClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId,
      { membershipId: m.active }, now);
    await expect(deactivateClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId, now))
      .rejects.toMatchObject({ kind: "conflict" });
    const assignmentId = assigned.roles.find((item) => item.id === fake.treasurerId)!.holders[0]!.assignmentId;
    await revokeClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId, assignmentId, now);
    expect(fake.permissionsOf(m.active)).toEqual([]);
    expect(fake.notifications.at(-1)).toBe(`CLUB_ROLE_REVOKED:${m.active}`);
    await expect(revokeClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId, assignmentId, now))
      .rejects.toMatchObject({ kind: "not_found" });

    const removed = await deactivateClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId, now);
    expect(removed.roles.map((item) => item.id)).not.toContain(fake.treasurerId);
    expect(removed.versions.map((item) => item.versionNo)).toEqual([3, 2, 1]);
  });

  it("A4 / E6: board roles take permission edits but not holders, removal or re-flagging", async () => {
    const fake = fakeRepo();
    const updated = await updateClubRole(fake.repo, leaderAccess(), leader, clubId, ids.vice,
      { name: "Phó chủ nhiệm", isSingleHolder: false, permissionCodes: ["club.event.manage", "club.booking.manage"] }, now);
    expect(updated.roles.find((item) => item.id === ids.vice)).toMatchObject({ isBoardSeat: true,
      permissionCodes: ["club.event.manage", "club.booking.manage"] });
    expect(fake.permissionsOf(m.vice)).toEqual(["club.event.manage", "club.booking.manage"]);
    await expect(updateClubRole(fake.repo, leaderAccess(), leader, clubId, ids.vice,
      { name: "Phó chủ nhiệm", isSingleHolder: true, permissionCodes: [] }, now)).rejects.toMatchObject({ kind: "conflict" });
    await expect(assignClubRole(fake.repo, leaderAccess(), leader, clubId, ids.vice, { membershipId: m.active }, now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(revokeClubRole(fake.repo, leaderAccess(), leader, clubId, ids.vice, "f00000000000000000000002", now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(deactivateClubRole(fake.repo, leaderAccess(), leader, clubId, ids.vice, now))
      .rejects.toMatchObject({ kind: "conflict" });
  });

  it("E7: the leader role is fixed and the members role is neither removable nor assignable", async () => {
    const fake = fakeRepo();
    await expect(updateClubRole(fake.repo, leaderAccess(), leader, clubId, ids.leader,
      { name: "Boss", isSingleHolder: true, permissionCodes: [] }, now)).rejects.toMatchObject({ kind: "conflict" });
    for (const roleId of [ids.leader, ids.members]) {
      await expect(deactivateClubRole(fake.repo, leaderAccess(), leader, clubId, roleId, now))
        .rejects.toMatchObject({ kind: "conflict" });
    }
    await expect(assignClubRole(fake.repo, leaderAccess(), leader, clubId, ids.members, { membershipId: m.active }, now))
      .rejects.toMatchObject({ kind: "conflict" });
    expect(fake.state.versions).toHaveLength(1);
  });

  it("BR56: permissions on the default members role apply to every Active member", async () => {
    const fake = fakeRepo();
    await updateClubRole(fake.repo, leaderAccess(), leader, clubId, ids.members,
      { name: "Thành viên", isSingleHolder: false, permissionCodes: ["club.feedback.view"] }, now);
    expect(fake.permissionsOf(m.active)).toEqual(["club.feedback.view"]);
    expect(fake.permissionsOf(m.inactive)).toEqual([]);
  });

  it("refuses changes outside Active / Pending Setup and assignments without an active term", async () => {
    await expect(createClubRole(fakeRepo("Suspended").repo, leaderAccess("Suspended"), leader, clubId, treasurer, now))
      .rejects.toMatchObject({ kind: "conflict" });
    const noTerm = fakeRepo("Active", null);
    const created = await createClubRole(noTerm.repo, leaderAccess(), leader, clubId, treasurer, now);
    await expect(assignClubRole(noTerm.repo, leaderAccess(), leader, clubId, created.roles.at(-1)!.id,
      { membershipId: m.active }, now)).rejects.toMatchObject({ kind: "conflict" });
  });

  it("E5: a vice leader holding every grantable permission still cannot call any role endpoint", async () => {
    const vice: ClubAccessRepository = { findSnapshot: async () => ({
      ...(await leaderAccess().findSnapshot(leader.id, clubId))!,
      positions: [{ id: ids.vice, clubId, isActive: true, isLeaderRole: false,
        permissionCodes: [...GRANTABLE_CLUB_PERMISSIONS] }],
      assignments: [{ clubId, termId, positionId: ids.vice, membershipId: m.leader,
        effectiveFrom: new Date("2026-09-01"), confirmedBy: leader.id }] }) };
    const fake = await withTreasurer();
    const calls = [
      () => getClubRoles(fake.repo, vice, leader, clubId, now),
      () => createClubRole(fake.repo, vice, leader, clubId, { ...treasurer, name: "Khác" }, now),
      () => updateClubRole(fake.repo, vice, leader, clubId, fake.treasurerId, treasurer, now),
      () => deactivateClubRole(fake.repo, vice, leader, clubId, fake.treasurerId, now),
      () => assignClubRole(fake.repo, vice, leader, clubId, fake.treasurerId, { membershipId: m.active }, now),
      () => revokeClubRole(fake.repo, vice, leader, clubId, fake.treasurerId, "f00000000000000000000002", now),
    ];
    for (const call of calls) await expect(call()).rejects.toMatchObject({ kind: "forbidden" });
    expect(fake.state.versions).toHaveLength(2);
    expect(fake.notifications).toEqual([]);
  });

  it("IDOR: role and assignment ids must belong to this club and this role", async () => {
    const fake = await withTreasurer();
    const foreignRole = "d0000000000000000000ffff";
    await expect(updateClubRole(fake.repo, leaderAccess(), leader, clubId, foreignRole, treasurer, now))
      .rejects.toMatchObject({ kind: "not_found" });
    await expect(assignClubRole(fake.repo, leaderAccess(), leader, clubId, foreignRole, { membershipId: m.active }, now))
      .rejects.toMatchObject({ kind: "not_found" });
    // The vice's board-seat assignment cannot be revoked through another role's endpoint.
    await expect(revokeClubRole(fake.repo, leaderAccess(), leader, clubId, fake.treasurerId,
      "f00000000000000000000002", now)).rejects.toMatchObject({ kind: "not_found" });
    expect(fake.permissionsOf(m.vice)).toEqual(["club.event.manage"]);
  });

  it("E3: the members role cannot be given leader-only permissions either", async () => {
    const fake = fakeRepo();
    await expect(updateClubRole(fake.repo, leaderAccess(), leader, clubId, ids.members,
      { name: "Thành viên", isSingleHolder: false, permissionCodes: ["club.role.manage"] }, now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(fake.state.versions).toHaveLength(1);
  });
});

describe("resolveClubPermissions with the default members role", () => {
  const term = { id: termId, clubId, state: "Active", startAt: new Date("2026-09-01"), endAt: new Date("2027-09-01") };
  const members = { id: ids.members, clubId, isActive: true, isLeaderRole: false, isDefaultMemberRole: true,
    permissionCodes: ["club.feedback.view", "club.role.manage", "club.board.nominate", "not.a.permission"] };
  function snapshot(overrides: Partial<ClubAccessSnapshot>): ClubAccessSnapshot {
    return { clubId, clubName: "Club", clubState: "Active", isApprovedFounder: false,
      membership: { id: m.active, clubId, state: "Active" }, terms: [term], positions: [members], assignments: [],
      ...overrides };
  }

  it("grants only catalogued grantable codes, never leader-only ones", () => {
    expect(resolveClubPermissions(snapshot({}), now)).toEqual(["club.feedback.view"]);
  });

  it("does not leak to non-Active members, other clubs, or an inactive members role", () => {
    for (const state of ["Inactive", "Banned", "Withdrawn"]) {
      expect(resolveClubPermissions(snapshot({ membership: { id: m.active, clubId, state } }), now)).toEqual([]);
    }
    expect(resolveClubPermissions(snapshot({ membership: { id: m.active, clubId: "c0000000000000000000ffff",
      state: "Active" } }), now)).toEqual([]);
    expect(resolveClubPermissions(snapshot({ positions: [{ ...members, clubId: "c0000000000000000000ffff" }] }), now))
      .toEqual([]);
    expect(resolveClubPermissions(snapshot({ positions: [{ ...members, isActive: false }] }), now)).toEqual([]);
  });

  it("revoked, expired and not-yet-started assignments grant nothing", () => {
    const treasurer = { id: "d00000000000000000000009", clubId, isActive: true, isLeaderRole: false,
      permissionCodes: ["club.expense.record"] };
    const base = { clubId, termId, positionId: treasurer.id, membershipId: m.active, confirmedBy: leader.id };
    function at(iso: string) { return new Date(iso); }
    for (const window of [
      { effectiveFrom: at("2026-09-01T00:00:00Z"), effectiveTo: now }, // revoked at `now`
      { effectiveFrom: at("2026-09-01T00:00:00Z"), effectiveTo: at("2026-10-01T00:00:00Z") }, // expired
      { effectiveFrom: at("2026-11-01T00:00:00Z") }, // future
      { effectiveFrom: at("2026-11-01T00:00:00Z"), effectiveTo: at("2026-11-01T00:00:00Z") }, // revoked before start
    ]) {
      expect(resolveClubPermissions(snapshot({ positions: [treasurer], assignments: [{ ...base, ...window }] }), now))
        .toEqual([]);
    }
    expect(resolveClubPermissions(snapshot({ positions: [treasurer], assignments: [{ ...base,
      effectiveFrom: at("2026-09-01T00:00:00Z") }] }), now)).toEqual(["club.expense.record"]);
  });
});
