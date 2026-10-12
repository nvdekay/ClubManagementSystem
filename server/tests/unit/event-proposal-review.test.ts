import { describe, expect, it, vi } from "vitest";
import type { AuthRepository } from "../../src/domain/auth.js";
import {
  approvedBudget,
  type EventProposalDetail, type EventProposalReviewRepository,
} from "../../src/domain/event-proposal-review.js";
import {
  claimEventProposalReview, decideEventProposalReview, listEventProposalReviews, normalizedEventDecision,
} from "../../src/usecase/event-proposal-review.js";

const now = new Date("2026-10-10T08:00:00Z");
const tomorrow = new Date("2026-10-11T08:00:00Z");
const officer = { id: "000000000000000000000001", accountState: "Active" as const };
const eventId = "000000000000000000000002";
const lines = [
  { category: "Truyền thông", amount: 2_000_000, purpose: "In poster" },
  { category: "Hậu cần", amount: 3_000_000, purpose: "Nước uống" },
];

function detail(budgetLines = lines): EventProposalDetail {
  return {
    task: { id: "000000000000000000000004", eventId, title: "Workshop", state: "Open", openedAt: now },
    event: { id: eventId, clubId: "000000000000000000000003", clubName: "HEBE", title: "Workshop",
      startAt: tomorrow, endAt: tomorrow, semesterCode: "Fall 2026", audienceScope: "PUBLIC", capacity: 50,
      state: "Under Review", approvalConditions: [], currentRevisionNo: 2, requestedBudgetTotal: 5_000_000 },
    versions: [
      { id: "v1", revisionNo: 1, payload: {}, budgetLines: [], requestedBudgetTotal: 0,
        submittedBy: "000000000000000000000005", submittedAt: now },
      { id: "v2", revisionNo: 2, payload: {}, budgetLines, requestedBudgetTotal: 5_000_000,
        submittedBy: "000000000000000000000005", submittedAt: now },
    ],
    decisions: [], club: { id: "000000000000000000000003", name: "HEBE", state: "Active", obligations: [] },
    bookings: [], semesterBudgets: [],
  };
}

function auth(roles: string[]): Pick<AuthRepository, "systemRoleCodes"> {
  return { systemRoleCodes: async () => roles };
}

function repository(overrides: Partial<EventProposalReviewRepository> = {}): EventProposalReviewRepository {
  return {
    listOpen: async () => [detail()], find: async () => detail(), claim: async () => detail(),
    decide: async () => detail(), advanceLifecycle: async () => ({ expired: 0, started: 0, completed: 0 }),
    ...overrides,
  };
}

describe("UC26 event proposal review use case", () => {
  it("requires the ICPDP officer role", async () => {
    await expect(listEventProposalReviews(repository(), auth([]), officer)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(listEventProposalReviews(repository(), auth(["ICPDP_OFFICER"]), null))
      .rejects.toMatchObject({ kind: "unauthorized" });
    await expect(listEventProposalReviews(repository(), auth(["ICPDP_OFFICER"]), officer)).resolves.toHaveLength(1);
  });

  it("passes the officer identity when claiming and rejects malformed ids", async () => {
    const claim = vi.fn(async () => detail());
    await claimEventProposalReview(repository({ claim }), auth(["ICPDP_OFFICER"]), officer, eventId, now);
    expect(claim).toHaveBeenCalledWith(eventId, officer.id, now);
    await expect(claimEventProposalReview(repository(), auth(["ICPDP_OFFICER"]), officer, "nope", now))
      .rejects.toMatchObject({ kind: "validation" });
  });

  it("requires a reason, sections and a future deadline for a revision request", () => {
    expect(() => normalizedEventDecision({ outcome: "Request revision", sections: ["budget"],
      revisionDeadlineAt: tomorrow }, now)).toThrow("decision reason is required");
    expect(() => normalizedEventDecision({ outcome: "Request revision", reason: "Giảm chi phí",
      revisionDeadlineAt: tomorrow }, now)).toThrow("revision sections are required");
    expect(() => normalizedEventDecision({ outcome: "Request revision", reason: "Giảm chi phí",
      sections: ["budget"], revisionDeadlineAt: now }, now)).toThrow("future revision deadline is required");
    expect(normalizedEventDecision({ outcome: "Request revision", reason: " Giảm chi phí ",
      sections: ["budget", "budget"], revisionDeadlineAt: tomorrow }, now))
      .toMatchObject({ reason: "Giảm chi phí", sections: ["budget"] });
  });

  it("requires a reason to reject and keeps conditions and amounts for approvals only", () => {
    expect(() => normalizedEventDecision({ outcome: "Reject" }, now)).toThrow("decision reason is required");
    expect(() => normalizedEventDecision({ outcome: "Reject", reason: "Trùng lịch", conditions: ["x"] }, now))
      .toThrow("only apply to an approval");
    expect(() => normalizedEventDecision({ outcome: "Approve", sections: ["nope"] }, now))
      .toThrow("invalid review section");
    expect(() => normalizedEventDecision({ outcome: "Approve", conditions: Array.from({ length: 11 }, () => "x") }, now))
      .toThrow("too many approval conditions");
    expect(normalizedEventDecision({ outcome: "Approve", conditions: [" Có bảo vệ ", ""] }, now).conditions)
      .toEqual(["Có bảo vệ"]);
  });

  it("checks approved amounts line by line against the requested budget", () => {
    expect(() => approvedBudget(lines, [{ approvedAmount: 2_000_000 }])).toThrow("for every budget line");
    expect(() => approvedBudget(lines, [{ approvedAmount: 2_500_000 }, { approvedAmount: 3_000_000 }]))
      .toThrow("cannot exceed");
    expect(() => approvedBudget(lines, [{ approvedAmount: 1_000_000 }, { approvedAmount: 3_000_000 }]))
      .toThrow("needs a reason");
    expect(() => approvedBudget(lines, [{ approvedAmount: 1.5 }, { approvedAmount: 3_000_000 }]))
      .toThrow("whole, non-negative");
    expect(approvedBudget(lines, [{ approvedAmount: 1_000_000, reason: "Chỉ in 50 poster" },
      { approvedAmount: 3_000_000 }])).toEqual([
      { category: "Truyền thông", requestedAmount: 2_000_000, approvedAmount: 1_000_000, reason: "Chỉ in 50 poster" },
      { category: "Hậu cần", requestedAmount: 3_000_000, approvedAmount: 3_000_000 },
    ]);
  });

  it("validates the approved budget of the current revision before writing", async () => {
    const decide = vi.fn(async () => detail());
    const repo = repository({ decide });
    await expect(decideEventProposalReview(repo, auth(["ICPDP_OFFICER"]), officer, eventId,
      { outcome: "Approve" }, now)).rejects.toMatchObject({ kind: "validation" });
    expect(decide).not.toHaveBeenCalled();
    await decideEventProposalReview(repo, auth(["ICPDP_OFFICER"]), officer, eventId, { outcome: "Approve",
      budgetLines: [{ approvedAmount: 2_000_000 }, { approvedAmount: 3_000_000 }] }, now);
    expect(decide).toHaveBeenCalledWith(eventId, officer.id, expect.objectContaining({ outcome: "Approve",
      budgetLines: [{ approvedAmount: 2_000_000 }, { approvedAmount: 3_000_000 }] }), now);
  });

  it("approves a proposal without a budget section without amounts", async () => {
    const decide = vi.fn(async () => detail([]));
    await decideEventProposalReview(repository({ find: async () => detail([]), decide }), auth(["ICPDP_OFFICER"]),
      officer, eventId, { outcome: "Approve" }, now);
    expect(decide).toHaveBeenCalledOnce();
  });
});
