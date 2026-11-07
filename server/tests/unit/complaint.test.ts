import { describe, expect, it, vi } from "vitest";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import { assertComplaintDecision, normalizeEvidence, type Complaint, type ComplaintRepository } from "../../src/domain/complaint.js";
import {
  decideComplaint, listClubComplaints, listComplaintQueue, respondToComplaint, submitComplaint, withdrawComplaint,
} from "../../src/usecase/complaint.js";

const now = new Date("2026-11-07T10:00:00Z");
const studentId = "000000000000000000000001";
const clubId = "000000000000000000000002";
const otherClub = "00000000000000000000000f";
const eventId = "000000000000000000000003";
const complaintId = "000000000000000000000009";
const actor = { id: studentId, accountState: "Active" as const };

function complaint(state: Complaint["state"] = "Submitted"): Complaint {
  return { id: complaintId, clubId, clubName: "Robotics", clubState: "Active", type: "CONDUCT", description: "Late",
    evidence: [], state, submittedAt: now };
}

function repo(club: { state: string } | null = { state: "Active" }, eventOk = true) {
  const icpdp = { ...complaint(), complainant: { id: studentId, displayName: "S", email: "s@x" }, linkedComplaintIds: [] };
  return {
    club: vi.fn(async () => (club ? { id: clubId, name: "Robotics", ...club } : null)),
    eventBelongsToClub: vi.fn(async () => eventOk), submit: vi.fn(async (_input: Parameters<ComplaintRepository["submit"]>[0]) => complaint()),
    listMine: vi.fn(async () => [complaint()]), withdraw: vi.fn(async () => complaint("Withdrawn")),
    queue: vi.fn(async () => [icpdp]), findForIcpdp: vi.fn(async () => icpdp), decide: vi.fn(async () => icpdp),
    clubInbox: vi.fn(async () => []), respond: vi.fn(async () => ({ id: complaintId, clubId, type: "CONDUCT", description: "Late",
      evidence: [], state: "Club Responded" as const, forwardNote: "Explain", forwardedAt: now })),
    flagOverdueResponses: vi.fn(async () => 0),
  } satisfies ComplaintRepository;
}

const input = { clubId, type: "CONDUCT" as const, description: "  Members were rude at the booth  ", evidence: [] };
function auth(roles: string[]) { return { systemRoleCodes: vi.fn(async () => roles) }; }

function access(kind: "leader" | "member" | "other"): ClubAccessRepository {
  return { findSnapshot: async (_user, club): Promise<ClubAccessSnapshot> => ({ clubId: club, clubName: "R", clubState: "Active",
    isApprovedFounder: false, membership: { id: "m", clubId: kind === "other" ? otherClub : club, state: "Active" },
    terms: [{ id: "t", clubId: club, state: "Active", startAt: new Date("2026-01-01"), endAt: new Date("2027-01-01") }],
    positions: [{ id: "p", clubId: club, code: "CLUB_LEADER", isActive: true, isLeaderRole: true }],
    assignments: kind === "leader" ? [{ clubId: club, termId: "t", positionId: "p", membershipId: "m",
      effectiveFrom: new Date("2026-01-01"), confirmedBy: "o" }] : [] }) };
}

describe("UC50 submit and withdraw", () => {
  it("always goes to ICPDP with a club, a valid type and trimmed text", async () => {
    const r = repo();
    await submitComplaint(r, actor, { ...input, eventId }, now);
    expect(r.submit).toHaveBeenCalledWith(expect.objectContaining({ clubId, eventId, description: "Members were rude at the booth",
      studentId }));
    expect(r.submit.mock.calls[0]![0]).not.toHaveProperty("recipient");
  });

  it("rejects a missing, dissolved or unknown club, an event of another club, bad type and bad evidence", async () => {
    await expect(submitComplaint(repo(null), actor, input, now)).rejects.toMatchObject({ kind: "not_found" });
    await expect(submitComplaint(repo({ state: "Dissolved" }), actor, input, now)).rejects.toMatchObject({ kind: "not_found" });
    await expect(submitComplaint(repo(undefined, false), actor, { ...input, eventId }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(submitComplaint(repo(), actor, { ...input, type: "praise" as never }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(submitComplaint(repo(), actor, { ...input, description: " " }, now)).rejects.toMatchObject({ kind: "validation" });
    await expect(submitComplaint(repo(), actor, { ...input, evidence: [{ label: "x", url: "javascript:alert(1)" }] }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(submitComplaint(repo(), null, input, now)).rejects.toMatchObject({ kind: "unauthorized" });
  });

  it("keeps only http(s) evidence, at most five", () => {
    expect(normalizeEvidence([{ label: " ", url: "https://drive.google.com/x" }])).toEqual([{ label: "drive.google.com",
      url: "https://drive.google.com/x" }]);
    expect(() => normalizeEvidence(Array.from({ length: 6 }, () => ({ label: "a", url: "https://a.b" })))).toThrow();
  });

  it("reports a conflict when the complaint is no longer withdrawable", async () => {
    const r = repo();
    r.withdraw.mockResolvedValueOnce(null as never);
    await expect(withdrawComplaint(r, actor, complaintId, now)).rejects.toMatchObject({ kind: "conflict" });
  });
});

describe("UC51 triage rules", () => {
  const triage = { kind: "triage" as const, severity: "MINOR" as const, validity: "VALID" as const, reason: "Checked" };
  it("opens only Submitted and triages only Under Triage, with a reason for every outcome (BR39)", () => {
    expect(() => assertComplaintDecision({ state: "Under Triage" }, { kind: "open" }, now)).toThrow(/submitted/);
    expect(() => assertComplaintDecision({ state: "Submitted" }, { ...triage, outcome: "Dismissed" }, now)).toThrow(/open/);
    expect(() => assertComplaintDecision({ state: "Under Triage" }, { ...triage, outcome: "Dismissed", reason: " " }, now))
      .toThrow(/reason/);
    const forwarded = assertComplaintDecision({ state: "Under Triage" }, { ...triage, outcome: "Forwarded" }, now);
    expect(forwarded).toMatchObject({ responseDueAt: new Date("2026-11-14T10:00:00Z") });
  });

  it("only closes or escalates after the club answered, and a dissolved club can only be dismissed (E1)", () => {
    expect(() => assertComplaintDecision({ state: "Forwarded" }, { kind: "close", reason: "ok" }, now)).toThrow();
    expect(assertComplaintDecision({ state: "Club Responded" }, { kind: "close", reason: " ok " }, now)).toMatchObject({ reason: "ok" });
    expect(() => assertComplaintDecision({ state: "Under Triage", clubState: "Dissolved" }, { ...triage, outcome: "Forwarded" }, now))
      .toThrow(/dissolved/);
    expect(assertComplaintDecision({ state: "Under Triage", clubState: "Dissolved" }, { ...triage, outcome: "Dismissed" }, now))
      .toMatchObject({ outcome: "Dismissed" });
  });

  it("lets only ICPDP officers read the queue or decide (FR-UC51-05)", async () => {
    const r = repo();
    await expect(listComplaintQueue(r, auth([]), actor)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(decideComplaint(r, auth([]), actor, complaintId, { kind: "open" }, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(r.decide).not.toHaveBeenCalled();
    await decideComplaint(r, auth(["ICPDP_OFFICER"]), actor, complaintId, { kind: "open" }, now);
    expect(r.decide).toHaveBeenCalledWith(complaintId, studentId, { kind: "open" }, now);
  });
});

describe("UC52 club response", () => {
  const response = { text: " We apologised ", action: " Rehearsals end at 21:00 ", evidence: [] };
  it("needs club.complaint.respond in the same club; a plain member or another club gets 403", async () => {
    const r = repo();
    await expect(listClubComplaints(r, access("member"), actor, clubId, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(listClubComplaints(r, access("other"), actor, clubId, now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(respondToComplaint(r, access("member"), actor, clubId, complaintId, response, now))
      .rejects.toMatchObject({ kind: "forbidden" });
    expect(r.clubInbox).not.toHaveBeenCalled();
    await listClubComplaints(r, access("leader"), actor, clubId, now);
    expect(r.clubInbox).toHaveBeenCalledWith(clubId);
  });

  it("requires a response text and a concrete action (FR-UC52-04)", async () => {
    const r = repo();
    await expect(respondToComplaint(r, access("leader"), actor, clubId, complaintId, { ...response, action: "" }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await respondToComplaint(r, access("leader"), actor, clubId, complaintId, response, now);
    expect(r.respond).toHaveBeenCalledWith(clubId, complaintId, studentId,
      { text: "We apologised", action: "Rehearsals end at 21:00", evidence: [] }, now);
  });
});
