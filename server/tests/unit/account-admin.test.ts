import { describe, expect, it } from "vitest";
import type { AccountAdminRepository } from "../../src/domain/account-admin.js";
import type { AuthUser } from "../../src/domain/auth.js";
import type { SessionService } from "../../src/domain/session.js";
import { changeSystemRole, searchAdminUsers, setAccountLock } from "../../src/usecase/account-admin.js";

const actor: AuthUser = {
  id: "0123456789abcdef01234567", email: "officer@fpt.edu.vn",
  displayName: "Officer", accountState: "Active",
};
const target: AuthUser = {
  id: "abcdef0123456789abcdef01", email: "student@fpt.edu.vn",
  displayName: "Student", accountState: "Active",
};
const now = new Date("2026-10-03T10:00:00Z");

function fixture(actorRoles = ["ICPDP_OFFICER"], targetRoles: string[] = []) {
  const changes: string[] = [];
  const repo: AccountAdminRepository = {
    async listUsers(search, page, pageSize) { changes.push(`list:${search}:${page}:${pageSize}`); return { items: [], total: 0, page, pageSize }; },
    async findUser(id) { return id === target.id ? target : id === actor.id ? actor : null; },
    async systemRoles(id) { return id === target.id ? targetRoles : actorRoles; },
    async applyRoleChange(input) { changes.push(`${input.action}:${input.roleCode}`); },
    async setLock(input) { changes.push(input.locked ? "locked" : "unlocked"); },
  };
  const sessions: SessionService = {
    async issue() { throw new Error("unused"); },
    async resolve() { return null; },
    async revoke() {},
    async revokeUser(id) { changes.push(`revoke:${id}`); },
  };
  return { repo, sessions, changes };
}

describe("UC03 account administration", () => {
  it("pages the user list and refuses an invalid page", async () => {
    const { repo, changes } = fixture();
    await searchAdminUsers(repo, actor, "an", { page: "3", pageSize: "10" });
    await searchAdminUsers(repo, actor, undefined);
    expect(changes).toEqual(["list:an:3:10", "list::1:50"]);
    await expect(searchAdminUsers(repo, actor, "", { page: "0" })).rejects.toMatchObject({ kind: "validation" });
    await expect(searchAdminUsers(repo, actor, "", { pageSize: "500" })).rejects.toMatchObject({ kind: "validation" });
  });

  it("rejects non-officers and unsupported role codes", async () => {
    const { repo, sessions, changes } = fixture([]);
    await expect(changeSystemRole(repo, sessions, actor, target.id,
      "ICPDP_OFFICER", "grant", undefined, now)).rejects.toMatchObject({ kind: "forbidden" });
    const officer = fixture();
    await expect(changeSystemRole(officer.repo, officer.sessions, actor, target.id,
      "CLUB_PRESIDENT", "grant", undefined, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(changeSystemRole(officer.repo, officer.sessions, actor, target.id,
      "ICPDP_SUPERVISOR", "grant", undefined, now)).rejects.toMatchObject({ kind: "validation" });
    expect(changes).toEqual([]);
  });

  it("D1: grants ICPDP_HEAD only to a current ICPDP officer", async () => {
    const plain = fixture();
    await expect(changeSystemRole(plain.repo, plain.sessions, actor, target.id, "ICPDP_HEAD", "grant", undefined, now))
      .rejects.toMatchObject({ kind: "conflict" });
    expect(plain.changes).toEqual([]);
    const officerTarget = fixture(["ICPDP_OFFICER"], ["ICPDP_OFFICER"]);
    await changeSystemRole(officerTarget.repo, officerTarget.sessions, actor, target.id, "ICPDP_HEAD", "grant", undefined, now);
    expect(officerTarget.changes).toEqual(["grant:ICPDP_HEAD", `revoke:${target.id}`]);
  });

  it("requires a reason for revoke, lock and unlock", async () => {
    const { repo, sessions, changes } = fixture();
    await expect(changeSystemRole(repo, sessions, actor, target.id,
      "ATTENDANCE_UNLOCK", "revoke", "", now)).rejects.toMatchObject({ kind: "validation" });
    await expect(setAccountLock(repo, sessions, actor, target.id, true, "", now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(setAccountLock(repo, sessions, actor, target.id, false, "", now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(changes).toEqual([]);
  });

  it("prevents self-revoking the last admin role", async () => {
    const { repo, sessions, changes } = fixture();
    await expect(changeSystemRole(repo, sessions, actor, actor.id,
      "ICPDP_OFFICER", "revoke", "leaving", now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(changes).toEqual([]);
  });

  it("revokes target sessions after a role change or lock", async () => {
    const { repo, sessions, changes } = fixture();
    await changeSystemRole(repo, sessions, actor, target.id,
      "ATTENDANCE_UNLOCK", "grant", undefined, now);
    await setAccountLock(repo, sessions, actor, target.id, true, "incident", now);
    expect(changes).toEqual([
      "grant:ATTENDANCE_UNLOCK", `revoke:${target.id}`,
      "locked", `revoke:${target.id}`,
    ]);
  });

  it("links a UC40 case only to a lock (A1)", async () => {
    const { repo, sessions, changes } = fixture();
    await expect(setAccountLock(repo, sessions, actor, target.id, false, "cleared", now,
      "0123456789abcdef01234599")).rejects.toMatchObject({ kind: "validation" });
    await expect(setAccountLock(repo, sessions, actor, target.id, true, "case", now, "bad"))
      .rejects.toMatchObject({ kind: "validation" });
    expect(changes).toEqual([]);
  });
});
