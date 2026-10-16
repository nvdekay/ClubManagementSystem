import { describe, expect, it, vi } from "vitest";
import { normalizeInvitationResponse, type ClubInvitationRepository } from "../../src/domain/club-invitation.js";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import { listClubInvitations, respondToClubInvitation } from "../../src/usecase/club-invitation.js";
import { invitationResponseBody } from "../../src/interface/http/club-invitation-routes.js";
const user = "000000000000000000000001";
const club = "000000000000000000000002";
const id = "000000000000000000000003";
const now = new Date("2026-10-15T00:00:00Z");
function access(leader: boolean): ClubAccessRepository {
  const snapshot: ClubAccessSnapshot = { clubId: club, clubName: "Club", clubState: "Active", isApprovedFounder: false,
    membership: { id: "member", clubId: club, state: "Active" },
    terms: [{ id: "term", clubId: club, state: "Active", startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") }],
    positions: [{ id: "position", clubId: club, isActive: true, isLeaderRole: leader }],
    assignments: [{ clubId: club, termId: "term", positionId: "position", membershipId: "member", effectiveFrom: new Date("2026-01-01"), confirmedBy: user }] };
  return { findSnapshot: async (_user, requested) => requested === club ? snapshot : null };
}
function repo(): ClubInvitationRepository {
  return { list: vi.fn(async () => []), respond: vi.fn(async () => { throw new Error("unused"); }) };
}
describe("UC54 club invitations", () => {
  it("requires a reason to decline and normalizes whitespace", () => {
    expect(() => normalizeInvitationResponse({ outcome: "Declined", responseNote: " " })).toThrow(/reason/);
    expect(normalizeInvitationResponse({ outcome: "Declined", responseNote: " unavailable " }))
      .toEqual({ outcome: "Declined", responseNote: "unavailable" });
  });
  it("rejects nested details and non-finite numbers at the HTTP boundary", () => {
    expect(invitationResponseBody.safeParse({ outcome: "Accepted", responseDetails: { nested: { value: 1 } } }).success).toBe(false);
    expect(invitationResponseBody.safeParse({ outcome: "Accepted", responseDetails: { members: Infinity } }).success).toBe(false);
    expect(() => normalizeInvitationResponse({ outcome: "Accepted", responseDetails: Object.fromEntries(Array.from({ length: 21 }, (_, n) => [String(n), n])) })).toThrow(/details/);
  });
  it("denies anonymous, locked, Member and other-club actors before querying invitations", async () => {
    const repository = repo();
    for (const actor of [null, { id: user, accountState: "Locked" as const }, { id: user, accountState: "Active" as const }]) {
      await expect(listClubInvitations(repository, access(false), actor, club, now)).rejects.toBeDefined();
    }
    await expect(listClubInvitations(repository, access(true), { id: user, accountState: "Active" }, id, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(repository.list).not.toHaveBeenCalled();
  });
  it("lets a confirmed Leader list only their club", async () => {
    const repository = repo();
    await listClubInvitations(repository, access(true), { id: user, accountState: "Active" }, club, now);
    expect(repository.list).toHaveBeenCalledWith(club);
  });
  it("validates the invitation id and decline before mutation", async () => {
    const repository = repo();
    await expect(respondToClubInvitation(repository, access(true), { id: user, accountState: "Active" }, club, "bad", { outcome: "Accepted" }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(respondToClubInvitation(repository, access(true), { id: user, accountState: "Active" }, club, id, { outcome: "Declined" }, now)).rejects.toMatchObject({ kind: "validation" });
    expect(repository.respond).not.toHaveBeenCalled();
  });
});
