import { describe, expect, it, vi } from "vitest";
import { normalizePeriodicDraft, type ClubPeriodicReportRepository } from "../../src/domain/club-periodic-report.js";
import { changeClubPeriodicReport, createClubPeriodicReport } from "../../src/usecase/club-periodic-report.js";

const clubId = "000000000000000000000001";
const userId = "000000000000000000000002";
const now = new Date("2026-10-15T00:00:00Z");
const actor = { id: userId, accountState: "Active" as const };
const denied = { findSnapshot: async () => null };
const allowed = {
  findSnapshot: async () => ({
    clubId,
    clubName: "Test Club",
    clubState: "Active",
    membership: { id: "m1", clubId, state: "Active" },
    terms: [{ id: "t1", clubId, state: "Active", startAt: new Date("2026-01-01Z"), endAt: new Date("2027-01-01Z") }],
    positions: [{ id: "p1", clubId, isActive: true, isLeaderRole: true }],
    assignments: [{ clubId, termId: "t1", positionId: "p1", membershipId: "m1", confirmedBy: "o1", effectiveFrom: new Date("2026-01-01Z") }],
    isApprovedFounder: false,
  }),
};

function repository(): ClubPeriodicReportRepository {
  return { list: async () => [], getCampaign: vi.fn(async () => null), create: vi.fn(), save: vi.fn(), submit: vi.fn() };
}

describe("UC38 periodic submission rules", () => {
  it("validates structured members (activity score 0-10), events, achievements and custom fields on submission", () => {
    const draft = normalizePeriodicDraft({
      members: [{ fullName: " Nguyễn Văn A ", studentCode: " HE170001 ", email: " anvhe170001@fpt.edu.vn ", activityScore: 9.5, source: "SYSTEM" }],
      events: [{ title: " Workshop AI ", description: " Chia sẻ kiến thức AI ", heldAt: "2026-10-01", participantCount: 45, evidenceUrl: "https://example.com/photo.jpg", source: "SYSTEM" }],
      achievements: [{ title: " Giải Nhất Hackathon ", description: " Đạt giải nhất toàn trường ", evidenceUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }],
      customAnswers: [{ fieldId: "f1", textValue: " Có nhà tài trợ " }],
    }, true, [{ id: "f1", label: "Nhà tài trợ", type: "text", required: true }]);

    expect(draft.members?.[0]).toMatchObject({ fullName: "Nguyễn Văn A", studentCode: "HE170001", activityScore: 9.5, source: "SYSTEM" });
    expect(draft.events?.[0]).toMatchObject({ title: "Workshop AI", participantCount: 45 });
    expect(draft.achievements?.[0]).toMatchObject({ title: "Giải Nhất Hackathon" });

    expect(() => normalizePeriodicDraft({
      members: [{ fullName: "A", studentCode: "HE1", email: "a@fpt.edu.vn", activityScore: 11 }],
    })).toThrow(/between 0 and 10/);

    expect(() => normalizePeriodicDraft({
      members: [{ fullName: "A", studentCode: "HE1", email: "a@fpt.edu.vn", activityScore: 8 }],
      events: [{ title: "Workshop", description: "Mô tả", heldAt: "2026-10-01", participantCount: 10 }],
    }, true)).toThrow(/evidence/);

    expect(() => normalizePeriodicDraft({
      members: [{ fullName: "A", studentCode: "HE1", email: "a@fpt.edu.vn", activityScore: 8 }],
      customAnswers: [],
    }, true, [{ id: "req_field", label: "Trường bắt buộc", type: "text", required: true }])).toThrow(/required field/);
  });

  it("allows creating a report only when ICPDP has opened the period and before the deadline", async () => {
    const repo = repository();
    const policy = {
      findEffective: vi.fn(async () => ({
        academicCalendar: [{ code: "Fall 2026", startAt: new Date("2026-09-01Z"), endAt: new Date("2026-12-31Z") }],
        reportDeadlines: [],
      }) as never),
    };
    await expect(createClubPeriodicReport(repo, policy, allowed as never, actor, clubId, "Fall 2026", now))
      .rejects.toMatchObject({ kind: "conflict" });

    repo.getCampaign = vi.fn(async () => ({
      periodCode: "Fall 2026",
      isOpen: true,
      dueAt: new Date("2026-10-10T00:00:00Z"),
      customFields: [],
    }));
    await expect(createClubPeriodicReport(repo, policy, allowed as never, actor, clubId, "Fall 2026", now))
      .rejects.toMatchObject({ kind: "conflict" });

    const futureDue = new Date("2026-10-25T00:00:00Z");
    repo.getCampaign = vi.fn(async () => ({
      periodCode: "Fall 2026",
      isOpen: true,
      dueAt: futureDue,
      customFields: [],
    }));
    await createClubPeriodicReport(repo, policy, allowed as never, actor, clubId, "Fall 2026", now);
    expect(repo.create).toHaveBeenCalledWith(clubId, "Fall 2026", futureDue, userId, now);
  });

  it("rejects executable evidence URLs, empty evidence and oversized content", () => {
    for (const entry of [{ url: "javascript:alert(1)" }, { url: "file:///tmp/a" }, { note: " " }, { url: "invalid" }]) {
      expect(() => normalizePeriodicDraft({ narrative: "Report", nextPlan: "Plan", evidence: [entry] })).toThrow();
    }
    expect(() => normalizePeriodicDraft({ narrative: "x".repeat(20_001), nextPlan: "", evidence: [] })).toThrow(/long/);
  });

  it("denies member or other club access before creating, editing or submitting", async () => {
    const repo = repository();
    const policy = { findEffective: vi.fn(async () => null) };
    await expect(createClubPeriodicReport(repo, policy, denied, actor, clubId, "Fall 2026", now)).rejects.toMatchObject({ kind: "forbidden" });
    await expect(changeClubPeriodicReport(repo, denied, actor, clubId, clubId, 1, null, now)).rejects.toMatchObject({ kind: "forbidden" });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.submit).not.toHaveBeenCalled();
    expect(policy.findEffective).not.toHaveBeenCalled();
  });
});
