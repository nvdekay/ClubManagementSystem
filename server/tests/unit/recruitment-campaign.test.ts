import { describe, expect, it } from "vitest";
import type { ClubAccessRepository, ClubAccessSnapshot } from "../../src/domain/access.js";
import type { PolicyRepository } from "../../src/domain/policy.js";
import type {
  RecruitmentCampaign, RecruitmentCampaignInput, RecruitmentCampaignRepository,
} from "../../src/domain/recruitment-campaign.js";
import {
  createRecruitmentCampaignDraft, publishRecruitmentCampaign,
} from "../../src/usecase/recruitment-campaign.js";

const actor = { id: "111111111111111111111111", accountState: "Active" as const };
const clubId = "222222222222222222222222";
const campaignId = "333333333333333333333333";
const now = new Date("2027-01-10T00:00:00.000Z");
const input: RecruitmentCampaignInput = {
  title: "Spring recruitment", positions: ["Designer", "Developer"], criteria: "Curious students",
  windowStart: new Date("2027-02-01T00:00:00.000Z"),
  windowEnd: new Date("2027-03-01T00:00:00.000Z"), capacity: 20,
  selectionSteps: [{ name: "Application" }, { name: "Interview" }],
  formSchema: [{ key: "motivation", label: "Why this club?", type: "textarea", required: true }],
  rubric: [{ key: "communication", label: "Communication", maxScore: 5 }],
};

const snapshot: ClubAccessSnapshot = {
  clubId, clubName: "Example Club", clubState: "Active", isApprovedFounder: false,
  membership: { id: "444444444444444444444444", clubId, state: "Active" },
  terms: [{ id: "555555555555555555555555", clubId, state: "Active",
    startAt: new Date("2026-09-01T00:00:00.000Z"), endAt: new Date("2027-09-01T00:00:00.000Z") }],
  positions: [{ id: "666666666666666666666666", clubId, isActive: true,
    isLeaderRole: false, permissionCodes: ["club.recruitment.manage"] }],
  assignments: [{ clubId, termId: "555555555555555555555555",
    positionId: "666666666666666666666666", membershipId: "444444444444444444444444",
    effectiveFrom: new Date("2026-09-01T00:00:00.000Z") }],
};

function accessRepository(value: ClubAccessSnapshot | null = snapshot): ClubAccessRepository {
  return { findSnapshot: async () => value };
}

function campaign(value: Partial<RecruitmentCampaign> = {}): RecruitmentCampaign {
  return {
    id: campaignId, clubId, ...input, state: "Draft", createdAt: now, ...value,
  };
}

function repository(overlaps: Awaited<ReturnType<RecruitmentCampaignRepository["overlaps"]>> = []) {
  let current = campaign();
  let published = false;
  const repo: RecruitmentCampaignRepository = {
    list: async () => [current], find: async () => current,
    overlaps: async () => overlaps,
    createDraft: async (_club, _actor, value, createdAt) => {
      current = campaign({ ...value, createdAt }); return current;
    },
    updateDraft: async (_club, _id, _actor, value) => {
      current = campaign({ ...value }); return current;
    },
    publish: async (_club, _id, publishedBy, publishedAt) => {
      published = true;
      current = campaign({ ...current, state: "Published", publishedBy, publishedAt });
      return current;
    },
    cancel: async (_club, _id) => current,
  };
  return { repo, isPublished: () => published };
}

function policy(academicCalendar: PolicyRepository extends never ? never : {
  code: string; startAt: Date; endAt: Date;
}[]): PolicyRepository {
  return { findEffective: async () => ({
    id: "policy", effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    createdBy: actor.id, createdAt: now,
    allowedEmailDomains: [], minFoundingMembers: 1, mandatoryApplicationDocuments: [],
    reportDeadlines: [], conflictThresholdMinutes: 0, feedbackWindowHours: 24,
    feedbackMinRespondents: 2, allowOverbooking: false, enforceOverdueReportBlock: false,
    academicCalendar,
  }) };
}

describe("UC16 recruitment campaign", () => {
  it("creates a normalized draft and reports overlapping campaigns", async () => {
    const overlap = { id: "777777777777777777777777", title: "Other campaign",
      positions: ["Designer"], windowStart: input.windowStart,
      windowEnd: input.windowEnd, state: "Published" as const };
    const { repo } = repository([overlap]);
    const result = await createRecruitmentCampaignDraft(repo, accessRepository(), actor,
      clubId, { ...input, title: "  Spring recruitment  " }, now);
    expect(result.campaign.title).toBe("Spring recruitment");
    expect(result.overlaps).toEqual([overlap]);
  });

  it("rejects inactive clubs and missing recruitment permission", async () => {
    const { repo } = repository();
    await expect(createRecruitmentCampaignDraft(repo, accessRepository({ ...snapshot,
      clubState: "Suspended" }), actor, clubId, input, now))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(createRecruitmentCampaignDraft(repo, accessRepository({ ...snapshot,
      positions: [{ ...snapshot.positions[0]!, permissionCodes: [] }] }), actor, clubId, input, now))
      .rejects.toMatchObject({ kind: "forbidden" });
  });

  it("rejects malformed draft content", async () => {
    const { repo } = repository();
    await expect(createRecruitmentCampaignDraft(repo, accessRepository(), actor, clubId,
      { ...input, positions: ["Designer", " designer "] }, now))
      .rejects.toMatchObject({ kind: "validation" });
    await expect(createRecruitmentCampaignDraft(repo, accessRepository(), actor, clubId,
      { ...input, capacity: 0 }, now))
      .rejects.toMatchObject({ kind: "validation" });
  });

  it("requires the window to fit entirely in one effective semester", async () => {
    const { repo, isPublished } = repository();
    const configured = policy([{ code: "Spring", startAt: new Date("2027-01-01T00:00:00.000Z"),
      endAt: new Date("2027-05-01T00:00:00.000Z") }]);
    await expect(publishRecruitmentCampaign(repo, accessRepository(), configured, actor,
      clubId, campaignId, false, now)).resolves.toMatchObject({ campaign: { state: "Published" } });
    expect(isPublished()).toBe(true);
    const outside = repository();
    await expect(publishRecruitmentCampaign(outside.repo, accessRepository(), policy([
      { code: "Spring", startAt: new Date("2027-02-15T00:00:00.000Z"),
        endAt: new Date("2027-04-01T00:00:00.000Z") },
    ]), actor, clubId, campaignId, false, now))
      .rejects.toMatchObject({ kind: "validation" });
    expect(outside.isPublished()).toBe(false);
  });

  it("requires explicit confirmation before publishing an overlapping campaign", async () => {
    const overlap = { id: "777777777777777777777777", title: "Other campaign",
      positions: ["Designer"], windowStart: input.windowStart,
      windowEnd: input.windowEnd, state: "Published" as const };
    const { repo, isPublished } = repository([overlap]);
    const currentPolicy = policy([{ code: "Spring", startAt: new Date("2027-01-01T00:00:00.000Z"),
      endAt: new Date("2027-05-01T00:00:00.000Z") }]);
    await expect(publishRecruitmentCampaign(repo, accessRepository(), currentPolicy, actor,
      clubId, campaignId, false, now)).rejects.toMatchObject({ kind: "conflict" });
    expect(isPublished()).toBe(false);
    await expect(publishRecruitmentCampaign(repo, accessRepository(), currentPolicy, actor,
      clubId, campaignId, true, now)).resolves.toMatchObject({
      campaign: { state: "Published" }, overlaps: [overlap],
    });
    expect(isPublished()).toBe(true);
  });
});
