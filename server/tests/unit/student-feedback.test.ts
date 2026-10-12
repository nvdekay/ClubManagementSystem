import { describe, expect, it, vi } from "vitest";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import type { AuthRepository } from "../../src/domain/auth.js";
import type { SentFeedback, StudentFeedbackRepository } from "../../src/domain/student-feedback.js";
import {
  listClubFeedbackInbox,
  listIcpdpFeedbackInbox,
  sendStudentFeedback,
} from "../../src/usecase/student-feedback.js";

const now = new Date("2026-10-09T10:00:00Z");
const studentId = "000000000000000000000001";
const clubId = "000000000000000000000002";
const eventId = "000000000000000000000003";
const actor = { id: studentId, accountState: "Active" as const };

function sent(): SentFeedback {
  return { id: "000000000000000000000009", recipient: "CLUB", clubId, clubName: "Robotics", category: "suggestion",
    message: "More workshops", isAnonymous: false, submittedAt: now };
}

function repo(club: { state: string } | null = { state: "Active" }, eventOk = true) {
  return { club: vi.fn(async () => (club ? { id: clubId, name: "Robotics", ...club } : null)),
    eventBelongsToClub: vi.fn(async () => eventOk), submit: vi.fn(async () => sent()),
    listMine: vi.fn(async () => [sent()]), inbox: vi.fn(async () => [sent()]) } satisfies StudentFeedbackRepository;
}

const toClub = { recipient: "CLUB" as const, clubId, category: "suggestion" as const, message: "  More workshops ",
  isAnonymous: true };

describe("student feedback (UC50, one-way)", () => {
  it("sends trimmed feedback to a club, optionally linked to one of its events", async () => {
    const data = repo();
    await sendStudentFeedback(data, actor, { ...toClub, eventId }, now);
    expect(data.eventBelongsToClub).toHaveBeenCalledWith(eventId, clubId);
    expect(data.submit).toHaveBeenCalledWith({ ...toClub, eventId, message: "More workshops", studentId, now });
  });

  it("sends to ICPDP with or without a related club", async () => {
    const data = repo();
    await sendStudentFeedback(data, actor, { recipient: "ICPDP", category: "issue", message: "x", isAnonymous: false }, now);
    expect(data.club).not.toHaveBeenCalled();
    await expect(sendStudentFeedback(repo(), actor, { ...toClub, recipient: "ICPDP" }, now)).resolves.toBeDefined();
  });

  it("rejects a missing club, an unrelated event, a dissolved club and empty or oversized messages", async () => {
    await expect(sendStudentFeedback(repo(), actor, { ...toClub, clubId: undefined }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(sendStudentFeedback(repo({ state: "Active" }, false), actor, { ...toClub, eventId }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(sendStudentFeedback(repo({ state: "Dissolved" }), actor, toClub, now))
      .rejects.toMatchObject({ kind: "not_found" });
    await expect(sendStudentFeedback(repo(null), actor, toClub, now)).rejects.toMatchObject({ kind: "not_found" });
    for (const message of ["   ", "x".repeat(2_001)]) {
      await expect(sendStudentFeedback(repo(), actor, { ...toClub, message }, now))
        .rejects.toMatchObject({ kind: "validation" });
    }
    await expect(sendStudentFeedback(repo(), null, toClub, now)).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("opens the club inbox only with club.feedback.view, and only for that club", async () => {
    const data = repo();
    function snapshot(permissionCodes: string[]): ClubAccessSnapshot {
      return { clubId, clubName: "Robotics",
      clubState: "Active", membership: { id: "000000000000000000000011", clubId, state: "Active" },
      terms: [{ id: "t", clubId, state: "Active", startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") }],
      positions: [{ id: "p", clubId, isActive: true, isLeaderRole: false, permissionCodes }],
      assignments: [{ clubId, termId: "t", positionId: "p", membershipId: "000000000000000000000011",
        effectiveFrom: new Date("2026-01-01") }], isApprovedFounder: false };
    }
    const allowed: ClubAccessRepository = { findSnapshot: async () => snapshot(["club.feedback.view"]) };
    await listClubFeedbackInbox(data, allowed, actor, clubId, now);
    expect(data.inbox).toHaveBeenCalledWith("CLUB", clubId);
    const denied: ClubAccessRepository = { findSnapshot: async () => snapshot(["club.event.manage"]) };
    await expect(listClubFeedbackInbox(repo(), denied, actor, clubId, now)).rejects.toMatchObject({ kind: "forbidden" });
  });

  it("opens the ICPDP inbox only for officers", async () => {
    const officer = { systemRoleCodes: vi.fn(async () => ["ICPDP_OFFICER"]) } as unknown as AuthRepository;
    const student = { systemRoleCodes: vi.fn(async () => []) } as unknown as AuthRepository;
    const data = repo();
    await listIcpdpFeedbackInbox(data, officer, actor);
    expect(data.inbox).toHaveBeenCalledWith("ICPDP");
    await expect(listIcpdpFeedbackInbox(repo(), student, actor)).rejects.toMatchObject({ kind: "forbidden" });
  });
});
