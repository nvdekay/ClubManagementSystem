import { describe, expect, it } from "vitest";
import type { AccountAdminRepository } from "../../src/domain/account-admin.js";
import type { AuthUser } from "../../src/domain/auth.js";
import type { SessionService } from "../../src/domain/session.js";
import { changeSystemRole, setAccountLock } from "../../src/usecase/account-admin.js";

const actor: AuthUser = {
  id: "0123456789abcdef01234567", email: "officer@fpt.edu.vn",
  displayName: "Officer", accountState: "Active",
};
const target: AuthUser = {
  id: "abcdef0123456789abcdef01", email: "student@fpt.edu.vn",
  displayName: "Student", accountState: "Active",
};
const now = new Date("2026-10-03T10:00:00Z");

function fixture(actorRoles = ["ICPDP_OFFICER"]) {
  const changes: string[] = [];
  const repo: AccountAdminRepository = {
    async listUsers() { return { items: [], total: 0 }; },
    async findUser(id) { return id === target.id ? target : id === actor.id ? actor : null; },
    async systemRoles() { return actorRoles; },
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
  it("rejects non-officers and club role codes", async () => {
    const { repo, sessions, changes } = fixture([]);
    await expect(changeSystemRole(repo, sessions, actor, target.id,
      "ICPDP_OFFICER", "grant", undefined, now)).rejects.toMatchObject({ kind: "forbidden" });
    const officer = fixture();
    await expect(changeSystemRole(officer.repo, officer.sessions, actor, target.id,
      "CLUB_PRESIDENT", "grant", undefined, now)).rejects.toMatchObject({ kind: "validation" });
    expect(changes).toEqual([]);
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
});
